// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {MultiplierAwareOracle} from "../contracts/lend/MultiplierAwareOracle.sol";
import {IChainlinkDataStream} from "../contracts/interfaces/IChainlinkDataStream.sol";
import {MockStockToken} from "../contracts/mocks/MockStockToken.sol";
import {MockDataStream} from "../contracts/mocks/MockDataStream.sol";

contract MultiplierAwareOracleTest is Test {
    MockStockToken stock;
    MockDataStream stream;
    MultiplierAwareOracle oracle;
    bytes32 constant FEED_ID = bytes32(uint256(1));

    function setUp() public {
        stock = new MockStockToken("Nvidia", "NVDA");
        stream = new MockDataStream();
        // Data Streams on Robinhood Chain includes the multiplier already,
        // so `dsAlreadyScaled = true` mirrors production. We also test the
        // `false` path in a separate case below.
        oracle = new MultiplierAwareOracle({
            _stockToken: address(stock),
            _feedId: FEED_ID,
            _priceSource: IChainlinkDataStream(address(stream)),
            _dsAlreadyScaled: false, // apply multiplier ourselves
            _priceDecimals: 8,
            _loanDecimals: 6, // USDG
            _collateralDecimals: 18,
            _maxStalenessSeconds: 1 hours
        });
    }

    function _setPrice(int192 p) internal {
        stream.set(FEED_ID, p, uint32(block.timestamp));
    }

    function testBasePriceMatchesMorphoAnchor() public {
        _setPrice(100_00_000_000); // $100.00, 8 decimals
        uint256 p = oracle.price();
        // Expected: p = 100e8 * 1e18 (mult) / 1e18 = 100e8, then scaled by
        // 10 ** (36 + 6 - 18 - 8) = 10 ** 16, giving 100e24.
        assertEq(p, uint256(100_00_000_000) * 1e16);
    }

    function testMultiplierIncreasesPrice() public {
        _setPrice(100_00_000_000);
        uint256 pBefore = oracle.price();

        // A 5% dividend growth: uiMultiplier from 1e18 to 1.05e18.
        stock.applyDividend(500);
        uint256 pAfter = oracle.price();

        // Price must grow by ~5%, within 1 wei rounding.
        uint256 expected = pBefore * 105 / 100;
        assertApproxEqAbs(pAfter, expected, 1);
    }

    function testStalePriceReverts() public {
        _setPrice(100_00_000_000);
        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert(MultiplierAwareOracle.StalePrice.selector);
        oracle.price();
    }

    function testNegativePriceReverts() public {
        _setPrice(-1);
        vm.expectRevert(MultiplierAwareOracle.NegativePrice.selector);
        oracle.price();
    }

    function testFuzz_MultiplierMonotonic(uint16 growthBps) public {
        growthBps = uint16(bound(growthBps, 1, 5_000)); // <= 50% growth per event
        _setPrice(100_00_000_000);
        uint256 pBefore = oracle.price();
        stock.applyDividend(growthBps);
        uint256 pAfter = oracle.price();
        assertGt(pAfter, pBefore, "price must strictly increase after dividend");
    }
}
