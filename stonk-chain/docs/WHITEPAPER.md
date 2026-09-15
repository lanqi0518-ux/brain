# STONK Chain — Technical Whitepaper

> **A dividend-aware DeFi layer for Robinhood Chain, in five contracts and one L3.**
>
> Version 0.1 · Draft for community review · September 2026

---

## Abstract

Robinhood Chain launched on July 1, 2026 as an Ethereum Layer 2 built on Arbitrum Orbit, purpose-built for tokenized real-world assets. Within ten weeks it accumulated $1.69 B in TVL, $869 M in stablecoins, and 134 protocols — most of them ports of Ethereum-native primitives (Morpho, Uniswap, Lighter, Spark). Yet none of these protocols is aware of the *single feature* that makes Robinhood Stock Tokens unique: the **ERC-8056 `uiMultiplier`** that grows every time the underlying company reinvests a dividend or executes a split. Every dollar of dividend paid to a stock token sitting inside a DeFi contract today is silently swept by arbitrageurs, held by the pool, or missed entirely by the user.

STONK Chain is the smallest possible correction to that gap. It ships five audited contracts that make every major Robinhood Chain protocol dividend-aware — a Uniswap V4 hook, a Morpho Blue oracle, a canonical bridge, a cross-protocol margin router, and a session-key router for AI agents — and it plans to graduate them onto a purpose-built Orbit L3 whose consensus layer treats corporate actions as first-class events. The team does not build competing venues to Lighter, Uniswap, or Morpho. It builds the missing awareness layer *on top of them*.

---

## 1 · Context: what is unique about Robinhood Stock Tokens

Every tokenized-equity issuer in the market today falls into one of two dividend models:

- **Cash distribution** (Kraken xStocks, Ondo, Coinbase B20). When the underlying stock pays a dividend, cash is disbursed to holders as a separate on-chain transaction. Simple, but fragile: cash must be routed through an issuer-managed process, and any position sitting inside a DeFi contract at the ex-dividend snapshot is treated per that contract's rules.
- **Multiplier accretion** (Robinhood, via ERC-8056). The dividend is reinvested and the token's `uiMultiplier()` grows in-place. Raw balances stay static; UI-adjusted balances grow. The dividend never leaves the token; instead the token itself becomes worth more.

The Robinhood model is strictly more DeFi-friendly *in principle* because the value accretion is atomic and requires no distribution logic. In practice, no DeFi protocol on Robinhood Chain reads `uiMultiplier()`. Morpho values collateral by raw balance. Uniswap V3/V4 pools price by raw reserves. Lighter's collateral valuation ignores it. As a result, a user who posts $10,000 of NVDA as Morpho collateral and holds it for four quarters (~1% dividend, per quarter, historically) accumulates roughly $400 of accretion inside the token *but their loan-to-value ratio does not move*, because Morpho's oracle reads the underlying Chainlink feed which — depending on the feed's configuration — either double-counts or ignores the multiplier.

This whitepaper identifies five specific loci where a small piece of contract code fixes the problem, and specifies each of them.

---

## 2 · The five-contract awareness layer

Each contract is standalone: it can be deployed and integrated with existing Robinhood Chain protocols independently. Together they form the "dividend-aware" pipeline for the four largest DeFi verticals on the chain.

### 2.1 · `MultiplierAwareHook` (Uniswap V4)

A Uniswap V4 hook that intercepts every swap and liquidity operation for a stock/quote pool. It solves three problems no existing V4 hook addresses:

1. **Dividend absorption.** Whenever the pool's stock leg has a multiplier that grew since the last touch, the delta is booked into a `dividendPot` that LPs can claim pro-rata against their principal. Dividends follow the LP, not the arbitrageur.
2. **Off-hours mispricing.** The hook widens the swap fee via `MarketHours.spreadMultiplierBps` during pre/after-market and weekends. Pools stay usable, but extraction becomes economically unattractive.
3. **Split rebalancing.** Any multiplier change greater than ±20 % increments a `lastActionEpoch` counter, and the hook exposes a `pendingRebalance()` view that keepers use to reposition concentrated liquidity atomically.

Only the pool's stock leg is required to implement ERC-8056. USDG / ETH / any non-stock quote pairs are handled uniformly via `MultiplierMath.safeMultiplier` which returns `1e18` on tokens that do not implement the interface.

