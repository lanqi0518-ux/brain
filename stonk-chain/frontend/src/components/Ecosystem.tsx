'use client';

import Reveal from './Reveal';

const ROWS: Array<[string, string, string]> = [
    ['Robinhood Chain', 'L2 · Settlement', 'Stock Token issuance, USDG native, Bitstamp on-ramp.'],
    ['Arbitrum Orbit', 'L3 · Framework', 'BoLD fraud proofs, custom precompiles, sovereign gas.'],
    ['Caldera', 'RaaS', 'Devnet operator, sequencer, block explorer.'],
    ['Uniswap V4', 'AMM', 'MultiplierAwareHook plugs directly into V4 pools.'],
    ['Morpho Blue', 'Lending', 'Isolated markets with the multiplier-scaled oracle.'],
    ['Lighter', 'Perps', 'ZK order-book perps, wrapped by LighterAdapter.'],
    ['Pons', 'Launchpad', 'Stock-paired fair launch curve for $STONK.'],
    ['Paxos · USDG', 'Stable', 'Gas token candidate + primary quote pair.'],
    ['Chainlink Data Streams', 'Oracle', 'Sub-second price feeds for stocks and forex.'],
    ['ERC-4337 EntryPoint', 'AA', 'Canonical v0.7 entry point, session keys, paymaster.'],
    ['ERC-8056', 'Standard', 'The scaled UI amount extension that makes it all work.'],
    ['BoLD', 'Security', 'Permissionless dispute resolution for Orbit rollups.'],
];

export default function Ecosystem() {
    return (
        <section className="border-t border-ink-700 bg-ink-950">
            <div className="container-x py-32 md:py-40">
                <Reveal>
                    <div className="eyebrow">04 · Ecosystem</div>
                </Reveal>
                <Reveal delay={80}>
                    <h2 className="mt-6 text-display font-medium tracking-tight text-spark max-w-3xl">
                        We integrate. We do not fork.
                    </h2>
                </Reveal>
                <Reveal delay={160}>
                    <p className="mt-6 max-w-2xl text-lg text-ink-100 leading-relaxed">
                        Stockchain L3 is a compositional bet. The rest of the stack is already live and battle-tested;
                        our job is the awareness layer that ties it all together.
                    </p>
                </Reveal>

                <Reveal delay={220} className="mt-16 border-t border-ink-700">
                    {ROWS.map(([name, role, note], i) => (
                        <div
                            key={name}
                            className={`grid grid-cols-[1fr_1fr_2fr] gap-8 py-6 border-b border-ink-700 hover:bg-ink-900/40 transition items-baseline ${
                                i === 0 ? '' : ''
                            }`}
                        >
                            <div className="text-lg font-medium text-spark">{name}</div>
                            <div className="text-eyebrow text-ink-200">{role}</div>
                            <div className="text-sm text-ink-100">{note}</div>
                        </div>
                    ))}
                </Reveal>
            </div>
        </section>
    );
}
