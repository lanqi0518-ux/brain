# Architecture

> **Two deployments, one codebase. The awareness layer runs on Robinhood Chain L2 today; the same code lifts to an Orbit L3 tomorrow.**

---

## System diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                     Users, wallets, and AI agents                      │
│                                                                        │
└──┬─────────────────────┬──────────────────────┬──────────────────────┬─┘
   │                     │                      │                      │
   ▼                     ▼                      ▼                      ▼
Trading UI          Lending UI           Bridge UI              Agent host
   │                     │                      │                      │
   ▼                     ▼                      ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    STONK awareness layer (5 contracts)                 │
│                                                                        │
│  MultiplierAwareHook          MultiplierAwareOracle                     │
│    ↳ Uniswap V4 hook             ↳ Morpho Blue curator                  │
│                                                                        │
│  PortfolioMarginRouter        SessionKeyRouter                          │
│    ↳ cross-protocol margin       ↳ AI agent authorisation               │
│                                                                        │
│                    MultiplierBridge (L2 ↔ L3)                            │
│                                                                        │
└──┬─────────────────────┬──────────────────────┬──────────────────────┬─┘
   │                     │                      │                      │
   ▼                     ▼                      ▼                      ▼
Uniswap V4          Morpho Blue           Chainlink DS           Lighter perps
Uniswap V3          Spark                 Metric fallback        Arcus (backup)
1inch / KyberSwap   Steakhouse            Pyth (backup)          Deribit (option)
0x RFQ, Rialto      (curators)                                                  
   │                     │                      │                      │
   └─────────────────────┴──────────────────────┴──────────────────────┘
                                    │
                                    ▼
                        Robinhood Chain (L2, Orbit)
                                    │
                                    ▼
                            Ethereum L1 (settlement)
```

Everything above the awareness-layer band is user-facing surface (UI, agents). Everything below is Robinhood Chain's live ecosystem. STONK Chain lives in the middle band and only in the middle band.

---

## Contract dependency graph

```
                            ┌──────────────────────┐
                            │  IScaledUIAmount     │
                            │  (ERC-8056, external) │
                            └──────────┬────────────┘
                                       │
                            ┌──────────▼────────────┐
                            │  MultiplierMath       │
                            │  (library)            │
                            └──────────┬────────────┘
             ┌──────────────┬──────────┼───────────┬──────────────┐
             │              │          │           │              │
   ┌─────────▼─────┐ ┌──────▼──┐ ┌─────▼──────┐ ┌──▼───────┐ ┌────▼────────┐
   │Multiplier     │ │Multiplier│ │Multiplier   │ │Portfolio │ │SessionKey   │
   │AwareHook      │ │AwareOracle│ │Bridge      │ │Margin   │ │Router       │
   │(Uniswap V4)   │ │(Morpho)   │ │            │ │Router   │ │             │
   └───────┬───────┘ └────┬──────┘ └─────┬──────┘ └────┬─────┘ └─────┬───────┘
           │              │              │             │             │
           ▼              ▼              ▼             ▼             ▼
       MarketHours    Chainlink       IL2ToL3       ILighter     (standalone)
       (library)      DataStream      Messenger     IMorphoBlue
```

No cyclic dependencies. Every arrow is a read; no arrow is a `delegatecall`.

---

## Deployment topology

### Robinhood Chain L2 (immediate)

Every contract is deployable *today* against live Robinhood Chain addresses. The `DeployCore.s.sol` script reads target addresses from environment variables:

| Var                      | Live target (once mapped)                                  |
|--------------------------|-------------------------------------------------------------|
| `UNISWAP_V4_POOL_MANAGER`| Uniswap V4 canonical PoolManager on Robinhood Chain         |
| `LIGHTER`                | Lighter deposit / margin router                             |
| `MORPHO_BLUE`            | Morpho Blue singleton                                        |
| `CROSS_CHAIN_MESSENGER`  | Arbitrum retryable messenger; on L2 alone it is a no-op stub|
| `STONK_ADMIN`            | Safe multisig, 3/5 initial                                  |

Per-stock oracles are deployed on demand, one per Morpho market.

### STONK L3 (post-funding)

Same contracts, plus five stock-native precompiles at reserved addresses. The precompile addresses are non-negotiable in the sense that every contract in the awareness layer resolves oracle and market-hours calls through the same addresses on both deployments — the L2 build routes them to a Chainlink adapter, the L3 build routes them to the precompile.

| Address | Precompile         | Rust source path (planned)     | Function                                                       |
|---------|---------------------|--------------------------------|----------------------------------------------------------------|
| `0x100` | `StockPrice`        | `precompile/stock_price.rs`     | Direct Data Streams read, ~0 gas                               |
| `0x101` | `MarketHours`       | `precompile/market_hours.rs`    | Consensus-level state machine, DST- and halt-aware              |
| `0x102` | `OrderMatch`        | `precompile/order_match.rs`     | On-chain order book matching (opt-in for perp/spot venues)     |
| `0x103` | `SessionKey`        | `precompile/session_key.rs`     | AA-native session validation (works alongside `SessionKeyRouter`)|
| `0x104` | `CorpAction`        | `precompile/corp_action.rs`     | Snapshot ex-dividend, split, redemption, rights events         |

The Rust code is not yet in this repository. It will be added as `precompiles/` once the L3 devnet decision is greenlit; each precompile is small enough (< 500 lines) that a full audit is achievable within a $50 000 budget once combined.

---

## Chain-of-trust for corporate actions

The most delicate flow is *how* a corporate action becomes an on-chain fact. The current design routes through three cooperating parties:

1. **Robinhood Corporate Actions API** publishes events (dividend, split, spinoff, redemption) with precise `effectiveAt` timestamps.
2. **Chainlink Data Streams** publishes signed price reports that already embed `uiMultiplier`.
3. **STONK keepers** watch the stock token's `UIMultiplierUpdated` on-chain event and race to broadcast via `MultiplierBridge.syncMultiplier` and `MultiplierAwareHook._checkpoint`.

On the L2 deployment the third party (STONK keepers) is us. On the L3 deployment the third party is the CorpAction precompile itself — the state transition happens at consensus.

The design intent is that the trust minimisation improves as the deployment moves down the stack: L2 with a multisig-controlled keeper → L2 with a permissionless keeper race → L3 with a consensus precompile. Users transacting on either stage can verify the trust profile from the `pendingRebalance` view.

---

## Gas & fee accounting (target economics)

The awareness layer intentionally takes **no fee** on its two most-used entry points:

- `MultiplierAwareHook.beforeSwap` — dynamic fee is *the pool's own fee*, only widened by hours. STONK collects zero.
- `MultiplierAwareOracle.price()` — pure `view`, no cost.

Revenue instead comes from three points where our value-add is unambiguous:

- **`MultiplierAwareHook.dividendPot` sweeps** — 5 % of accrued dividend accrues to a `FeeDistributor`. LPs keep 95 %.
- **`PortfolioMarginRouter` fee routing** — the router registers as a Lighter integrator via `approveAndRouteFees`, collecting an agreed fraction (target 10 %) of routed perp fees.
- **`MultiplierBridge` withdraw handling** — 1 bp of bridge-in and 1 bp of bridge-out, paid in USDG.

Every one of these fee streams flows into a single `FeeDistributor` contract (see `contracts/token/FeeDistributor.sol`, planned) with a simple 60 / 30 / 10 split: 60 % buy-and-burn STONK, 30 % reserved for audits & security bounties, 10 % team.

The design principle: **never charge for reads, always charge where we actually saved a user money.**
