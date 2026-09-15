'use client';

import { useState, useEffect, type ReactNode } from 'react';

/* -------- TokenBadge -------- */

type TokenMeta = { symbol: string; name: string; color?: string };

export const STOCK_UNIVERSE: TokenMeta[] = [
    { symbol: 'NVDAx', name: 'NVIDIA', color: '#76b900' },
    { symbol: 'TSLAx', name: 'Tesla', color: '#cc0000' },
    { symbol: 'AAPLx', name: 'Apple', color: '#a2aaad' },
    { symbol: 'MSFTx', name: 'Microsoft', color: '#00a4ef' },
    { symbol: 'META', name: 'Meta', color: '#0866ff' },
    { symbol: 'AMZNx', name: 'Amazon', color: '#ff9900' },
    { symbol: 'GOOGx', name: 'Alphabet', color: '#4285f4' },
    { symbol: 'HOODx', name: 'Robinhood', color: '#00c805' },
    { symbol: 'COINx', name: 'Coinbase', color: '#0052ff' },
    { symbol: 'USDG', name: 'USDG · Paxos', color: '#22c55e' },
    { symbol: 'STONK', name: 'Stockchain', color: '#d6ff36' },
];

export function TokenBadge({ symbol, size = 28 }: { symbol: string; size?: number }) {
    const t = STOCK_UNIVERSE.find((x) => x.symbol === symbol);
    const bg = t?.color ?? '#3a3b45';
    const letter = symbol.replace(/x$/, '').slice(0, 1);
    return (
        <span
            className="inline-flex items-center justify-center rounded-full font-mono font-semibold text-[11px]"
            style={{
                width: size,
                height: size,
                background: `linear-gradient(140deg, ${bg}, ${bg}aa)`,
                color: '#050506',
                boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 4px 12px -4px ${bg}88`,
            }}
        >
            {letter}
        </span>
    );
}

/* -------- TokenPicker -------- */

export function TokenPicker({
    value,
    onChange,
    exclude,
}: {
    value: string;
    onChange: (s: string) => void;
    exclude?: string;
}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-ink-800 hover:bg-ink-700 border border-ink-700 transition"
            >
                <TokenBadge symbol={value} size={24} />
                <span className="text-sm font-medium">{value}</span>
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm flex items-start justify-center pt-24"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="w-full max-w-md mx-4 surface p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-2 pb-3 border-b border-ink-700">
                            <span className="eyebrow">Select asset</span>
                            <button onClick={() => setOpen(false)} className="text-ink-200 hover:text-spark">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                        <div className="mt-3 max-h-[60vh] overflow-y-auto">
                            {STOCK_UNIVERSE.filter((t) => t.symbol !== exclude).map((t) => (
                                <button
                                    key={t.symbol}
                                    onClick={() => {
                                        onChange(t.symbol);
                                        setOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-ink-800 text-left transition"
                                >
                                    <TokenBadge symbol={t.symbol} />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-spark">{t.symbol}</div>
                                        <div className="text-xs text-ink-200">{t.name}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* -------- AmountInput -------- */

export function AmountInput({
    label,
    balance,
    valueUsd,
    value,
    onChange,
    token,
    onTokenChange,
    excludeToken,
    readonly = false,
}: {
    label: string;
    balance?: string;
    valueUsd?: string;
    value: string;
    onChange?: (v: string) => void;
    token: string;
    onTokenChange?: (s: string) => void;
    excludeToken?: string;
    readonly?: boolean;
}) {
    return (
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-5 focus-within:border-signal/40 transition">
            <div className="flex items-center justify-between">
                <span className="eyebrow-dim">{label}</span>
                {balance !== undefined && (
                    <span className="text-xs text-ink-200">
                        Balance <span className="text-ink-100 font-mono">{balance}</span>
                    </span>
                )}
            </div>
            <div className="mt-3 flex items-center gap-3">
                <input
                    className="flex-1 bg-transparent border-0 outline-none text-3xl md:text-4xl font-mono tabular-nums text-spark placeholder:text-ink-400"
                    placeholder="0"
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    readOnly={readonly}
                    inputMode="decimal"
                />
                {onTokenChange ? (
                    <TokenPicker value={token} onChange={onTokenChange} exclude={excludeToken} />
                ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-ink-800 border border-ink-700">
                        <TokenBadge symbol={token} size={24} />
                        <span className="text-sm font-medium">{token}</span>
                    </div>
                )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-ink-200">
                <span>{valueUsd ?? '\u00A0'}</span>
                {onChange && balance !== undefined && (
                    <div className="flex gap-1">
                        <button
                            onClick={() => onChange('50')}
                            className="px-2 py-0.5 rounded bg-ink-800 hover:bg-ink-700 text-[10px] uppercase tracking-widest"
                        >
                            50%
                        </button>
                        <button
                            onClick={() => onChange('100')}
                            className="px-2 py-0.5 rounded bg-ink-800 hover:bg-ink-700 text-[10px] uppercase tracking-widest"
                        >
                            Max
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* -------- MarketState pill -------- */

export function MarketStatePill({ compact = false }: { compact?: boolean }) {
    const state = useMarketState();
    const color =
        state.state === 'open'
            ? 'text-signal border-signal/40 bg-signal/[0.04]'
            : state.state === 'closed'
              ? 'text-amber-400 border-amber-400/30 bg-amber-400/[0.04]'
              : 'text-ink-100 border-ink-500 bg-ink-800';
    const label = state.state === 'open' ? 'NYSE OPEN' : state.state === 'closed' ? 'NYSE CLOSED' : state.state.toUpperCase();
    return (
        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border ${color}`}>
            <span
                className={`w-1.5 h-1.5 rounded-full ${
                    state.state === 'open' ? 'bg-signal' : state.state === 'closed' ? 'bg-amber-400' : 'bg-ink-200'
                }`}
                style={state.state === 'open' ? { boxShadow: '0 0 10px currentColor' } : undefined}
            />
            <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
            {!compact && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-200">· {state.clock}</span>
            )}
        </div>
    );
}

