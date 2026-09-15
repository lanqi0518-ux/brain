import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-ink-700">
            <div className="container-x py-16 grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-10">
                <div>
                    <div className="flex items-center gap-2 font-mono">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2 L22 7 V17 L12 22 L2 17 V7 Z" stroke="#f4f4f7" strokeWidth="1.2" />
                            <path d="M12 2 V12 M22 7 L12 12 L2 7 M12 12 V22" stroke="#d6ff36" strokeWidth="1" />
                        </svg>
                        <span className="text-[13px]">
                            <span className="text-spark">Stockchain</span>
                            <span className="text-ink-300">/L3</span>
                        </span>
                    </div>
                    <p className="mt-4 text-sm text-ink-100 max-w-sm leading-relaxed">
                        The equity chain. Arbitrum Orbit L3 for tokenized equities, settling to Robinhood Chain, with
                        corporate actions baked into the execution layer.
                    </p>
                </div>
                <FooterCol
                    title="Product"
                    items={[
                        ['/swap', 'Swap'],
                        ['/lend', 'Lend'],
                        ['/bridge', 'Bridge'],
                        ['/perp', 'Perp'],
                        ['/points', 'Points'],
                    ]}
                />
                <FooterCol
                    title="Docs"
                    items={[
                        ['https://github.com/lanqi0518-ux/stonk-chain/blob/main/docs/WHITEPAPER.md', 'Whitepaper'],
                        ['https://github.com/lanqi0518-ux/stonk-chain/blob/main/docs/ARCHITECTURE.md', 'Architecture'],
                        ['https://github.com/lanqi0518-ux/stonk-chain/blob/main/docs/ROADMAP.md', 'Roadmap'],
                        ['https://github.com/lanqi0518-ux/stonk-chain/blob/main/docs/TOKENOMICS.md', 'Tokenomics'],
                    ]}
                />
                <FooterCol
                    title="Community"
                    items={[
                        ['https://github.com/lanqi0518-ux/stonk-chain', 'GitHub'],
                        ['https://twitter.com', 'Twitter'],
                        ['https://t.me', 'Telegram'],
                    ]}
                />
            </div>
            <div className="border-t border-ink-700">
                <div className="container-x py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-ink-300">
                    <p>Unaffiliated with Robinhood. Stock Tokens are issued by Robinhood Assets. Not investment advice.</p>
                    <p className="font-mono">MIT · 2026</p>
                </div>
            </div>
        </footer>
    );
}

function FooterCol({ title, items }: { title: string; items: Array<[string, string]> }) {
    return (
        <div>
            <div className="eyebrow-dim mb-4">{title}</div>
            <ul className="space-y-3">
                {items.map(([href, label]) => (
                    <li key={href}>
                        {href.startsWith('/') ? (
                            <Link href={href} className="text-sm text-ink-100 hover:text-spark transition link-underline">
                                {label}
                            </Link>
                        ) : (
                            <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-ink-100 hover:text-spark transition link-underline"
                            >
                                {label}
                            </a>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
