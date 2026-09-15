// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IMorphoBlue (minimal)
/// @notice Subset of the Morpho Blue singleton needed by our curator layer.
///         Morpho Blue markets are permissionless: anyone can spin up a
///         `(loanToken, collateralToken, oracle, irm, lltv)` market and
///         become a "curator" by concentrating liquidity into it. We use
///         this exact pattern with a custom `MultiplierAwareOracle` to
///         create the first dividend-aware borrow markets on Robinhood Chain.
interface IMorphoBlue {
    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    struct Market {
        uint128 totalSupplyAssets;
        uint128 totalSupplyShares;
        uint128 totalBorrowAssets;
        uint128 totalBorrowShares;
        uint128 lastUpdate;
        uint128 fee;
    }

    function createMarket(MarketParams memory params) external;

    function supply(MarketParams memory params, uint256 assets, uint256 shares, address onBehalf, bytes memory data)
        external
        returns (uint256, uint256);

    function borrow(
        MarketParams memory params,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256, uint256);

    function supplyCollateral(MarketParams memory params, uint256 assets, address onBehalf, bytes memory data)
        external;

    function withdrawCollateral(MarketParams memory params, uint256 assets, address onBehalf, address receiver)
        external;

    function repay(MarketParams memory params, uint256 assets, uint256 shares, address onBehalf, bytes memory data)
        external
        returns (uint256, uint256);

    function liquidate(
        MarketParams memory params,
        address borrower,
        uint256 seizedAssets,
        uint256 repaidShares,
        bytes memory data
    ) external returns (uint256, uint256);

    function market(bytes32 id) external view returns (Market memory);
}

/// @title IMorphoOracle
/// @notice Morpho oracle interface. Prices are returned scaled by 1e36 to
///         accommodate any decimals combination for the pair.
interface IMorphoOracle {
    /// @notice Price of 1 unit of collateral in terms of loan token, 1e36 fixed-point.
    function price() external view returns (uint256);
}
