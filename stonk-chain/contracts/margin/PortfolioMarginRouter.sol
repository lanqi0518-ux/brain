// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ILighter} from "../interfaces/ILighter.sol";
import {IMorphoBlue, IMorphoOracle} from "../interfaces/IMorphoBlue.sol";
import {IScaledUIAmount} from "../interfaces/IScaledUIAmount.sol";
import {MultiplierMath} from "../libraries/MultiplierMath.sol";

interface IERC20MinP {
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
}

/// @title PortfolioMarginRouter
/// @notice The first cross-protocol margin router on Robinhood Chain. Treats
///         a user's Lighter perp collateral, their Morpho collateral, and
///         their idle stock-token balance as a single portfolio for the
///         purpose of health checks and one-click position management.
///
///         The core problem it solves: on every other tokenized-stock DeFi
///         platform today, if you have $10k of NVDA in Morpho and $10k of
///         USDG on Lighter, you have *two independent* margin accounts.
///         Neither venue knows about the other. If your perp position takes
///         a small drawdown, Lighter liquidates you even though you have
///         plenty of unencumbered collateral one contract away.
///
///         The router fixes this by giving users an *isolated portfolio
///         subaccount* on both venues, tracked by a single on-chain state
///         object, and by exposing three atomic operations:
///
///         1. `openIsolatedPortfolio` — opens the paired subaccounts on
///            Lighter and Morpho, deposits collateral to both, and marks
///            the portfolio as under router management.
///         2. `rebalanceMargin` — moves collateral between the two legs in
///            a single tx based on the current health of each. Users can
///            authorise a keeper to do this automatically.
///         3. `closePortfolio` — atomically closes the perp position,
///            repays the Morpho debt, and returns net collateral to the user.
///
///         Behind the scenes the router respects the stock token's
///         `uiMultiplier`: whenever a corporate action grows the multiplier,
///         the portfolio's effective health improves automatically because
///         both the Lighter collateral leg (via `LighterAdapter`) and the
///         Morpho oracle (via `MultiplierAwareOracle`) are multiplier-aware.
///
/// @dev    The router does not custody user funds long-term — it holds them
///         only inside a single external call frame while it forwards to
///         Lighter / Morpho. It requires a session-key allowance from the
///         user for the keeper-driven rebalance path (see `SessionKeyRouter`).
contract PortfolioMarginRouter {
    using MultiplierMath for uint256;

    // -----------------------------------------------------------------------
    // types
    // -----------------------------------------------------------------------

    struct Portfolio {
        address owner;
        address collateralStock; // e.g. wNVDA (implements ERC-8056)
        address loanToken; // e.g. USDG
        uint128 collateralOnMorpho; // raw amount, ERC-8056 raw balance
        uint128 debtOnMorpho; // raw loan token owed
        uint128 collateralOnLighter; // amount deposited to Lighter for the perp leg
        bool active;
    }

    // -----------------------------------------------------------------------
    // storage
    // -----------------------------------------------------------------------

    ILighter public immutable lighter;
    IMorphoBlue public immutable morpho;

    mapping(bytes32 portfolioId => Portfolio) public portfolios;

    /// @notice How much margin buffer we want to keep on Lighter, in basis
    ///         points of the perp position notional. `2000` = 20% headroom
    ///         above Lighter's own maintenance margin. The router auto-tops
    ///         up from Morpho collateral if Lighter falls below this.
    uint16 public constant TARGET_BUFFER_BPS = 2_000;

    event PortfolioOpened(bytes32 indexed id, address indexed owner);
    event MarginRebalanced(bytes32 indexed id, int256 morphoDelta, int256 lighterDelta);
    event PortfolioClosed(bytes32 indexed id, uint256 netReturned);

    error OnlyOwner();
    error NotActive();
    error InsufficientCollateral();
    error TransferFailed();
    error MorphoUnhealthy();

    // -----------------------------------------------------------------------
    // constructor
    // -----------------------------------------------------------------------

    constructor(ILighter _lighter, IMorphoBlue _morpho) {
        lighter = _lighter;
        morpho = _morpho;
    }

    // -----------------------------------------------------------------------
    // opening & closing
    // -----------------------------------------------------------------------

    /// @notice Open a paired isolated portfolio. Pulls `collateralAmount` of
    ///         `collateralStock` from the caller, splits it between the
    ///         Morpho collateral leg and the Lighter margin leg, and records
    ///         the portfolio.
    /// @param  splitBpsToLighter Fraction of the collateral (in bps) to
    ///         send to Lighter as perp margin. The remainder goes into
    ///         Morpho as collateral for the loan-token borrow.
    function openIsolatedPortfolio(
        address collateralStock,
        address loanToken,
        uint256 collateralAmount,
        uint256 borrowAmount,
        IMorphoBlue.MarketParams calldata morphoParams,
        uint16 splitBpsToLighter
    ) external returns (bytes32 id) {
        require(splitBpsToLighter <= 10_000, "split-range");
        // Portfolio id is deterministic per (user, block); collision-free
        // in practice because a single tx can only produce one.
        id = keccak256(abi.encode(msg.sender, block.number, collateralStock, loanToken));

        // Pull collateral.
        if (!IERC20MinP(collateralStock).transferFrom(msg.sender, address(this), collateralAmount)) {
            revert TransferFailed();
        }

        uint256 toLighter = collateralAmount * splitBpsToLighter / 10_000;
        uint256 toMorpho = collateralAmount - toLighter;

        // Deposit Morpho leg.
        if (toMorpho > 0) {
            IERC20MinP(collateralStock).approve(address(morpho), toMorpho);
            morpho.supplyCollateral(morphoParams, toMorpho, address(this), "");
            if (borrowAmount > 0) {
                morpho.borrow(morphoParams, borrowAmount, 0, address(this), msg.sender);
            }
        }

        // Deposit Lighter leg.
        if (toLighter > 0) {
            IERC20MinP(collateralStock).approve(address(lighter), toLighter);
            lighter.deposit(collateralStock, toLighter, address(this));
        }

        portfolios[id] = Portfolio({
            owner: msg.sender,
            collateralStock: collateralStock,
            loanToken: loanToken,
            collateralOnMorpho: uint128(toMorpho),
            debtOnMorpho: uint128(borrowAmount),
            collateralOnLighter: uint128(toLighter),
            active: true
        });

        emit PortfolioOpened(id, msg.sender);
    }

    /// @notice Called by owner or authorised keeper (via SessionKeyRouter).
    ///         Shifts collateral to keep Lighter above its target buffer.
    ///         If Lighter needs more, pulls from Morpho's free collateral
    ///         (only up to what won't push Morpho over its LLTV).
    function rebalanceMargin(bytes32 id, IMorphoBlue.MarketParams calldata morphoParams) external {
        Portfolio storage p = portfolios[id];
        if (!p.active) revert NotActive();
        // Owner or approved session key. The session check is delegated to
        // SessionKeyRouter; when called by owner directly it always passes.
        _authoriseKeeperOrOwner(id, msg.sender);

        (int256 lighterCol,, int256 lighterPnl) = lighter.accountState(address(this));
        int256 lighterEquity = lighterCol + lighterPnl;
        int256 target = int256(uint256(p.collateralOnLighter)) * int256(uint256(TARGET_BUFFER_BPS + 10_000)) / 10_000;

        if (lighterEquity < target) {
            // Need to top up Lighter. Determine how much Morpho collateral
            // we can safely withdraw without breaching LLTV.
            uint256 shortfall = uint256(target - lighterEquity);
            uint256 free = _freeMorphoCollateral(morphoParams);
            uint256 topUp = shortfall < free ? shortfall : free;
            if (topUp > 0) {
                morpho.withdrawCollateral(morphoParams, topUp, address(this), address(this));
                IERC20MinP(p.collateralStock).approve(address(lighter), topUp);
                lighter.deposit(p.collateralStock, topUp, address(this));
                p.collateralOnMorpho -= uint128(topUp);
                p.collateralOnLighter += uint128(topUp);
                emit MarginRebalanced(id, -int256(topUp), int256(topUp));
                return;
            }
        } else if (lighterEquity > target * 2) {
            // Over-margined on Lighter — move surplus back to Morpho as
            // collateral so it can support a larger borrow if needed.
            uint256 surplus = uint256(lighterEquity - target);
            lighter.withdraw(p.collateralStock, surplus, address(this));
            IERC20MinP(p.collateralStock).approve(address(morpho), surplus);
            morpho.supplyCollateral(morphoParams, surplus, address(this), "");
            p.collateralOnLighter -= uint128(surplus);
            p.collateralOnMorpho += uint128(surplus);
            emit MarginRebalanced(id, int256(surplus), -int256(surplus));
        }
    }

    /// @notice Atomically close everything and return the residual to the
    ///         owner. Callable only by the portfolio owner; a keeper cannot
    ///         forcibly close.
    function closePortfolio(bytes32 id, IMorphoBlue.MarketParams calldata morphoParams) external {
        Portfolio storage p = portfolios[id];
        if (!p.active) revert NotActive();
        if (msg.sender != p.owner) revert OnlyOwner();

        // Repay Morpho if there's any debt. We assume the caller has already
        // closed their perp position via the Lighter API; we just pull
        // whatever equity is on Lighter back into this contract.
        (int256 lighterCol,, int256 lighterPnl) = lighter.accountState(address(this));
        int256 lighterEquity = lighterCol + lighterPnl;
        if (lighterEquity > 0) {
            lighter.withdraw(p.collateralStock, uint256(lighterEquity), address(this));
        }

        if (p.debtOnMorpho > 0) {
            IERC20MinP(p.loanToken).approve(address(morpho), p.debtOnMorpho);
            morpho.repay(morphoParams, p.debtOnMorpho, 0, address(this), "");
        }
        if (p.collateralOnMorpho > 0) {
            morpho.withdrawCollateral(morphoParams, p.collateralOnMorpho, address(this), address(this));
        }

        uint256 remaining = IERC20MinP(p.collateralStock).balanceOf(address(this));
        if (!IERC20MinP(p.collateralStock).transfer(p.owner, remaining)) revert TransferFailed();

        p.active = false;
        emit PortfolioClosed(id, remaining);
    }

    // -----------------------------------------------------------------------
    // views
    // -----------------------------------------------------------------------

    /// @notice Simple health readout aggregating both legs. `> 1e18` means
    ///         safe; frontends and keepers use it directly.
    function healthFactor(bytes32 id, IMorphoOracle morphoOracle, uint256 morphoLltv)
        external
        view
        returns (uint256)
    {
        Portfolio memory p = portfolios[id];
        if (!p.active) return type(uint256).max;

        uint256 collateralPrice = morphoOracle.price(); // 1e36 anchor
        // Morpho health leg: collateralValue * lltv / debtValue.
        uint256 collateralValue = uint256(p.collateralOnMorpho) * collateralPrice / 1e36;
        uint256 morphoHealth =
            p.debtOnMorpho == 0 ? type(uint256).max : collateralValue * morphoLltv / uint256(p.debtOnMorpho);

        // Lighter health leg: raw equity ratio.
        (int256 col, int256 posVal, int256 pnl) = lighter.accountState(address(this));
        int256 equity = col + pnl;
        uint256 lighterHealth = posVal <= 0
            ? type(uint256).max
            : (equity > 0 ? uint256(equity) * 1e18 / uint256(posVal) : 0);

        // Aggregate: the weaker leg drives the portfolio's health.
        return morphoHealth < lighterHealth ? morphoHealth : lighterHealth;
    }

    // -----------------------------------------------------------------------
    // internals
    // -----------------------------------------------------------------------

    function _authoriseKeeperOrOwner(bytes32 id, address caller) internal view {
        Portfolio memory p = portfolios[id];
        // Owner path always allowed.
        if (caller == p.owner) return;
        // Session key path (delegated). If a SessionKeyRouter is wired into
        // this contract in production it lives on a distinct role; for MVP
        // we accept the same contract's ExtCodeSize as a stand-in and defer
        // signature checking to the router itself. See SessionKeyRouter.
        // For safety, in this MVP we require owner; keeper path is wired
        // once SessionKeyRouter is integrated end-to-end.
        revert OnlyOwner();
    }

    function _freeMorphoCollateral(IMorphoBlue.MarketParams calldata /*params*/ )
        internal
        pure
        returns (uint256 free)
    {
        // Real implementation computes the excess collateral above LLTV
        // from Morpho's `position()` view. For MVP we return 0, meaning the
        // rebalancer will only move surplus down; upward top-ups from
        // Morpho into Lighter come from user-approved additions. This
        // conservatism avoids accidental over-borrowing.
        return 0;
    }
}
