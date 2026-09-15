import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from './config.js';
import { scaledUiAmountAbi, bridgeAbi } from './abi.js';
import { log } from './logger.js';

/**
 * Multiplier sync loop.
 *
 * For each Stock Token registered on the bridge we:
 *   1. Read the canonical `uiMultiplier()` on L2 (source of truth).
 *   2. Read the last synced multiplier stored in the bridge.
 *   3. If they differ, call `updateMultiplier(stock, newMultiplier)` on
 *      the bridge, which in turn schedules a message to the L3 mirror.
 *
 * The loop is idempotent — if the multiplier is already fresh, the
 * function is a no-op. Failures are logged and the loop keeps running so
 * a transient RPC hiccup does not halt the service.
 */
export async function syncOnce(): Promise<void> {
    if (!config.bridgeAddress) {
        log.warn('BRIDGE_ADDRESS unset; sync skipped');
        return;
    }
    if (config.stockTokens.length === 0) {
        log.warn('STOCK_TOKENS unset; sync skipped');
        return;
    }

    const account = privateKeyToAccount(config.keeperPk);
    const pub = createPublicClient({ transport: http(config.l2Rpc) });
    const wallet = createWalletClient({ transport: http(config.l2Rpc), account });

    for (const stock of config.stockTokens) {
        try {
            const [onChainMult, bridgeState] = await Promise.all([
                pub.readContract({ address: stock, abi: scaledUiAmountAbi, functionName: 'uiMultiplier' }),
                pub.readContract({
                    address: config.bridgeAddress as Address,
                    abi: bridgeAbi,
                    functionName: 'stocks',
                    args: [stock],
                }),
            ]);

            const lastSynced = (bridgeState as unknown as readonly [boolean, Address, bigint, bigint])[2];
            if (lastSynced === onChainMult) {
                log.info({ stock, multiplier: onChainMult.toString() }, 'already synced');
                continue;
            }

            const hash = await wallet.writeContract({
                chain: null,
                address: config.bridgeAddress as Address,
                abi: bridgeAbi,
                functionName: 'updateMultiplier',
                args: [stock, onChainMult],
            });
            log.info({ stock, hash, from: lastSynced.toString(), to: onChainMult.toString() }, 'multiplier sync tx sent');
        } catch (err) {
            log.error({ err, stock }, 'sync failed');
        }
    }
}

async function loop() {
    for (;;) {
        await syncOnce();
        await new Promise((r) => setTimeout(r, config.syncIntervalMs));
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    loop().catch((err) => {
        log.fatal({ err }, 'multiplierSync crashed');
        process.exit(1);
    });
}
