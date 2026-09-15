// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {StonkToken} from "../contracts/token/StonkToken.sol";

contract StonkTokenTest is Test {
    StonkToken token;
    address owner = address(0xA11CE);
    address treasury = address(0xB0B);
    address alice = address(0xA);
    address bob = address(0xB);

    function setUp() public {
        vm.prank(owner);
        token = new StonkToken(treasury);
    }

    function testInitialSupply() public view {
        assertEq(token.totalSupply(), 1_000_000_000 ether);
        assertEq(token.balanceOf(treasury), 1_000_000_000 ether);
        assertEq(token.name(), "StockChain");
        assertEq(token.symbol(), "STONK");
    }

    function testTradingLockedBeforeEnable() public {
        vm.prank(treasury);
        token.transfer(alice, 1 ether);

        vm.prank(alice);
        vm.expectRevert(StonkToken.TradingNotEnabled.selector);
        token.transfer(bob, 1 ether);
    }

    function testWhitelistedAccountCanMovePreLaunch() public {
        vm.prank(owner);
        token.setPreLaunchAllowed(alice, true);

        vm.prank(treasury);
        token.transfer(alice, 100 ether);

        vm.prank(alice);
        token.transfer(bob, 50 ether);
        assertEq(token.balanceOf(bob), 50 ether);
    }

    function testEnableTradingRenouncesOwnership() public {
        vm.prank(owner);
        token.enableTrading();
        assertTrue(token.tradingEnabled());
        assertEq(token.owner(), address(0));

        vm.prank(treasury);
        token.transfer(alice, 1 ether);
        vm.prank(alice);
        token.transfer(bob, 1 ether);
        assertEq(token.balanceOf(bob), 1 ether);
    }

    function testEnableTradingIsOneWay() public {
        vm.prank(owner);
        token.enableTrading();
        vm.prank(owner);
        vm.expectRevert();
        token.setPreLaunchAllowed(alice, true);
    }

    function testBurnFromFeesTracksCumulative() public {
        vm.prank(owner);
        token.enableTrading();
        vm.prank(treasury);
        token.transfer(alice, 100 ether);

        vm.startPrank(alice);
        token.burnFromFees(40 ether);
        token.burnFromFees(10 ether);
        vm.stopPrank();

        assertEq(token.burnedFromFees(), 50 ether);
        assertEq(token.totalSupply(), 1_000_000_000 ether - 50 ether);
    }

    function testFuzzTransfersConserveSupplyAfterLaunch(uint96 amount, address to) public {
        vm.assume(to != address(0) && to != treasury);
        amount = uint96(bound(uint256(amount), 0, uint256(token.balanceOf(treasury))));
        vm.prank(owner);
        token.enableTrading();
        uint256 supplyBefore = token.totalSupply();
        vm.prank(treasury);
        token.transfer(to, amount);
        assertEq(token.totalSupply(), supplyBefore);
    }
}
