'use client';

import Link from 'next/link';
import GridCanvas from './GridCanvas';
import Reveal from './Reveal';

/**
 * Cinematic hero. Massive display type, ambient canvas grid, single
 * signal-color accent. Everything else lives in later sections.
 */
export default function Hero() {
    return (
        <section className="relative overflow-hidden">
            <div className="absolute inset-0">
                <GridCanvas />
            </div>
            <div className="hero-glow" />

            <div className="container-x relative pt-24 md:pt-32 pb-32 md:pb-40">
                {/* meta line */}
                <Reveal className="mb-14 md:mb-20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
                        <MetaCell k="Chain" v="Stockchain L3" />
                        <MetaCell k="Framework" v="Arbitrum Orbit" />
                        <MetaCell k="Settles on" v="Robinhood Chain L2" />
                        <MetaCell k="Gas" v="USDG · STONK" />
                    </div>
                </Reveal>

                {/* headline */}
                <Reveal delay={100}>
                    <h1 className="text-mega font-medium tracking-[-0.045em]">
                        The equity <br className="hidden sm:block" />
                        <span className="text-spark">chain.</span>{' '}
                        <span className="display-outline">Corporate</span>
                        <br />
                        <span className="display-outline">actions</span>{' '}
                        <span className="text-signal italic font-serif tracking-[-0.06em] px-1">native</span>
                        <span className="text-spark">.</span>
                    </h1>
                </Reveal>

                <Reveal delay={220}>
                    <p className="mt-10 max-w-2xl text-lg md:text-xl text-ink-100 leading-relaxed">
                        Stockchain is a Layer&nbsp;3 built for tokenized equities. The AMM, the lending market, the perp
                        engine, the bridge — every primitive respects dividends, splits, and market hours at the
                        sequencer level. Not a bolt-on. A property of the chain.
                    </p>
                </Reveal>

                <Reveal delay={340}>
                    <div className="mt-12 flex flex-wrap items-center gap-3">
                        <Link href="/swap" className="btn-signal">
                            Launch app
                            <ArrowRight />
                        </Link>
                        <a
                            href="https://github.com/lanqi0518-ux/stonk-chain/blob/main/docs/WHITEPAPER.md"
                            target="_blank"
                            rel="noreferrer"
                            className="btn-outline"
                        >
                            Whitepaper
                        </a>
                        <a
                            href="https://github.com/lanqi0518-ux/stonk-chain"
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-ink-100 hover:text-spark px-2 py-3 link-underline"
                        >
                            Read the code →
                        </a>
                    </div>
                </Reveal>

                {/* bottom rail */}
                <Reveal delay={480} className="mt-24 md:mt-32">
                    <div className="grid grid-cols-3 md:grid-cols-6 border-t border-ink-700 pt-6 gap-4">
                        <RailStat k="TVL · Stock Tokens" v="$170M+" />
                        <RailStat k="DEX Volume" v="$50B" />
                        <RailStat k="Standard" v="ERC-8056" />
                        <RailStat k="Contracts" v="09" />
                        <RailStat k="Tests" v="56 / 56" />
                        <RailStat k="Audits" v="pending" muted />
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

function MetaCell({ k, v }: { k: string; v: string }) {
    return (
        <div>
            <div className="eyebrow-dim">{k}</div>
            <div className="mt-1.5 text-sm text-spark font-mono">{v}</div>
        </div>
    );
}

function RailStat({ k, v, muted = false }: { k: string; v: string; muted?: boolean }) {
    return (
        <div>
            <div className="eyebrow-dim">{k}</div>
            <div className={`mt-1.5 text-2xl font-mono ${muted ? 'text-ink-200' : 'text-spark'}`}>{v}</div>
        </div>
    );
}

function ArrowRight() {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
