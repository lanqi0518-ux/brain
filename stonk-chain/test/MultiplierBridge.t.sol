// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {MultiplierBridge, IL2ToL3Messenger} from "../contracts/bridge/MultiplierBridge.sol";
import {MockStockToken} from "../contracts/mocks/MockStockToken.sol";

contract MockMessenger is IL2ToL3Messenger {
    event Sent(address to, uint256 gas, bytes data);

    function sendMessage(address to, uint256 gasLimit, bytes calldata data) external payable returns (uint256) {
        emit Sent(to, gasLimit, data);
        return uint256(keccak256(data));
    }
}

contract MultiplierBridgeTest is Test {
    MultiplierBridge bridge;
    MockMessenger msgr;
    MockStockToken stock;
    address admin = address(this);
    address peer = address(0xBEEF);
    address user = address(0xA11CE);
    address keeper = address(0xBABE);

    function setUp() public {
        msgr = new MockMessenger();
        bridge = new MultiplierBridge(admin, msgr);
        bridge.setPeerBridge(peer);
        bridge.setKeeper(keeper, true);
        stock = new MockStockToken("NVDA", "NVDA");
        bridge.registerStock(address(stock), address(0xDEAD));
        stock.mint(user, 1_000e18);
    }

    function testDepositLocksAndEmits() public {
        vm.prank(user);
        stock.approve(address(bridge), 100e18);
        vm.prank(user);
        bridge.deposit(address(stock), 100e18, user);
        assertEq(stock.balanceOf(address(bridge)), 100e18);
        (, uint256 escrowed,,) = bridge.stocks(address(stock));
        assertEq(escrowed, 100e18);
    }

    function testKeeperOnlySync() public {
        stock.applyDividend(500);
        vm.expectRevert(MultiplierBridge.OnlyKeeper.selector);
        bridge.syncMultiplier(address(stock));
    }

    function testSyncMultiplierBroadcasts() public {
        stock.applyDividend(500); // +5%
        vm.prank(keeper);
        bridge.syncMultiplier(address(stock));
        (,, uint256 lastSynced,) = bridge.stocks(address(stock));
        assertEq(lastSynced, 1.05e18);
    }

    function testSyncNoOpWhenUnchanged() public {
        vm.prank(keeper);
        // No dividend yet, multiplier still 1e18 == last synced. Should
        // return early without a revert.
        bridge.syncMultiplier(address(stock));
    }

    function testReceiveWithdrawStagesAndClaimsAfterDelay() public {
        // Seed escrow so the release has funds to pay from.
        vm.prank(user);
        stock.approve(address(bridge), 100e18);
        vm.prank(user);
        bridge.deposit(address(stock), 100e18, user);

        bytes32 msgId = keccak256("m1");
        vm.prank(peer);
        bridge.receiveWithdraw(msgId, user, address(stock), 100e18, 1e18);

        // Before delay elapses, claim reverts.
        vm.expectRevert(MultiplierBridge.NotClaimable.selector);
        bridge.claimWithdraw(msgId, address(stock));

        // Fast-forward past withdraw delay.
        vm.warp(block.timestamp + 1 hours);

        // Apply a dividend during transit. ERC-8056 raw balances stay flat
        // — only the multiplier grows — so the payout is exactly what was
        // escrowed. The user's raw tokens are simply worth more UI-adjusted
        // shares now that the multiplier is higher.
        stock.applyDividend(500); // +5%

        uint256 balBefore = stock.balanceOf(user);
        bridge.claimWithdraw(msgId, address(stock));
        assertEq(stock.balanceOf(user) - balBefore, 100e18);
    }

    function testAlreadyRegisteredReverts() public {
        vm.expectRevert(MultiplierBridge.AlreadyRegistered.selector);
        bridge.registerStock(address(stock), address(0xDEAD));
    }
}
