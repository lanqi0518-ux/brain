# Roadmap

> **Build in public. Ship every week. Let `git log` be the marketing.**

The plan is expressed as **capability milestones**, not calendar dates. Each milestone unlocks the next by making funding either unnecessary or attainable via grants, meme proceeds, or Pre-Seed on the strength of the milestone's telemetry.

---

## Phase 0 · Repo public, tests green (this commit)

- ✅ `MultiplierAwareHook`, `MultiplierAwareOracle`, `MultiplierBridge`, `PortfolioMarginRouter`, `SessionKeyRouter` shipped
- ✅ 32 unit / fuzz tests, all passing
- ✅ Whitepaper, integration map, tokenomics, manifesto drafted
- ✅ Deployment script for any Orbit-compatible chain
- 🎯 Cost so far: **$0**

## Phase 1 · Meme launch on Pons

- Fair-launch STONK on Pons, paired with a chosen Robinhood Stock Token
- Website live, Twitter cadence live, Telegram + Discord live
- **All source code and audit-preparation notes public**
- 🎯 Cost: **~$5-50** (Pons launch gas)

## Phase 2 · Testnet demo of the awareness layer

- Deploy all five contracts to Robinhood Chain Sepolia testnet
- Register a `MultiplierAwareOracle` against a mock stock token, spin up a matching Morpho market
- Register a `MultiplierAwareHook` on a Uniswap V4 test pool
- 3-minute video demo: existing Morpho market vs. our market, watch health factor grow as the mock stock pays a dividend
- 🎯 Cost: **$0-20** (all testnet)

## Phase 3 · Grant applications

- Arbitrum Foundation: L3-track grant, cite the Orbit deployment path
- Chainlink BUILD: Data Streams integration, cite the oracle contract
- Uniswap Foundation: V4 hook development grant
- Alchemy / QuickNode: free-tier RPC credits
- Optimism RetroPGF: retroactive public-goods funding once we have adoption

Target combined grants: **$30 000 – $150 000**

## Phase 4 · Audit, small mainnet pilot

- Fund a lightweight audit (Certora spec + one manual pass ≈ $20 000 – $40 000) via meme proceeds + grants
- Deploy the oracle and hook to Robinhood Chain mainnet with a **$10 000 per-user cap** and a top-level circuit breaker
- One live pool, one live Morpho market, real users but bounded downside
- 🎯 TVL target: **$100 000 – $1 000 000** through the pilot window

## Phase 5 · Full mainnet launch + $STONK token utility

- Remove per-user caps after two clean weeks of pilot data
- Ship `USDGPaymaster` and route idle balances into Robinhood Earn's Morpho vault
- `PortfolioMarginRouter` opens Lighter integration in production
- Meme token accrues utility: fee routing (`Lighter.approveAndRouteFees`) points to a `FeeDistributor` that buys back and burns STONK
- 🎯 TVL target: **$10 M+**

## Phase 6 · Pre-Seed round

- On the strength of on-chain TVL and Pons meme community, close a $500 K – $1 M Pre-Seed
- Immediate uses: full audit (Trail of Bits or Spearbit), 2 engineering hires, Caldera L3 devnet subscription
- Investors targeted: Robot Ventures, Delphi, angel checks from Robinhood / Arbitrum / Chainlink ecosystems

## Phase 7 · Caldera L3 devnet

- Spin up STONK L3 on Caldera / Conduit RaaS ($5 K/month baseline)
- Redeploy all five contracts to L3, plus the five stock-native precompiles (see [ARCHITECTURE.md](ARCHITECTURE.md))
- L2 canonical bridge live, `MultiplierBridge` battle-tested
- 🎯 L3 daily active users target: **1 000**

## Phase 8 · Seed / A round + L3 mainnet

- Close $3 M – $5 M Seed on the strength of L3 daily-active-user metrics
- Move sequencer to a shared / decentralised set (Espresso or Astria)
- Full audit of L3 precompiles (Trail of Bits, ~$150 K)
- L3 mainnet launch, USDG negotiated as native
- $STONK becomes L3 gas token (burned per transaction)

---

## Non-milestones (things we explicitly are not doing)

- **500× leverage.** Marketing number. Real product ceiling is 50× to match Lighter.
- **Native options engine.** Deferred to Phase 8+; MVP path uses vault wrappers on top of Deribit or a partner.
- **Physical stock delivery.** Blocked on Robinhood's own roadmap. When they ship it, we are already the canonical bridge.
- **Governance token bloat.** The $STONK utility path is deliberately narrow: gas + fee-share + fee-burn. No governance until there is something worth governing.

---

## What we will publish weekly, forever

- `git log` diff summary — every change, every week.
- One-line TVL delta.
- Any incident or issue, whether or not it affected users.

Everything else is noise.
