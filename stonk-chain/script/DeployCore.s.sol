// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {MultiplierAwareHook} from "../contracts/swap/MultiplierAwareHook.sol";
import {MultiplierAwareOracle} from "../contracts/lend/MultiplierAwareOracle.sol";
import {MultiplierBridge, IL2ToL3Messenger} from "../contracts/bridge/MultiplierBridge.sol";
import {SessionKeyRouter} from "../contracts/session/SessionKeyRouter.sol";
import {PortfolioMarginRouter} from "../contracts/margin/PortfolioMarginRouter.sol";
import {ILighter} from "../contracts/interfaces/ILighter.sol";
import {IMorphoBlue} from "../contracts/interfaces/IMorphoBlue.sol";
import {IChainlinkDataStream} from "../contracts/interfaces/IChainlinkDataStream.sol";

/// @notice One-shot deployment for the five STONK core contracts. Runs on
///         any Arbitrum-Orbit-compatible chain; addresses of Lighter, Morpho,
///         the Uniswap V4 PoolManager, and the messenger are read from
///         environment variables so the same script works on Robinhood Chain
///         mainnet, Robinhood Chain Sepolia, and a Caldera devnet.
///
/// Usage:
///   forge script script/DeployCore.s.sol \
///     --rpc-url $ROBINHOOD_CHAIN_RPC \
///     --broadcast --verify
contract DeployCore is Script {
    function run() external {
        address admin = vm.envAddress("STONK_ADMIN");
        address poolManager = vm.envAddress("UNISWAP_V4_POOL_MANAGER");
        address lighter = vm.envAddress("LIGHTER");
        address morpho = vm.envAddress("MORPHO_BLUE");
        address messenger = vm.envAddress("CROSS_CHAIN_MESSENGER");

        vm.startBroadcast();

        MultiplierAwareHook hook = new MultiplierAwareHook(poolManager);
        console2.log("MultiplierAwareHook", address(hook));

        SessionKeyRouter session = new SessionKeyRouter();
        console2.log("SessionKeyRouter", address(session));

        PortfolioMarginRouter margin = new PortfolioMarginRouter(ILighter(lighter), IMorphoBlue(morpho));
        console2.log("PortfolioMarginRouter", address(margin));

        MultiplierBridge bridge = new MultiplierBridge(admin, IL2ToL3Messenger(messenger));
        console2.log("MultiplierBridge", address(bridge));

        // Oracles are per-market — they get deployed alongside each Morpho
        // market registration, not once globally. Emit the deployment
        // command for the operator to run per stock.
        console2.log("---");
        console2.log("Next: deploy per-stock MultiplierAwareOracle instances.");
        console2.log("Set _stockToken, _feedId, _priceSource, and dsAlreadyScaled=true");
        console2.log("when using Chainlink Data Streams on Robinhood Chain.");

        vm.stopBroadcast();
    }
}
