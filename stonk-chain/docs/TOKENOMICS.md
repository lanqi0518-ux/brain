# $STONK Tokenomics

> **Fair launch on Pons. No VC allocation. No pre-mine. Utility is grown, not promised.**

---

## Supply

- **Total supply:** `1,000,000,000` STONK (fixed, no mint function)
- **Decimals:** `18`
- **Initial distribution:** Pons bonding curve launch, paired against a Robinhood Stock Token (see `marketing/manifesto.md` for the specific pair)
- **Team allocation:** `5%` (`50,000,000` STONK) — vested linearly over 24 months with a 3-month cliff, on-chain
- **Treasury / ecosystem:** `10%` (`100,000,000` STONK) — governed by a Safe multisig, spendable only against public proposals with 7-day timelock
- **Community rewards / points → airdrop:** `10%` (`100,000,000` STONK) — distributed against the on-chain points ledger described below
- **Public float (via Pons curve):** `75%` (`750,000,000` STONK) — no team share on this side of the curve

There is no dedicated VC bucket. If institutional investment happens later, it must come from open-market accumulation exactly like a retail participant.

---

## Value capture: three utility surfaces, none of them promise-ware

Every token has a story. The story here is that STONK is the fee sink of the awareness layer once it is live in production. The connection to on-chain revenue is enforced by contract wiring, not by a marketing deck.

### Utility 1 · Fee routing → buy-and-burn

Every fee stream identified in `docs/ARCHITECTURE.md` (`MultiplierAwareHook` dividend sweep, `PortfolioMarginRouter` integrator fee from Lighter, `MultiplierBridge` 1 bp in/out) flows into `FeeDistributor.sol`. The distributor splits inbound fees:

- **60 %** — USDG → market-buy → burn STONK
- **30 %** — treasury reserve (audits, bounties)
- **10 %** — team operational

The buy-and-burn path is public and permissionless: anyone can trigger `harvest()` once accrual crosses a threshold, and the routing is visible on-chain.

### Utility 2 · Points → airdrop

On-chain points are minted per action:

| Action                                            | Points per USDG-value          |
|---------------------------------------------------|--------------------------------|
| LP into a stock-quote pool with the STONK hook    | 10 points / $ / day            |
| Borrow against a MultiplierAware Morpho market    | 5 points / $ / day             |
| Route a swap through the STONK aggregator         | 1 point / $ swapped            |
| Bridge in or out via `MultiplierBridge`           | 20 points / $ bridged (one-off)|
| Rebalance via `PortfolioMarginRouter`             | 100 points / rebalance         |
| Authorise a session key with real trading volume  | 50 points / $10 000 traded      |

Points convert to STONK at the airdrop snapshot, biased toward long-tenure LPs and against wash-trading through a Hyperliquid-style **volume / TVL ratio penalty**. Points are non-transferable ERC-1155 balances until the snapshot.

### Utility 3 · Gas token on the L3 (post-Phase 8)

Once the L3 launches, $STONK becomes the native gas token. Every transaction burns a fraction of its gas denomination, tightening supply. The paymaster path allows users to pay in USDG and have the paymaster do the STONK burn on their behalf, so this utility does not force users into the token.

---

## What $STONK is not

- **Not governance.** There is no on-chain vote surface at launch. Governance is only introduced when there is something meaningful to govern (fee splits, precompile parameters), and at that point it will be a `veSTONK` model with 4-year lockup for max weight.
- **Not a security wrapper.** $STONK does not represent a claim on any underlying asset. The Robinhood Stock Tokens it pairs with on Pons do; $STONK does not.
- **Not a yield token.** Fees flow to buy-and-burn, not to holders. Any yield attribution comes from staking (Phase 5+) or from LPing STONK on Uniswap, both of which are user-initiated.

---

## Anti-rug commitments

1. **Team vesting on-chain.** The 5 % team allocation lives in `contracts/token/Vesting.sol` (planned) with 24-month linear vest + 3-month cliff. No admin key can accelerate.
2. **Treasury multisig visible from day 1.** Safe address published in `marketing/manifesto.md` and in the pinned tweet.
3. **Buy-and-burn is permissionless.** Anyone can call `FeeDistributor.harvest()`. If the team ever tries to redirect fees, the change is a public tx with a 7-day timelock.
4. **Full source, tests, and audit prep public before the meme launches.** `git log` is the receipt.

---

## Illustrative math (not a promise)

Suppose after 6 months of steady growth the awareness layer sees:

- Uniswap V4 hook TVL: $10 M, average pool fee 0.05 %, annualised turnover 20×
  → gross swap fees $100 000, our accrued dividend sweep 5 % = $5 000
- Portfolio margin routing through Lighter: $50 M annualised notional, integrator fee 2 bp × 10 % share = $10 000
- Bridge in/out: $30 M / year at 1 bp each = $6 000

Total revenue: **$21 000 / year** at that snapshot. 60 % of that ($12 600) buys and burns STONK. At a $2 M market cap that is ~0.6 %/year of the float; at a $20 M market cap it is ~0.06 %. The utility case does not depend on the numbers being large early; it depends on them being **real, permissionless, and public**.
