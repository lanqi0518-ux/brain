'use client';

import { useEffect, useRef } from 'react';

/**
 * Ambient dotted-grid canvas that subtly reacts to the mouse.
 * Draws once per frame with a low opacity so it feels like paper rather
 * than a game. Highlights the dots closest to the cursor with the
 * signal color, creating a soft "spotlight" effect on hover.
 */
export default function GridCanvas() {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;

        const state = { w: 0, h: 0, dpr: 1, mx: -9999, my: -9999, raf: 0 };

        const resize = () => {
            state.dpr = Math.min(window.devicePixelRatio || 1, 2);
            state.w = c.clientWidth;
            state.h = c.clientHeight;
            c.width = state.w * state.dpr;
            c.height = state.h * state.dpr;
            ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        };

        const onMove = (e: MouseEvent) => {
            const r = c.getBoundingClientRect();
            state.mx = e.clientX - r.left;
            state.my = e.clientY - r.top;
        };
        const onLeave = () => {
            state.mx = -9999;
            state.my = -9999;
        };

        const draw = () => {
            const { w, h, mx, my } = state;
            ctx.clearRect(0, 0, w, h);
            const step = 34;
            const radius = 220;
            for (let x = 0; x < w + step; x += step) {
                for (let y = 0; y < h + step; y += step) {
                    const dx = x - mx;
                    const dy = y - my;
                    const dist = Math.hypot(dx, dy);
                    if (dist < radius) {
                        const t = 1 - dist / radius;
                        ctx.fillStyle = `rgba(214,255,54,${0.06 + t * 0.55})`;
                        ctx.beginPath();
                        ctx.arc(x, y, 1 + t * 1.6, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        ctx.fillStyle = 'rgba(255,255,255,0.06)';
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }
            state.raf = requestAnimationFrame(draw);
        };

        resize();
        draw();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseleave', onLeave);
        return () => {
            cancelAnimationFrame(state.raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseleave', onLeave);
        };
    }, []);

    return (
        <canvas
            ref={ref}
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden
        />
    );
}