### 2.2 · `MultiplierAwareOracle` (Morpho Blue curator)

A `IMorphoOracle` implementation that combines a Chainlink Data Streams feed with the collateral token's `uiMultiplier`. It supports two configuration modes:

- `dsAlreadyScaled = true` — the price source (Chainlink Data Streams on Robinhood Chain, per docs) already embeds the multiplier. The oracle passes the price through, applying only the 1e36 Morpho anchor scaling.
- `dsAlreadyScaled = false` — the price source is a "raw" feed (Pyth, Metric, a legacy Chainlink Price Feed). The oracle multiplies the raw price by the multiplier itself.

Two safety gates are unconditionally applied:

- **Staleness.** A report older than `maxStalenessSeconds` reverts with `StalePrice`. Morpho reads this as a stale oracle and pauses new borrows; existing positions can still repay, because the repay path never touches the oracle.
- **Halt.** When `MarketHours.current() == Halted` (holiday, halt, deep-night), the oracle also reverts, freezing collateral valuations at the last valid quote. Same behaviour as staleness from Morpho's perspective.

The observable effect: a borrower's collateral value grows with every dividend without any transaction, and their health factor improves. Reverse splits (which decrease the multiplier) revert on the bridge for safety.

### 2.3 · `MultiplierBridge` (L2 ↔ L3)

The bridge is a standard lock-and-mint with two ERC-8056–specific mechanics on top:

1. **Snapshot at lock.** The source multiplier is recorded on every deposit and sent to the destination. The wrapped token on the destination knows what multiplier its escrow was frozen at.
2. **Keeper-driven `syncMultiplier`.** Whitelisted keepers race to broadcast a source-side multiplier change to the destination, whose wrapped token rebases its own multiplier to match. Regressions (reverse splits) are rejected with `MultiplierRegressed`; they must instead be handled via an admin-signed corporate-action path.

Withdrawals are two-step (stage → claim) with a 5-minute-to-24-hour timelock that gives incident response a window before an exploit can drain escrow. Raw amounts flow 1:1 across the bridge in both directions; the multiplier tracks value.

### 2.4 · `PortfolioMarginRouter` (Lighter + Morpho unified margin)

The router treats a user's Lighter perp collateral and Morpho collateral as a single portfolio. It exposes three atomic operations:

- `openIsolatedPortfolio` — pulls collateral, splits it between Lighter and Morpho at a caller-specified ratio, opens the paired subaccounts.
- `rebalanceMargin` — moves collateral between the two legs based on live Lighter equity vs. a configurable target buffer (default 20 % above maintenance).
- `closePortfolio` — atomically closes both legs and returns net collateral to the owner.

The router does not custody funds long-term; funds pass through a single external call frame. The keeper-driven rebalance path is scoped via `SessionKeyRouter` (below); a bare-EOA keeper cannot rebalance a portfolio unless the owner has authorised it.

### 2.5 · `SessionKeyRouter` (AI agent authorisation)

The rise of on-chain AI trading agents has run into a UX wall: every trade requires a fresh signature. `SessionKeyRouter` provides fine-grained permissions:

```
session = (agent, expiresAt, dailyBudgetWei, [(target, selector, dailyCount)])
```

The user authorises once. The agent executes many times via `executeAsAgent(user, target, value, data)`, and each call is checked against:

- Session expiry (hard-capped at 90 days).
- Daily value budget (rolling 24-hour window).
- Per-(target, selector) daily call count.

Revocation is one call and takes effect atomically. The router is intended to be wired as a module on ZeroDev / Pimlico kernels on Robinhood Chain; a standalone deployment is also valid for direct-call flows.

---

## 3 · Corporate-action handling

`uiMultiplier` monotonic growth from dividends is the common case. Splits, spinoffs, mergers, and rights distributions are less common but must be handled deliberately. The current five contracts handle each as follows:

