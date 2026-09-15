// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title STONK — the fee sink of the StockChain awareness layer
/// @notice Fixed-supply ERC-20 with an on-chain buy-and-burn hook.
///         Minting is disabled after the constructor runs. There is no
///         upgrade path, no admin mint, no blacklist. Trading is gated
///         behind a one-way `enableTrading()` switch so the deployer can
///         seed initial Pons liquidity in one atomic transaction and
///         open the market only when routing is ready.
/// @dev    Supply / distribution numbers must match `docs/TOKENOMICS.md`.
contract StonkToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;

    /// @notice Cumulative amount of STONK burned via `burnFromFees`.
    ///         Exposed so anyone can audit the buy-and-burn flow.
    uint256 public burnedFromFees;

    /// @notice Once true, `transfer` / `transferFrom` are unrestricted.
    ///         One-way switch; cannot be flipped back to false.
    bool public tradingEnabled;

    /// @notice Addresses allowed to move tokens before `enableTrading()`
    ///         is called. Used exclusively to seed the initial Pons pool
    ///         and to route the treasury / points / team allocations to
    ///         their respective vesting or vault contracts.
    mapping(address => bool) public preLaunchAllowed;

    event TradingEnabled();
    event PreLaunchAllowanceSet(address indexed account, bool allowed);
    event FeeBurn(address indexed source, uint256 amount, uint256 cumulative);

    error TradingNotEnabled();

    constructor(address initialHolder)
        ERC20("StockChain", "STONK")
        ERC20Permit("StockChain")
        Ownable(msg.sender)
    {
        _mint(initialHolder, TOTAL_SUPPLY);
        preLaunchAllowed[initialHolder] = true;
        preLaunchAllowed[msg.sender] = true;
    }

    /// @notice One-way flip to open the market. Only owner can call it,
    ///         and only once. After this call, ownership is renounced
    ///         so the switch cannot be reversed and no other privileged
    ///         action remains.
    function enableTrading() external onlyOwner {
        tradingEnabled = true;
        emit TradingEnabled();
        renounceOwnership();
    }

    /// @notice Whitelist a router / vault so the deployer can move the
    ///         initial allocations before the market opens. Can only be
    ///         called before `enableTrading`.
    function setPreLaunchAllowed(address account, bool allowed) external onlyOwner {
        require(!tradingEnabled, "tradingEnabled");
        preLaunchAllowed[account] = allowed;
        emit PreLaunchAllowanceSet(account, allowed);
    }

    /// @notice Convenience burn entrypoint for the fee router / paymaster
    ///         so the buy-and-burn flow shows up under a stable event.
    function burnFromFees(uint256 amount) external {
        _burn(msg.sender, amount);
        burnedFromFees += amount;
        emit FeeBurn(msg.sender, amount, burnedFromFees);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (!tradingEnabled && from != address(0) && to != address(0)) {
            if (!preLaunchAllowed[from] && !preLaunchAllowed[to]) {
                revert TradingNotEnabled();
            }
        }
        super._update(from, to, value);
    }
}
