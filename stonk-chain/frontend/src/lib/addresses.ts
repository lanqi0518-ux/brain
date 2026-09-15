import type { Address } from 'viem';

/**
 * Deployment address book. Updated by `script/DeployCore.s.sol` output.
 * Missing addresses are represented as the zero address so the UI can
 * disable the corresponding features gracefully.
 */
export type Deployment = {
    chainId: number;
    stonkToken: Address;
    points: Address;
    hook: Address;
    bridge: Address;
    session: Address;
    margin: Address;
    adapter: Address;
    paymaster: Address;
    usdg: Address;
};

const ZERO = '0x0000000000000000000000000000000000000000' as Address;

export const deployments: Record<number, Deployment> = {
    421614: {
        chainId: 421614,
        stonkToken: (process.env.NEXT_PUBLIC_STONK_TOKEN ?? ZERO) as Address,
        points: (process.env.NEXT_PUBLIC_POINTS ?? ZERO) as Address,
        hook: (process.env.NEXT_PUBLIC_HOOK ?? ZERO) as Address,
        bridge: (process.env.NEXT_PUBLIC_BRIDGE ?? ZERO) as Address,
        session: (process.env.NEXT_PUBLIC_SESSION ?? ZERO) as Address,
        margin: (process.env.NEXT_PUBLIC_MARGIN ?? ZERO) as Address,
        adapter: (process.env.NEXT_PUBLIC_ADAPTER ?? ZERO) as Address,
        paymaster: (process.env.NEXT_PUBLIC_PAYMASTER ?? ZERO) as Address,
        usdg: (process.env.NEXT_PUBLIC_USDG ?? ZERO) as Address,
    },
};

export function isSet(a: Address): boolean {
    return a !== ZERO;
}
