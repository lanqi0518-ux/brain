'use client';

import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import {
    MarketStatePill,
    Panel,
    PanelHeader,
    SegmentedTabs,
    Sparkline,
    TokenBadge,
    useMarketState,
} from '@/components/ui';

const PERP_MARKETS = [
    { symbol: 'NVDAx-PERP', mark: 128.42, change: 2.14, funding: 0.0084, oi: 12_400_000 },
    { symbol: 'TSLAx-PERP', mark: 241.09, change: -1.32, funding: -0.0032, oi: 8_120_000 },
    { symbol: 'AAPLx-PERP', mark: 220.11, change: 0.42, funding: 0.0011, oi: 6_050_000 },
    { symbol: 'MSFTx-PERP', mark: 424.85, change: 0.87, funding: 0.0022, oi: 3_400_000 },
    { symbol: 'HOODx-PERP', mark: 42.71, change: 4.62, funding: 0.0198, oi: 1_820_000 },
    { symbol: 'COINx-PERP', mark: 205.33, change: -2.11, funding: -0.0053, oi: 940_000 },
];

export default function PerpPage() {
    const [market, setMarket] = useState('NVDAx-PERP');
    const [side, setSide] = useState<'long' | 'short'>('long');
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
    const [size, setSize] = useState('');
    const [leverage, setLeverage] = useState(10);
    const state = useMarketState();

    const m = PERP_MARKETS.find((x) => x.symbol === market)!;
    const maxLev = state.state === 'open' ? 50 : state.state === 'closed' ? 3 : 10;
    const clamped = leverage > maxLev;

    // fake price ticker
    const [tick, setTick] = useState(m.mark);
    useEffect(() => {
        setTick(m.mark);
        const id = setInterval(() => setTick((t) => t + (Math.random() - 0.5) * m.mark * 0.001), 1200);
        return () => clearInterval(id);
    }, [market, m.mark]);

    const notional = size ? parseFloat(size) * tick : 0;

    return (
        <>
            <PageHeader
                kicker="Module · 04 · Perp"
                title="Stockchain Perpetuals"
                subtitle="Lighter perps wrapped by a market-hours-aware adapter. Leverage tightens outside the bell — no hard halt."
            />

            {/* market bar */}
            <section className="border-b border-ink-700 bg-ink-950">
                <div className="container-x py-4 flex items-center gap-8 overflow-x-auto">
                    <MarketPicker value={market} onChange={setMarket} />
                    <div className="flex items-baseline gap-8">
                        <div>
                            <div className="eyebrow-dim">Mark</div>
                            <div className="text-2xl num text-spark">
                                ${tick.toFixed(2)}
                            </div>
                        </div>
                        <div>
                            <div className="eyebrow-dim">24h</div>
                            <div className={`num ${m.change >= 0 ? 'text-signal' : 'text-red-400'}`}>
                                {m.change >= 0 ? '+' : ''}
                                {m.change.toFixed(2)}%
                            </div>
                        </div>
                        <div>
                            <div className="eyebrow-dim">Funding · 1h</div>
                            <div className={`num ${m.funding >= 0 ? 'text-signal' : 'text-red-400'}`}>
                                {(m.funding * 100).toFixed(4)}%
                            </div>
                        </div>
                        <div>
                            <div className="eyebrow-dim">Open interest</div>
                            <div className="num text-spark">${m.oi.toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="eyebrow-dim">Max leverage</div>
                            <div className="num text-signal">{maxLev}×</div>
                        </div>
                    </div>
                    <div className="ml-auto">
                        <MarketStatePill />
                    </div>
                </div>
            </section>

            {/* trading terminal */}
            <section className="container-x py-6 grid grid-cols-[1fr_320px] gap-4 min-h-[640px]">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-4">
                    <Panel className="min-h-[540px]">
                        <PanelHeader
                            title={`${market} · 1H`}
                            kicker="Chart"
                            right={
                                <SegmentedTabs
                                    size="sm"
                                    value="1H"
                                    onChange={() => {}}
                                    options={[
                                        { value: '5M', label: '5M' },
                                        { value: '15M', label: '15M' },
                                        { value: '1H', label: '1H' },
                                        { value: '4H', label: '4H' },
                                        { value: '1D', label: '1D' },
                                    ]}
                                />
                            }
                        />
                        <CandleChart mark={tick} change={m.change} />
                    </Panel>
                    <Panel className="min-h-[540px]">
                        <PanelHeader title="Order book" kicker="0.10" />
                        <OrderBook mark={tick} />
                    </Panel>
                </div>

                {/* Trade panel */}
                <Panel className="h-fit sticky top-24">
                    <div className="p-4 space-y-4">
                        <SegmentedTabs
                            value={side}
                            onChange={setSide}
                            options={[
                                { value: 'long', label: 'Long' },
                                { value: 'short', label: 'Short' },
                            ]}
                        />
                        <SegmentedTabs
                            value={orderType}
                            onChange={setOrderType}
                            size="sm"
                            options={[
                                { value: 'market', label: 'Market' },
                                { value: 'limit', label: 'Limit' },
                            ]}
                        />

                        <div>
                            <div className="eyebrow-dim mb-2">Size</div>
                            <div className="flex items-stretch bg-ink-900 border border-ink-700 rounded-xl overflow-hidden">
                                <input
                                    className="flex-1 bg-transparent outline-none px-3 py-3 text-xl font-mono tabular-nums text-spark"
                                    placeholder="0.00"
                                    value={size}
                                    onChange={(e) => setSize(e.target.value)}
                                    inputMode="decimal"
                                />
                                <div className="flex items-center px-3 border-l border-ink-700 text-xs text-ink-200 font-mono">
                                    {market.split('-')[0]}
                                </div>
                            </div>
                            <div className="mt-1 text-xs text-ink-200">
                                ≈ ${notional.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="eyebrow-dim">Leverage</span>
                                <span className={`text-sm font-mono ${clamped ? 'text-amber-400' : 'text-signal'}`}>
                                    {leverage}× {clamped && `· capped @ ${maxLev}×`}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={50}
                                step={1}
                                value={leverage}
                                onChange={(e) => setLeverage(Number(e.target.value))}
                                className="w-full accent-signal"
                            />
                            <div className="mt-1 flex justify-between text-[10px] text-ink-300 font-mono">
                                <span>1×</span>
                                <span>10×</span>
                                <span>25×</span>
                                <span>50×</span>
                            </div>
                        </div>

                        <div className="text-xs space-y-1.5 border-t border-ink-700 pt-3">
                            <Row k="Entry" v={`$${tick.toFixed(2)}`} />
                            <Row k="Liquidation" v={`$${(tick * (side === 'long' ? 1 - 1 / leverage : 1 + 1 / leverage)).toFixed(2)}`} warn />
                            <Row k="Notional" v={`$${notional.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
                            <Row k="Margin" v={`$${(notional / leverage).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
                            <Row k="Fee" v={state.state === 'open' ? '2 bps' : '10 bps'} />
                        </div>

                        <button
                            className={`w-full py-3.5 rounded-full font-semibold text-sm transition ${
                                side === 'long'
                                    ? 'bg-signal text-ink-950 hover:brightness-110'
                                    : 'bg-red-400 text-ink-950 hover:brightness-110'
                            } ${clamped ? 'opacity-40 cursor-not-allowed' : ''}`}
                            disabled={clamped}
                        >
                            {side === 'long' ? 'Long' : 'Short'} {market.split('-')[0]}
                        </button>
                    </div>
                </Panel>
            </section>

            {/* Positions / open orders / history tabs */}
            <section className="container-x pb-16">
                <Panel>
                    <div className="px-5 py-3 border-b border-ink-700 flex items-center gap-6 text-sm">
                        <span className="text-spark font-medium">Positions <span className="text-ink-300">(0)</span></span>
                        <span className="text-ink-200 hover:text-spark cursor-pointer">Open orders (0)</span>
                        <span className="text-ink-200 hover:text-spark cursor-pointer">History</span>
                    </div>
                    <div className="p-16 text-center text-ink-200 text-sm">
                        No positions. Deposit USDG to get started.
                    </div>
                </Panel>
            </section>
        </>
    );
}

function Row({ k, v, warn = false }: { k: string; v: string; warn?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-ink-200">{k}</span>
            <span className={`font-mono ${warn ? 'text-amber-400' : 'text-spark'}`}>{v}</span>
        </div>
    );
}

function MarketPicker({ value, onChange }: { value: string; onChange: (s: string) => void }) {
    const [open, setOpen] = useState(false);
    const cur = PERP_MARKETS.find((m) => m.symbol === value)!;
    return (
        <div className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-ink-900 border border-ink-700 hover:border-signal/40 transition"
            >
                <TokenBadge symbol={cur.symbol.replace('-PERP', '')} size={28} />
                <div className="text-left">
                    <div className="text-sm font-medium text-spark">{cur.symbol}</div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-ink-300">Perpetual</div>
                </div>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-2 w-[420px] surface z-20 overflow-hidden">
                    <div className="px-4 py-3 border-b border-ink-700 grid grid-cols-[1fr_80px_80px_80px] gap-3 text-eyebrow-dim">
                        <span>Market</span>
                        <span className="text-right">Mark</span>
                        <span className="text-right">24h</span>
                        <span className="text-right">OI</span>
                    </div>
                    {PERP_MARKETS.map((m) => (
                        <button
                            key={m.symbol}
                            onClick={() => {
                                onChange(m.symbol);
                                setOpen(false);
                            }}
                            className="w-full grid grid-cols-[1fr_80px_80px_80px] gap-3 px-4 py-3 items-center hover:bg-ink-800 transition text-left"
                        >
                            <div className="flex items-center gap-2">
                                <TokenBadge symbol={m.symbol.replace('-PERP', '')} size={20} />
                                <span className="text-sm text-spark">{m.symbol}</span>
                            </div>
                            <span className="text-sm font-mono text-right text-spark">${m.mark.toFixed(2)}</span>
                            <span className={`text-sm font-mono text-right ${m.change >= 0 ? 'text-signal' : 'text-red-400'}`}>
                                {m.change >= 0 ? '+' : ''}
                                {m.change.toFixed(2)}%
                            </span>
                            <span className="text-sm font-mono text-right text-ink-100">${(m.oi / 1_000_000).toFixed(1)}M</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function CandleChart({ mark, change }: { mark: number; change: number }) {
    // Generate deterministic-ish candles
    const bars = useMemo(() => {
        const n = 60;
        const out: Array<{ o: number; h: number; l: number; c: number }> = [];
        let px = mark * (1 - change / 200);
        for (let i = 0; i < n; i++) {
            const drift = (Math.random() - 0.5) * mark * 0.008;
            const o = px;
            const c = Math.max(mark * 0.9, Math.min(mark * 1.1, px + drift));
            const h = Math.max(o, c) + Math.random() * mark * 0.004;
            const l = Math.min(o, c) - Math.random() * mark * 0.004;
            out.push({ o, h, l, c });
            px = c;
        }
        out[out.length - 1].c = mark;
        return out;
    }, [mark, change]);

    const max = Math.max(...bars.map((b) => b.h));
    const min = Math.min(...bars.map((b) => b.l));
    const span = Math.max(max - min, 1e-9);
    const W = 800;
    const H = 460;
    const bw = W / bars.length;
    const y = (v: number) => H - ((v - min) / span) * (H - 40) - 20;

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
                <defs>
                    <linearGradient id="grid-x" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
                    </linearGradient>
                </defs>
                {/* grid */}
                {Array.from({ length: 5 }).map((_, i) => (
                    <line
                        key={i}
                        x1={0}
                        y1={(H / 5) * (i + 1)}
                        x2={W}
                        y2={(H / 5) * (i + 1)}
                        stroke="rgba(255,255,255,0.04)"
                        strokeWidth="1"
                    />
                ))}
                {/* candles */}
                {bars.map((b, i) => {
                    const up = b.c >= b.o;
                    const col = up ? '#d6ff36' : '#f87171';
                    const cx = i * bw + bw / 2;
                    return (
                        <g key={i}>
                            <line x1={cx} y1={y(b.h)} x2={cx} y2={y(b.l)} stroke={col} strokeWidth="1" />
                            <rect
                                x={cx - bw * 0.32}
                                y={y(Math.max(b.o, b.c))}
                                width={bw * 0.64}
                                height={Math.max(1, Math.abs(y(b.o) - y(b.c)))}
                                fill={col}
                                opacity={up ? 0.9 : 0.85}
                            />
                        </g>
                    );
                })}
                {/* current price line */}
                <line
                    x1={0}
                    y1={y(mark)}
                    x2={W}
                    y2={y(mark)}
                    stroke="#d6ff36"
                    strokeWidth="1"
                    strokeDasharray="3 4"
                    opacity="0.6"
                />
                <rect x={W - 76} y={y(mark) - 12} width="72" height="22" rx="4" fill="#d6ff36" />
                <text x={W - 40} y={y(mark) + 3} textAnchor="middle" fontSize="11" fontFamily="ui-monospace" fill="#050506">
                    {mark.toFixed(2)}
                </text>
            </svg>
        </div>
    );
}

function OrderBook({ mark }: { mark: number }) {
    const asks = useMemo(() => generateBook(mark, 12, 'ask'), [mark]);
    const bids = useMemo(() => generateBook(mark, 12, 'bid'), [mark]);
    const maxA = Math.max(...asks.map((r) => r.size));
    const maxB = Math.max(...bids.map((r) => r.size));

    return (
        <div className="text-xs font-mono">
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-4 py-2 border-b border-ink-700 text-ink-300 text-eyebrow">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Total</span>
            </div>
            <div>
                {asks.map((a, i) => (
                    <div key={`a${i}`} className="relative grid grid-cols-[1fr_1fr_1fr] gap-2 px-4 py-1 tabular-nums">
                        <div
                            className="absolute inset-y-0 right-0 bg-red-400/[0.08]"
                            style={{ width: `${(a.size / maxA) * 100}%` }}
                        />
                        <span className="relative text-red-400">{a.price.toFixed(2)}</span>
                        <span className="relative text-right text-ink-100">{a.size.toFixed(2)}</span>
                        <span className="relative text-right text-ink-200">{a.total.toFixed(2)}</span>
                    </div>
                ))}
            </div>
            <div className="px-4 py-3 border-y border-ink-700 flex items-baseline justify-between">
                <span className="text-lg text-signal">${mark.toFixed(2)}</span>
                <span className="text-[10px] text-ink-300">Spread 0.03</span>
            </div>
            <div>
                {bids.map((b, i) => (
                    <div key={`b${i}`} className="relative grid grid-cols-[1fr_1fr_1fr] gap-2 px-4 py-1 tabular-nums">
                        <div
                            className="absolute inset-y-0 right-0 bg-signal/[0.08]"
                            style={{ width: `${(b.size / maxB) * 100}%` }}
                        />
                        <span className="relative text-signal">{b.price.toFixed(2)}</span>
                        <span className="relative text-right text-ink-100">{b.size.toFixed(2)}</span>
                        <span className="relative text-right text-ink-200">{b.total.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function generateBook(mark: number, n: number, side: 'ask' | 'bid') {
    let total = 0;
    const arr: Array<{ price: number; size: number; total: number }> = [];
    for (let i = 0; i < n; i++) {
        const off = (i + 1) * mark * 0.0005 * (side === 'ask' ? 1 : -1);
        const size = Math.round((Math.random() * 400 + 20) * 100) / 100;
        total += size;
        arr.push({ price: mark + off, size, total });
    }
    return side === 'ask' ? arr.reverse() : arr;
}
