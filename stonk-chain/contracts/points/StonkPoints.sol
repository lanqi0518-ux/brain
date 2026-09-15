// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title StonkPoints — non-transferable points ledger for airdrop accounting
/// @notice Tracks per-user, per-reason points balances. Points are minted by
///         whitelisted awarders (each protocol module has its own awarder
///         key). Points are non-transferable by construction; there is no
///         `transfer` function and no approval surface. At the airdrop
///         snapshot, an off-chain script reads the on-chain state and
///         computes the airdrop distribution against the volume/TVL ratio
///         penalty documented in `docs/TOKENOMICS.md`.
/// @dev    This contract intentionally avoids ERC-1155 to remove the
///         approval-for-all surface entirely. Points are internal state
///         only, exposed via `balanceOf`, `totalOf`, and events for
///         indexers.
contract StonkPoints is AccessControl {
    bytes32 public constant AWARDER_ROLE = keccak256("AWARDER_ROLE");

    /// @dev Snapshot block. Zero means "no snapshot yet". After it is
    ///      set, `award` reverts so the airdrop math is deterministic.
    uint256 public snapshotBlock;

    /// @dev balance[user][reason] — reasons are opaque bytes32 tags such
    ///      as keccak256("LP_STONK_HOOK") so different verticals can be
    ///      weighted independently at snapshot time.
    mapping(address => mapping(bytes32 => uint256)) public balance;

    /// @dev Sum across all reasons for a user; O(1) read.
    mapping(address => uint256) public totalOf;

    /// @dev Sum across all users for a reason; used for verticals-level
    ///      analytics and sanity checks.
    mapping(bytes32 => uint256) public totalByReason;

    /// @dev Aggregate. Should equal sum of totalOf and sum of totalByReason.
    uint256 public totalSupply;

    event PointsAwarded(address indexed user, bytes32 indexed reason, uint256 amount);
    event PointsSlashed(address indexed user, bytes32 indexed reason, uint256 amount, string cause);
    event SnapshotTaken(uint256 indexed block_);

    error SnapshotTaken_();
    error NothingToSlash();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Award points. Only callable by an AWARDER_ROLE holder
    ///         (each module — swap hook, lend market, bridge, perp — is
    ///         its own awarder so a compromised module cannot drain
    ///         points from other verticals).
    function award(address user, bytes32 reason, uint256 amount) external onlyRole(AWARDER_ROLE) {
        if (snapshotBlock != 0) revert SnapshotTaken_();
        balance[user][reason] += amount;
        totalOf[user] += amount;
        totalByReason[reason] += amount;
        totalSupply += amount;
        emit PointsAwarded(user, reason, amount);
    }

    /// @notice Slash points for wash trading / abuse. Only admin can call
    ///         it, and every slash event is public. This is the only lever
    ///         against sybils; there is intentionally no ban list.
    function slash(address user, bytes32 reason, uint256 amount, string calldata cause)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 current = balance[user][reason];
        if (current == 0 || amount == 0) revert NothingToSlash();
        uint256 slashAmt = amount > current ? current : amount;
        balance[user][reason] = current - slashAmt;
        totalOf[user] -= slashAmt;
        totalByReason[reason] -= slashAmt;
        totalSupply -= slashAmt;
        emit PointsSlashed(user, reason, slashAmt, cause);
    }

    /// @notice Freeze the ledger at the current block. One-way switch;
    ///         after this call no more points can be awarded or slashed.
    function takeSnapshot() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (snapshotBlock != 0) revert SnapshotTaken_();
        snapshotBlock = block.number;
        emit SnapshotTaken(block.number);
    }
}
