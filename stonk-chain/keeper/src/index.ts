import { config } from './config.js';
import { log } from './logger.js';
import { syncOnce } from './multiplierSync.js';
import { updateRateOnce } from './paymasterRate.js';

/**
 * Single-process orchestrator that runs the two keeper loops on their
 * own timers. Each loop is fault-isolated so a failure in one does not
 * stop the other.
 */
async function main() {
    log.info(
        {
            l2Rpc: config.l2Rpc,
            bridge: config.bridgeAddress,
            paymaster: config.paymasterAddress,
            stocks: config.stockTokens.length,
            syncInterval: config.syncIntervalMs,
            rateInterval: config.rateIntervalMs,
        },
        'stockchain-keeper starting',
    );

    // Sync loop
    (async () => {
        for (;;) {
            try {
                await syncOnce();
            } catch (err) {
                log.error({ err }, 'sync loop error');
            }
            await new Promise((r) => setTimeout(r, config.syncIntervalMs));
        }
    })();

    // Rate loop
    (async () => {
        for (;;) {
            try {
                await updateRateOnce();
            } catch (err) {
                log.error({ err }, 'rate loop error');
            }
            await new Promise((r) => setTimeout(r, config.rateIntervalMs));
        }
    })();
}

main().catch((err) => {
    log.fatal({ err }, 'keeper crashed');
    process.exit(1);
});
