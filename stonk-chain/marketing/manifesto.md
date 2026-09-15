# $STONK · Manifesto

> **We are not here to launch another meme.**
>
> **We are here to fix the dividend bug in DeFi. And the token happens to be the flag we plant.**

---

## The bug

Robinhood Stock Tokens grow. Every quarter Apple pays a dividend, Robinhood reinvests it, and the token's on-chain `uiMultiplier` ticks up. Your raw balance doesn't move. Your true share count does. This is **atomic value accretion**. No distribution transaction. No cash to route. No form to sign.

It is the single most elegant thing tokenized equities have ever produced.

And **every DeFi protocol on Robinhood Chain ignores it**. Morpho reads raw balance. Uniswap reads raw reserves. Lighter reads raw margin. Every dollar of dividend paid to a stock token sitting inside a DeFi pool is silently swept by an arbitrageur, held by the pool, or missed entirely by the user.

We can't sit with that.

## The fix

Five contracts. Each of them small. Each of them a plug into an existing venue.

1. A **Uniswap V4 hook** that pays LPs their dividend instead of letting the arb bot eat it.
2. A **Morpho oracle** that treats collateral value as growing over time — because it *is*.
3. A **bridge** that carries the multiplier across chains.
4. A **margin router** that treats your Lighter position and your Morpho position as one portfolio.
5. A **session key router** that lets an AI agent trade for you without holding your seed phrase.

That is the whole product. There is no 500× leverage in it. There is no fork of anyone. There is no 42-page tokenomics deck.

## The token

$STONK launches on Pons, paired against a Robinhood Stock Token. Fair curve. No pre-mine. No VC. 5 % team, vested 24 months on-chain. See `docs/TOKENOMICS.md` for the exact numbers.

The token is the flag. The five contracts are the boat.

## What we promise

- **We publish every commit.** `git log` is the marketing.
- **We publish every audit finding.** No embargo.
- **We deploy first, ask permission never.** The five contracts talk to Lighter, Morpho, Uniswap V4, and Chainlink whether or not those teams endorse us.
- **We stop when the bug is fixed.** If Robinhood ships native corporate-action DeFi in a year and makes us redundant, we cheer.

## What we do not promise

- Number goes up.
- L3 by December.
- Anyone shows up.

## What you can do

- Read the whitepaper.
- Read the code. It is 1 500 lines. You will finish it before lunch.
- If it is good, buy the meme.
- If it is broken, PR the fix.

---

**We are not here to launch another meme.**

**We are here to build the dividend layer that Robinhood Chain forgot.**

**And the meme is the boat.**

*— The STONK contributors*
