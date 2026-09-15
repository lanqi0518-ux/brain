# Integration Map

> **What we plug into vs. what we build. The philosophy: don't fork Robinhood Chain, extend it.**

The five STONK contracts are designed to compose with the existing Robinhood Chain ecosystem, not compete with it. Each contract lists the venue it augments, the specific integration surface, and the exact value the contract adds that the venue does not provide today.

---

## Vertical: **Perpetuals**

| Slot                | Chosen provider                          | Why                                                                 |
|---------------------|-------------------------------------------|---------------------------------------------------------------------|
| Execution venue     | **Lighter** (ZK perp DEX)                 | Robinhood-official perp partner, live in Robinhood Wallet, $41 M TVL |
| Backup venue        | Arcus (dYdX × Robinhood)                  | Currently in waitlist; ready to route once live                     |
| Off-chain intents   | Lighter Rest API + WebSocket              | Signed-intent orderbook, low latency                                |
| Fee routing         | `Lighter.approveAndRouteFees(integrator)` | Native integrator fee mechanism, our revenue path                    |

**Our contribution:** `PortfolioMarginRouter` treats Lighter perp collateral as one leg of a unified portfolio (paired with Morpho collateral) and rebalances between them via a per-user session-key allowance.

---

## Vertical: **Spot & AMM**

| Slot          | Chosen provider     | Why                                                             |
|---------------|----------------------|-----------------------------------------------------------------|
| Primary AMM   | **Uniswap V4**       | Designated main AMM, $192 M TVL, native V4 hooks system         |
| Aggregation   | 1inch, KyberSwap, GMGN | Best-price routing across the venue set                       |
| RFQ           | 0x RFQ               | $953 K/day USDG↔MU volume already flowing                      |
| propAMM       | Rialto               | Internal-inventory market maker                                  |

**Our contribution:** `MultiplierAwareHook` is a Uniswap V4 hook that fixes the dividend-absorption bug (LP pools swallow the multiplier growth today) and widens spreads during off-hours. Registering a stock/quote pool with this hook is a single `initialize` call from any V4 factory.

---

## Vertical: **Lending & Yield**

| Slot                     | Chosen provider                     | Why                                                              |
|--------------------------|--------------------------------------|------------------------------------------------------------------|
| Base lending engine      | **Morpho Blue**                      | Largest protocol on Robinhood Chain, $447 M TVL, permissionless markets |
| Yield curation framework | Morpho Vault                         | Standardises `curator → market` allocation, industry-proven      |
| Comparable curators      | Steakhouse Financial ($438 M), Spark | Sets the bar for what a differentiated curator looks like        |
| Base rate strategy       | Robinhood Earn (Morpho + Spark)      | Official USDG yield product, ~7 % APY                            |

**Our contribution:** `MultiplierAwareOracle` is an `IMorphoOracle` implementation deployed once per stock-token/USDG market. It creates the *first dividend-aware Morpho markets* on Robinhood Chain, letting borrowers' health factors improve automatically as the collateral's `uiMultiplier` grows. We become a Morpho curator by concentrating liquidity into these markets.

---

## Vertical: **Stablecoin & Payments**

| Slot                | Chosen provider           | Why                                                       |
|---------------------|---------------------------|-----------------------------------------------------------|
| Settlement stable   | **USDG** (Paxos)          | Natively issued on Robinhood Chain, $869 M market cap     |
| Payment rails       | Global Dollar Network      | Bullish, Kraken, OKX, Mastercard, Robinhood, Worldpay     |
| Reserve yield       | Morpho / Spark            | USDG → spUSDG yield loop is Robinhood Earn's default      |
| Bridge form         | Arbitrum canonical bridge | Free, native to any Orbit deployment                       |

**Our contribution:** We do not issue a competing stablecoin. USDG is the default gas denomination (via `USDGPaymaster` — separate module, ships after MVP), and any idle USDG in our contracts is auto-routed to Robinhood Earn's Morpho vault for the ~7 % APY that already exists.

---

## Vertical: **Oracles**

