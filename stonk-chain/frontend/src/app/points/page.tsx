'use client';

import PageHeader from '@/components/PageHeader';
import { Panel, PanelHeader, TokenBadge } from '@/components/ui';

const TIERS = [
    { name: 'Retail', min: 0, boost: '1×' },
    { name: 'Trader', min: 5_000, boost: '1.5×' },
    { name: 'Whale', min: 50_000, boost: '2×' },
    { name: 'Sovereign', min: 500_000, boost: '3×' },
];

const BREAKDOWN = [
    { source: 'Swap volume', reason: 'LP_STONK_HOOK', pts: 8_420, weight: '1× notional' },
    { source: 'Lend supply', reason: 'MORPHO_SUPPLY', pts: 5_120, weight: '0.5× per $ per day' },
    { source: 'Perp volume', reason: 'LIGHTER_ADAPTER', pts: 3_010, weight: '2× notional' },
    { source: 'Bridge in', reason: 'BRIDGE_INBOUND', pts: 900, weight: '10 per transfer' },
    { source: 'Referrals', reason: 'REFERRAL', pts: 1_800, weight: '10% of invitee' },
];

const LEADERBOARD = [
    { rank: 1, addr: '0x8f…41a2', pts: 812_402, tier: 'Sovereign' },
    { rank: 2, addr: '0xa9…de1c', pts: 501_211, tier: 'Sovereign' },
    { rank: 3, addr: '0x42…9f88', pts: 348_902, tier: 'Whale' },
    { rank: 4, addr: '0xf1…22bc', pts: 210_048, tier: 'Whale' },
    { rank: 5, addr: '0x2d…7710', pts: 148_602, tier: 'Whale' },
    { rank: 6, addr: '0x99…0442', pts: 96_301, tier: 'Whale' },
    { rank: 7, addr: '0x64…8811', pts: 78_150, tier: 'Whale' },
    { rank: 8, addr: '0x03…c4d1', pts: 54_002, tier: 'Whale' },
];

