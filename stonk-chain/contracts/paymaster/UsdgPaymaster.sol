// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IEntryPoint, IPaymaster, PackedUserOperation} from "../interfaces/IEntryPoint.sol";

/// @title UsdgPaymaster — ERC-4337 paymaster paying gas in USDG
/// @notice Deducts USDG from the sender proportional to the gas cost of
///         their UserOperation. Uses a keeper-updated exchange rate
///         (native gas token → USDG, 1e18 scale) plus a configurable
///         markup that funds the buy-and-burn flow described in
///         `docs/TOKENOMICS.md`.
///
///         Only bundler-signed operations from the canonical EntryPoint
///         can call `validatePaymasterUserOp` / `postOp`. Sender must
///         have granted this paymaster USDG allowance and hold at least
///         `maxCost * rate * (1 + markupBps)` at validation time.
contract UsdgPaymaster is IPaymaster, Ownable {
    using SafeERC20 for IERC20;

    IEntryPoint public immutable entryPoint;
    IERC20 public immutable usdg;

    /// @notice Native → USDG price, 1e18 scaled. Concretely: how many
    ///         USDG (with USDG's own decimals) equal 1e18 wei of native.
    uint256 public nativePriceInUsdg;

    /// @notice Markup on top of raw gas cost, in basis points. Revenue
    ///         above cost is forwarded to `feeSink` (typically the fee
    ///         router that runs the buy-and-burn).
    uint16 public markupBps;

    /// @notice Receiver of net paymaster revenue (raw gas is repaid by
    ///         the EntryPoint from our deposit; markup is pure margin).
    address public feeSink;

    /// @notice Keeper allowed to update the exchange rate. Should be a
    ///         Chainlink automation wallet or a hot signer with narrow
    ///         scope. Rate updates are rate-limited by staleness.
    address public priceKeeper;

    /// @notice Maximum age of a rate update before validation reverts.
    uint256 public maxRateStaleness = 30 minutes;
    uint256 public lastRateUpdate;

    event RateUpdated(uint256 nativePriceInUsdg, uint256 timestamp);
    event MarkupSet(uint16 markupBps);
    event FeeSinkSet(address indexed feeSink);
    event KeeperSet(address indexed keeper);
    event GasPaid(address indexed sender, uint256 nativeCost, uint256 usdgCharged);

    error NotEntryPoint();
    error NotKeeper();
    error StaleRate();
    error MarkupTooHigh();

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) revert NotEntryPoint();
        _;
    }

    constructor(address entryPoint_, address usdg_, address feeSink_, uint16 markupBps_)
        Ownable(msg.sender)
    {
        if (markupBps_ > 5_000) revert MarkupTooHigh();
        entryPoint = IEntryPoint(entryPoint_);
        usdg = IERC20(usdg_);
        feeSink = feeSink_;
        markupBps = markupBps_;
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setMarkup(uint16 markupBps_) external onlyOwner {
        if (markupBps_ > 5_000) revert MarkupTooHigh();
        markupBps = markupBps_;
        emit MarkupSet(markupBps_);
    }

    function setFeeSink(address feeSink_) external onlyOwner {
        feeSink = feeSink_;
        emit FeeSinkSet(feeSink_);
    }

    function setPriceKeeper(address keeper_) external onlyOwner {
        priceKeeper = keeper_;
        emit KeeperSet(keeper_);
    }

    function setMaxRateStaleness(uint256 seconds_) external onlyOwner {
        maxRateStaleness = seconds_;
    }

    function updateRate(uint256 nativePriceInUsdg_) external {
        if (msg.sender != priceKeeper && msg.sender != owner()) revert NotKeeper();
        nativePriceInUsdg = nativePriceInUsdg_;
        lastRateUpdate = block.timestamp;
        emit RateUpdated(nativePriceInUsdg_, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // EntryPoint deposit management
    // -------------------------------------------------------------------------

    function deposit() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    function withdrawTo(address payable to, uint256 amount) external onlyOwner {
        entryPoint.withdrawTo(to, amount);
    }

    function addStake(uint32 unstakeDelaySec) external payable onlyOwner {
        entryPoint.addStake{value: msg.value}(unstakeDelaySec);
    }

    function unlockStake() external onlyOwner {
        entryPoint.unlockStake();
    }

    function withdrawStake(address payable to) external onlyOwner {
        entryPoint.withdrawStake(to);
    }

    // -------------------------------------------------------------------------
    // ERC-4337 hooks
    // -------------------------------------------------------------------------

    function validatePaymasterUserOp(PackedUserOperation calldata userOp, bytes32, uint256 maxCost)
        external
        view
        onlyEntryPoint
        returns (bytes memory context, uint256 validationData)
    {
        if (nativePriceInUsdg == 0 || block.timestamp > lastRateUpdate + maxRateStaleness) revert StaleRate();

        uint256 usdgMax = _nativeToUsdg(maxCost);
        // Fail-fast if sender cannot cover the worst case. We do not
        // pull tokens here; the actual charge happens in `postOp`.
        if (usdg.balanceOf(userOp.sender) < usdgMax || usdg.allowance(userOp.sender, address(this)) < usdgMax) {
            // Return failure code (validAfter=0, validUntil=0, sigError=1).
            return (bytes(""), 1);
        }
        context = abi.encode(userOp.sender);
        validationData = 0;
    }

    function postOp(PostOpMode, bytes calldata context, uint256 actualGasCost, uint256) external onlyEntryPoint {
        address sender = abi.decode(context, (address));
        uint256 base = (actualGasCost * nativePriceInUsdg) / 1e18;
        uint256 markup = (base * markupBps) / 10_000;
        uint256 usdgCharge = base + markup;
        usdg.safeTransferFrom(sender, address(this), usdgCharge);
        if (markup != 0 && feeSink != address(0)) {
            usdg.safeTransfer(feeSink, markup);
        }
        emit GasPaid(sender, actualGasCost, usdgCharge);
    }

    // -------------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------------

    function _nativeToUsdg(uint256 nativeAmount) internal view returns (uint256) {
        uint256 base = (nativeAmount * nativePriceInUsdg) / 1e18;
        return base + (base * markupBps) / 10_000;
    }
}
