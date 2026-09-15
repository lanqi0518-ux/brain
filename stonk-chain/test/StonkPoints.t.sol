// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {StonkPoints} from "../contracts/points/StonkPoints.sol";

contract StonkPointsTest is Test {
    StonkPoints points;
    address admin = address(0xA11CE);
    address awarder = address(0xBEEF);
    address alice = address(0xA);
    address bob = address(0xB);

    bytes32 constant REASON_LP = keccak256("LP_STONK_HOOK");
    bytes32 constant REASON_LEND = keccak256("LEND_STONK");

    function setUp() public {
        points = new StonkPoints(admin);
        bytes32 role = points.AWARDER_ROLE();
        vm.prank(admin);
        points.grantRole(role, awarder);
    }

    function testAwardIncrementsBalancesAndAggregates() public {
        vm.prank(awarder);
        points.award(alice, REASON_LP, 100);
        vm.prank(awarder);
        points.award(alice, REASON_LEND, 50);
        vm.prank(awarder);
        points.award(bob, REASON_LP, 25);

        assertEq(points.balance(alice, REASON_LP), 100);
        assertEq(points.balance(alice, REASON_LEND), 50);
        assertEq(points.totalOf(alice), 150);
        assertEq(points.totalByReason(REASON_LP), 125);
        assertEq(points.totalSupply(), 175);
    }

    function testOnlyAwarderCanAward() public {
        vm.expectRevert();
        points.award(alice, REASON_LP, 1);
    }

    function testSlashClamps() public {
        vm.prank(awarder);
        points.award(alice, REASON_LP, 100);

        vm.prank(admin);
        points.slash(alice, REASON_LP, 1000, "wash");

        assertEq(points.balance(alice, REASON_LP), 0);
        assertEq(points.totalOf(alice), 0);
        assertEq(points.totalSupply(), 0);
    }

    function testSnapshotFreezesLedger() public {
        vm.prank(awarder);
        points.award(alice, REASON_LP, 100);
        vm.prank(admin);
        points.takeSnapshot();

        vm.prank(awarder);
        vm.expectRevert(StonkPoints.SnapshotTaken_.selector);
        points.award(alice, REASON_LP, 1);

        vm.prank(admin);
        vm.expectRevert(StonkPoints.SnapshotTaken_.selector);
        points.takeSnapshot();
    }

    function testFuzzAggregateInvariant(address[10] calldata users, uint128[10] calldata amounts) public {
        uint256 sum = 0;
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == address(0)) continue;
            vm.prank(awarder);
            points.award(users[i], REASON_LP, amounts[i]);
            sum += amounts[i];
        }
        assertEq(points.totalSupply(), sum);
        assertEq(points.totalByReason(REASON_LP), sum);
    }
}
