// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IScaledUIAmount} from "../interfaces/IScaledUIAmount.sol";

/// @title MultiplierMath
/// @notice Math helpers for the ERC-8056 corporate-action multiplier used by
///         every Robinhood Stock Token. Centralised so the Swap Hook, the
///         Morpho oracle, the bridge, and the margin router all treat
///         multipliers the same way.
library MultiplierMath {
    uint256 internal constant ONE = 1e18;

    /// @notice UI-adjusted (per-share) amount for a raw ERC-20 amount.
    /// @dev    `raw * multiplier / 1e18`. This is what the user "really owns"
    ///         in underlying shares, not what `balanceOf` returns.
    function uiAmount(uint256 raw, uint256 multiplier) internal pure returns (uint256) {
        return raw * multiplier / ONE;
    }

    /// @notice Raw amount for a target UI-adjusted amount.
    /// @dev    Inverse of `uiAmount`. Used when transferring an *exact* number
    ///         of underlying-share-equivalents. Truncates toward zero.
    function rawAmount(uint256 ui, uint256 multiplier) internal pure returns (uint256) {
        if (multiplier == 0) revert MultiplierZero();
        return ui * ONE / multiplier;
    }

    /// @notice Extract the "raw per-share" price from a Chainlink Data Streams
    ///         price that already includes the multiplier.
    /// @dev    Robinhood's Chainlink feed reports `stockPrice * multiplier`.
    ///         Some downstream logic (e.g. options strikes) needs the naked
    ///         stock price and must divide it back out here.
    function rawPrice(uint256 dsPrice, uint256 multiplier) internal pure returns (uint256) {
        if (multiplier == 0) revert MultiplierZero();
        return dsPrice * ONE / multiplier;
    }

    /// @notice Read `uiMultiplier` from a token address, returning `1e18` if
    ///         the token does not implement ERC-8056. Safe for non-stock
    ///         collaterals like USDG or ETH.
    function safeMultiplier(address token) internal view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeCall(IScaledUIAmount.uiMultiplier, ()));
        if (!ok || data.length < 32) return ONE;
        uint256 m = abi.decode(data, (uint256));
        return m == 0 ? ONE : m;
    }

    /// @notice Multiplier delta as a signed 18-decimal ratio: `(new - old) / old`.
    ///         Used by keepers to size the rebalance of Uniswap positions or
    ///         Morpho collateral values after a corporate action.
    function delta(uint256 oldMult, uint256 newMult) internal pure returns (int256) {
        if (oldMult == 0) revert MultiplierZero();
        return (int256(newMult) - int256(oldMult)) * int256(ONE) / int256(oldMult);
    }

    error MultiplierZero();
}
