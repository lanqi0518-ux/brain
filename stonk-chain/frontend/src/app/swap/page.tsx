'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import {
    AmountInput,
    MarketStatePill,
    Panel,
    PanelHeader,
    Sparkline,
    TokenBadge,
    useMarketState,
} from '@/components/ui';

const MOCK_PRICES: Record<string, { price: number; change24h: number; multiplier: number; series: number[] }> = {
    NVDAx: { price: 128.42, change24h: 2.14, multiplier: 1.00234, series: gen(60, 125, 132) },
    TSLAx: { price: 241.09, change24h: -1.32, multiplier: 1.0, series: gen(60, 238, 247) },
    AAPLx: { price: 220.11, change24h: 0.42, multiplier: 1.00512, series: gen(60, 218, 224) },
    MSFTx: { price: 424.85, change24h: 0.87, multiplier: 1.00089, series: gen(60, 420, 428) },
    HOODx: { price: 42.71, change24h: 4.62, multiplier: 1.0, series: gen(60, 39, 44) },
    COINx: { price: 205.33, change24h: -2.11, multiplier: 1.0, series: gen(60, 203, 214) },
    USDG: { price: 1.0, change24h: 0.0, multiplier: 1.0, series: gen(60, 0.999, 1.001) },
    STONK: { price: 0.021, change24h: 12.7, multiplier: 1.0, series: gen(60, 0.018, 0.023) },
    META: { price: 512.4, change24h: 1.02, multiplier: 1.00119, series: gen(60, 505, 518) },
    AMZNx: { price: 198.7, change24h: 0.55, multiplier: 1.0, series: gen(60, 195, 202) },
    GOOGx: { price: 172.3, change24h: -0.8, multiplier: 1.00098, series: gen(60, 169, 175) },
};

