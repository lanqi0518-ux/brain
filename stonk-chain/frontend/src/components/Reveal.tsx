'use client';

import { useEffect, useRef } from 'react';

/** IntersectionObserver reveal. Adds `.is-visible` when the element enters. */
export default function Reveal({
    as: Tag = 'div',
    delay = 0,
    className = '',
    children,
}: {
    as?: keyof JSX.IntrinsicElements;
    delay?: number;
    className?: string;
    children: React.ReactNode;
}) {
    const ref = useRef<HTMLElement | null>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setTimeout(() => el.classList.add('is-visible'), delay);
                        io.unobserve(el);
                    }
                }
            },
            { threshold: 0.12 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [delay]);
    // @ts-expect-error dynamic Tag
    return <Tag ref={ref} data-reveal className={className}>{children}</Tag>;
}
