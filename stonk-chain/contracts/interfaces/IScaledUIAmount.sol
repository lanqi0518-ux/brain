// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IScaledUIAmount (ERC-8056)
/// @notice The corporate-action multiplier extension implemented by every
///         Robinhood Stock Token. `uiMultiplier()` is an 18-decimal fixed-point
///         value that grows every time the underlying company pays a
///         reinvested dividend, splits, or has any corporate action applied.
/// @dev    Raw `balanceOf` and `totalSupply` stay static. The "true" holding
///         is always `balanceOf(user) * uiMultiplier() / 1e18`.
///         Reference: docs.robinhood.com/chain/stock-tokens
interface IScaledUIAmount {
    /// @notice Current UI multiplier, 18 decimals (1e18 == 1.0).
    function uiMultiplier() external view returns (uint256);

    /// @notice The next scheduled multiplier, applied at `effectiveAt()`.
    ///         Returns 0 if no update is scheduled.
    function nextMultiplier() external view returns (uint256);

    /// @notice Timestamp when the next multiplier becomes active.
    ///         Returns 0 if no update is scheduled.
    function effectiveAt() external view returns (uint256);

    /// @notice Emitted when the multiplier changes (dividend, split, etc.).
    event UIMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier, uint256 effectiveAtTimestamp);

    /// @notice Emitted on transfer, carrying both raw value and UI-adjusted value.
    event TransferWithScaledUI(address indexed from, address indexed to, uint256 value, uint256 uiValue);
}
