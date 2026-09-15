'use client';

import { useEffect, useRef, useState } from 'react';

/** Simple ease-out count-up when scrolled into view. */
export default function CountUp({
    value,
    duration = 1600,
    prefix = '',
    suffix = '',
    format = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 }),
}: {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    format?: (n: number) => string;
}) {
    const [n, setN] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (!e.isIntersecting) continue;
                const start = performance.now();
                const step = (t: number) => {
                    const p = Math.min(1, (t - start) / duration);
                    const eased = 1 - Math.pow(1 - p, 3);
                    setN(value * eased);
                    if (p < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
                io.unobserve(el);
            }
        });
        io.observe(el);
        return () => io.disconnect();
    }, [value, duration]);
    return (
        <span ref={ref} className="num">
            {prefix}
            {format(n)}
            {suffix}
        </span>
    );
}
