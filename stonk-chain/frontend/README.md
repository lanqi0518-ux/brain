# StockChain Frontend

Next.js 15 (App Router) + wagmi + RainbowKit + Tailwind.

## Pages

- `/` — landing + KPIs (burn counter, points issued, trading status)
- `/swap` — Uniswap V4 hook explorer (fee state by market hours + dividend rebalance)
- `/lend` — Morpho oracle preview (raw price × uiMultiplier)
- `/bridge` — lock deposits + multiplier drift indicator
- `/perp` — Lighter adapter (leverage cap depending on market state, deposit/withdraw)
- `/points` — non-transferable ledger + earning table

## Quick start

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>. Wallet connection uses RainbowKit / WalletConnect. Contract addresses are read from
`NEXT_PUBLIC_*` env vars; missing addresses cause the corresponding feature to be disabled gracefully.

## Deploy to Vercel

```bash
vercel --prod
```

Set all `NEXT_PUBLIC_*` variables in the Vercel dashboard. Add your custom domain (e.g. `stockchain.xyz`) to the
project — Vercel handles TLS automatically. WalletConnect requires the deployed origin to be added to the project's
allowlist in <https://cloud.walletconnect.com>.