export default function SwapPage() {
    const [fromToken, setFromToken] = useState('USDG');
    const [toToken, setToToken] = useState('NVDAx');
    const [fromAmount, setFromAmount] = useState('');
    const [slippage, setSlippage] = useState(0.5);
    const market = useMarketState();

    const from = MOCK_PRICES[fromToken];
    const to = MOCK_PRICES[toToken];
    const toAmount = useMemo(() => {
        const n = parseFloat(fromAmount);
        if (!n || !from || !to) return '';
        const raw = (n * from.price) / to.price;
        const spread = market.state === 'open' ? 0.003 : market.state === 'closed' ? 0.015 : 0.006;
        return (raw * (1 - spread)).toFixed(6);
    }, [fromAmount, from, to, market.state]);

    const fee = market.state === 'open' ? '30 bps' : market.state === 'closed' ? '150 bps' : '60 bps';

    const flip = () => {
        setFromToken(toToken);
        setToToken(fromToken);
    };

    return (
        <>
            <PageHeader
                kicker="Module · 01 · Swap"
                title="Multiplier-aware AMM"
                subtitle="Every pool is uiMultiplier-aware. Fees widen off-hours. Dividend events rebalance virtual reserves — LPs keep the growth, arbers walk."
            />
            <section className="container-x py-10">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
                    {/* Swap card */}
                    <div className="max-w-xl">
                        <Panel>
                            <div className="px-5 py-3 flex items-center justify-between border-b border-ink-700">
                                <span className="text-sm font-medium text-spark">Swap</span>
                                <div className="flex items-center gap-2">
                                    <MarketStatePill compact />
                                    <SlippagePicker value={slippage} onChange={setSlippage} />
                                </div>
                            </div>
                            <div className="p-4 space-y-2">
                                <AmountInput
                                    label="You pay"
                                    balance="0.00"
                                    valueUsd={
                                        fromAmount && from
                                            ? `≈ $${(parseFloat(fromAmount) * from.price).toLocaleString(undefined, {
                                                  maximumFractionDigits: 2,
                                              })}`
                                            : ''
                                    }
                                    value={fromAmount}
                                    onChange={setFromAmount}
                                    token={fromToken}
                                    onTokenChange={setFromToken}
                                    excludeToken={toToken}
                                />
                                <div className="flex justify-center -my-1 relative z-10">
                                    <button
                                        onClick={flip}
                                        className="w-9 h-9 rounded-full bg-ink-900 border border-ink-700 hover:border-signal/50 flex items-center justify-center transition"
                                    >
                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M7 3v14M3 13l4 4 4-4M17 21V7M21 11l-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                                <AmountInput
                                    label="You receive"
                                    valueUsd={
                                        toAmount && to
                                            ? `≈ $${(parseFloat(toAmount) * to.price).toLocaleString(undefined, {
                                                  maximumFractionDigits: 2,
                                              })}`
                                            : ''
                                    }
                                    value={toAmount}
                                    token={toToken}
                                    onTokenChange={setToToken}
                                    excludeToken={fromToken}
                                    readonly
                                />
                            </div>
                            <div className="px-5 pb-5">
                                <div className="text-xs text-ink-200 space-y-1.5 border-t border-ink-700 pt-4">
                                    <Row k="Rate" v={from && to ? `1 ${fromToken} = ${(from.price / to.price).toFixed(6)} ${toToken}` : '—'} />
                                    <Row k="Fee (hook)" v={fee} highlight />
                                    <Row k="Slippage" v={`${slippage}%`} />
                                    <Row k="Route" v={`${fromToken} → V4 Hook → ${toToken}`} />
                                </div>
                                <button className="btn-signal w-full justify-center mt-5 py-4 text-base">Swap</button>
                            </div>
                        </Panel>
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-6">
                        <Panel>
                            <PanelHeader kicker="Pool" title={`${fromToken} / ${toToken}`} />
                            <div className="p-5 space-y-4">
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <div className="text-3xl num text-spark">
                                            ${to?.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </div>
                                        <div
                                            className={`text-xs font-mono mt-1 ${
                                                (to?.change24h ?? 0) >= 0 ? 'text-signal' : 'text-red-400'
                                            }`}
                                        >
                                            {(to?.change24h ?? 0) >= 0 ? '+' : ''}
                                            {to?.change24h.toFixed(2)}% · 24h
                                        </div>
                                    </div>
                                    <TokenBadge symbol={toToken} size={40} />
                                </div>
                                {to && <Sparkline data={to.series} color={to.change24h >= 0 ? '#d6ff36' : '#f87171'} />}
                            </div>
                        </Panel>

                        <Panel>
                            <PanelHeader kicker="Hook state" title="MultiplierAwareHook" />
                            <div className="p-5 space-y-3 text-sm">
                                <Row k="uiMultiplier" v={to?.multiplier.toFixed(6) ?? '—'} highlight mono />
                                <Row k="Last sync" v="atomic" mono />
                                <Row k="Market state" v={market.state === 'open' ? 'NYSE OPEN' : 'NYSE CLOSED'} mono />
                                <Row k="Fee curve" v={fee} highlight mono />
                                <div className="rule my-3" />
                                <p className="text-xs text-ink-200 leading-relaxed">
                                    Hook reads <code className="text-signal">uiMultiplier()</code> on every swap and
                                    rebalances virtual reserves atomically when it detects a dividend event.
                                </p>
                            </div>
                        </Panel>

                        <Panel>
                            <PanelHeader kicker="Trending" title="Stock Tokens" />
                            <div className="p-2">
                                {Object.entries(MOCK_PRICES)
                                    .filter(([s]) => s !== 'USDG' && s !== 'STONK')
                                    .slice(0, 5)
                                    .map(([s, m]) => (
                                        <div key={s} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-ink-800 transition cursor-default">
                                            <TokenBadge symbol={s} size={24} />
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-spark">{s}</div>
                                                <div className="text-xs text-ink-200 font-mono">
                                                    ${m.price.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="w-16">
                                                <Sparkline data={m.series} color={m.change24h >= 0 ? '#d6ff36' : '#f87171'} height={24} fill={false} />
                                            </div>
                                            <div
                                                className={`text-xs font-mono w-14 text-right ${
                                                    m.change24h >= 0 ? 'text-signal' : 'text-red-400'
                                                }`}
                                            >
                                                {m.change24h >= 0 ? '+' : ''}
                                                {m.change24h.toFixed(2)}%
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </Panel>
                    </aside>
                </div>
            </section>
        </>
    );
}

function Row({ k, v, highlight = false, mono = false }: { k: string; v: string; highlight?: boolean; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-ink-200">{k}</span>
            <span className={`${mono ? 'font-mono' : ''} ${highlight ? 'text-signal' : 'text-spark'}`}>{v}</span>
        </div>
    );
}

function SlippagePicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-ink-800 border border-ink-700 hover:border-signal/40 text-xs font-mono"
            >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                {value}%
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-2 surface p-3 z-20 w-52">
                    <div className="eyebrow-dim mb-2">Slippage tolerance</div>
                    <div className="flex gap-1.5">
                        {[0.1, 0.5, 1.0].map((s) => (
                            <button
                                key={s}
                                onClick={() => {
                                    onChange(s);
                                    setOpen(false);
                                }}
                                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-mono ${
                                    s === value ? 'bg-signal text-ink-950' : 'bg-ink-800 hover:bg-ink-700'
                                }`}
                            >
                                {s}%
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function gen(n: number, min: number, max: number): number[] {
    const out: number[] = [];
    let v = (min + max) / 2;
    for (let i = 0; i < n; i++) {
        v += (Math.random() - 0.5) * (max - min) * 0.15;
        v = Math.max(min, Math.min(max, v));
        out.push(v);
    }
    return out;
}
