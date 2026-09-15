# Caldera Orbit L3 configuration (STONK Chain)

> **This is the target config for the Caldera-hosted devnet in Phase 7. It is deliberately not `git`-executable at MVP time; it becomes live once Pre-Seed funding lands (see `docs/ROADMAP.md`).**

The Caldera dashboard walks you through most fields interactively; this file records the values we intend to use so the config choice is public and reviewable before any button is pushed.

---

## Chain

| Setting              | Value                                                    | Reason                                                                     |
|----------------------|-----------------------------------------------------------|----------------------------------------------------------------------------|
| Chain name           | `STONK`                                                   | Matches token, matches repo                                                 |
| Chain ID             | `48561` (indicative; will be reserved via Caldera)         | Chosen for memetic 8 5 6 (ERC-8056) reference                              |
| Parent chain         | Robinhood Chain (L2)                                      | Anchors us to the equity-token issuer                                       |
| Rollup type          | AnyTrust (with DAC)                                       | 10× cheaper than Rollup mode, acceptable trust delta                        |
| DA committee         | 3-of-5 initial (STONK, Robinhood-adjacent, Chainlink, one community, one auditor) | Same shape Robinhood Chain itself uses |
| DA backup            | Celestia posting per hour                                 | Belt-and-braces liveness for AnyTrust                                       |
| Gas token            | $STONK                                                    | Burns per-tx; paymaster path lets end-users pay in USDG                    |
| Block time target    | 250 ms                                                    | Matches Robinhood Chain, matches Nitro defaults                            |
| Nitro version        | Latest LTS at deployment                                  | Pinned in `stonk-chain/deployment/nitro.version`                            |

## Sequencer

| Setting              | Value                                                    | Reason                                                                     |
|----------------------|-----------------------------------------------------------|----------------------------------------------------------------------------|
| Mode                 | Centralised (Caldera-hosted) at devnet                    | Cheapest, sufficient for Phase 7                                            |
| Fallback             | 24 h user-force-withdrawal path                           | Standard Orbit escape hatch                                                 |
| Post-mainnet plan    | Espresso or Astria shared sequencer                       | Decentralisation without running our own hardware                           |

## Precompiles

Reserved addresses for the five stock-native precompiles. These are called by the same awareness-layer contracts that today speak to Chainlink Data Streams and `MarketHours` on L2.

| Address  | Precompile     | Notes                                                                  |
|----------|----------------|------------------------------------------------------------------------|
| `0x100`  | `StockPrice`   | Reads latest verified Data Streams report from consensus cache          |
| `0x101`  | `MarketHours`  | Full DST + halt handling, replaces the pure-Solidity library             |
| `0x102`  | `OrderMatch`   | Optional; only pools/perp venues that opt-in call it                     |
| `0x103`  | `SessionKey`   | Complements `SessionKeyRouter` for AA-native flows                       |
| `0x104`  | `CorpAction`   | Syncs Robinhood's Corporate Actions API into consensus                   |

## Bridge

- **Canonical bridge**: Arbitrum Orbit standard (free)
- **Bridge hooks**: `MultiplierBridge` deployed on both sides, admin-configured with matching peers
- **Fast bridge to other chains**: LayerZero adapter, planned in Phase 8

## Admin

- Initial admin: 5-of-9 Safe multisig with public signers list on domain
- Timelock: 72 h for parameter changes, 7 days for contract upgrades
- Emergency pause: 3-of-9 with 24 h auto-expiry

## Cost profile (illustrative, Caldera 2026 pricing)

| Item                             | Monthly (USD)       |
|----------------------------------|---------------------|
| Managed sequencer                | $3 000 – $6 000     |
| DAC hosting                      | $1 000 – $2 000     |
| Bridge & explorer                | $500 – $1 000       |
| RPC (Alchemy / QuickNode)        | Free tier at start  |
| Support & monitoring             | $500                |
| **Total** at devnet              | **~$5 000 – $10 000/mo** |

This is why the L3 lives in Phase 7, after Pre-Seed. It is not affordable earlier and does not need to be.
