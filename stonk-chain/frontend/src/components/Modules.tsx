'use client';

import Link from 'next/link';
import Reveal from './Reveal';

const MODULES = [
    { i: '01', name: 'MultiplierAwareHook', sub: 'Uniswap V4', body: 'Rebalances virtual reserves on dividend events. Widens fees off-hours. Arbers walk, LPs keep the delta.', href: '/swap' },
    { i: '02', name: 'MultiplierAwareOracle', sub: 'Morpho Blue', body: 'Collateral value scales with uiMultiplier growth. Borrower health improves automatically as dividends accrue.', href: '/lend' },
    { i: '03', name: 'MultiplierBridge', sub: 'Lock & mint', body: 'Snapshots uiMultiplier at deposit, syncs to the destination mirror via keeper. Dividends survive the bridge.', href: '/bridge' },
    { i: '04', name: 'LighterAdapter', sub: 'Perp wrapper', body: 'Graduated circuit breaker: leverage tightens off-hours instead of halting. Fees route to STONK buy-and-burn.', href: '/perp' },
    { i: '05', name: 'PortfolioMarginRouter', sub: 'Cross-protocol', body: 'Lighter perp collateral doubles as Morpho collateral. One position, two protocols, capital-efficient.', href: '/perp' },
    { i: '06', name: 'SessionKeyRouter', sub: 'AI-agent native', body: 'Vendor-neutral session keys. Scoped by contract, function, notional, and time. One authorization, thirty days of trading.', href: '/swap' },
    { i: '07', name: 'UsdgPaymaster', sub: 'ERC-4337', body: 'Pay gas in USDG. Markup routes to STONK buy-and-burn. Zero native token required in the wallet.', href: '/points' },
    { i: '08', name: 'StonkToken', sub: '$STONK', body: '1B fixed supply. One-way trading switch renounces ownership on flip. Built-in burnFromFees counter, publicly auditable.', href: '/points' },
    { i: '09', name: 'StonkPoints', sub: 'Airdrop ledger', body: 'Non-transferable. Awarder-scoped roles per module. Snapshot freezes the airdrop math deterministically.', href: '/points' },
];

export default function Modules() {
    return (
        <section className="border-t border-ink-700">
            <div className="container-x py-32 md:py-40">
                <Reveal>
                    <div className="eyebrow">03 · Primitives</div>
                </Reveal>
                <Reveal delay={80}>
                    <h2 className="mt-6 text-display font-medium tracking-tight text-spark max-w-3xl">
                        Nine contracts. All uiMultiplier-aware.
                    </h2>
                </Reveal>
                <Reveal delay={160}>
                    <p className="mt-6 max-w-2xl text-lg text-ink-100 leading-relaxed">
                        Each primitive is deployable on the L3 or as a drop-in on any Arbitrum Orbit chain today.
                        Production-ready. 56 / 56 tests. Open source.
                    </p>
                </Reveal>

                <Reveal delay={220} className="mt-16 border-t border-ink-700">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3">
                        {MODULES.map((m) => (
                            <Link
                                key={m.i}
                                href={m.href}
                                className="group relative p-8 border-b border-r border-ink-700 last:border-r-0 md:border-r [&:nth-child(2n)]:lg:border-r [&:nth-child(3n)]:lg:border-r-0 hover:bg-ink-900/60 transition"
                            >
                                <div className="flex items-baseline justify-between">
                                    <span className="text-eyebrow text-ink-300">{m.i}</span>
                                    <span className="text-eyebrow text-ink-200">{m.sub}</span>
                                </div>
                                <div className="mt-6 text-2xl font-medium tracking-tight text-spark group-hover:text-signal transition-colors">
                                    {m.name}
                                </div>
                                <p className="mt-3 text-sm text-ink-100 leading-relaxed">{m.body}</p>
                                <div className="mt-8 flex items-center gap-2 text-eyebrow text-ink-200 group-hover:text-signal transition">
                                    Explore
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </Link>
                        ))}
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
