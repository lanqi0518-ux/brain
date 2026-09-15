import { parseAbi } from 'viem';

export const stonkTokenAbi = parseAbi([
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function burnedFromFees() view returns (uint256)',
    'function tradingEnabled() view returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)',
]);

export const pointsAbi = parseAbi([
    'function totalOf(address) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function balance(address user, bytes32 reason) view returns (uint256)',
    'function snapshotBlock() view returns (uint256)',
]);

export const bridgeAbi = parseAbi([
    'function stocks(address) view returns (bool registered, address remoteMirror, uint256 lastMultiplier, uint256 lastSyncedAt)',
    'function lockDeposit(address stockToken, uint256 amount)',
    'function claimWithdraw(address stockToken, uint256 nonce)',
]);

export const scaledUiAmountAbi = parseAbi([
    'function uiMultiplier() view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
]);

export const oracleAbi = parseAbi(['function price() view returns (uint256)']);

export const adapterAbi = parseAbi([
    'function collateralOf(address) view returns (uint256)',
    'function effectiveLeverageCap() view returns (uint256)',
    'function maxLeverageBps() view returns (uint256)',
    'function deposit(uint256 amount)',
    'function withdraw(uint256 amount)',
    'function trade(int256 size, uint256 leverageBps, bytes callData)',
]);

export const paymasterAbi = parseAbi([
    'function nativePriceInUsdg() view returns (uint256)',
    'function lastRateUpdate() view returns (uint256)',
    'function markupBps() view returns (uint16)',
]);
