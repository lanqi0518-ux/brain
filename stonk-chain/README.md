# STONK Chain

> **The stock-native L3 for tokenized equity DeFi.**
> Where memecoins trade Nvidia at 50x, dividends compound automatically, and AI agents trade for you 24/7.

STONK Chain is an Arbitrum Orbit L3 settling to Robinhood Chain, purpose-built to be the **canonical settlement layer for tokenized-stock DeFi**. Instead of forking every protocol, STONK Chain integrates the existing Robinhood Chain ecosystem (Lighter perps, Uniswap V4 spot, Morpho lending, USDG stablecoin) and adds a thin, high-leverage differentiation layer:

- **ERC-8056 native awareness** — every Hook, Oracle, Vault, and Bridge respects the `uiMultiplier()` growth so users stop losing dividends inside DeFi pools.
- **Portfolio Margin Router** — cross-protocol collateral (Perp position on Lighter counts as margin for Morpho loans).
- **Session Key Router** — AI agents get one-shot 30-day authorizations to trade on your behalf.
- **Multiplier Bridge** — L2↔L3 canonical bridge that preserves the corporate-action multiplier across chains.
- **USDG Paymaster** — pay gas in USDG, idle balance auto-routed to Morpho for 7% APY.

## Repository layout

```
stonk-chain/
├── contracts/          # Solidity — the differentiation layer
│   ├── swap/           # MultiplierAwareHook (Uniswap V4 hook)
│   ├── lend/           # MultiplierAwareOracle (Morpho Blue curator)
│   ├── bridge/         # MultiplierBridge (L2 <-> L3)
│   ├── margin/         # PortfolioMarginRouter
│   ├── session/        # SessionKeyRouter
│   ├── perp/           # LighterAdapter (perp wrapper)
│   ├── paymaster/      # USDGPaymaster
│   ├── integrations/   # Adapters to existing protocols
│   ├── interfaces/     # ERC-8056, Lighter, Morpho
│   ├── libraries/      # MarketHours, MultiplierMath
│   └── mocks/          # Test doubles for stock tokens, oracles
├── test/               # Foundry tests
├── script/             # Deployment scripts
├── frontend/           # Next.js + wagmi trading terminal (Phase 2)
├── keeper/             # TypeScript keeper bots
├── docs/               # WHITEPAPER, PITCHDECK, ARCHITECTURE
├── deployment/         # Caldera L3 configuration
└── marketing/          # Twitter, website, KOL outreach
```

## Quick start

```bash
# Install Foundry if you don't have it
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Install dependencies
forge install

# Build
forge build

# Test
forge test -vvv

# Deploy to local anvil
anvil &
forge script script/DeployLocal.s.sol --broadcast --rpc-url http://localhost:8545
```

## Ecosystem integrations (Robinhood Chain L2, live)

| Layer         | Protocol           | Role                                      |
|---------------|--------------------|-------------------------------------------|
| Perp          | **Lighter**        | Robinhood-official ZK perp DEX            |
| Spot          | **Uniswap V4**     | Primary AMM ($192M TVL)                   |
| Aggregation   | 1inch, KyberSwap   | Best-price routing                        |
| Lending       | **Morpho Blue**    | Largest lending market ($447M TVL)        |
| Curators      | Spark, Steakhouse  | Yield strategy curators                   |
| Stablecoin    | **USDG (Paxos)**   | Native to Robinhood Chain                 |
| Oracle        | **Chainlink DS**   | Data Streams for stock prices             |
| Account Abs   | ZeroDev, Pimlico   | Smart accounts + paymasters               |
| Launchpad     | Pons, LONG, PAIR   | Stock-paired memecoin markets             |

## Status

Pre-launch. This repository is the code artifact of the initial technical whitepaper, targeting a Caldera-hosted Orbit L3 devnet within 4-8 weeks of the first commit.

See [docs/WHITEPAPER.md](docs/WHITEPAPER.md) for the full technical thesis and [docs/ROADMAP.md](docs/ROADMAP.md) for the delivery plan.
