'use client';

import Reveal from './Reveal';

/**
 * L3 stack diagram — a proper technical drawing, not chips-in-a-row.
 * Uses inline SVG with animated dashed lines to indicate data flow.
 */
export default function Architecture() {
    return (
        <section className="border-t border-ink-700">
            <div className="container-x py-32 md:py-40">
                <Reveal>
                    <div className="eyebrow">01 · Architecture</div>
                </Reveal>
                <Reveal delay={80}>
                    <h2 className="mt-6 text-display font-medium tracking-tight text-spark">
                        The equity settlement stack.
                    </h2>
                </Reveal>
                <Reveal delay={160}>
                    <p className="mt-6 max-w-2xl text-lg text-ink-100 leading-relaxed">
                        Stockchain sits at Layer 3. It inherits equity issuance from Robinhood Chain and data
                        availability from Ethereum, and adds precompiles + a market-hours-aware sequencer that no
                        general-purpose chain provides.
                    </p>
                </Reveal>

                <Reveal delay={240} className="mt-16 md:mt-24">
                    <div className="grid lg:grid-cols-[1.15fr_1fr] gap-8 md:gap-14 items-start">
                        <StackSVG />
                        <div className="space-y-8">
                            <PropRow k="Sequencer" v="Market-hours aware. Fee curves, leverage caps, and oracle staleness bounds switch with the bell." />
                            <PropRow k="Precompile" v="uiMultiplier reads are a single opcode. Zero external-call overhead for hooks, oracles, and bridges." />
                            <PropRow k="Gas token" v="USDG paymaster with STONK burn on markup. Every tx routes a slice into the fee sink." />
                            <PropRow k="Corporate-action inbox" v="Dividend, split, merger events land as system-emitted logs. One canonical source across every module." />
                            <PropRow k="Fraud proof" v="BoLD (Arbitrum Orbit). 7-day challenge, permissionless validators." />
                            <PropRow k="Data availability" v="Ethereum blob (EIP-4844). Cheap, censorship-resistant." />
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

function PropRow({ k, v }: { k: string; v: string }) {
    return (
        <div className="grid grid-cols-[160px_1fr] gap-6 items-baseline border-t border-ink-700 pt-6">
            <div className="eyebrow">{k}</div>
            <div className="text-ink-100 leading-relaxed">{v}</div>
        </div>
    );
}

function StackSVG() {
    return (
        <div className="relative">
            <svg viewBox="0 0 560 620" className="w-full h-auto" aria-hidden>
                <defs>
                    <linearGradient id="l3g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d6ff36" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#d6ff36" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="l2g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.01" />
                    </linearGradient>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M20 0 L0 0 L0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    </pattern>
                </defs>

                {/* faint grid */}
                <rect width="560" height="620" fill="url(#grid)" />

                {/* L3 slab */}
                <g>
                    <rect x="40" y="40" width="480" height="160" rx="18" fill="url(#l3g)" stroke="#d6ff36" strokeOpacity="0.55" />
                    <text x="64" y="82" className="fill-signal" fontSize="11" fontFamily="ui-monospace" letterSpacing="0.24em">
                        LAYER 3
                    </text>
                    <text x="64" y="120" className="fill-white" fontSize="30" fontFamily="ui-sans-serif, system-ui" fontWeight="500" letterSpacing="-0.02em">
                        Stockchain
                    </text>
                    <g fontSize="11" fontFamily="ui-monospace" fill="#c7c8d1">
                        <text x="64" y="152">◆ AMM · Lending · Perp · Bridge</text>
                        <text x="64" y="172">◆ Precompile: uiMultiplier</text>
                        <text x="64" y="192">◆ Sequencer: market-hours aware</text>
                    </g>
                    {/* corner ticks */}
                    <Tick x={40} y={40} />
                    <Tick x={520} y={40} rot={90} />
                    <Tick x={520} y={200} rot={180} />
                    <Tick x={40} y={200} rot={270} />
                </g>

                {/* flow arrows L3 → L2 */}
                <g stroke="#d6ff36" strokeWidth="1.5" fill="none" strokeOpacity="0.7">
                    <path d="M180 200 L180 240" className="dashed-flow" />
                    <path d="M380 200 L380 240" className="dashed-flow" />
                </g>

                {/* L2 slab */}
                <g>
                    <rect x="40" y="240" width="480" height="150" rx="18" fill="url(#l2g)" stroke="#ffffff" strokeOpacity="0.25" />
                    <text x="64" y="282" fontSize="11" fontFamily="ui-monospace" fill="#8b8d99" letterSpacing="0.24em">
                        LAYER 2 · SETTLEMENT
                    </text>
                    <text x="64" y="316" fill="#f4f4f7" fontSize="24" fontFamily="ui-sans-serif, system-ui" fontWeight="500" letterSpacing="-0.02em">
                        Robinhood Chain
                    </text>
                    <g fontSize="11" fontFamily="ui-monospace" fill="#c7c8d1">
                        <text x="64" y="346">◆ Stock Token issuance · ERC-8056</text>
                        <text x="64" y="366">◆ USDG native · Bitstamp on-ramp</text>
                    </g>
                </g>

                {/* flow arrows L2 → L1 */}
                <g stroke="#ffffff" strokeWidth="1.5" fill="none" strokeOpacity="0.35">
                    <path d="M180 390 L180 430" className="dashed-flow" />
                    <path d="M380 390 L380 430" className="dashed-flow" />
                </g>

                {/* L1 slab */}
                <g>
                    <rect x="40" y="430" width="480" height="150" rx="18" fill="#0f1013" stroke="#ffffff" strokeOpacity="0.18" />
                    <text x="64" y="472" fontSize="11" fontFamily="ui-monospace" fill="#8b8d99" letterSpacing="0.24em">
                        LAYER 1 · DATA AVAILABILITY
                    </text>
                    <text x="64" y="506" fill="#f4f4f7" fontSize="24" fontFamily="ui-sans-serif, system-ui" fontWeight="500" letterSpacing="-0.02em">
                        Ethereum
                    </text>
                    <g fontSize="11" fontFamily="ui-monospace" fill="#c7c8d1">
                        <text x="64" y="536">◆ Blob storage · EIP-4844</text>
                        <text x="64" y="556">◆ Fraud proof · BoLD</text>
                    </g>
                </g>

                {/* side label: You are here */}
                <g transform="translate(475, 44)">
                    <rect x="0" y="0" width="80" height="22" rx="11" fill="#d6ff36" />
                    <text x="40" y="15" fontSize="9" fontFamily="ui-monospace" fill="#050506" textAnchor="middle" letterSpacing="0.18em">
                        YOU ARE HERE
                    </text>
                </g>
            </svg>
        </div>
    );
}

function Tick({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
    return (
        <g transform={`translate(${x},${y}) rotate(${rot})`}>
            <path d="M0 0 L10 0 M0 0 L0 10" stroke="#d6ff36" strokeWidth="1.5" strokeOpacity="0.85" />
        </g>
    );
}
