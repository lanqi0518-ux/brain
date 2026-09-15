import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                ink: {
                    950: '#050506',
                    900: '#0a0a0c',
                    800: '#0f1013',
                    700: '#16171b',
                    600: '#1e1f24',
                    500: '#2a2b32',
                    400: '#3a3b45',
                    300: '#5a5b68',
                    200: '#8b8d99',
                    100: '#c7c8d1',
                    50: '#f4f4f7',
                },
                signal: '#d6ff36',
                spark: '#ffffff',
            },
            fontFamily: {
                sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
                mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
            },
            fontSize: {
                giga: ['clamp(4rem, 12vw, 12rem)', { lineHeight: '0.88', letterSpacing: '-0.05em' }],
                mega: ['clamp(3rem, 8vw, 7rem)', { lineHeight: '0.92', letterSpacing: '-0.04em' }],
                display: ['clamp(2.5rem, 6vw, 5rem)', { lineHeight: '0.95', letterSpacing: '-0.035em' }],
                headline: ['clamp(2rem, 4vw, 3.5rem)', { lineHeight: '1', letterSpacing: '-0.03em' }],
                eyebrow: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.24em' }],
            },
            animation: {
                'marquee-slow': 'marquee 60s linear infinite',
                'pulse-signal': 'pulseSignal 2s ease-in-out infinite',
                'scan': 'scan 3s linear infinite',
                'shimmer': 'shimmer 2.6s linear infinite',
            },
            keyframes: {
                marquee: {
                    from: { transform: 'translate3d(0,0,0)' },
                    to: { transform: 'translate3d(-50%,0,0)' },
                },
                pulseSignal: {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.4', transform: 'scale(0.9)' },
                },
                scan: {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(100vh)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
