import { parseAbi } from 'viem';

export const scaledUiAmountAbi = parseAbi([
    'function uiMultiplier() view returns (uint256)',
    'function decimals() view returns (uint8)',
]);

export const bridgeAbi = parseAbi([
    'function stocks(address) view returns (bool registered, address remoteMirror, uint256 lastMultiplier, uint256 lastSyncedAt)',
    'function updateMultiplier(address stockToken, uint256 newMultiplier)',
    'event DepositLocked(address indexed user, address indexed stock, uint256 rawAmount, uint256 uiMultiplier)',
    'event MultiplierSynced(address indexed stock, uint256 uiMultiplier, uint256 timestamp)',
]);

export const paymasterAbi = parseAbi([
    'function updateRate(uint256 nativePriceInUsdg)',
    'function nativePriceInUsdg() view returns (uint256)',
    'function lastRateUpdate() view returns (uint256)',
    'function maxRateStaleness() view returns (uint256)',
]);
