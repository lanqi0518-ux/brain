'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const links: Array<[string, string]> = [
    ['/swap', 'Swap'],
    ['/lend', 'Lend'],
    ['/bridge', 'Bridge'],
    ['/perp', 'Perp'],
    ['/points', 'Points'],
];

export default function Nav() {
    const path = usePathname();
    return (
        <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/70 backdrop-blur-xl">
            <div className="container-x h-16 flex items-center justify-between">
                <div className="flex items-center gap-12">
                    <Link href="/" className="flex items-center gap-3 group">
                        <Wordmark />
                    </Link>
                    <nav className="hidden md:flex items-center gap-1">
                        {links.map(([href, label]) => {
                            const active = path === href;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`px-3 py-1.5 text-sm transition ${
                                        active ? 'text-spark' : 'text-ink-100 hover:text-spark'
                                    }`}
                                >
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <a
                        href="https://github.com/lanqi0518-ux/stonk-chain"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="GitHub"
                        className="hidden sm:inline-flex text-ink-100 hover:text-spark transition"
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                            <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.7 2.7 1.2 3.4.9.1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2.9-.3 1.9-.4 2.9-.4s2 .1 2.9.4c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.2 0 4.6-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
                        </svg>
                    </a>
                    <ConnectButton
                        showBalance={false}
                        chainStatus={{ smallScreen: 'icon', largeScreen: 'icon' }}
                        accountStatus={{ smallScreen: 'avatar', largeScreen: 'address' }}
                    />
                </div>
            </div>
        </header>
    );
}

function Wordmark() {
    return (
        <div className="flex items-center gap-2 font-mono tracking-[-0.02em]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2 L22 7 V17 L12 22 L2 17 V7 Z" stroke="#f4f4f7" strokeWidth="1.2" />
                <path d="M12 2 V12 M22 7 L12 12 L2 7 M12 12 V22" stroke="#d6ff36" strokeWidth="1" />
            </svg>
            <span className="text-[13px] tracking-[0.02em]">
                <span className="text-spark">Stockchain</span>
                <span className="text-ink-300">/L3</span>
            </span>
        </div>
    );
}
