// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IScaledUIAmount} from "../interfaces/IScaledUIAmount.sol";

/// @title MockStockToken
/// @notice Test double that implements the ERC-8056 corporate-action
///         multiplier extension. Used across the STONK test suite to
///         simulate dividend and split events end-to-end.
contract MockStockToken is IScaledUIAmount {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public override uiMultiplier;
    uint256 public override nextMultiplier;
    uint256 public override effectiveAt;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        uiMultiplier = 1e18;
    }

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        if (a != type(uint256).max) allowance[from][msg.sender] = a - amount;
        _transfer(from, to, amount);
        return true;
    }

    /// @notice Simulate a dividend event: bumps the multiplier and emits
    ///         the ERC-8056 event that keepers listen for.
    function applyDividend(uint256 growthBps) external {
        uint256 old = uiMultiplier;
        uint256 mnew = old + (old * growthBps / 10_000);
        uiMultiplier = mnew;
        emit UIMultiplierUpdated(old, mnew, block.timestamp);
    }

    /// @notice Simulate a stock split (`ratioX18 = new / old`, 18-decimal).
    ///         A 2-for-1 forward split is `2e18`; a 1-for-2 reverse is `5e17`.
    function applySplit(uint256 ratioX18) external {
        uint256 old = uiMultiplier;
        uint256 mnew = old * ratioX18 / 1e18;
        uiMultiplier = mnew;
        emit UIMultiplierUpdated(old, mnew, block.timestamp);
    }

    function _transfer(address from, address to, uint256 amount) private {
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        uint256 ui = amount * uiMultiplier / 1e18;
        emit TransferWithScaledUI(from, to, amount, ui);
    }
}
