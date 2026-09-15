// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Minimal shape of the Uniswap V4 hook + PoolManager surface we need,
// hand-copied to avoid pulling the full v4-core dependency into MVP
// compilation. Real deployment swaps this for the canonical imports
// via the remapping @uniswap/v4-core.
library PoolKeyLib {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee; // dynamic if flag bit set
        int24 tickSpacing;
        address hooks;
    }
}

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}

struct ModifyLiquidityParams {
    int24 tickLower;
    int24 tickUpper;
    int256 liquidityDelta;
    bytes32 salt;
}

/// @notice BalanceDelta and BeforeSwapDelta are packed int128 pairs in the
///         real Uniswap V4. For our hook we only need to construct zero
///         deltas; production replacements come from `@uniswap/v4-core`.
type BalanceDelta is int256;

type BeforeSwapDelta is int256;

BeforeSwapDelta constant ZERO_BEFORE_SWAP_DELTA = BeforeSwapDelta.wrap(0);

/// @notice Subset of `IHooks` sufficient for MVP behaviour. Real deployment
///         imports the canonical interface, keeping our selectors compatible.
interface IUniswapV4Hook {
    function beforeSwap(address sender, PoolKeyLib.PoolKey calldata key, SwapParams calldata params, bytes calldata data)
        external
        returns (bytes4, BeforeSwapDelta, uint24);

    function afterSwap(
        address sender,
        PoolKeyLib.PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata data
    ) external returns (bytes4, int128);

    function beforeAddLiquidity(
        address sender,
        PoolKeyLib.PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata data
    ) external returns (bytes4);

    function beforeRemoveLiquidity(
        address sender,
        PoolKeyLib.PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata data
    ) external returns (bytes4);
}
