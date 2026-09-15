// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IMorphoOracle} from "../interfaces/IMorphoBlue.sol";
import {IChainlinkDataStream} from "../interfaces/IChainlinkDataStream.sol";
import {IScaledUIAmount} from "../interfaces/IScaledUIAmount.sol";
import {MarketHours} from "../libraries/MarketHours.sol";
import {MultiplierMath} from "../libraries/MultiplierMath.sol";

/// @title MultiplierAwareOracle
/// @notice Morpho Blue oracle that treats a Robinhood Stock Token as
///         **collateral that appreciates from dividends**. Every other
///         tokenized-stock lender on Robinhood Chain today (Morpho with the
///         default oracle, Spark, TownSquare, etc.) reads `balanceOf * price`
///         and quietly leaves the multiplier's dividend growth on the table.
///         When Apple pays a dividend, a borrower who has posted AAPL as
///         collateral sees their raw balance stay flat, so the loan-to-value
///         ratio stays flat too — even though they now truly own more
///         underlying shares.
///
///         This oracle fixes that by returning:
///             price = chainlinkPrice × uiMultiplier / 1e18
///
///         Effect: as `uiMultiplier` grows, the collateral value grows in
///         Morpho's eyes, and the borrower's health factor auto-improves.
///         The liquidation line moves *down* on every dividend / stock split,
///         so borrowers who never touch their position get safer over time.
///
/// @dev    The Chainlink Data Streams price on Robinhood Chain already
///         embeds the multiplier per the docs, so multiplying by it again
///         would double-count. When integrating with Data Streams we set
///         `dsAlreadyScaled = true` and use the raw feed. When we integrate
///         with a "vanilla" price source (Pyth free tier, Metric, etc.) we
///         set `dsAlreadyScaled = false` and apply the multiplier ourselves.
///         This flag is the single knob that makes this oracle safe to reuse
///         across every stock market on Morpho Blue.
contract MultiplierAwareOracle is IMorphoOracle {
    /// @notice Address of the collateral stock token (implements ERC-8056).
    address public immutable stockToken;

    /// @notice Chainlink Data Streams feed id for the underlying stock price.
    bytes32 public immutable feedId;

    /// @notice Data Streams verifier / cache exposed by the L3 precompile
    ///         (or, on L2, the standard Chainlink verifier contract).
    IChainlinkDataStream public immutable priceSource;

    /// @notice True if `priceSource` already multiplies price by uiMultiplier.
    ///         For Chainlink Data Streams on Robinhood Chain this must be `true`.
    bool public immutable dsAlreadyScaled;

    /// @notice Decimals of the underlying stock (Chainlink stock feeds are 8).
    uint256 public immutable priceDecimals;

    /// @notice Decimals of the loan token (USDG = 6).
    uint256 public immutable loanDecimals;

    /// @notice Decimals of the collateral token (stock token = 18).
    uint256 public immutable collateralDecimals;

    /// @notice Maximum acceptable staleness for a Data Streams report.
    ///         Reads older than this revert with `StalePrice`.
    uint256 public immutable maxStalenessSeconds;

    error StalePrice();
    error PriceHalted();
    error NegativePrice();

    constructor(
        address _stockToken,
        bytes32 _feedId,
        IChainlinkDataStream _priceSource,
        bool _dsAlreadyScaled,
        uint256 _priceDecimals,
        uint256 _loanDecimals,
        uint256 _collateralDecimals,
        uint256 _maxStalenessSeconds
    ) {
        stockToken = _stockToken;
        feedId = _feedId;
        priceSource = _priceSource;
        dsAlreadyScaled = _dsAlreadyScaled;
        priceDecimals = _priceDecimals;
        loanDecimals = _loanDecimals;
        collateralDecimals = _collateralDecimals;
        maxStalenessSeconds = _maxStalenessSeconds;
    }

    /// @notice Morpho Blue expects `price()` to return the price of 1 unit
    ///         (10 ** collateralDecimals) of collateral, denominated in the
    ///         loan token, scaled by 1e36. That specific 1e36 anchor is
    ///         Morpho's convention and is critical for LLTV math.
    function price() external view override returns (uint256) {
        // 1) Halt-gate: during a Halted state we let the market breathe but
        //    freeze the oracle at its last reported price. Morpho reads this
        //    as a stale price and pauses new borrows. Existing positions can
        //    still repay because that path doesn't call the oracle at all.
        if (MarketHours.current() == MarketHours.State.Halted) revert PriceHalted();

        IChainlinkDataStream.Report memory r = priceSource.latestReport(feedId);
        if (r.price <= 0) revert NegativePrice();
        if (r.observationsTimestamp + maxStalenessSeconds < block.timestamp) revert StalePrice();

        uint256 p = uint256(int256(r.price));

        // 2) Apply the multiplier only when the price source doesn't already
        //    scale it internally.
        if (!dsAlreadyScaled) {
            uint256 m = MultiplierMath.safeMultiplier(stockToken);
            p = p * m / MultiplierMath.ONE;
        }

        // 3) Scale to Morpho's 1e36 anchor.
        //    price_1e36 = p * 10 ** (36 + loanDecimals - collateralDecimals - priceDecimals)
        int256 exp = int256(36) + int256(loanDecimals) - int256(collateralDecimals) - int256(priceDecimals);
        if (exp >= 0) {
            return p * (10 ** uint256(exp));
        } else {
            return p / (10 ** uint256(-exp));
        }
    }
}
