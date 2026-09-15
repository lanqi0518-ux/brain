import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from './config.js';
import { paymasterAbi } from './abi.js';
import { log } from './logger.js';

/**
 * Paymaster rate updater.
 *
 * The paymaster charges gas in USDG. To do that it needs a fresh
 * native-token -> USDG price. We pull the price from a public feed and
 * push it on-chain if it has drifted more than 0.5 % or if the on-chain
 * value is about to become stale.
 */
async function fetchNativeUsdPrice(): Promise<number> {
    const res = await fetch(config.priceFeedUrl);
    if (!res.ok) throw new Error(`price feed ${res.status}`);
    const j = (await res.json()) as Record<string, { usd: number }>;
    const first = Object.values(j)[0];
    if (!first || typeof first.usd !== 'number') throw new Error('bad price feed shape');
    return first.usd;
}

export async function updateRateOnce(): Promise<void> {
    if (!config.paymasterAddress) {
        log.warn('PAYMASTER_ADDRESS unset; rate update skipped');
        return;
    }
    const account = privateKeyToAccount(config.keeperPk);
    const pub = createPublicClient({ transport: http(config.l2Rpc) });
    const wallet = createWalletClient({ transport: http(config.l2Rpc), account });

    const [current, lastUpdate, maxStale] = await Promise.all([
        pub.readContract({
            address: config.paymasterAddress as Address,
            abi: paymasterAbi,
            functionName: 'nativePriceInUsdg',
        }) as Promise<bigint>,
        pub.readContract({
            address: config.paymasterAddress as Address,
            abi: paymasterAbi,
            functionName: 'lastRateUpdate',
        }) as Promise<bigint>,
        pub.readContract({
            address: config.paymasterAddress as Address,
            abi: paymasterAbi,
            functionName: 'maxRateStaleness',
        }) as Promise<bigint>,
    ]);

    const usd = await fetchNativeUsdPrice();
    // USDG has 6 decimals on Robinhood Chain; assume same on Arb Sepolia
    // mock. Rate meaning: how many USDG (raw, 6-dec) per 1e18 wei native.
    // => rate = usd_price * 1e6
    const nextRate = BigInt(Math.round(usd * 1_000_000));

    const now = BigInt(Math.floor(Date.now() / 1000));
    const stale = current === 0n || now - lastUpdate > (maxStale * 3n) / 4n;

    // Drift check: > 0.5 % triggers an update.
    let drifted = false;
    if (current !== 0n) {
        const diff = nextRate > current ? nextRate - current : current - nextRate;
        drifted = (diff * 200n) / current > 1n;
    }

    if (!stale && !drifted) {
        log.info({ current: current.toString(), next: nextRate.toString(), usd }, 'rate fresh, skip');
        return;
    }

    const hash = await wallet.writeContract({
        chain: null,
        address: config.paymasterAddress as Address,
        abi: paymasterAbi,
        functionName: 'updateRate',
        args: [nextRate],
    });
    log.info({ hash, from: current.toString(), to: nextRate.toString(), usd, stale, drifted }, 'rate update tx');
}

async function loop() {
    for (;;) {
        try {
            await updateRateOnce();
        } catch (err) {
            log.error({ err }, 'rate update failed');
        }
        await new Promise((r) => setTimeout(r, config.rateIntervalMs));
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    loop().catch((err) => {
        log.fatal({ err }, 'paymasterRate crashed');
        process.exit(1);
    });
}
