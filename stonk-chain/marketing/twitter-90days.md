# $STONK · 90-day Twitter content calendar

> **Cadence: 3 posts/day on average — 1 technical, 1 meme/culture, 1 community/engagement.**
> **Every technical post must include a `git log` reference or contract-verified link. No vaporware.**

---

## Week 1 (T+0 to T+6) — Launch & anchor

- **T+0 Launch thread** (see `launch-day-thread.md`)
- **T+1** Technical: walkthrough of `MultiplierAwareOracle.price()` with a real Chainlink Data Streams example.
- **T+1** Meme: "your $NVDA on Aave, 6 months later, still 100 shares. your $NVDA on STONK, 6 months later, 104.2 shares. one of these has been robbed."
- **T+2** Technical: how `MultiplierAwareHook` books the dividend pot. Screenshot of the checkpoint event.
- **T+2** Community: pinned Telegram AMA, 24h drop-in
- **T+3** Meme: portfolio meme showing a "before/after" LP position
- **T+3** Technical: bridge deposit → syncMultiplier → withdraw round-trip demo on testnet
- **T+4** Cultural: "why we launched on Pons — the boat is not the point, the ocean is."
- **T+4** Technical: SessionKeyRouter demo — an AI agent trading NVDA with a $500/day budget
- **T+5** Community: "we do not have a KOL budget. we have a repo. here is what changed this week." Link to `git log`.
- **T+5** Meme: "$STONK team allocation is 5% vested 24 months. rug-pull economics: not our style."
- **T+6** Recap thread of week 1

## Week 2-4 — Depth week

- Deep-dive threads on each of the 5 contracts, one per week
- Public benchmark: how much dividend was silently absorbed by every major Robinhood Chain protocol *this quarter*. Turn it into a leaderboard.
- Guest-post pitch: DL News, The Defiant, CoinDesk research

## Week 5-8 — Grant + audit push

- Publicly document grant application status (Arbitrum, Chainlink BUILD, Uniswap Foundation)
- Weekly `git log` recap remains
- Community poll: which stock market gets the first live oracle? (NVDA, TSLA, MSTR, GME, SPY)

## Week 9-12 — Pilot launch

- Mainnet pilot post-audit
- Live TVL dashboard on domain
- Independent developer contribution highlight (from PRs)

---

## Voice rules

- **Never** say "to the moon" or use rocket emoji.
- **Always** cite the exact contract file and line when making a technical claim.
- **Never** insult competing protocols. Say "we noticed X" not "Y is broken."
- **Always** answer the "what's the bug" question in 1 sentence.
- **Every** week: publish the diff. `git log --since="1 week ago" --oneline` becomes a screenshot.

---

## Metrics we watch (never tweet these; they inform tweet direction)

- Impressions on the last technical thread vs. the last meme
- Discord + Telegram net member delta
- Repo star delta
- Realised TVL of live oracle markets
- Fees swept into `FeeDistributor` this week