| Event                       | Contract behaviour                                                                                     |
|-----------------------------|---------------------------------------------------------------------------------------------------------|
| Cash dividend (reinvested)  | `uiMultiplier` grows monotonically; all contracts absorb it automatically.                              |
| Forward split (e.g. 2-for-1)| Multiplier jumps > +20 %; `MultiplierAwareHook` marks a rebalance epoch; keepers reposition LP ranges.  |
| Reverse split               | Multiplier decreases; bridge rejects; admin path required to correlate wrapped supply.                  |
| Stock dividend              | Multiplier growth path.                                                                                 |
| Spinoff, merger, redemption | Currently out-of-scope for MVP; ERC-8056 event types exist for forward compatibility (see [robinhood docs](https://docs.robinhood.com/chain/stock-token-apis/)). Roadmap places them in the L3 CorporateAction precompile. |

---

## 4 · Deployment: L2 first, L3 later

The five contracts are designed for immediate deployment on Robinhood Chain L2 mainnet against the live Lighter, Uniswap V4, Morpho Blue, and Chainlink Data Streams contracts. The L3 is a natural next step — an Orbit chain settling to Robinhood Chain, with the same contracts redeployed but backed by five stock-native precompiles at the addresses defined in [ARCHITECTURE.md](ARCHITECTURE.md):

| Precompile | Role                                                                     |
|------------|---------------------------------------------------------------------------|
| `0x100`    | Direct Chainlink Data Streams read at ~0 gas                              |
| `0x101`    | Market-hours state machine, holiday-aware                                  |
| `0x102`    | On-chain order book matching (for perp / spot venues that opt in)         |
| `0x103`    | Session-key authorisation (co-located with `SessionKeyRouter`)             |
| `0x104`    | Corporate-action feed synced from Robinhood's Corporate Actions API       |

The L3 is not necessary for the awareness layer to be useful. It becomes necessary when the ecosystem wants systemwide behaviours — atomic ex-dividend snapshots across every dApp, consensus-level halt propagation, native rights-offering primary markets — that a contract layer alone cannot deliver. The whitepaper's position is that the L3 should be pursued *after* the L2 awareness layer has demonstrable adoption; the pre-Seed and Seed funding milestones tied to that path are described in [ROADMAP.md](ROADMAP.md).

---

## 5 · Non-goals

- **Building a new perp DEX.** Lighter is the official Robinhood Chain perp partner. We integrate.
- **Building a new AMM.** Uniswap V4 is deployed. We hook.
- **Building a new lending protocol.** Morpho Blue has $447 M TVL. We curate.
- **Issuing a new stablecoin.** USDG is native. We route.
- **Building an options venue.** Options require a market-maker network and a bespoke pricing engine; we defer.
- **Chasing peak leverage.** 500× is a marketing number. Our perp integration lives at 50× to match Lighter's cap.

---

## 6 · Threat model & known limitations

- **Unaudited MVP.** All five contracts ship pre-audit for the initial L2 devnet. A staged audit (spec review → symbolic execution → full manual review) is scoped for Trail of Bits or Spearbit, funded by grants and token proceeds after the meme launch.
- **Oracle dependence.** The `MultiplierAwareOracle` inherits every failure mode of Chainlink Data Streams. The staleness and halt gates mitigate but do not eliminate signer-set risk.
- **Bridge withdrawal delay.** The 30-minute default withdrawal timelock trades UX for exploit response headroom. It is upper-bounded at 24 hours by the admin, and lower-bounded at 5 minutes to prevent accidental zero-delay misconfiguration.
- **Session key liveness.** A user who loses their signing key can revoke sessions via any other authorised device; a user who loses *every* device cannot revoke. Sessions are hard-capped at 90 days so the blast radius is bounded even in that case.
- **Multiplier regression.** The current design rejects any bridge withdrawal or oracle read where the multiplier has decreased since snapshot. This is safe for the common case (monotonic dividend growth) but requires an admin-driven flow for reverse splits and worthless-removal events.

---

## 7 · Contributor path

The repository at `github.com/…/stonk-chain` is public from day one. All five contracts, test suites, deployment scripts, and this whitepaper are open-source (MIT). Contributors are invited to:

1. Extend `MultiplierAwareHook` with a rights-distribution accrual path.
2. Ship a `MorphoBlue` curator that composes the oracle with a real Chainlink Data Streams verifier on Robinhood Chain.
3. Build the L3 Rust precompiles from the specifications in [ARCHITECTURE.md](ARCHITECTURE.md).

The goal is not to gate-keep. It is to build in public and let the record of `git log` speak louder than any twitter thread.
