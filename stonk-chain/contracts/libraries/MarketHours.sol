// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title MarketHours
/// @notice On-chain awareness of US equity market hours. Used across the
///         protocol to widen spreads during pre/after market, halt during
///         deep-night hours, and enable graduated circuit breakers instead
///         of hard closure — a differentiator vs. every other tokenized-stock
///         venue that either freezes trading or ignores hours entirely.
/// @dev    Pure Solidity implementation. On our L3 this library is replaced
///         by the `0x101 MarketHours` precompile that also reads scheduled
///         holiday and halt data from the CorpAction module. All callers use
///         the same `state()` signature so the migration is transparent.
library MarketHours {
    /// @notice Coarse-grained market state. Fine-grained per-symbol halts are
    ///         layered on top by the CorpAction precompile on L3.
    enum State {
        Closed, // deep night / weekend
        PreMarket, // 4:00 - 9:30 ET
        Open, // 9:30 - 16:00 ET
        AfterHours, // 16:00 - 20:00 ET
        Halted // circuit breaker or holiday

    }

    uint256 internal constant SECONDS_PER_DAY = 86_400;
    uint256 internal constant SECONDS_PER_HOUR = 3_600;

    // NYSE / NASDAQ core hours in seconds from midnight, US Eastern.
    uint256 internal constant PRE_OPEN = 4 * SECONDS_PER_HOUR; // 04:00
    uint256 internal constant REGULAR_OPEN = 9 * SECONDS_PER_HOUR + 30 * 60; // 09:30
    uint256 internal constant REGULAR_CLOSE = 16 * SECONDS_PER_HOUR; // 16:00
    uint256 internal constant AFTER_CLOSE = 20 * SECONDS_PER_HOUR; // 20:00

    /// @notice Coarse market state at `timestamp`. Weekends and midnight are
    ///         reported as `Closed`. The four-tier layering (Closed/Pre/Open/After)
    ///         is what drives the graduated circuit breakers used by the
    ///         MultiplierAwareHook and PortfolioMarginRouter.
    /// @dev    US Eastern Time approximation: fixed UTC-5. On L3 the
    ///         precompile handles DST automatically. For MVP the 1-hour DST
    ///         shift is acceptable: it only widens spread by one hour, twice a
    ///         year, at 04:00 ET.
    function state(uint256 timestamp) internal pure returns (State) {
        uint256 dow = _dayOfWeek(timestamp);
        if (dow == 0 || dow == 6) return State.Closed; // Sun / Sat

        // UTC -> ET: subtract 5 hours (approximation)
        uint256 secondsOfDay = (timestamp + SECONDS_PER_DAY - 5 * SECONDS_PER_HOUR) % SECONDS_PER_DAY;

        if (secondsOfDay < PRE_OPEN) return State.Closed;
        if (secondsOfDay < REGULAR_OPEN) return State.PreMarket;
        if (secondsOfDay < REGULAR_CLOSE) return State.Open;
        if (secondsOfDay < AFTER_CLOSE) return State.AfterHours;
        return State.Closed;
    }

    /// @notice Convenience overload using `block.timestamp`.
    function current() internal view returns (State) {
        return state(block.timestamp);
    }

    /// @notice Spread multiplier in basis points applied by market venues.
    ///         Open       => 100  bps of base fee (1.00x)
    ///         PreMarket  => 200  bps           (2.00x, half-liquid)
    ///         AfterHours => 200  bps           (2.00x)
    ///         Closed     => 500  bps           (5.00x, discourage overnight fills)
    ///         Halted     => 10000 bps          (blocks fills economically)
    function spreadMultiplierBps(State s) internal pure returns (uint16) {
        if (s == State.Open) return 100;
        if (s == State.PreMarket || s == State.AfterHours) return 200;
        if (s == State.Closed) return 500;
        return 10_000; // Halted
    }

    /// @notice Whether new leverage (open, size-increase) is permitted.
    ///         Reducing risk (close, size-decrease) is always allowed.
    function allowsNewLeverage(State s) internal pure returns (bool) {
        return s == State.Open || s == State.PreMarket || s == State.AfterHours;
    }

    /// @notice Maximum leverage cap by state. 0 means "no limit beyond
    ///         protocol max". Circuit-breaker semantics live here so every
    ///         perp/lending venue reads a single source of truth.
    function maxLeverageX(State s) internal pure returns (uint16) {
        if (s == State.Open) return 0; // full 50x
        if (s == State.PreMarket) return 10; // clamp to 10x
        if (s == State.AfterHours) return 10;
        if (s == State.Closed) return 3; // reduce-mostly window
        return 1; // Halted: no new leverage
    }

    // -----------------------------------------------------------------------
    // internals
    // -----------------------------------------------------------------------

    /// @dev Sun = 0, Mon = 1, ..., Sat = 6. Uses the well-known "January 1,
    ///      1970 was a Thursday" invariant of Unix time.
    function _dayOfWeek(uint256 timestamp) private pure returns (uint256) {
        return (timestamp / SECONDS_PER_DAY + 4) % 7;
    }
}
