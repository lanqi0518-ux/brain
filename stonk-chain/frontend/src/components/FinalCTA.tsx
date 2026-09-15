'use client';

import Link from 'next/link';
import Reveal from './Reveal';

export default function FinalCTA() {
    return (
        <section className="border-t border-ink-700">
            <div className="container-x py-40 md:py-56">
                <Reveal>
                    <h2 className="text-giga font-medium tracking-[-0.05em] text-spark">
                        Build the <br />
                        <span className="text-signal italic font-serif">equity</span> chain.
                    </h2>
                </Reveal>
                <Reveal delay={140}>
                    <p className="mt-10 max-w-2xl text-lg text-ink-100 leading-relaxed">
                        Fair launch on Pons. Proceeds fund the audit, the Caldera devnet, and mainnet incentives. No
                        VCs, no seed round, no cliff for the team beyond public vesting. Everything on-chain.
                    </p>
                </Reveal>
                <Reveal delay={280}>
                    <div className="mt-14 flex flex-wrap gap-3">
                        <a
                            href="https://github.com/lanqi0518-ux/stonk-chain/blob/main/docs/TOKENOMICS.md"
                            target="_blank"
                            rel="noreferrer"
                            className="btn-signal"
                        >
                            Tokenomics
                        </a>
                        <Link href="/points" className="btn-outline">
                            Earn points
                        </Link>
                        <a
                            href="https://github.com/lanqi0518-ux/stonk-chain"
                            target="_blank"
                            rel="noreferrer"
                            className="btn-outline"
                        >
                            GitHub
                        </a>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
