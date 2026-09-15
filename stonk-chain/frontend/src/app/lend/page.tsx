'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { Panel, PanelHeader, TokenBadge, Sparkline } from '@/components/ui';

type Market = {
    collateral: string;
    debt: string;
    supplyApy: number;
    borrowApy: number;
    tvl: number;
    utilization: number;
    ltv: number;
    multiplier: number;
    series: number[];
};

const MARKETS: Market[] = [
    { collateral: 'NVDAx', debt: 'USDG', supplyApy: 6.42, borrowApy: 8.11, tvl: 12_400_000, utilization: 68, ltv: 75, multiplier: 1.00234, series: gen(30, 6, 7) },
    { collateral: 'TSLAx', debt: 'USDG', supplyApy: 5.11, borrowApy: 7.35, tvl: 8_120_000, utilization: 54, ltv: 70, multiplier: 1.0, series: gen(30, 4.8, 5.5) },
    { collateral: 'AAPLx', debt: 'USDG', supplyApy: 4.28, borrowApy: 6.02, tvl: 6_050_000, utilization: 42, ltv: 80, multiplier: 1.00512, series: gen(30, 4, 4.6) },
    { collateral: 'MSFTx', debt: 'USDG', supplyApy: 3.91, borrowApy: 5.44, tvl: 3_400_000, utilization: 38, ltv: 80, multiplier: 1.00089, series: gen(30, 3.5, 4.2) },
    { collateral: 'HOODx', debt: 'USDG', supplyApy: 9.82, borrowApy: 12.4, tvl: 1_820_000, utilization: 74, ltv: 60, multiplier: 1.0, series: gen(30, 9, 10.5) },
    { collateral: 'USDG', debt: 'NVDAx', supplyApy: 3.22, borrowApy: 5.11, tvl: 24_100_000, utilization: 62, ltv: 85, multiplier: 1.0, series: gen(30, 3, 3.5) },
];

