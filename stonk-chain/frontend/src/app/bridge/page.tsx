'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { AmountInput, Panel, PanelHeader, TokenBadge } from '@/components/ui';

const NETWORKS = [
    {
        id: 'l2',
        name: 'Robinhood Chain',
        subtitle: 'L2 · Arbitrum Orbit',
        chainId: 42_069,
        color: '#22c55e',
        tokens: ['NVDAx', 'TSLAx', 'AAPLx', 'MSFTx', 'HOODx', 'USDG'],
    },
    {
        id: 'l3',
        name: 'Stockchain',
        subtitle: 'L3 · corporate-action native',
        chainId: 984_121,
        color: '#d6ff36',
        tokens: ['NVDAx', 'TSLAx', 'AAPLx', 'MSFTx', 'HOODx', 'USDG'],
    },
];

export default function BridgePage() {
    const [fromId, setFromId] = useState('l2');
    const [toId, setToId] = useState('l3');
    const [token, setToken] = useState('NVDAx');
    const [amount, setAmount] = useState('');

    const from = NETWORKS.find((n) => n.id === fromId)!;
    const to = NETWORKS.find((n) => n.id === toId)!;

    const swap = () => {
        setFromId(toId);
        setToId(fromId);
    };

    const eta = fromId === 'l2' ? '~ 2 min' : '~ 40 min · challenge window';
    const fee = '0.00 · gas rebated';
    const multiplier = 1.00234;
    const receive = useMemo(() => {
        const n = parseFloat(amount);
        if (!n) return '';
        return n.toFixed(6);
    }, [amount]);

    return (
        <>
            <PageHeader
                kicker="Module · 05 · Bridge"
                title="Canonical multiplier bridge"
                subtitle="Lock-and-mint bridge that preserves uiMultiplier across L2 and L3. Dividend growth follows the token — even mid-transit."
            />

            <section className="container-x py-10 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
                <div className="max-w-2xl">
                    <Panel>
                        <PanelHeader title="Transfer" kicker="Bridge" />
                        <div className="p-5">
                            {/* Network selectors */}
                            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
                                <NetworkCard net={from} label="From" />
                                <button
                                    onClick={swap}
                                    className="self-center w-10 h-10 rounded-full bg-ink-800 border border-ink-700 hover:border-signal/40 flex items-center justify-center transition"
                                >
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 7H3l4-4M7 17h14l-4 4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <NetworkCard net={to} label="To" />
                            </div>

                            <div className="mt-4 space-y-2">
                                <AmountInput
                                    label="Amount"
                                    balance="0.00"
                                    value={amount}
                                    onChange={setAmount}
                                    token={token}
                                    onTokenChange={setToken}
                                />
                                <AmountInput
                                    label="You receive"
                                    value={receive}
                                    token={token}
                                    readonly
                                />
                            </div>

                            {/* Route summary */}
                            <div className="mt-5 border-t border-ink-700 pt-4 space-y-1.5 text-xs">
                                <Row k="Bridge fee" v={fee} highlight />
                                <Row k="Est. time" v={eta} />
                                <Row k="uiMultiplier snapshot" v={multiplier.toFixed(6)} highlight mono />
                                <Row k="Recipient" v="0x… (your address)" />
                            </div>

                            <button className="btn-signal w-full justify-center mt-5 py-3.5">
                                Bridge {token} → {to.name}
                            </button>
                        </div>
                    </Panel>

                    {/* History */}
                    <div className="mt-8">
                        <div className="eyebrow-dim mb-3">Recent transfers</div>
                        <Panel>
                            <div className="hidden md:grid grid-cols-[100px_1fr_1fr_1fr_100px] gap-4 px-5 py-3 border-b border-ink-700 text-eyebrow-dim">
                                <span>Time</span>
                                <span>Route</span>
                                <span className="text-right">Amount</span>
                                <span className="text-right">Multiplier</span>
                                <span className="text-right">Status</span>
                            </div>
                            {[
                                { t: '2m ago', route: 'L2 → L3', tok: 'NVDAx', amt: '124.20', m: '1.00234', st: 'confirmed' },
                                { t: '18m', route: 'L3 → L2', tok: 'USDG', amt: '2,500', m: '1.00000', st: 'confirmed' },
                                { t: '1h', route: 'L2 → L3', tok: 'AAPLx', amt: '48.10', m: '1.00512', st: 'confirmed' },
                            ].map((r, i) => (
                                <div key={i} className="grid grid-cols-[100px_1fr_1fr_1fr_100px] gap-4 px-5 py-3 border-b border-ink-700 last:border-b-0 text-sm items-center">
                                    <span className="text-ink-200 font-mono text-xs">{r.t}</span>
                                    <span className="flex items-center gap-2">
                                        <TokenBadge symbol={r.tok} size={20} /> {r.tok} <span className="text-ink-300 text-xs">{r.route}</span>
                                    </span>
                                    <span className="text-right font-mono text-spark">{r.amt}</span>
                                    <span className="text-right font-mono text-signal">{r.m}</span>
                                    <span className="text-right">
                                        <span className="inline-block px-2 py-0.5 rounded-full bg-signal/10 text-signal text-[10px] uppercase tracking-widest">
                                            {r.st}
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </Panel>
                    </div>
                </div>

                <aside className="space-y-6">
                    <Panel>
                        <PanelHeader kicker="Chain of trust" title="How this works" />
                        <div className="p-5 space-y-4 text-sm text-ink-100 leading-relaxed">
                            <p>
                                Bridge records <span className="text-signal font-mono">uiMultiplier</span> at deposit
                                time on the source chain and mints a receipt on the destination — carrying the multiplier
                                with it.
                            </p>
                            <p>
                                Keepers sync incremental multiplier growth every corporate-action event, so bridged
                                tokens keep receiving dividends in transit.
                            </p>
                            <div className="rule" />
                            <ul className="space-y-2 text-xs text-ink-200">
                                <li>· Lock on source · mint on dest</li>
                                <li>· Multiplier snapshot recorded on-chain</li>
                                <li>· Keeper syncs Δ every dividend event</li>
                                <li>· Claim released after challenge window</li>
                            </ul>
                        </div>
                    </Panel>

                    <Panel>
                        <PanelHeader kicker="Live" title="Bridge stats" />
                        <div className="p-5 grid grid-cols-2 gap-4">
                            <Stat label="TVL" v="$18.2M" />
                            <Stat label="24h volume" v="$4.1M" />
                            <Stat label="Transfers" v="1,204" />
                            <Stat label="Avg. latency" v="2m 18s" />
                        </div>
                    </Panel>
                </aside>
            </section>
        </>
    );
}

function NetworkCard({ net, label }: { net: (typeof NETWORKS)[number]; label: string }) {
    return (
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-4 flex items-center gap-3">
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-semibold"
                style={{ background: `linear-gradient(140deg, ${net.color}, ${net.color}80)`, color: '#050506' }}
            >
                {net.id === 'l2' ? 'L2' : 'L3'}
            </div>
            <div className="min-w-0">
                <div className="eyebrow-dim">{label}</div>
                <div className="text-sm font-medium text-spark truncate">{net.name}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-ink-300 truncate">
                    {net.subtitle}
                </div>
            </div>
        </div>
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

function Stat({ label, v }: { label: string; v: string }) {
    return (
        <div>
            <div className="eyebrow-dim">{label}</div>
            <div className="text-xl num text-spark mt-1">{v}</div>
        </div>
    );
}
