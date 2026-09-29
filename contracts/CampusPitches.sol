// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CampusPitches
 * @author Demo for 2nd-Year University Students
 * @notice An educational decentralized application (dApp) smart contract demonstrating:
 *         1. Decentralized State & Immutability (no central database).
 *         2. Cryptographic Access Control & Sybil-resistant Voting (1 vote per wallet).
 *         3. Direct Peer-to-Peer Native ETH Value Transfers (no payment gateways).
 *         4. Event-Driven Architecture (real-time blockchain logs).
 */
contract CampusPitches {

    // --- DATA STRUCTURES (EVM STORAGE) ---

    /**
     * @dev Represents a student project proposal stored permanently on the blockchain.
     */
    struct Pitch {
        uint256 id;                 // Unique identifier for the pitch
        address payable author;     // Cryptographic Ethereum address of the pitch creator
        string title;               // Project title
        string description;         // Project abstract or proposal details
        string category;            // Category (e.g., AI, Robotics, Green Campus, Social)
        uint256 voteCount;          // Total number of upvotes received
        uint256 totalFunds;         // Total micro-grants / tips received (in Wei: 1 ETH = 10^18 Wei)
        uint256 createdAt;          // Block timestamp when pitch was mined
    }

    /**
     * @dev Represents a peer-to-peer tip or micro-grant with an encouragement message.
     */
    struct Tip {
        address sender;             // Address of the donor/supporter
        uint256 amount;             // Tip amount in Wei
        string message;             // Encouragement message (e.g. "Great idea! Keep it up!")
        uint256 timestamp;          // Block timestamp
    }

    // --- STATE VARIABLES (PERMANENT STORAGE ON BLOCKCHAIN) ---

    /// @notice Auto-incrementing counter tracking total pitches submitted
    uint256 public pitchCount;

    /// @notice Main key-value store mapping pitch ID -> Pitch struct
    mapping(uint256 => Pitch) public pitches;

    /// @notice Nested mapping enforcing 1 vote per address: pitchId => (voterAddress => hasVoted)
    /// @dev Demonstrates how the EVM prevents double-voting at the protocol level.
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @notice Mapping from pitchId => array of received Tips
    mapping(uint256 => Tip[]) public pitchTips;

    // --- EVENTS (BLOCKCHAIN LOGS FOR REAL-TIME FRONTEND REACTIVITY) ---

    /// @notice Emitted when a student submits a new idea
    event PitchCreated(
        uint256 indexed id,
        address indexed author,
        string title,
        string category
    );

    /// @notice Emitted when a wallet casts a vote
    event Voted(
        uint256 indexed id,
        address indexed voter,
        uint256 newVoteCount
    );

    /// @notice Emitted when a student receives a micro-grant in ETH
    event PitchFunded(
        uint256 indexed id,
        address indexed funder,
        uint256 amount,
        string message
    );

    // --- CUSTOM ERRORS (GAS-EFFICIENT ALTERNATIVE TO REQUIRE STRINGS) ---
    error EmptyTitle();
    error PitchDoesNotExist();
    error AlreadyVoted();
    error CannotTipZero();
    error TransferFailed();

    // --- FUNCTIONS ---

    /**
     * @notice Submits a new project idea to the immutable ledger.
     * @param _title Title of the student project
     * @param _description Brief summary of what the project aims to do
     * @param _category Project category (e.g. "AI", "Campus Sustainability", "Software")
     * @return The unique ID assigned to the new pitch
     */
    function createPitch(
        string calldata _title,
        string calldata _description,
        string calldata _category
    ) external returns (uint256) {
        // Validate inputs (reverts transaction and refunds remaining gas if title is blank)
        if (bytes(_title).length == 0) revert EmptyTitle();

        pitchCount++;
        pitches[pitchCount] = Pitch({
            id: pitchCount,
            author: payable(msg.sender), // msg.sender is cryptographically verified by the digital signature
            title: _title,
            description: _description,
            category: _category,
            voteCount: 0,
            totalFunds: 0,
            createdAt: block.timestamp
        });

        emit PitchCreated(pitchCount, msg.sender, _title, _category);
        return pitchCount;
    }

    /**
     * @notice Cast an upvote for a student pitch.
     * @dev Enforces 1 vote per address. Once cast, the vote cannot be retracted or altered.
     * @param _pitchId The ID of the pitch to vote for
     */
    function vote(uint256 _pitchId) external {
        if (_pitchId == 0 || _pitchId > pitchCount) revert PitchDoesNotExist();
        if (hasVoted[_pitchId][msg.sender]) revert AlreadyVoted();

        // Mark as voted in the blockchain state storage
        hasVoted[_pitchId][msg.sender] = true;
        pitches[_pitchId].voteCount++;

        emit Voted(_pitchId, msg.sender, pitches[_pitchId].voteCount);
    }

    /**
     * @notice Send a native ETH micro-grant or tip directly to the student author.
     * @dev The function is `payable`, meaning it accepts native ETH attached via `msg.value`.
     *      The funds are transferred directly to `pitch.author` in the same atomic transaction.
     * @param _pitchId The ID of the pitch to fund
     * @param _message Encouragement note attached to the tip
     */
    function tipPitch(uint256 _pitchId, string calldata _message) external payable {
        if (_pitchId == 0 || _pitchId > pitchCount) revert PitchDoesNotExist();
        if (msg.value == 0) revert CannotTipZero();

        Pitch storage pitch = pitches[_pitchId];
        pitch.totalFunds += msg.value;

        // Record the tip history
        pitchTips[_pitchId].push(Tip({
            sender: msg.sender,
            amount: msg.value,
            message: _message,
            timestamp: block.timestamp
        }));

        // Atomic native ETH transfer to the author:
        // No bank, credit card processor, or middleman fees.
        (bool success, ) = pitch.author.call{value: msg.value}("");
        if (!success) revert TransferFailed();

        emit PitchFunded(_pitchId, msg.sender, msg.value, _message);
    }

    /**
     * @notice Fetch all pitches in a single RPC call for presentation UI convenience.
     * @return Array of all Pitch structs
     */
    function getAllPitches() external view returns (Pitch[] memory) {
        Pitch[] memory items = new Pitch[](pitchCount);
        for (uint256 i = 1; i <= pitchCount; i++) {
            items[i - 1] = pitches[i];
        }
        return items;
    }

    /**
     * @notice Fetch all tips and messages for a given pitch.
     * @param _pitchId The ID of the pitch
     * @return Array of Tip structs
     */
    function getPitchTips(uint256 _pitchId) external view returns (Tip[] memory) {
        return pitchTips[_pitchId];
    }

    /**
     * @notice Helper to check if a specific address has already voted for a pitch.
     * @param _pitchId The ID of the pitch
     * @param _voter The wallet address to query
     * @return bool True if already voted, false otherwise
     */
    function checkIfVoted(uint256 _pitchId, address _voter) external view returns (bool) {
        return hasVoted[_pitchId][_voter];
    }
}
