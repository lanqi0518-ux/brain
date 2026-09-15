'use client';

import Reveal from './Reveal';

type S = 'done' | 'live' | 'next' | 'plan';
const PHASES: Array<{ title: string; desc: string; state: S; when: string }> = [
    {
        title: 'L3-ready contracts + tests',
        desc: 'Nine contracts sized to run natively on the L3. Slither clean. 56/56 fuzz tests green.',
        state: 'done',
        when: 'Shipped',
    },
    {
        title: 'CI + frontend + keeper',
        desc: 'GitHub Actions running fmt/build/test/slither. Next.js frontend at stockchain.fly.dev. TypeScript keeper for multiplier sync.',
        state: 'done',
        when: 'Shipped',
    },
    {
        title: 'Arb Sepolia devnet',
        desc: 'Full stack deployed against live Uniswap V4 on Arb Sepolia. Mock Stock Tokens with dividend replay. Public playground.',
        state: 'live',
        when: 'This week',
    },
    {
        title: 'Pons fair launch — $STONK',
        desc: '$STONK against USDG. 75 % on the public curve. Points snapshot starts the moment the pool opens.',
        state: 'next',
        when: 'Q4',
    },
    {
        title: 'Security audit',
        desc: 'Spearbit / Trail of Bits / Zellic, funded from launch proceeds. Fixes merged. Trading enabled on flip.',
        state: 'plan',
        when: 'Q4 / Q1',
    },
    {
        title: 'Caldera L3 devnet',
        desc: 'Deploy Stockchain L3. Custom precompile for uiMultiplier. Market-hours-aware sequencer plugin. USDG paymaster wired into the fee escrow.',
        state: 'plan',
        when: 'H1',
    },
    {
        title: 'L3 mainnet',
        desc: 'Arbitrum Orbit L3 settling to Robinhood Chain. Corporate-action inbox. STONK gas burn at the consensus level. Custom-domain frontend.',
        state: 'plan',
        when: 'H2',
    },
];

export default function Roadmap() {
    return (
        <section className="border-t border-ink-700">
            <div className="container-x py-32 md:py-40">
                <Reveal>
                    <div className="eyebrow">05 · Roadmap</div>
                </Reveal>
                <Reveal delay={80}>
                    <h2 className="mt-6 text-display font-medium tracking-tight text-spark">
                        From contracts to L3 mainnet.
                    </h2>
                </Reveal>

                <div className="mt-16">
                    {PHASES.map((p, i) => (
                        <Reveal key={i} delay={80 + i * 40}>
                            <div className="grid grid-cols-[80px_1fr_180px] md:grid-cols-[100px_1fr_200px] gap-6 items-start py-8 border-b border-ink-700 first:border-t hover:bg-ink-900/40 transition">
                                <div className="pt-1 flex items-center gap-3">
                                    <span className="text-eyebrow text-ink-300 font-mono">{String(i).padStart(2, '0')}</span>
                                    <Glyph state={p.state} />
                                </div>
                                <div>
                                    <div className="text-xl md:text-2xl font-medium tracking-tight text-spark">
                                        {p.title}
                                    </div>
                                    <div className="mt-2 text-sm text-ink-100 leading-relaxed max-w-2xl">{p.desc}</div>
                                </div>
                                <div className={`text-right text-eyebrow ${stateColor(p.state)}`}>{p.when}</div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Glyph({ state }: { state: S }) {
    if (state === 'done') return <span className="inline-block w-2 h-2 bg-signal rounded-full" />;
    if (state === 'live') return <span className="inline-block w-2 h-2 rounded-full signal-dot" />;
    if (state === 'next') return <span className="inline-block w-2 h-2 border border-signal rounded-full" />;
    return <span className="inline-block w-2 h-2 border border-ink-400 rounded-full" />;
}
function stateColor(s: S): string {
    if (s === 'done') return 'text-ink-200';
    if (s === 'live') return 'text-signal';
    if (s === 'next') return 'text-spark';
    return 'text-ink-300';
}
