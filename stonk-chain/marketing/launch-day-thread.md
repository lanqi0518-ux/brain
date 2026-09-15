# $STONK · Launch-day Twitter thread

**Format:** 12 tweets, ~250 chars each. Post as a single thread from `@stonkchain`. Pinned immediately.

---

**1/**
Every Robinhood Stock Token grows.

Every quarter, the dividend gets reinvested and the token's `uiMultiplier` ticks up. Your true share count grows. No transaction. No form. Just line-goes-up, atomically.

It is the most elegant thing tokenized equities have ever shipped. ↓

**2/**
And every single DeFi protocol on Robinhood Chain **ignores it**.

Morpho reads raw balance. Uniswap reads raw reserves. Lighter reads raw margin.

Every dollar of dividend paid to a stock token in a DeFi pool is silently swept by an arb bot, or trapped, or lost.

**3/**
We wrote five contracts to fix this. That's it. That's the whole product.

• A Uniswap V4 hook that pays LPs their dividends
• A Morpho oracle that reads the multiplier
• A bridge that carries the multiplier across chains
• A margin router that unifies Lighter + Morpho
• A session key router for AI agents

**4/**
Not a fork. Not a competitor. Not a new perp DEX.

We plug into Lighter, Morpho, Uniswap V4, and Chainlink Data Streams — the four biggest venues on Robinhood Chain — and make them all dividend-aware.

Additive, not adversarial. Boring, on purpose.

**5/**
Contracts: `github.com/stonk-chain`

- 1,500 lines of Solidity
- 32 passing tests
- 0 external funding
- Full whitepaper + tokenomics + roadmap in the same repo

You will finish reading the code before lunch. Please do.

**6/**
We are launching $STONK on Pons today, paired against $NVDA.

Fair curve. No pre-mine. No VC. 5% team allocation vested 24 months on-chain with a 3-month cliff. Full details in `docs/TOKENOMICS.md`.

Pons pool: <link when live>

**7/**
Why on Pons: because Pons is where stock-paired memes have already produced a $300M token from $1.5M in 30 days.

The distribution channel is proven. What was missing was a project on the other end of it whose utility hasn't been forgotten by the fifth tweet.

**8/**
Utility is deliberately narrow:
• All awareness-layer fees route into a public `FeeDistributor`
• 60% market-buys & burns STONK
• 30% reserved for audits + bounties
• 10% team ops

Every buyback is a public transaction. Anyone can call `harvest()` when accrual crosses threshold.

**9/**
What we are **not** doing:
• 500× leverage (marketing number, kills protocols)
• A new perp DEX (Lighter is the official partner)
• A governance token from day 1 (you govern with your fork, not your voice)
• A calendar-time roadmap (calendar time is a lie in crypto)

**10/**
What we **are** doing:
• Publishing every commit
• Publishing every audit finding
• Deploying without asking permission
• Stopping when the bug is fixed

If Robinhood ships native corporate-action DeFi in a year and makes us redundant, we cheer.

**11/**
This is not a promise that number goes up. This is a promise that the boat is real, the flag is fair, and the code compiles.

Everything else is up to whether the dividend bug bothers you as much as it bothers us.

Read the code. Read the whitepaper. Then decide.

**12/**
Website: <domain>
Whitepaper: <domain>/whitepaper
Code: `github.com/stonk-chain`
Telegram: <link>
Discord: <link>
Pons pool: <link>

`git log`. Not to the moon. To the ledger.

$STONK
