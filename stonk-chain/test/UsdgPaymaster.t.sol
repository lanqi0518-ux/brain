// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {UsdgPaymaster} from "../contracts/paymaster/UsdgPaymaster.sol";
import {PackedUserOperation, IEntryPoint, IPaymaster} from "../contracts/interfaces/IEntryPoint.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";

/// @notice Minimal EntryPoint stand-in that captures deposits and lets
///         the paymaster hooks be invoked from the address configured
///         as the canonical EntryPoint. We do not simulate a real
///         bundler here; that is exercised in E2E on Arb Sepolia.
contract MockEntryPoint {
    mapping(address => uint256) public deposits;

    function depositTo(address account) external payable {
        deposits[account] += msg.value;
    }

    function withdrawTo(address payable to, uint256 amount) external {
        deposits[msg.sender] -= amount;
        (bool ok,) = to.call{value: amount}("");
        require(ok, "withdraw");
    }

    function balanceOf(address account) external view returns (uint256) {
        return deposits[account];
    }

    function addStake(uint32) external payable {}
    function unlockStake() external {}
    function withdrawStake(address payable) external {}
}

contract UsdgPaymasterTest is Test {
    MockEntryPoint ep;
    MockERC20 usdg;
    UsdgPaymaster pm;
    address owner = address(0xA11CE);
    address keeper = address(0xBEEF);
    address feeSink = address(0xFEE);
    address user = address(0xDEAD);

    function setUp() public {
        ep = new MockEntryPoint();
        usdg = new MockERC20("USDG", "USDG", 6);
        vm.prank(owner);
        pm = new UsdgPaymaster(address(ep), address(usdg), feeSink, 200); // 2% markup

        vm.prank(owner);
        pm.setPriceKeeper(keeper);

        // 1 ETH = 3000 USDG (with USDG at 6 decimals)
        // rate = usdg_per_native_wei * 1e18; if 1e18 wei == 3000e6 USDG
        // → rate = 3000e6 * 1e18 / 1e18 = 3000e6
        vm.prank(keeper);
        pm.updateRate(3000e6);

        usdg.mint(user, 1_000e6);
        vm.prank(user);
        usdg.approve(address(pm), type(uint256).max);
    }

    function testValidateReturnsSuccessWhenFunded() public {
        PackedUserOperation memory op = _op(user);
        vm.prank(address(ep));
        (bytes memory ctx, uint256 valData) = pm.validatePaymasterUserOp(op, bytes32(0), 0.001 ether);
        assertEq(valData, 0);
        assertEq(abi.decode(ctx, (address)), user);
    }

    function testValidateReturnsFailureWhenUnfunded() public {
        address broke = address(0xB07);
        PackedUserOperation memory op = _op(broke);
        vm.prank(address(ep));
        (, uint256 valData) = pm.validatePaymasterUserOp(op, bytes32(0), 0.001 ether);
        assertEq(valData, 1);
    }

    function testValidateRevertsOnStaleRate() public {
        vm.warp(block.timestamp + 1 hours);
        PackedUserOperation memory op = _op(user);
        vm.prank(address(ep));
        vm.expectRevert(UsdgPaymaster.StaleRate.selector);
        pm.validatePaymasterUserOp(op, bytes32(0), 0.001 ether);
    }

    function testPostOpChargesUserAndForwardsMarkup() public {
        uint256 actualGas = 0.0005 ether; // 5e14 wei

        // usdgCharge = 5e14 * 3000e6 / 1e18 = 1_500_000_000e-6 = 1.5 USDG raw base
        // = 1_500_000 (6 dec). +2% markup = 1_530_000. Markup portion = 30_000.
        uint256 balBefore = usdg.balanceOf(user);
        vm.prank(address(ep));
        pm.postOp(IPaymaster.PostOpMode.opSucceeded, abi.encode(user), actualGas, 0);

        uint256 balAfter = usdg.balanceOf(user);
        assertEq(balBefore - balAfter, 1_530_000);
        assertEq(usdg.balanceOf(feeSink), 30_000);
        assertEq(usdg.balanceOf(address(pm)), 1_500_000);
    }

    function testOnlyEntryPointCanValidate() public {
        PackedUserOperation memory op = _op(user);
        vm.expectRevert(UsdgPaymaster.NotEntryPoint.selector);
        pm.validatePaymasterUserOp(op, bytes32(0), 0.001 ether);
    }

    function testMarkupCappedAt5000() public {
        vm.prank(owner);
        vm.expectRevert(UsdgPaymaster.MarkupTooHigh.selector);
        pm.setMarkup(5001);
    }

    function _op(address sender) internal pure returns (PackedUserOperation memory op) {
        op.sender = sender;
        op.nonce = 0;
        op.initCode = "";
        op.callData = "";
        op.accountGasLimits = bytes32(0);
        op.preVerificationGas = 21000;
        op.gasFees = bytes32(0);
        op.paymasterAndData = "";
        op.signature = "";
    }
}
