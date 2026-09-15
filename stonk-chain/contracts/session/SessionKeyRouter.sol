// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title SessionKeyRouter
/// @notice A permission router that lets a user grant a scoped, time-limited
///         authorisation to a "session key" — typically an AI trading agent
///         or a bot — to perform a restricted set of actions on the user's
///         behalf without further wallet signatures.
///
///         The rise of on-chain AI agents has run head-first into a UX wall:
///         every trade requires a fresh signature, so agents that trade at
///         high frequency either can't run at all, or force the user to
///         hand over their entire private key. This router provides the
///         middle path: fine-grained permissions with explicit expiry, per-
///         action budgets, and one-click revocation.
///
///         A session is a tuple of:
///           (agent, targets, selectors, dailyBudget, expiresAt).
///
///         Actions are performed via `executeAsAgent` which validates all
///         predicates before forwarding the call. The router never holds
///         funds; the user's smart account keeps custody, and this contract
///         is registered as a module on that account. In the simplest
///         deployment against ZeroDev / Pimlico kernels, adding this
///         contract as a hook or validator gives it the ability to
///         authorise `execute` calls that match the session policy.
///
/// @dev    This contract is intentionally standalone rather than tied to
///         one AA vendor. `executeAsAgent` uses `call` to forward to
///         `target`; when integrated as a kernel module it will be wrapped
///         with the vendor's own signature validation. Every AA vendor with
///         a hook / validator system on Robinhood Chain (ZeroDev, Pimlico,
///         Safe modules) can compose with this router unchanged.
contract SessionKeyRouter {
    // -----------------------------------------------------------------------
    // types
    // -----------------------------------------------------------------------

    struct Session {
        address user; // owner of the smart account
        address agent; // session key (an EOA or contract) authorised to act
        uint64 expiresAt;
        uint64 startedAt;
        uint128 dailyBudgetWei; // running-native-value cap per 24h window
        uint128 spentTodayWei;
        uint64 dayEpoch; // floor(startedAt / 1 days), rolls over daily
        bool active;
    }

    struct ActionAllowance {
        bool allowed;
        uint128 dailyCount; // 0 = unlimited
        uint128 usedToday;
        uint64 dayEpoch;
    }

    /// @dev Storage layout is per (user, agent) → session.
    mapping(address user => mapping(address agent => Session)) public sessions;

    /// @dev Per-session allowance for a specific `(target, selector)` pair.
    ///      This is the fine-grained permission grid: users approve exactly
    ///      the calls their agent is allowed to make.
    mapping(bytes32 => ActionAllowance) public allowances;

    // -----------------------------------------------------------------------
    // events
    // -----------------------------------------------------------------------

    event SessionAuthorised(address indexed user, address indexed agent, uint64 expiresAt, uint128 dailyBudgetWei);
    event SessionRevoked(address indexed user, address indexed agent);
    event ActionAllowed(
        address indexed user, address indexed agent, address indexed target, bytes4 selector, uint128 dailyCount
    );
    event ActionRevoked(address indexed user, address indexed agent, address indexed target, bytes4 selector);
    event AgentExecuted(
        address indexed user, address indexed agent, address indexed target, bytes4 selector, uint256 value, bool ok
    );

    // -----------------------------------------------------------------------
    // errors
    // -----------------------------------------------------------------------

    error SessionExpired();
    error SessionInactive();
    error NotAllowed();
    error BudgetExceeded();
    error CountExceeded();
    error CallFailed(bytes returndata);
    error NotUser();

    // -----------------------------------------------------------------------
    // user-facing: authorise / revoke
    // -----------------------------------------------------------------------

    /// @notice Grant `agent` the right to act on behalf of `msg.sender`
    ///         until `expiresAt`, with `dailyBudgetWei` of native-token
    ///         value spend per 24h rolling window. `allowedTargets` /
    ///         `allowedSelectors` array pairs describe the exact set of
    ///         calls the agent may make. Both arrays must be the same length.
    function authoriseSession(
        address agent,
        uint64 expiresAt,
        uint128 dailyBudgetWei,
        address[] calldata allowedTargets,
        bytes4[] calldata allowedSelectors,
        uint128[] calldata perActionDailyCounts
    ) external {
        require(agent != address(0), "agent-zero");
        require(expiresAt > block.timestamp, "expiry-past");
        require(allowedTargets.length == allowedSelectors.length, "len-mismatch");
        require(allowedTargets.length == perActionDailyCounts.length, "len-mismatch-2");
        // Hard cap on session lifetime: 90 days. Users who want a longer
        // authorisation must reissue; makes revocation-by-neglect harmless.
        require(expiresAt <= block.timestamp + 90 days, "expiry-too-long");

        sessions[msg.sender][agent] = Session({
            user: msg.sender,
            agent: agent,
            expiresAt: expiresAt,
            startedAt: uint64(block.timestamp),
            dailyBudgetWei: dailyBudgetWei,
            spentTodayWei: 0,
            dayEpoch: uint64(block.timestamp / 1 days),
            active: true
        });

        for (uint256 i = 0; i < allowedTargets.length; ++i) {
            bytes32 k = _key(msg.sender, agent, allowedTargets[i], allowedSelectors[i]);
            allowances[k] = ActionAllowance({
                allowed: true,
                dailyCount: perActionDailyCounts[i],
                usedToday: 0,
                dayEpoch: uint64(block.timestamp / 1 days)
            });
            emit ActionAllowed(msg.sender, agent, allowedTargets[i], allowedSelectors[i], perActionDailyCounts[i]);
        }

        emit SessionAuthorised(msg.sender, agent, expiresAt, dailyBudgetWei);
    }

    /// @notice One-click kill switch for a session. Sets `active = false`;
    ///         no further `executeAsAgent` calls succeed.
    function revokeSession(address agent) external {
        sessions[msg.sender][agent].active = false;
        emit SessionRevoked(msg.sender, agent);
    }

    /// @notice Revoke a single (target, selector) permission without
    ///         killing the whole session. Useful when a user wants to
    ///         narrow an agent's scope on the fly.
    function revokeAction(address agent, address target, bytes4 selector) external {
        bytes32 k = _key(msg.sender, agent, target, selector);
        allowances[k].allowed = false;
        emit ActionRevoked(msg.sender, agent, target, selector);
    }

    // -----------------------------------------------------------------------
    // agent-facing: execute
    // -----------------------------------------------------------------------

    /// @notice The agent calls this to perform an authorised action on the
    ///         user's behalf. All validation happens here in one place.
    /// @param  user     The session owner.
    /// @param  target   Contract to call.
    /// @param  value    Native token value forwarded with the call.
    /// @param  data     Calldata, must begin with a whitelisted selector.
    function executeAsAgent(address user, address target, uint256 value, bytes calldata data)
        external
        payable
        returns (bytes memory result)
    {
        Session storage s = sessions[user][msg.sender];
        if (!s.active) revert SessionInactive();
        if (block.timestamp >= s.expiresAt) revert SessionExpired();

        bytes4 sel = _selectorOf(data);
        bytes32 k = _key(user, msg.sender, target, sel);
        ActionAllowance storage a = allowances[k];
        if (!a.allowed) revert NotAllowed();

        // Budget accounting: rolling 1-day epoch. When a new day starts we
        // reset counters transparently on read.
        uint64 today = uint64(block.timestamp / 1 days);
        if (today != s.dayEpoch) {
            s.dayEpoch = today;
            s.spentTodayWei = 0;
        }
        if (today != a.dayEpoch) {
            a.dayEpoch = today;
            a.usedToday = 0;
        }

        if (s.dailyBudgetWei > 0 && uint256(s.spentTodayWei) + value > s.dailyBudgetWei) revert BudgetExceeded();
        if (a.dailyCount > 0 && a.usedToday + 1 > a.dailyCount) revert CountExceeded();

        s.spentTodayWei = uint128(uint256(s.spentTodayWei) + value);
        a.usedToday += 1;

        // Forward. In production this contract will be wired as a module on
        // the user's smart account; here we call through directly so tests
        // and standalone use both work.
        (bool ok, bytes memory ret) = target.call{value: value}(data);
        emit AgentExecuted(user, msg.sender, target, sel, value, ok);
        if (!ok) revert CallFailed(ret);
        return ret;
    }

    // -----------------------------------------------------------------------
    // views
    // -----------------------------------------------------------------------

    function isAllowed(address user, address agent, address target, bytes4 selector) external view returns (bool) {
        Session memory s = sessions[user][agent];
        if (!s.active || block.timestamp >= s.expiresAt) return false;
        return allowances[_key(user, agent, target, selector)].allowed;
    }

    function remainingBudget(address user, address agent) external view returns (uint256) {
        Session memory s = sessions[user][agent];
        if (!s.active || block.timestamp >= s.expiresAt) return 0;
        if (uint64(block.timestamp / 1 days) != s.dayEpoch) return s.dailyBudgetWei; // reset
        if (s.dailyBudgetWei == 0) return type(uint256).max;
        return s.dailyBudgetWei > s.spentTodayWei ? uint256(s.dailyBudgetWei - s.spentTodayWei) : 0;
    }

    // -----------------------------------------------------------------------
    // internals
    // -----------------------------------------------------------------------

    function _key(address user, address agent, address target, bytes4 selector) private pure returns (bytes32) {
        return keccak256(abi.encode(user, agent, target, selector));
    }

    function _selectorOf(bytes calldata data) private pure returns (bytes4 s) {
        if (data.length < 4) return bytes4(0);
        s = bytes4(data[0]) | (bytes4(data[1]) >> 8) | (bytes4(data[2]) >> 16) | (bytes4(data[3]) >> 24);
    }

    receive() external payable {}
}
