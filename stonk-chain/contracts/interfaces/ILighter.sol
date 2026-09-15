// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ILighter
/// @notice Minimal interface to the Lighter perpetual DEX on Robinhood Chain.
///         Lighter is the Robinhood-official ZK perp partner; we integrate it
///         as our perp execution venue rather than fork the engine.
/// @dev    The full Lighter API is off-chain (ZK-rollup with signed order
///         intents), but on-chain deposit/withdraw and the fee-routing hooks
///         are what we integrate with here. Fee routing lets STONK Chain
///         collect a share of user fees as an integrator.
interface ILighter {
    struct Order {
        uint32 marketIndex;
        int64 baseAmount;
        uint64 priceX10;
        uint32 nonce;
        uint32 expiry;
        uint8 orderType;
        uint8 side;
        bool reduceOnly;
    }

    /// @notice Deposit collateral for `account`. Anyone can deposit for anyone
    ///         (used by the PortfolioMarginRouter to shuffle collateral).
    function deposit(address token, uint256 amount, address account) external;

    /// @notice Withdraw collateral to `receiver`. Only callable by the account
    ///         owner or an approved SessionKey.
    function withdraw(address token, uint256 amount, address receiver) external;

    /// @notice Route order fees to an integrator address. Called once per
    ///         account per integrator, then persists.
    function approveAndRouteFees(address integrator, uint16 basisPoints) external;

    /// @notice Returns `(collateral, positionValue, unrealizedPnl)` for an account.
    function accountState(address account)
        external
        view
        returns (int256 collateral, int256 positionValue, int256 unrealizedPnl);

    /// @notice True if `account` is currently below maintenance margin.
    function isLiquidatable(address account) external view returns (bool);
}
