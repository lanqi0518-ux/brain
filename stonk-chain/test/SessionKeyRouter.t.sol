// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {SessionKeyRouter} from "../contracts/session/SessionKeyRouter.sol";

contract Callee {
    uint256 public last;

    function ping(uint256 x) external payable returns (uint256) {
        last = x;
        return x;
    }
}

contract SessionKeyRouterTest is Test {
    SessionKeyRouter router;
    Callee callee;
    address user = address(0xA11CE);
    address agent = address(0xBEEF);

    function setUp() public {
        router = new SessionKeyRouter();
        callee = new Callee();
        vm.deal(user, 10 ether);
        vm.deal(agent, 10 ether);
    }

    function _authorise(uint128 budget, uint128 dailyCount, uint64 duration) internal {
        address[] memory targets = new address[](1);
        bytes4[] memory sels = new bytes4[](1);
        uint128[] memory counts = new uint128[](1);
        targets[0] = address(callee);
        sels[0] = Callee.ping.selector;
        counts[0] = dailyCount;
        vm.prank(user);
        router.authoriseSession(agent, uint64(block.timestamp) + duration, budget, targets, sels, counts);
    }

    function testAuthorisedCallSucceeds() public {
        _authorise(1 ether, 5, 1 days);
        vm.prank(agent);
        router.executeAsAgent(user, address(callee), 0, abi.encodeCall(Callee.ping, (42)));
        assertEq(callee.last(), 42);
    }

    function testUnauthorisedSelectorReverts() public {
        _authorise(1 ether, 5, 1 days);
        vm.prank(agent);
        vm.expectRevert(SessionKeyRouter.NotAllowed.selector);
        router.executeAsAgent(user, address(callee), 0, abi.encodeWithSignature("noSuchFn()"));
    }

    function testExpiredSessionReverts() public {
        _authorise(1 ether, 5, 1 hours);
        vm.warp(block.timestamp + 2 hours);
        vm.prank(agent);
        vm.expectRevert(SessionKeyRouter.SessionExpired.selector);
        router.executeAsAgent(user, address(callee), 0, abi.encodeCall(Callee.ping, (1)));
    }

    function testRevokeKillsSession() public {
        _authorise(1 ether, 5, 1 days);
        vm.prank(user);
        router.revokeSession(agent);
        vm.prank(agent);
        vm.expectRevert(SessionKeyRouter.SessionInactive.selector);
        router.executeAsAgent(user, address(callee), 0, abi.encodeCall(Callee.ping, (1)));
    }

    function testDailyCountLimitEnforced() public {
        _authorise(0, 2, 1 days); // 2 calls per day
        vm.startPrank(agent);
        router.executeAsAgent(user, address(callee), 0, abi.encodeCall(Callee.ping, (1)));
        router.executeAsAgent(user, address(callee), 0, abi.encodeCall(Callee.ping, (2)));
        vm.expectRevert(SessionKeyRouter.CountExceeded.selector);
        router.executeAsAgent(user, address(callee), 0, abi.encodeCall(Callee.ping, (3)));
        vm.stopPrank();
    }

    function testDailyCountResetsAcrossDay() public {
        _authorise(0, 1, 7 days);
        vm.startPrank(agent);
        router.executeAsAgent(user, address(callee), 0, abi.encodeCall(Callee.ping, (1)));
        vm.warp(block.timestamp + 1 days);
        router.executeAsAgent(user, address(callee), 0, abi.encodeCall(Callee.ping, (2)));
        vm.stopPrank();
        assertEq(callee.last(), 2);
    }

    function testBudgetLimitEnforced() public {
        _authorise(0.5 ether, 0, 1 days);
        vm.deal(agent, 1 ether);
        vm.prank(agent);
        router.executeAsAgent{value: 0.4 ether}(user, address(callee), 0.4 ether, abi.encodeCall(Callee.ping, (1)));
        vm.prank(agent);
        vm.expectRevert(SessionKeyRouter.BudgetExceeded.selector);
        router.executeAsAgent{value: 0.2 ether}(user, address(callee), 0.2 ether, abi.encodeCall(Callee.ping, (2)));
    }

    function testExpiryTooLongReverts() public {
        address[] memory t = new address[](1);
        bytes4[] memory s = new bytes4[](1);
        uint128[] memory c = new uint128[](1);
        t[0] = address(callee);
        s[0] = Callee.ping.selector;
        vm.prank(user);
        vm.expectRevert("expiry-too-long");
        router.authoriseSession(agent, uint64(block.timestamp) + 91 days, 0, t, s, c);
    }
}
