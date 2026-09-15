import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia, arbitrum } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'StockChain',
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? 'stockchain-dev',
    chains: [arbitrumSepolia, arbitrum],
    ssr: true,
});