export default function PointsPage() {
    const total = BREAKDOWN.reduce((a, b) => a + b.pts, 0);
    const nextTier = TIERS.find((t) => t.min > total) ?? TIERS[TIERS.length - 1];
    const currentTier = [...TIERS].reverse().find((t) => t.min <= total) ?? TIERS[0];
    const progress = Math.min(100, (total / nextTier.min) * 100);

    return (
        <>
            <PageHeader
                kicker="Module · 06 · Points"
                title="Season 1 · Stockchain Points"
                subtitle="Non-transferable on-chain points ledger. Volume-weighted, wash-slashed. Snapshot converts to $STONK at fair-launch."
            />

            <section className="container-x py-10">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
                    <div className="space-y-6">
                        {/* Big total */}
                        <Panel className="relative overflow-hidden">
                            <div
                                className="absolute inset-0 opacity-[0.15] pointer-events-none"
                                style={{
                                    background:
                                        'radial-gradient(600px 240px at 20% 40%, #d6ff36 0%, transparent 60%)',
                                }}
                            />
                            <div className="relative p-8">
                                <div className="eyebrow-dim">Your points</div>
                                <div className="mt-3 flex items-baseline gap-4">
                                    <div className="text-6xl md:text-7xl num text-spark tracking-tight">
                                        {total.toLocaleString()}
                                    </div>
                                    <div className="text-signal font-mono text-sm">+ 320 · 24h</div>
                                </div>

                                {/* Tier progress */}
                                <div className="mt-8">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <div className="eyebrow-dim">Current tier</div>
                                            <div className="text-lg text-spark">
                                                {currentTier.name} <span className="text-signal font-mono text-sm ml-1">{currentTier.boost}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="eyebrow-dim">Next tier</div>
                                            <div className="text-lg text-ink-100">
                                                {nextTier.name}{' '}
                                                <span className="text-ink-300 font-mono text-sm ml-1">
                                                    @ {nextTier.min.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative h-2 bg-ink-800 rounded-full overflow-hidden">
                                        <div
                                            className="absolute inset-y-0 left-0 bg-signal rounded-full"
                                            style={{
                                                width: `${progress}%`,
                                                boxShadow: '0 0 24px rgba(214,255,54,0.6)',
                                            }}
                                        />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs font-mono text-ink-300">
                                        <span>{progress.toFixed(1)}%</span>
                                        <span>{(nextTier.min - total).toLocaleString()} to go</span>
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        {/* Breakdown */}
                        <Panel>
                            <PanelHeader title="Breakdown by activity" kicker="Sources" />
                            <div>
                                {BREAKDOWN.map((b, i) => (
                                    <div
                                        key={i}
                                        className="grid grid-cols-[1fr_1.2fr_120px_100px] gap-4 px-5 py-4 border-b border-ink-700 last:border-b-0 items-center"
                                    >
                                        <div>
                                            <div className="text-sm text-spark">{b.source}</div>
                                            <div className="text-[10px] font-mono uppercase tracking-widest text-ink-300 mt-0.5">
                                                {b.reason}
                                            </div>
                                        </div>
                                        <div className="text-xs text-ink-200">{b.weight}</div>
                                        <div>
                                            <div className="h-1 bg-ink-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-signal"
                                                    style={{ width: `${(b.pts / total) * 100}%` }}
                                                />
                                            </div>
                                            <div className="text-[10px] font-mono text-ink-300 mt-1">
                                                {((b.pts / total) * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="text-right text-sm num text-spark">
                                            {b.pts.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Panel>

                        {/* Referral */}
                        <Panel>
                            <PanelHeader title="Referral" kicker="Invite" />
                            <div className="p-5 flex items-center gap-3">
                                <code className="flex-1 font-mono text-sm px-3 py-2.5 rounded-lg bg-ink-950 border border-ink-700 text-ink-100 truncate">
                                    stockchain.xyz/r/0x8f4A…41a2
                                </code>
                                <button className="btn-outline text-xs px-4 py-2.5">Copy</button>
                            </div>
                        </Panel>
                    </div>

                    {/* Leaderboard */}
                    <aside>
                        <Panel>
                            <PanelHeader title="Leaderboard" kicker="Season 1" />
                            <div>
                                {LEADERBOARD.map((r) => (
                                    <div
                                        key={r.rank}
                                        className="flex items-center gap-3 px-5 py-3 border-b border-ink-700 last:border-b-0"
                                    >
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono ${
                                                r.rank <= 3
                                                    ? 'bg-signal text-ink-950 font-semibold'
                                                    : 'bg-ink-800 text-ink-200'
                                            }`}
                                        >
                                            {r.rank}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-mono text-spark truncate">{r.addr}</div>
                                            <div className="text-[10px] font-mono uppercase tracking-widest text-ink-300">
                                                {r.tier}
                                            </div>
                                        </div>
                                        <div className="text-sm num text-spark">
                                            {r.pts.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-5 py-4 border-t border-ink-700 text-center text-xs text-ink-200">
                                View full leaderboard →
                            </div>
                        </Panel>

                        <div className="mt-6">
                            <Panel>
                                <PanelHeader title="Snapshot" kicker="Airdrop" />
                                <div className="p-5 text-sm text-ink-100 space-y-3">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-ink-200">Snapshot block</span>
                                        <span className="font-mono text-spark">TBA</span>
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-ink-200">Season 1 pool</span>
                                        <span className="font-mono text-signal">100M STONK</span>
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-ink-200">Wash multiplier</span>
                                        <span className="font-mono text-spark">volume ÷ TVL penalty</span>
                                    </div>
                                    <div className="rule my-2" />
                                    <p className="text-xs text-ink-200 leading-relaxed">
                                        Points are non-transferable. On snapshot, off-chain script converts balances
                                        into $STONK at a deterministic ratio. Wash traders are slashed publicly.
                                    </p>
                                </div>
                            </Panel>
                        </div>
                    </aside>
                </div>
            </section>
        </>
    );
}