export default function LendPage() {
    const [selected, setSelected] = useState<Market | null>(null);

    return (
        <>
            <PageHeader
                kicker="Module · 02 · Lend"
                title="Multiplier-aware markets"
                subtitle="Morpho Blue markets where collateral value scales with uiMultiplier. Dividends → automatic health improvement, without touching the position."
            />

            <section className="container-x py-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <StatBig label="Total supplied" value="$56.2M" sub="+ $1.4M · 24h" positive />
                    <StatBig label="Total borrowed" value="$32.1M" sub="57% utilization" />
                    <StatBig label="Avg. supply APY" value="5.4%" sub="weighted by TVL" />
                    <StatBig label="Markets live" value="6" sub="all uiMultiplier-aware" />
                </div>

                <Panel>
                    <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1.4fr_1fr_120px] gap-4 px-6 py-3 border-b border-ink-700 text-ink-300 text-eyebrow">
                        <span>Market</span>
                        <span className="text-right">Supply APY</span>
                        <span className="text-right">Borrow APY</span>
                        <span className="text-right">TVL</span>
                        <span>Utilization</span>
                        <span className="text-right">uiMultiplier</span>
                        <span />
                    </div>
                    {MARKETS.map((m, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[2fr_1fr_1fr_1fr_1.4fr_1fr_120px] gap-4 px-6 py-5 border-b border-ink-700 last:border-b-0 hover:bg-ink-800/60 transition items-center"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    <TokenBadge symbol={m.collateral} size={28} />
                                    <TokenBadge symbol={m.debt} size={28} />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-spark">
                                        {m.collateral} <span className="text-ink-300">/</span> {m.debt}
                                    </div>
                                    <div className="text-[10px] font-mono uppercase tracking-widest text-ink-300">
                                        LTV {m.ltv}%
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm num text-signal">{m.supplyApy.toFixed(2)}%</div>
                                <div className="h-4 mt-0.5 -mr-2">
                                    <Sparkline data={m.series} color="#d6ff36" height={16} fill={false} />
                                </div>
                            </div>
                            <div className="text-sm num text-right text-spark">{m.borrowApy.toFixed(2)}%</div>
                            <div className="text-sm num text-right text-ink-100">${(m.tvl / 1_000_000).toFixed(1)}M</div>
                            <div>
                                <div className="w-full h-1.5 bg-ink-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${
                                            m.utilization > 80 ? 'bg-red-400' : m.utilization > 60 ? 'bg-amber-400' : 'bg-signal'
                                        }`}
                                        style={{ width: `${m.utilization}%` }}
                                    />
                                </div>
                                <div className="text-[10px] font-mono text-ink-300 mt-1">{m.utilization}%</div>
                            </div>
                            <div className={`text-sm num text-right ${m.multiplier > 1 ? 'text-signal' : 'text-ink-100'}`}>
                                {m.multiplier.toFixed(6)}
                            </div>
                            <div className="text-right">
                                <button onClick={() => setSelected(m)} className="btn-outline text-xs px-3 py-1.5">
                                    Supply
                                </button>
                            </div>
                        </div>
                    ))}
                </Panel>
            </section>

            {selected && <SupplyModal m={selected} onClose={() => setSelected(null)} />}
        </>
    );
}

function StatBig({ label, value, sub, positive = false }: { label: string; value: string; sub: string; positive?: boolean }) {
    return (
        <div>
            <div className="eyebrow-dim">{label}</div>
            <div className="mt-2 text-3xl num text-spark">{value}</div>
            <div className={`mt-1 text-xs font-mono ${positive ? 'text-signal' : 'text-ink-200'}`}>{sub}</div>
        </div>
    );
}

function SupplyModal({ m, onClose }: { m: Market; onClose: () => void }) {
    const [amt, setAmt] = useState('');
    return (
        <div
            className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={onClose}
        >
            <Panel className="w-full max-w-md" >
                <div onClick={(e) => e.stopPropagation()}>
                    <PanelHeader
                        title={`Supply ${m.collateral}`}
                        kicker={`${m.collateral}/${m.debt}`}
                        right={
                            <button onClick={onClose} className="text-ink-200 hover:text-spark">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                                </svg>
                            </button>
                        }
                    />
                    <div className="p-5 space-y-4">
                        <div className="bg-ink-900 border border-ink-700 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <span className="eyebrow-dim">Amount</span>
                                <span className="text-xs text-ink-200">Balance 0.00</span>
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                                <input
                                    className="flex-1 bg-transparent outline-none text-2xl font-mono tabular-nums text-spark"
                                    placeholder="0"
                                    value={amt}
                                    onChange={(e) => setAmt(e.target.value)}
                                />
                                <TokenBadge symbol={m.collateral} />
                                <span className="text-sm font-medium">{m.collateral}</span>
                            </div>
                        </div>
                        <div className="text-xs space-y-1.5">
                            <Row k="Supply APY" v={`${m.supplyApy.toFixed(2)}%`} highlight />
                            <Row k="uiMultiplier boost" v={m.multiplier > 1 ? `+${((m.multiplier - 1) * 100).toFixed(4)}%` : '—'} highlight={m.multiplier > 1} />
                            <Row k="Max LTV" v={`${m.ltv}%`} />
                            <Row k="Utilization" v={`${m.utilization}%`} />
                        </div>
                        <button className="btn-signal w-full justify-center py-3">Supply {m.collateral}</button>
                    </div>
                </div>
            </Panel>
        </div>
    );
}

function Row({ k, v, highlight = false }: { k: string; v: string; highlight?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-ink-200">{k}</span>
            <span className={`font-mono ${highlight ? 'text-signal' : 'text-spark'}`}>{v}</span>
        </div>
    );
}

function gen(n: number, min: number, max: number): number[] {
    const out: number[] = [];
    let v = (min + max) / 2;
    for (let i = 0; i < n; i++) {
        v += (Math.random() - 0.5) * (max - min) * 0.2;
        v = Math.max(min, Math.min(max, v));
        out.push(v);
    }
    return out;
}
