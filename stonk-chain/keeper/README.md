# StockChain Keeper

Node.js service that keeps two on-chain state variables fresh:

1. **Multiplier sync** — for each Stock Token registered on the bridge,
   reads the canonical `uiMultiplier()` on the source chain and calls
   `updateMultiplier` on the bridge when it drifts.
2. **Paymaster rate** — pulls the native-token → USD price from a public
   feed and pushes it to `UsdgPaymaster.updateRate` when it drifts more
   than 0.5 % or when the on-chain value is about to become stale.

## Quick start

```bash
cd keeper
cp ../.env.example ./.env    # fill in KEEPER_PK, BRIDGE_ADDRESS, PAYMASTER_ADDRESS, STOCK_TOKENS
npm install
npm run dev
```

## Production

```bash
npm run build
node dist/index.js
```

Run under a supervisor (systemd / pm2 / docker). Every action is a
signed transaction from `KEEPER_PK`; that key should be scoped as narrow
as possible — ideally an EOA that only holds enough native gas to run a
few dozen tx and has been granted the specific role on each contract
(`priceKeeper` on `UsdgPaymaster`; ownership or a scoped `KEEPER_ROLE`
on `MultiplierBridge`).

## Failure modes

- **RPC down**: logs error, keeps looping. No crash.
- **Feed 5xx**: logs error, skips this iteration.
- **Nonce race**: viem retries; if it still fails the next tick picks it up.
- **Insufficient gas**: transaction fails, logged; refill the keeper wallet.
