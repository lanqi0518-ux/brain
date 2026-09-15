import 'dotenv/config';
import type { Address, Hex } from 'viem';

function req(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

function opt(name: string): string | undefined {
    const v = process.env[name];
    return v && v.length > 0 ? v : undefined;
}

function addr(name: string): Address | undefined {
    const v = opt(name);
    if (!v) return undefined;
    if (!/^0x[0-9a-fA-F]{40}$/.test(v)) throw new Error(`Bad address in ${name}: ${v}`);
    return v as Address;
}

export const config = {
    keeperPk: req('KEEPER_PK') as Hex,
    l2Rpc: req('KEEPER_ETH_RPC'),
    l3Rpc: opt('KEEPER_L3_RPC'),
    bridgeAddress: addr('BRIDGE_ADDRESS'),
    stockTokens: (opt('STOCK_TOKENS') ?? '').split(',').filter(Boolean) as Address[],
    paymasterAddress: addr('PAYMASTER_ADDRESS'),
    priceFeedUrl: opt('KEEPER_PRICE_FEED') ??
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    syncIntervalMs: Number(opt('SYNC_INTERVAL_MS') ?? '60000'),
    rateIntervalMs: Number(opt('RATE_INTERVAL_MS') ?? '600000'),
};
