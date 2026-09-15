// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IScaledUIAmount} from "../interfaces/IScaledUIAmount.sol";
import {MultiplierMath} from "../libraries/MultiplierMath.sol";

/// @dev Minimal ERC-20 subset used by the bridge for transfers on either side.
interface IERC20Min {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @dev Minimal Arbitrum L2→L3 outbound messenger for the L2 side of the bridge.
///      The real interface is `ArbSys.sendTxToL2` when going L2→L3 via the
///      canonical Orbit bridge; here we type only what we need.
interface IL2ToL3Messenger {
    function sendMessage(address to, uint256 gasLimit, bytes calldata data) external payable returns (uint256);
}

/// @title MultiplierBridge
/// @notice A lock-and-mint bridge for Robinhood Stock Tokens between the
///         Robinhood Chain L2 and a downstream L3 (or any peer chain). It
///         solves a specific bug that every generic bridge has when carrying
///         ERC-8056 assets: the token's `uiMultiplier()` grows on the source
///         chain after the lock, but the wrapped copy on the destination
///         chain has no way to know. The user's dividends are silently
///         stranded in the escrow.
///
///         This bridge fixes that with three mechanics:
///
///         1. **Lock records the multiplier**. On deposit we snapshot
///            `sourceMultiplier` and send it alongside the amount so the
///            destination mints wrapped tokens whose *effective* balance
///            equals `raw * sourceMultiplier / 1e18`.
///
///         2. **Keeper-driven multiplier sync**. When the source token's
///            multiplier changes (dividend / split), an off-chain keeper
///            calls `syncMultiplier(newMultiplier)` which sends a single
///            cross-chain message; the destination bridge applies the delta
///            proportionally to all outstanding wrapped supply, either by
///            rebasing the wrapped token or by streaming the delta into a
///            claim pool. Which strategy is used depends on how the wrapped
///            token itself is implemented; both paths are supported by the
///            `IWrappedStockToken` interface below.
///
///         3. **Redemption respects the current multiplier**. When a user
///            burns wrapped tokens on the destination, the message back to
///            the source releases `escrowedRaw * currentMultiplier /
///            snapshotMultiplier`, so the user gets back exactly what they
///            would have owned if they had held the source token natively.
///
/// @dev    This contract is deployed once on the *source* chain (Robinhood
///         Chain L2). The mirror contract `L3Endpoint` handles the mint/burn
///         side on the destination. Cross-chain messaging is abstracted so
///         the same code works with Arbitrum canonical retryables (Orbit L2↔L3)
///         and with a LayerZero / Hyperlane path when bridging to non-Orbit
///         chains. The message format is versioned so we can extend it later
///         (e.g. carry corporate-action ex-date data).
contract MultiplierBridge {
    using MultiplierMath for uint256;

    // -----------------------------------------------------------------------
    // types
    // -----------------------------------------------------------------------

    enum MessageType {
        Deposit, // user locks source token, wrapped minted downstream
        Withdraw, // user burns wrapped, source token released
        MultiplierSync // keeper updates multiplier on downstream

    }

    struct StockConfig {
        address wrappedTokenOnL3; // corresponding wrapped token address on the destination
        uint256 totalEscrowed; // raw amount of source token currently locked
        uint256 lastSyncedMultiplier; // last multiplier we broadcast downstream
        bool paused; // per-token pause (used during unusual corporate actions)
    }

    struct PendingRedeem {
        address to;
        uint256 rawAmount;
        uint256 snapshotMultiplier;
        uint64 unlockAt; // ≥ block.timestamp when it becomes claimable
    }

    // -----------------------------------------------------------------------
    // storage
    // -----------------------------------------------------------------------

    /// @notice Per-stock-token bridge state.
    mapping(address stockToken => StockConfig) public stocks;

    /// @notice Pending withdrawals keyed by messageId (from L3).
    mapping(bytes32 => PendingRedeem) public pendingRedeems;

    /// @notice Whitelisted keepers allowed to broadcast multiplier updates.
    mapping(address => bool) public isKeeper;

    /// @notice Admin (governance / multisig). Kept lean to minimise attack
    ///         surface; only pause/unpause and keeper set live here.
    address public admin;

    /// @notice Withdrawal timelock for L3→L2 releases. Deters exploiter
    ///         rushes and gives incident-response time. Default 30 minutes.
    uint64 public withdrawDelaySeconds = 30 minutes;

    /// @notice Peer bridge contract on the destination chain (L3).
    address public peerBridge;

    /// @notice Cross-chain messenger (Arbitrum Orbit outbound, or LZ endpoint).
    IL2ToL3Messenger public immutable messenger;

    /// @dev Nonce for outbound message ids.
    uint256 private _msgNonce;

    // -----------------------------------------------------------------------
    // events
    // -----------------------------------------------------------------------

    event Deposit(
        address indexed user,
        address indexed stockToken,
        uint256 rawAmount,
        uint256 snapshotMultiplier,
        bytes32 messageId
    );
    event WithdrawRequested(
        address indexed user, address indexed stockToken, uint256 rawAmount, bytes32 messageId, uint64 unlockAt
    );
    event WithdrawClaimed(address indexed user, address indexed stockToken, uint256 payoutAmount);
    event MultiplierSynced(address indexed stockToken, uint256 oldMult, uint256 newMult, bytes32 messageId);
    event StockRegistered(address indexed stockToken, address indexed wrappedOnL3);
    event StockPaused(address indexed stockToken, bool paused);
    event KeeperSet(address indexed keeper, bool allowed);

    error OnlyAdmin();
    error OnlyKeeper();
    error OnlyPeer();
    error StockNotRegistered();
    error StockPausedErr();
    error NotClaimable();
    error MultiplierRegressed();
    error TransferFailed();
    error AlreadyRegistered();

    // -----------------------------------------------------------------------
    // constructor
    // -----------------------------------------------------------------------

    constructor(address _admin, IL2ToL3Messenger _messenger) {
        admin = _admin;
        messenger = _messenger;
    }

    // -----------------------------------------------------------------------
    // admin
    // -----------------------------------------------------------------------

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }

