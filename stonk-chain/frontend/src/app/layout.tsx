import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import Providers from './providers';
import Nav from '@/components/Nav';
import Ticker from '@/components/Ticker';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
    title: 'StockChain — the dividend-aware DeFi stack',
    description:
        'StockChain is the corporate-action-native settlement layer for tokenized equities. Dividend-aware AMM hooks, uiMultiplier oracles, cross-chain multiplier bridges — built on Robinhood Chain.',
    metadataBase: new URL('https://stockchain.fly.dev'),
    openGraph: {
        title: 'StockChain — the dividend-aware DeFi stack',
        description:
            'DeFi has a dividend bug. StockChain fixes it. Uniswap-style pools, Morpho-style lending, cross-chain bridging that respect ERC-8056 uiMultiplier growth.',
        type: 'website',
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
            <body className="font-sans antialiased">
                <Providers>
                    <div className="relative min-h-screen">
                        <Nav />
                        <Ticker />
                        <main className="relative">{children}</main>
                        <Footer />
                    </div>
                </Providers>
            </body>
        </html>
    );
}
