// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IChainlinkDataStream} from "../interfaces/IChainlinkDataStream.sol";

/// @title MockDataStream
/// @notice Test double for Chainlink Data Streams. Lets tests set a price
///         and timestamp explicitly so oracle behaviour (staleness gates,
///         multiplier scaling, halted-state gating) can be exercised without
///         a live signer.
contract MockDataStream is IChainlinkDataStream {
    mapping(bytes32 => Report) internal _reports;

    function set(bytes32 feedId, int192 price, uint32 timestamp) external {
        _reports[feedId] = Report({
            feedId: feedId,
            validFromTimestamp: timestamp,
            observationsTimestamp: timestamp,
            nativeFee: 0,
            linkFee: 0,
            expiresAt: timestamp + 1 hours,
            price: price,
            bid: price,
            ask: price
        });
    }

    function latestReport(bytes32 feedId) external view override returns (Report memory) {
        return _reports[feedId];
    }

    function verifyAndDecode(bytes calldata, bytes calldata) external payable override returns (Report memory r) {
        return r;
    }
}
