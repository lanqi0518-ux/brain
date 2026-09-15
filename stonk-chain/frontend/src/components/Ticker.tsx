'use client';

const items = [
    'STOCKCHAIN L3',
    'ARBITRUM ORBIT',
    'SETTLES ON ROBINHOOD CHAIN L2',
    'DA · ETHEREUM BLOB',
    'GAS · USDG / STONK',
    'PRECOMPILE · uiMULTIPLIER',
    'SEQUENCER · MARKET-HOURS AWARE',
    'STANDARD · ERC-8056',
    'STATUS · DEVNET · PRE-AUDIT',
];

export default function Ticker() {
    const doubled = [...items, ...items, ...items];
    return (
        <div className="w-full border-b border-ink-700 bg-ink-900/60 overflow-hidden">
            <div className="flex whitespace-nowrap animate-marquee-slow py-2">
                {doubled.map((v, i) => (
                    <div key={i} className="flex items-center gap-6 px-6 text-eyebrow text-ink-100">
                        <span className="signal-dot" />
                        {v}
                    </div>
                ))}
            </div>
        </div>
    );
}
