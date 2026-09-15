// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {LighterAdapter} from "../contracts/perp/LighterAdapter.sol";
import {MarketHours} from "../contracts/libraries/MarketHours.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";

contract MockLighter {
    function deposit(address, uint256, address) external {}
    function withdraw(address, uint256, address) external {}
    function approveAndRouteFees(address, uint16) external {}
    function accountState(address) external pure returns (int256, int256, int256, int256) {
        return (0, 0, 0, 0);
    }
    function isLiquidatable(address) external pure returns (bool) {
        return false;
    }
}

contract LighterAdapterTest is Test {
    LighterAdapter adapter;
    MockLighter lighter;
    MockERC20 collateral;
    address owner = address(0xA11CE);
    address feeSink = address(0xFEE);
    address alice = address(0xA);

    function setUp() public {
        lighter = new MockLighter();
        collateral = new MockERC20("USDG", "USDG", 6);
        vm.prank(owner);
        adapter = new LighterAdapter(address(lighter), address(collateral), feeSink);

        collateral.mint(alice, 1_000_000e6);
        vm.prank(alice);
        collateral.approve(address(adapter), type(uint256).max);
    }

    function _warpToRegularHours() internal {
        // Wednesday 2024-01-03 15:30 UTC = 10:30 ET (regular hours)
        vm.warp(1_704_294_600);
    }

    function _warpToClosed() internal {
        // Saturday 2024-01-06 06:00 UTC — weekend closed
        vm.warp(1_704_520_800);
    }

    function testDepositAndWithdraw() public {
        vm.prank(alice);
        adapter.deposit(100e6);
        assertEq(adapter.collateralOf(alice), 100e6);
        assertEq(collateral.balanceOf(address(adapter)), 100e6);

        vm.prank(alice);
        adapter.withdraw(60e6);
        assertEq(adapter.collateralOf(alice), 40e6);
        assertEq(collateral.balanceOf(alice), 1_000_000e6 - 40e6);
    }

    function testWithdrawRespectsBalance() public {
        vm.prank(alice);
        adapter.deposit(10e6);
        vm.prank(alice);
        vm.expectRevert(LighterAdapter.InsufficientCollateral.selector);
        adapter.withdraw(11e6);
    }

    function testLeverageCapDuringOpenHours() public {
        _warpToRegularHours();
        assertEq(adapter.effectiveLeverageCap(), 500_000);
    }

    function testLeverageCapDuringClosedHours() public {
        _warpToClosed();
        // Closed → 3x cap = 30_000 bps
        assertEq(adapter.effectiveLeverageCap(), 30_000);
    }

    function testTradeRejectsAboveCap() public {
        _warpToClosed();
        vm.prank(alice);
        adapter.deposit(10e6);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LighterAdapter.LeverageAboveCap.selector, 50_000, 30_000));
        adapter.trade(1e18, 50_000, "");
    }

    function testTradeAcceptedWithinCap() public {
        _warpToClosed();
        vm.prank(alice);
        adapter.deposit(10e6);
        vm.prank(alice);
        adapter.trade(1e18, 20_000, "");
    }
}