| Slot                    | Chosen provider             | Why                                                             |
|-------------------------|------------------------------|-----------------------------------------------------------------|
| Primary stock feed      | **Chainlink Data Streams**   | Official Robinhood Chain oracle, includes multiplier scaling    |
| 24-hour price fallback  | Metric                       | Chainlink-based, 24 h coverage for off-hours reads              |
| Cross-check             | Pyth (Free tier)             | For pre-mainnet testing when Data Streams access is gated       |

**Our contribution:** `MultiplierAwareOracle` normalises across the three via the `dsAlreadyScaled` flag, giving downstream Morpho markets a single, halt-aware, staleness-guarded oracle surface no matter which feed is underneath.

---

## Vertical: **Account Abstraction & Session Keys**

| Slot                | Chosen provider      | Why                                                             |
|---------------------|-----------------------|-----------------------------------------------------------------|
| Smart-account kernel| ZeroDev, Pimlico     | Both live on Robinhood Chain, ERC-4337 v0.7 compatible          |
| AA custody          | Passkeys via ZeroDev | Face ID / Touch ID biometrics, no seed phrases                  |
| Paymaster           | Pimlico Paymaster    | Sponsors gas in USDG                                             |

**Our contribution:** `SessionKeyRouter` provides the permission grid that any of the AA kernels can plug in as a validator or module. It is vendor-neutral by design; the same router works whether the underlying kernel is ZeroDev's `Kernel`, Pimlico's `SafeSingletonFactory`-derived account, or a raw Safe module.

---

## Vertical: **Bridges & Messaging**

| Slot                 | Chosen provider              | Why                                                             |
|----------------------|-------------------------------|-----------------------------------------------------------------|
| L2 → L3 canonical    | Arbitrum Orbit canonical bridge| Free, native, part of the Orbit stack                            |
| Fast cross-chain     | Across, LayerZero, Stargate  | For non-Orbit destinations (Base, Solana, X Layer)               |
| Messaging (retries)  | Arbitrum retryable tickets   | Standard for L2↔L3 messaging with automatic re-execution         |

**Our contribution:** `MultiplierBridge` layers snapshot-based multiplier tracking and keeper-broadcast `syncMultiplier` messages on top of any underlying messaging fabric. The internal `IL2ToL3Messenger` abstraction lets the same contract work over Orbit retryables, LayerZero, or Hyperlane by swapping the messenger address at construction.

---

## Vertical: **Launchpads & Memes**

| Slot                | Chosen provider     | Why                                                       |
|---------------------|----------------------|-----------------------------------------------------------|
| Bonding curve launch| **Pons**             | Ranks #1 across all DeFi by 24 h revenue ($1.45 M/day)    |
| Stock-paired launch | **PAIR**             | Multipool RWA launchpad, pairs new tokens with equity baskets |
| Alt launchpad       | LONG                 | Stock-paired token specialist                              |
| Meme culture ops    | StonkBrokers         | Real stock-token giveaways                                 |

**Our contribution:** The STONK meme itself launches via Pons paired against a chosen Robinhood Stock Token. The awareness-layer contracts above are the utility that gives the meme sustainable narrative through year 1. See [../marketing/manifesto.md](../marketing/manifesto.md).

---

## Vertical: **RPC, Analytics, Tools**

| Slot                | Chosen provider              | Why                                             |
|---------------------|-------------------------------|--------------------------------------------------|
| RPC                 | Alchemy, QuickNode, Dwellir  | Free tiers cover MVP traffic                     |
| Explorer            | Blockscout                   | Free, Robinhood Chain default                     |
| Indexer             | Ponder, Envio, Allium        | Free / low-cost options                          |
| Analytics           | DefiLlama, Dune              | Free                                             |

---

## Summary: what the awareness layer adds

Every one of the seven verticals above has strong incumbents. STONK Chain does not compete on any of them. It adds five thin contracts that make the whole stack finally read `uiMultiplier()`, and it moves the ecosystem forward without asking any user or protocol to migrate.

The strategic wager is that once the five contracts are running against live liquidity, the fastest way to get bigger dividends onto every existing Robinhood Chain user's balance is to use them.
