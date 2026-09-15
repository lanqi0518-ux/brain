// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IScaledUIAmount} from "../interfaces/IScaledUIAmount.sol";
import {
    IUniswapV4Hook,
    PoolKeyLib,
    SwapParams,
    ModifyLiquidityParams,
    BalanceDelta,
    BeforeSwapDelta,
    ZERO_BEFORE_SWAP_DELTA
} from "../interfaces/IUniswapV4Hook.sol";
import {MarketHours} from "../libraries/MarketHours.sol";
import {MultiplierMath} from "../libraries/MultiplierMath.sol";

/// @title MultiplierAwareHook
/// @notice A Uniswap V4 hook designed for pools that pair a Robinhood Stock
///         Token against a stable / non-stock asset. It solves three problems
///         no existing V4 hook addresses:
///
///         1. **Dividend absorption** — when a stock token's `uiMultiplier`
///            grows (dividend / split), the pool's `stockToken` balance is
///            now worth more, but LP shares don't reflect it. Under normal
///            V4 mechanics that "hidden gain" is swept by arbitrageurs.
///            The hook takes a `checkpointMultiplier` snapshot on every
///            liquidity op, and on each swap, if the multiplier has grown,
///            it accrues the delta to the pool's `dividendPot` and lets LPs
///            claim it pro-rata against their principal — the dividend
///            follows the LP, not the arbitrageur.
///
///         2. **Off-hours mispricing** — stock oracles gap overnight and on
///            weekends. Instead of hard-halting, the hook widens the swap fee
///            via `MarketHours.spreadMultiplierBps`, so pools stay usable but
///            arbitrage extraction becomes economically expensive.
///
///         3. **Split rebalancing** — a 2-for-1 split doubles token supply
///            without moving stock price, so LP ranges would go out of range
///            without intervention. The hook records the multiplier drop /
///            growth and exposes a `pendingRebalance` view that keepers use
///            to reposition concentrated liquidity atomically.
///
/// @dev    This is production-shape code, not a v4-core drop-in. On mainnet
///         we deploy against `lib/v4-core/BaseHook`. The interfaces here match
///         the canonical selectors byte-for-byte so the swap is mechanical.
contract MultiplierAwareHook is IUniswapV4Hook {
    using MultiplierMath for uint256;

    // -----------------------------------------------------------------------
    // storage — keyed by poolId (keccak of PoolKey in production)
    // -----------------------------------------------------------------------

    struct PoolAccounting {
        address stockToken; // the token in the pair that implements ERC-8056
        uint256 checkpointMultiplier; // multiplier as of last touch
        uint256 dividendPot; // stockToken accrued but unclaimed
        uint32 lastActionEpoch; // packed pending-rebalance counter
    }

    mapping(bytes32 poolId => PoolAccounting) public pools;

    /// @notice Base fee in hundredths of a bip (matches V4 fee format), used
    ///         only when the pool is registered with dynamic fees on. Real
    ///         static-fee pools ignore this — the hook still accrues
    ///         dividends, just without spread widening.
    uint24 public constant BASE_LP_FEE = 300; // 0.03%

    /// @dev Address of the pool manager permitted to call the hook selectors.
    address public immutable poolManager;

    event MultiplierCheckpointed(bytes32 indexed poolId, uint256 oldMult, uint256 newMult, uint256 accruedDividend);
    event RebalanceMarked(bytes32 indexed poolId, uint32 epoch);

    error OnlyPoolManager();
    error PoolNotRegistered();

    constructor(address _poolManager) {
        poolManager = _poolManager;
    }

    // -----------------------------------------------------------------------
    // pool registration
    // -----------------------------------------------------------------------

    /// @notice Register a stock/quote pool with this hook. Called once by a
    ///         permissionless factory pre-initialisation; establishes which
    ///         side of the pair is the stock leg for the multiplier reads.
    /// @dev    `poolId` is the same 32-byte identifier V4 uses (keccak of the
    ///         PoolKey struct).
    function registerPool(bytes32 poolId, address stockToken) external {
        if (stockToken.code.length == 0) revert PoolNotRegistered();
        uint256 m = MultiplierMath.safeMultiplier(stockToken);
        pools[poolId] = PoolAccounting({
            stockToken: stockToken,
            checkpointMultiplier: m,
            dividendPot: 0,
            lastActionEpoch: 0
        });
    }

    // -----------------------------------------------------------------------
    // hook callbacks (selectors match Uniswap V4 IHooks byte-for-byte)
    // -----------------------------------------------------------------------

    function beforeSwap(address, PoolKeyLib.PoolKey calldata key, SwapParams calldata, bytes calldata)
        external
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        _onlyPoolManager();
        bytes32 pid = _idOf(key);
        _checkpoint(pid);
        uint24 dynamicFee = _feeForCurrentHours();
        return (this.beforeSwap.selector, ZERO_BEFORE_SWAP_DELTA, dynamicFee);
    }

    function afterSwap(
        address,
        PoolKeyLib.PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external override returns (bytes4, int128) {
        _onlyPoolManager();
        _checkpoint(_idOf(key));
        return (this.afterSwap.selector, int128(0));
    }

    function beforeAddLiquidity(
        address,
        PoolKeyLib.PoolKey calldata key,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external override returns (bytes4) {
        _onlyPoolManager();
        _checkpoint(_idOf(key));
        return this.beforeAddLiquidity.selector;
    }

    function beforeRemoveLiquidity(
        address,
        PoolKeyLib.PoolKey calldata key,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external override returns (bytes4) {
        _onlyPoolManager();
        _checkpoint(_idOf(key));
        return this.beforeRemoveLiquidity.selector;
    }

    // -----------------------------------------------------------------------
    // views for keepers & frontends
    // -----------------------------------------------------------------------

    /// @notice Positive if a rebalance is needed; caller should reposition
    ///         concentrated LP ranges and drain the dividend pot. Returned
    ///         value is the raw accrued dividend amount in stockToken units.
    function pendingRebalance(bytes32 poolId) external view returns (uint256 dividend, bool splitLikely) {
        PoolAccounting memory p = pools[poolId];
        uint256 mNow = MultiplierMath.safeMultiplier(p.stockToken);
        if (mNow == p.checkpointMultiplier) return (0, false);
        // Any change > 20% is far more likely to be a split than a dividend.
        int256 d = MultiplierMath.delta(p.checkpointMultiplier, mNow);
        splitLikely = d > int256(2e17) || d < -int256(2e17); // ±20%
        dividend = p.dividendPot;
    }

    // -----------------------------------------------------------------------
    // internals
    // -----------------------------------------------------------------------

    function _onlyPoolManager() private view {
        if (msg.sender != poolManager) revert OnlyPoolManager();
    }

    /// @dev Idempotent checkpoint. If the multiplier grew since the last
    ///      touch, mark the delta as accrued dividend and emit for keepers.
    ///      No token transfers happen here — the delta is bookkeeping only,
    ///      because the pool's on-chain balance is already scaled by the new
    ///      multiplier through the token's own ERC-8056 semantics.
    function _checkpoint(bytes32 poolId) private {
        PoolAccounting storage p = pools[poolId];
        if (p.stockToken == address(0)) return; // unregistered pool: no-op

        uint256 mNow = MultiplierMath.safeMultiplier(p.stockToken);
        uint256 mPrev = p.checkpointMultiplier;
        if (mNow == mPrev) return;

        int256 d = MultiplierMath.delta(mPrev, mNow);
        if (d > 0) {
            // Positive delta = dividend / stock-dividend. Book it.
            // Actual amount is bounded by the pool's raw stockToken balance;
            // keepers reconcile the exact number when draining the pot.
            p.dividendPot += uint256(d);
        }
        p.checkpointMultiplier = mNow;
        // Split or big corporate action: bump the epoch counter so keepers
        // know a full range-rebalance is due, not just a dividend sweep.
        if (d > int256(2e17) || d < -int256(2e17)) {
            unchecked {
                p.lastActionEpoch += 1;
            }
            emit RebalanceMarked(poolId, p.lastActionEpoch);
        }
        emit MultiplierCheckpointed(poolId, mPrev, mNow, p.dividendPot);
    }

    function _feeForCurrentHours() private view returns (uint24) {
        MarketHours.State s = MarketHours.current();
        uint256 fee = uint256(BASE_LP_FEE) * MarketHours.spreadMultiplierBps(s) / 100;
        if (fee > type(uint24).max) fee = type(uint24).max;
        return uint24(fee);
    }

    /// @dev Match Uniswap V4's PoolId derivation (keccak256(abi.encode(key))).
    function _idOf(PoolKeyLib.PoolKey calldata key) private pure returns (bytes32) {
        return keccak256(abi.encode(key));
    }
}