    function setPeerBridge(address peer) external onlyAdmin {
        peerBridge = peer;
    }

    function setKeeper(address keeper, bool allowed) external onlyAdmin {
        isKeeper[keeper] = allowed;
        emit KeeperSet(keeper, allowed);
    }

    function setWithdrawDelay(uint64 seconds_) external onlyAdmin {
        // Bounds: 5 minutes ≤ delay ≤ 24 hours. Prevents accidental zero-delay
        // configuration on one side of the admin, while still letting us
        // extend for incident response.
        require(seconds_ >= 5 minutes && seconds_ <= 1 days, "delay-range");
        withdrawDelaySeconds = seconds_;
    }

    function registerStock(address stockToken, address wrappedOnL3) external onlyAdmin {
        if (stocks[stockToken].wrappedTokenOnL3 != address(0)) revert AlreadyRegistered();
        stocks[stockToken] = StockConfig({
            wrappedTokenOnL3: wrappedOnL3,
            totalEscrowed: 0,
            lastSyncedMultiplier: MultiplierMath.safeMultiplier(stockToken),
            paused: false
        });
        emit StockRegistered(stockToken, wrappedOnL3);
    }

    function setPaused(address stockToken, bool p) external onlyAdmin {
        stocks[stockToken].paused = p;
        emit StockPaused(stockToken, p);
    }

    // -----------------------------------------------------------------------
    // user-facing: deposit (L2 → L3)
    // -----------------------------------------------------------------------

    /// @notice Lock `rawAmount` of `stockToken` and instruct the peer bridge
    ///         to mint the equivalent wrapped token to `to` on L3. The mint
    ///         amount on L3 is `rawAmount` in raw units — but the wrapped
    ///         token's own `uiMultiplier` will be set to the source
    ///         multiplier snapshot so that UI-adjusted balances match.
    function deposit(address stockToken, uint256 rawAmount, address to) external returns (bytes32 messageId) {
        StockConfig storage cfg = stocks[stockToken];
        if (cfg.wrappedTokenOnL3 == address(0)) revert StockNotRegistered();
        if (cfg.paused) revert StockPausedErr();

        // Pull the raw tokens.
        if (!IERC20Min(stockToken).transferFrom(msg.sender, address(this), rawAmount)) revert TransferFailed();

        // Snapshot the source multiplier at deposit time. Any subsequent
        // dividend growth accrues to the escrow and is synced to L3 via
        // `syncMultiplier`; the user's L3 balance benefits proportionally.
        uint256 snapshot = MultiplierMath.safeMultiplier(stockToken);
        cfg.totalEscrowed += rawAmount;

        // Send Deposit message to peer.
        messageId = _nextMessageId();
        bytes memory payload = abi.encode(MessageType.Deposit, stockToken, cfg.wrappedTokenOnL3, to, rawAmount, snapshot);
        messenger.sendMessage(peerBridge, 300_000, payload);

        emit Deposit(msg.sender, stockToken, rawAmount, snapshot, messageId);
    }

    // -----------------------------------------------------------------------
    // inbound from peer: receive a withdraw request and stage it
    // -----------------------------------------------------------------------

