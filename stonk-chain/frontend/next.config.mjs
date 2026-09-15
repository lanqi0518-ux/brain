/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config) => {
        config.externals.push('pino-pretty', 'lokijs', 'encoding');
        // wagmi/rainbowkit optionally pull the Coinbase CDP SDK, which
        // depends on a `@x402/evm` package that isn't published. We do
        // not use CDP smart accounts, so mark the whole subtree as an
        // external commonjs module — Next won't try to bundle it.
        config.resolve = config.resolve ?? {};
        config.resolve.alias = {
            ...(config.resolve.alias ?? {}),
            '@x402/evm': false,
            '@base-org/account': false,
            '@coinbase/cdp-sdk': false,
        };
        return config;
    },
};

export default nextConfig;
