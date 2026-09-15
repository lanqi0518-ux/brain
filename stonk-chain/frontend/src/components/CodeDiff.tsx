'use client';

import Reveal from './Reveal';

const before = `// Generic Uniswap V4 hook, cash-flow blind
function beforeSwap(
    PoolKey calldata key,
    SwapParams calldata params
) external returns (bytes4) {
    // No knowledge of the stock token's uiMultiplier.
    // Dividends silently accrue → arbers front-run.
    return this.beforeSwap.selector;
}`;

const after = `// Stockchain L3 · multiplier-aware
function beforeSwap(
    PoolKey calldata key,
    SwapParams calldata params
) external returns (bytes4) {
    uint256 m = IScaledUIAmount(key.currency0).uiMultiplier();
    uint256 last = poolMultiplier[key.toId()];

    if (m != last) {
        // Corporate action detected. Rebalance virtual
        // reserves atomically before the trade executes.
        _rebalance(key, m, last);
        poolMultiplier[key.toId()] = m;
    }

    // Widen fees when NYSE is not in session.
    _applyMarketHoursSpread(key);

    return this.beforeSwap.selector;
}`;

export default function CodeDiff() {
    return (
        <section className="border-t border-ink-700 bg-ink-950">
            <div className="container-x py-32 md:py-40">
                <Reveal>
                    <div className="eyebrow">02 · Under the hood</div>
                </Reveal>
                <Reveal delay={80}>
                    <h2 className="mt-6 text-display font-medium tracking-tight text-spark">
                        A dividend event, in ten lines.
                    </h2>
                </Reveal>
                <Reveal delay={160}>
                    <p className="mt-6 max-w-2xl text-lg text-ink-100 leading-relaxed">
                        Same hook interface. Same pool. One difference: the L3 makes the multiplier a first-class read,
                        so every swap sees the same corporate-action state atomically.
                    </p>
                </Reveal>

                <Reveal delay={240} className="mt-16 grid lg:grid-cols-2 gap-6">
                    <CodePanel label="Generic L2" tone="dim" code={before} />
                    <CodePanel label="Stockchain L3" tone="signal" code={after} />
                </Reveal>
            </div>
        </section>
    );
}

function CodePanel({ label, tone, code }: { label: string; tone: 'dim' | 'signal'; code: string }) {
    const barColor = tone === 'signal' ? 'bg-signal' : 'bg-ink-500';
    const textColor = tone === 'signal' ? 'text-signal' : 'text-ink-200';
    return (
        <div className="codeblock">
            <div className="flex items-center justify-between px-6 py-3 border-b border-ink-700">
                <div className="flex items-center gap-3">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${barColor}`} />
                    <span className={`text-eyebrow ${textColor}`}>{label}</span>
                </div>
                <span className="text-eyebrow text-ink-300">MultiplierAwareHook.sol</span>
            </div>
            <pre className="text-ink-100">
                <code
                    dangerouslySetInnerHTML={{
                        __html: highlight(code, tone === 'signal'),
                    }}
                />
            </pre>
        </div>
    );
}

/** Minimal syntax colorizer. Not a real tokenizer — just enough to feel alive. */
function highlight(src: string, signal: boolean): string {
    const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
    let out = escape(src);
    // comments
    out = out.replace(/(\/\/[^\n]*)/g, `<span style="color:#5a5b68">$1</span>`);
    // keywords
    const kw = ['function', 'external', 'returns', 'if', 'calldata', 'uint256', 'address', 'bytes4', 'this', 'internal', 'view', 'require'];
    for (const k of kw) {
        out = out.replace(new RegExp(`\\b${k}\\b`, 'g'), `<span style="color:#8b8d99">${k}</span>`);
    }
    // types (Pascal-case)
    out = out.replace(/\b([A-Z][A-Za-z0-9]+)\b/g, `<span style="color:${signal ? '#d6ff36' : '#c7c8d1'}">$1</span>`);
    // strings
    out = out.replace(/(".*?")/g, `<span style="color:#c7c8d1">$1</span>`);
    // numbers
    out = out.replace(/\b(\d+)\b/g, `<span style="color:#d6ff36">$1</span>`);
    return out;
}
