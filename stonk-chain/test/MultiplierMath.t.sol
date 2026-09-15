// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {MultiplierMath} from "../contracts/libraries/MultiplierMath.sol";
import {MockStockToken} from "../contracts/mocks/MockStockToken.sol";

contract MultiplierMathTest is Test {
    function testUIAndRawRoundTrip(uint128 raw) public {
        uint256 m = 1.234e18;
        uint256 ui = MultiplierMath.uiAmount(raw, m);
        uint256 back = MultiplierMath.rawAmount(ui, m);
        // Truncation may cost at most 1 wei per direction.
        assertApproxEqAbs(back, raw, 1);
    }

    function testSafeMultiplierOnErc8056() public {
        MockStockToken stock = new MockStockToken("NVDA", "NVDA");
        assertEq(MultiplierMath.safeMultiplier(address(stock)), 1e18);
        stock.applyDividend(500); // +5%
        assertEq(MultiplierMath.safeMultiplier(address(stock)), 1.05e18);
    }

    function testSafeMultiplierOnPlainErc20() public {
        // A raw address without ERC-8056 must return 1e18, letting the same
        // math work uniformly on USDG or ETH collaterals.
        assertEq(MultiplierMath.safeMultiplier(address(this)), 1e18);
    }

    function testDeltaSign() public {
        int256 d = MultiplierMath.delta(1e18, 1.1e18);
        assertEq(d, 1e17); // +10%
        int256 dneg = MultiplierMath.delta(1e18, 5e17);
        assertEq(dneg, -5e17); // -50% (reverse split)
    }

    function testRawPrice() public {
        // Data Streams price = $105.00 with multiplier 1.05, so raw is $100.
        uint256 raw = MultiplierMath.rawPrice(105e8, 1.05e18);
        assertEq(raw, 100e8);
    }
}
