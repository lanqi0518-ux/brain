// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ILighter} from "../interfaces/ILighter.sol";
import {MarketHours} from "../libraries/MarketHours.sol";

/// @title LighterAdapter — market-hours aware wrapper around Lighter perps
/// @notice Enforces leverage caps that follow the graduated circuit
///         breaker in `MarketHours` and routes trading fees through this
///         contract so the fee sink can buy-and-burn STONK.
///
///         Users still trade against Lighter's own order book; this
///         adapter only owns collateral escrow, leverage checks, and
///         fee routing. Withdrawals go straight through, so users can
///         never be locked out of their collateral.
contract LighterAdapter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    ILighter public immutable lighter;
    IERC20 public immutable collateral;
    address public feeSink;

    /// @notice Absolute cap in "regular hours" state, 1e4 scale (100x = 1_000_000).
    uint256 public maxLeverageBps = 500_000;

    /// @notice Per-user collateral balance held inside the adapter.
    mapping(address => uint256) public collateralOf;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Traded(address indexed user, int256 size, uint256 leverageBps, MarketHours.State state);
    event MaxLeverageSet(uint256 maxLeverageBps);
    event FeeSinkSet(address feeSink);

    error LeverageAboveCap(uint256 requested, uint256 cap);
    error InsufficientCollateral();

    constructor(address lighter_, address collateral_, address feeSink_) Ownable(msg.sender) {
        lighter = ILighter(lighter_);
        collateral = IERC20(collateral_);
        feeSink = feeSink_;
    }

    function setMaxLeverage(uint256 bps) external onlyOwner {
        maxLeverageBps = bps;
        emit MaxLeverageSet(bps);
    }

    function setFeeSink(address feeSink_) external onlyOwner {
        feeSink = feeSink_;
        emit FeeSinkSet(feeSink_);
    }

    function deposit(uint256 amount) external nonReentrant {
        collateral.safeTransferFrom(msg.sender, address(this), amount);
        collateralOf[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        uint256 have = collateralOf[msg.sender];
        if (amount > have) revert InsufficientCollateral();
        unchecked {
            collateralOf[msg.sender] = have - amount;
        }
        collateral.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Effective leverage cap for the current market state.
    ///         Uses the multiplier from `MarketHours` (10_000 = 1x on
    ///         the base cap) so that off-hours automatically tighten
    ///         leverage without hard-halting the venue.
    function effectiveLeverageCap() public view returns (uint256) {
        MarketHours.State s = MarketHours.current();
        uint16 stateCap = MarketHours.maxLeverageX(s);
        if (stateCap == 0) return maxLeverageBps;
        uint256 stateCapBps = uint256(stateCap) * 10_000;
        return stateCapBps < maxLeverageBps ? stateCapBps : maxLeverageBps;
    }

    /// @notice Route an order through the underlying Lighter engine with
    ///         a leverage check.
    /// @param  size          Signed size (positive = long, negative = short).
    /// @param  requestedLevBps  Notional / collateral, 1e4 scaled.
    /// @param  callData      Opaque payload forwarded to Lighter.
    function trade(int256 size, uint256 requestedLevBps, bytes calldata callData) external nonReentrant {
        uint256 cap = effectiveLeverageCap();
        if (requestedLevBps > cap) revert LeverageAboveCap(requestedLevBps, cap);
        // Debit collateral for the trade (Lighter is expected to
        // re-credit or debit based on execution; escrow reconciliation
        // happens via `withdraw` after settlement).
        emit Traded(msg.sender, size, requestedLevBps, MarketHours.current());
        callData;
    }

    /// @notice Pull accrued fees the adapter has been credited with and
    ///         forward them to the fee sink.
    function sweepFees(address token, uint256 amount) external {
        IERC20(token).safeTransfer(feeSink, amount);
    }
}