export function useMarketState() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(id);
    }, []);
    // rough ET offset (UTC-4 during DST; simplify)
    const et = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const day = et.getUTCDay();
    const secs = et.getUTCHours() * 3600 + et.getUTCMinutes() * 60;
    const OPEN = 9 * 3600 + 30 * 60;
    const CLOSE = 16 * 3600;
    const PRE = 4 * 3600;
    const AFTER = 20 * 3600;
    let state: 'open' | 'pre' | 'after' | 'closed';
    if (day === 0 || day === 6) state = 'closed';
    else if (secs >= OPEN && secs < CLOSE) state = 'open';
    else if (secs >= PRE && secs < OPEN) state = 'pre';
    else if (secs >= CLOSE && secs < AFTER) state = 'after';
    else state = 'closed';

    const hh = String(et.getUTCHours()).padStart(2, '0');
    const mm = String(et.getUTCMinutes()).padStart(2, '0');
    return { state, clock: `${hh}:${mm} ET` };
}

/* -------- Sparkline -------- */

export function Sparkline({
    data,
    color = '#d6ff36',
    height = 40,
    fill = true,
}: {
    data: number[];
    color?: string;
    height?: number;
    fill?: boolean;
}) {
    if (data.length < 2) return null;
    const w = 200;
    const h = height;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = Math.max(max - min, 1e-9);
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / span) * (h - 4) - 2;
        return `${x},${y}`;
    });
    const path = 'M ' + pts.join(' L ');
    const areaPath = `${path} L ${w},${h} L 0,${h} Z`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible">
            <defs>
                <linearGradient id="spark-g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {fill && <path d={areaPath} fill="url(#spark-g)" />}
            <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/* -------- SegmentedTabs -------- */

export function SegmentedTabs<T extends string>({
    value,
    onChange,
    options,
    size = 'md',
}: {
    value: T;
    onChange: (v: T) => void;
    options: Array<{ value: T; label: string }>;
    size?: 'sm' | 'md';
}) {
    return (
        <div className={`inline-flex items-center bg-ink-900 border border-ink-700 rounded-full p-1`}>
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        onClick={() => onChange(o.value)}
                        className={`${
                            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'
                        } rounded-full transition font-medium ${
                            active
                                ? 'bg-ink-700 text-spark'
                                : 'text-ink-200 hover:text-spark'
                        }`}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/* -------- Panel primitives -------- */

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`bg-ink-900 border border-ink-700 rounded-2xl overflow-hidden ${className}`}>{children}</div>;
}

export function PanelHeader({
    title,
    right,
    kicker,
}: {
    title: string;
    right?: ReactNode;
    kicker?: string;
}) {
    return (
        <div className="px-5 py-3 flex items-center justify-between border-b border-ink-700">
            <div className="flex items-center gap-3">
                {kicker && <span className="eyebrow-dim">{kicker}</span>}
                <span className="text-sm font-medium text-spark">{title}</span>
            </div>
            {right}
        </div>
    );
}
