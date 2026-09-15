// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {MarketHours} from "../contracts/libraries/MarketHours.sol";

contract MarketHoursTest is Test {
    // Reference: 2026-01-05 (Mon) 14:30:00 UTC == 09:30 ET → regular open bell.
    uint256 constant MON_JAN_5_2026_UTC_1430 = 1767623400;

    function testRegularOpenBell() public {
        assertEq(uint8(MarketHours.state(MON_JAN_5_2026_UTC_1430)), uint8(MarketHours.State.Open));
    }

    function testPreMarket() public {
        // 05:00 ET on the same Monday = 10:00 UTC
        assertEq(uint8(MarketHours.state(MON_JAN_5_2026_UTC_1430 - 4 * 3600 - 1800)), uint8(MarketHours.State.PreMarket));
    }

    function testAfterHours() public {
        // 17:00 ET = 22:00 UTC
        assertEq(uint8(MarketHours.state(MON_JAN_5_2026_UTC_1430 + 7 * 3600 + 1800)), uint8(MarketHours.State.AfterHours));
    }

    function testWeekend() public {
        // Sunday 2026-01-04
        uint256 sun = MON_JAN_5_2026_UTC_1430 - 1 days;
        assertEq(uint8(MarketHours.state(sun)), uint8(MarketHours.State.Closed));
    }

    function testDeepNight() public {
        // 02:00 ET Monday = 07:00 UTC
        assertEq(uint8(MarketHours.state(MON_JAN_5_2026_UTC_1430 - 7 * 3600 - 1800)), uint8(MarketHours.State.Closed));
    }

    function testSpreadWidening() public {
        assertEq(MarketHours.spreadMultiplierBps(MarketHours.State.Open), 100);
        assertEq(MarketHours.spreadMultiplierBps(MarketHours.State.PreMarket), 200);
        assertEq(MarketHours.spreadMultiplierBps(MarketHours.State.AfterHours), 200);
        assertEq(MarketHours.spreadMultiplierBps(MarketHours.State.Closed), 500);
        assertEq(MarketHours.spreadMultiplierBps(MarketHours.State.Halted), 10_000);
    }

    function testLeverageCaps() public {
        assertEq(MarketHours.maxLeverageX(MarketHours.State.Open), 0); // unlimited
        assertEq(MarketHours.maxLeverageX(MarketHours.State.PreMarket), 10);
        assertEq(MarketHours.maxLeverageX(MarketHours.State.Closed), 3);
        assertEq(MarketHours.maxLeverageX(MarketHours.State.Halted), 1);
    }

    function testAllowsNewLeverageMatchesLeverageCap() public {
        assertTrue(MarketHours.allowsNewLeverage(MarketHours.State.Open));
        assertTrue(MarketHours.allowsNewLeverage(MarketHours.State.PreMarket));
        assertTrue(MarketHours.allowsNewLeverage(MarketHours.State.AfterHours));
        assertFalse(MarketHours.allowsNewLeverage(MarketHours.State.Closed));
        assertFalse(MarketHours.allowsNewLeverage(MarketHours.State.Halted));
    }
}
