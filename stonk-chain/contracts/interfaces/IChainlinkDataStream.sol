// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IChainlinkDataStream
/// @notice Minimal Chainlink Data Streams interface for stock price feeds on
///         Robinhood Chain. Data Streams deliver low-latency, pull-based
///         price reports; a fresh report can be verified on-chain per read.
/// @dev    The Robinhood Chain Chainlink integration exposes prices that
///         already include the token's `uiMultiplier`. Never apply the
///         multiplier again on top of a Data Streams price. When callers need
///         the "raw" (per-share) price, they must divide by the multiplier
///         themselves — see `MultiplierMath.rawPrice`.
interface IChainlinkDataStream {
    struct Report {
        bytes32 feedId;
        uint32 validFromTimestamp;
        uint32 observationsTimestamp;
        uint192 nativeFee;
        uint192 linkFee;
        uint32 expiresAt;
        int192 price;
        int192 bid;
        int192 ask;
    }

    /// @notice Latest verified report for a feed. Cheap read; the L3 exposes
    ///         a precompile-backed cache updated every block.
    function latestReport(bytes32 feedId) external view returns (Report memory);

    /// @notice Pull-verify a signed report and return the decoded payload.
    function verifyAndDecode(bytes calldata signedReport, bytes calldata parameterPayload)
        external
        payable
        returns (Report memory);
}