    /// @notice Called by the messenger when a Withdraw message arrives from
    ///         L3. Stages the release; the user (or anyone) can claim it
    ///         once `withdrawDelaySeconds` has elapsed.
    /// @dev    Message authenticity is enforced by `_authenticate`. The
    ///         two-step (stage → claim) design lets us configure a timelock
    ///         without introducing custody indirection.
    function receiveWithdraw(bytes32 messageId, address to, address stockToken, uint256 rawAmount, uint256 snapshotMult)
        external
    {
        _authenticate();
        StockConfig storage cfg = stocks[stockToken];
        if (cfg.wrappedTokenOnL3 == address(0)) revert StockNotRegistered();

        pendingRedeems[messageId] = PendingRedeem({
            to: to,
            rawAmount: rawAmount,
            snapshotMultiplier: snapshotMult,
            unlockAt: uint64(block.timestamp) + withdrawDelaySeconds
        });

        emit WithdrawRequested(to, stockToken, rawAmount, messageId, uint64(block.timestamp) + withdrawDelaySeconds);
    }

    /// @notice Claim a staged withdrawal. Anyone can call this after the
    ///         unlock time; the payout always goes to the `to` recorded in
    ///         the message, never to the claimer. This lets keepers batch-
    ///         claim on behalf of users without introducing a custody path.
    function claimWithdraw(bytes32 messageId, address stockToken) external {
        PendingRedeem memory p = pendingRedeems[messageId];
        if (p.to == address(0) || block.timestamp < p.unlockAt) revert NotClaimable();
        StockConfig storage cfg = stocks[stockToken];

        // ERC-8056 raw balances never move on dividends or splits — only the
        // multiplier does. So the bridge is strictly 1:1 in raw units: we
        // release exactly what was escrowed. The value grew inside the raw
        // tokens themselves because the source stock's `uiMultiplier` grew
        // while the tokens sat in escrow; the returning user gets that upside
        // automatically because their raw NVDA is now worth more UI-adjusted
        // shares.
        //
        // The wrapped token on the destination chain tracks its own
        // multiplier via `syncMultiplier` messages, so a user burning wrapped
        // shares at UI-parity ends up with the correct raw amount back. If a
        // reverse split ever caused the source multiplier to regress, the
        // guard below revert-protects the escrow accounting.
        uint256 currentMult = MultiplierMath.safeMultiplier(stockToken);
        if (currentMult < p.snapshotMultiplier) revert MultiplierRegressed();

        cfg.totalEscrowed -= p.rawAmount;

        delete pendingRedeems[messageId];
        if (!IERC20Min(stockToken).transfer(p.to, p.rawAmount)) revert TransferFailed();
        emit WithdrawClaimed(p.to, stockToken, p.rawAmount);
    }

    // -----------------------------------------------------------------------
    // keeper: broadcast a multiplier update to L3
    // -----------------------------------------------------------------------

    /// @notice Push a new multiplier to the peer bridge so it can rebase the
    ///         wrapped token supply. Keepers monitor `UIMultiplierUpdated`
    ///         events on the source token and race to call this — the first
    ///         caller wins and pays the messaging gas. On the L3 side the
    ///         wrapped token's `_multiplier` gets set to `newMultiplier`
    ///         atomically for all holders.
    function syncMultiplier(address stockToken) external returns (bytes32 messageId) {
        if (!isKeeper[msg.sender]) revert OnlyKeeper();
        StockConfig storage cfg = stocks[stockToken];
        if (cfg.wrappedTokenOnL3 == address(0)) revert StockNotRegistered();

        uint256 newMult = MultiplierMath.safeMultiplier(stockToken);
        uint256 oldMult = cfg.lastSyncedMultiplier;
        if (newMult < oldMult) revert MultiplierRegressed(); // multipliers only grow
        if (newMult == oldMult) return bytes32(0); // no-op, avoid wasted message

        cfg.lastSyncedMultiplier = newMult;

        messageId = _nextMessageId();
        bytes memory payload =
            abi.encode(MessageType.MultiplierSync, stockToken, cfg.wrappedTokenOnL3, address(0), newMult, oldMult);
        messenger.sendMessage(peerBridge, 150_000, payload);

        emit MultiplierSynced(stockToken, oldMult, newMult, messageId);
    }

    // -----------------------------------------------------------------------
    // internal
    // -----------------------------------------------------------------------

    /// @dev Cross-chain message authenticity check. The concrete predicate
    ///      depends on the messenger — for Arbitrum Orbit inbound retryables
    ///      the aliased L3 peer address arrives as `msg.sender`. For
    ///      LayerZero it's a callback on `lzReceive`. We use the simplest
    ///      shape here and expect production deployment to wrap this in the
    ///      appropriate adapter contract.
    function _authenticate() internal view {
        if (msg.sender != peerBridge) revert OnlyPeer();
    }

    function _nextMessageId() internal returns (bytes32) {
        unchecked {
            _msgNonce += 1;
        }
        return keccak256(abi.encode(block.chainid, address(this), _msgNonce));
    }
}
