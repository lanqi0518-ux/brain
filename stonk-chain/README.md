# StockChain

> The dividend-aware DeFi stack for Robinhood Stock Tokens.

Robinhood Stock Tokens use **ERC-8056**: dividends and splits don't move raw balances — they scale an on-chain `uiMultiplier`. Every DeFi protocol built for cash-flow-less tokens silently absorbs that growth into LPs, arbers, and liquidators. **StockChain** is the awareness layer that fixes it.

Five contracts, one thesis:

| Contract | What it does |
|---|---|
| `MultiplierAwareHook` | Uniswap V4 hook — widens fees off-hours, rebalances pools on dividend events so LPs (not arbers) capture the multiplier delta |
| `MultiplierAwareOracle` | Morpho Blue oracle — collateral value scales with `uiMultiplier`, borrower health improves automatically |
| `MultiplierBridge` | Cross-chain lock-and-mint that snapshots `uiMultiplier` at deposit and keeps the destination mirror in sync |
| `PortfolioMarginRouter` | Cross-protocol margin — Lighter perp collateral doubles as Morpho collateral |
| `SessionKeyRouter` | Scoped, time-limited authorizations so AI agents can trade without prompting for every signature |

Plus the operating stack:

- `StonkToken` — `$STONK`, 1B fixed supply, one-way trading switch that renounces ownership on flip, built-in `burnFromFees` counter
- `StonkPoints` — non-transferable ledger, `AWARDER_ROLE` per module, snapshot-freezes for the airdrop
- `UsdgPaymaster` — ERC-4337 v0.7 paymaster, users pay gas in USDG, configurable markup funds `burnFromFees`
- `LighterAdapter` — market-hours-aware leverage cap on top of Lighter perps
- **Keeper** — TypeScript service that keeps `uiMultiplier` and the paymaster rate fresh
- **Frontend** — Next.js 15 + wagmi + RainbowKit, six pages ready for Vercel

## Repository layout

```
stonk-chain/
├── contracts/           # Solidity 0.8.26, Foundry
├── test/                # 56 Foundry tests (fuzz + invariants), all green
├── script/              # DeployCore.s.sol — one-shot deploy
├── keeper/              # TypeScript keeper (viem + pino)
├── frontend/            # Next.js 15 (App Router) + wagmi + RainbowKit
├── .github/workflows/   # CI: fmt + build + test + Slither
├── docs/                # Whitepaper, architecture, roadmap, tokenomics
├── deployment/          # Caldera L3 config (Phase 7 target)
└── marketing/           # Manifesto, launch thread, 90-day content calendar
```

## Quick start

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit --shallow
forge build
forge test           # 56/56 passing

# Frontend
cd frontend && cp .env.example .env.local && npm install && npm run dev

# Keeper (needs a funded EOA + deployed contract addresses)
cd keeper && cp ../.env.example .env && npm install && npm run dev
```

## Deploy to Arbitrum Sepolia (real, end-to-end)

```bash
cp .env.example .env
# Fill in DEPLOYER_PK, STONK_ADMIN, USDG (mock or canonical), etc.

forge script script/DeployCore.s.sol \
  --rpc-url $ARB_SEPOLIA_RPC \
  --private-key $DEPLOYER_PK \
  --broadcast --verify

# Copy the printed addresses into frontend/.env.local and keeper/.env
cd frontend && npm run build && vercel --prod
cd ../keeper && npm run build && node dist/index.js
```

The deploy script skips contracts whose external protocol addresses are not yet set (e.g. `LighterAdapter` requires `LIGHTER`), so partial deployments work — you can bring up `StonkToken` + `StonkPoints` + `SessionKeyRouter` + `MultiplierBridge` before Uniswap V4 / Morpho / Lighter are live on your target chain.

Uniswap V4 is already deployed on Arb Sepolia at `0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317`; that's the default in `.env.example`.

## Ecosystem integrations

| Layer | Protocol | Role | Status |
|---|---|---|---|
| Spot | **Uniswap V4** | Primary AMM; StockChain adds the multiplier hook | Live on Arb Sepolia, targeted for RH Chain |
| Perp | **Lighter** | Robinhood-official ZK perp DEX | LighterAdapter ready; awaits RH deploy |
| Lending | **Morpho Blue** | Largest lending market on the target chain | Oracle ready; awaits RH deploy |
| Stablecoin | **USDG (Paxos)** | Native to Robinhood Chain | Paymaster ready |
| Oracle | **Chainlink Data Streams** | Stock prices | `MultiplierAwareOracle` wired |
| Account Abs | ERC-4337 v0.7 | UsdgPaymaster + SessionKeyRouter | Canonical EntryPoint targeted |
| Launchpad | Pons | Stock-paired fair launch for `$STONK` | Phase 1 bootstrapping strategy |

## Status

Contracts + tests + CI + frontend + keeper are **production-ready and deployable today** to Arbitrum Sepolia (or any Orbit chain). The blockers between now and Robinhood Chain mainnet usability are:

1. Uniswap V4 / Morpho Blue / Lighter deploying to Robinhood Chain (out of our hands).
2. A security review of the five awareness contracts and the paymaster.
3. A Pons launch of `$STONK` to fund the audit and treasury.

See [docs/WHITEPAPER.md](docs/WHITEPAPER.md) for the full technical thesis and [docs/ROADMAP.md](docs/ROADMAP.md) for the phased plan.

## License

MIT.
