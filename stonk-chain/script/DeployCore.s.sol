// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {MultiplierAwareHook} from "../contracts/swap/MultiplierAwareHook.sol";
import {MultiplierAwareOracle} from "../contracts/lend/MultiplierAwareOracle.sol";
import {MultiplierBridge, IL2ToL3Messenger} from "../contracts/bridge/MultiplierBridge.sol";
import {SessionKeyRouter} from "../contracts/session/SessionKeyRouter.sol";
import {PortfolioMarginRouter} from "../contracts/margin/PortfolioMarginRouter.sol";
import {StonkToken} from "../contracts/token/StonkToken.sol";
import {StonkPoints} from "../contracts/points/StonkPoints.sol";
import {UsdgPaymaster} from "../contracts/paymaster/UsdgPaymaster.sol";
import {LighterAdapter} from "../contracts/perp/LighterAdapter.sol";
import {ILighter} from "../contracts/interfaces/ILighter.sol";
import {IMorphoBlue} from "../contracts/interfaces/IMorphoBlue.sol";

/// @notice One-shot deployment for the StockChain awareness layer. Same
///         script works on:
///           - Arbitrum Sepolia         (default, real Uniswap V4 / Morpho)
///           - Robinhood Chain Sepolia  (when the RH devnet exposes v4)
///           - Robinhood Chain mainnet  (production target)
///           - Any Arbitrum Orbit chain (Caldera devnet, custom L3)
///
///         Every external address is read from the environment. Missing
///         addresses default to `address(0)` so partial deployments (e.g.
///         "token + points only, no perp") still succeed.
///
/// Usage:
///   forge script script/DeployCore.s.sol \
///     --rpc-url $ARB_SEPOLIA_RPC \
///     --private-key $DEPLOYER_PK \
///     --broadcast --verify
///
///     ARB_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
///     STONK_ADMIN=<safe multisig or EOA>
///     UNISWAP_V4_POOL_MANAGER=0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317   # Arb Sepolia v4
///     MORPHO_BLUE=0x0000000000000000000000000000000000000000              # not yet on Arb Sepolia; set when live
///     LIGHTER=0x0000000000000000000000000000000000000000                  # not yet on Arb Sepolia
///     CROSS_CHAIN_MESSENGER=0x0000000000000000000000000000000000000000    # bridge stubbed by admin keeper for now
///     USDG=<mock ERC-20 on testnet | canonical USDG on mainnet>
///     ENTRYPOINT_4337=0x0000000071727De22E5E9d8BAf0edAc6f37da032           # canonical v0.7 EntryPoint
contract DeployCore is Script {
    struct Addresses {
        address stonkToken;
        address points;
        address hook;
        address bridge;
        address session;
        address margin;
        address adapter;
        address paymaster;
    }

    function run() external returns (Addresses memory out) {
        address admin = vm.envAddress("STONK_ADMIN");
        address poolManager = _envOr("UNISWAP_V4_POOL_MANAGER", address(0));
        address lighter = _envOr("LIGHTER", address(0));
        address morpho = _envOr("MORPHO_BLUE", address(0));
        address messenger = _envOr("CROSS_CHAIN_MESSENGER", address(0));
        address usdg = _envOr("USDG", address(0));
        address entryPoint = _envOr("ENTRYPOINT_4337", 0x0000000071727De22E5E9d8BAf0edAc6f37da032);

        vm.startBroadcast();

        StonkToken token = new StonkToken(admin);
        out.stonkToken = address(token);
        console2.log("StonkToken            ", address(token));

        StonkPoints points = new StonkPoints(admin);
        out.points = address(points);
        console2.log("StonkPoints           ", address(points));

        SessionKeyRouter session = new SessionKeyRouter();
        out.session = address(session);
        console2.log("SessionKeyRouter      ", address(session));

        MultiplierBridge bridge = new MultiplierBridge(admin, IL2ToL3Messenger(messenger));
        out.bridge = address(bridge);
        console2.log("MultiplierBridge      ", address(bridge));

        if (poolManager != address(0)) {
            MultiplierAwareHook hook = new MultiplierAwareHook(poolManager);
            out.hook = address(hook);
            console2.log("MultiplierAwareHook   ", address(hook));
        } else {
            console2.log("SKIP MultiplierAwareHook (UNISWAP_V4_POOL_MANAGER unset)");
        }

        if (lighter != address(0) && morpho != address(0)) {
            PortfolioMarginRouter margin = new PortfolioMarginRouter(ILighter(lighter), IMorphoBlue(morpho));
            out.margin = address(margin);
            console2.log("PortfolioMarginRouter ", address(margin));
        } else {
            console2.log("SKIP PortfolioMarginRouter (LIGHTER or MORPHO_BLUE unset)");
        }

        if (lighter != address(0) && usdg != address(0)) {
            LighterAdapter adapter = new LighterAdapter(lighter, usdg, admin);
            out.adapter = address(adapter);
            console2.log("LighterAdapter        ", address(adapter));
        } else {
            console2.log("SKIP LighterAdapter (LIGHTER or USDG unset)");
        }

        if (usdg != address(0)) {
            UsdgPaymaster pm = new UsdgPaymaster(entryPoint, usdg, admin, 200);
            out.paymaster = address(pm);
            console2.log("UsdgPaymaster         ", address(pm));
        } else {
            console2.log("SKIP UsdgPaymaster (USDG unset)");
        }

        console2.log("---");
        console2.log("Next: deploy per-stock MultiplierAwareOracle instances alongside each Morpho market.");
        console2.log("      Set stockToken / feedId / priceSource per stock, keep dsAlreadyScaled=true.");

        vm.stopBroadcast();
    }

    function _envOr(string memory key, address fallback_) internal view returns (address) {
        try vm.envAddress(key) returns (address v) {
            return v;
        } catch {
            return fallback_;
        }
    }
}
