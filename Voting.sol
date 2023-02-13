// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.17;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Counters.sol";

contract Voting is Ownable {
    using Counters for Counters.Counter;

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    uint winningProposalId;

    WorkflowStatus workflowStatus;
    mapping (address=>Voter) private whitelist;
    Proposal[] public proposals;
    address[] private addressForMapping;
    Counters.Counter private whitelistCounter;
    Counters.Counter private proposalsCounter;


    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted(address voter, uint proposalId);

    constructor() {
        workflowStatus = WorkflowStatus.RegisteringVoters;
    }

    function authorize(address _address) public onlyOwner {
        require(!whitelist[_address].isRegistered, "Address already authorized");
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "Register time has ended !");
        Voter memory voter;
        voter.isRegistered = true;
        voter.hasVoted = false;
        whitelist[_address] = voter;
        whitelistCounter.increment();
        addressForMapping.push(_address);
    }

    function registerProposal(string memory _description) public isWhitelisted {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "Proposal Registration not started !");
        Proposal memory proposal = Proposal(_description, 0);
        proposals.push(proposal);
        emit ProposalRegistered(proposalsCounter.current());
        proposalsCounter.increment();
    }

    function vote(uint _proposalId) public isWhitelisted {
        require(_proposalId < proposalsCounter.current(), "Proposal ID out of scope");
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "Voting session not started");
        require(!whitelist[msg.sender].hasVoted, "You already have voted");
        proposals[_proposalId].voteCount++;
        whitelist[msg.sender].hasVoted = true;
        whitelist[msg.sender].votedProposalId = _proposalId;
        emit Voted(msg.sender, _proposalId);
    }

    function setWinner() private {
        uint winnerId = 0;
        for(uint i = 0; i < proposals.length; i++) {
            if(proposals[i].voteCount > proposals[winnerId].voteCount) {
                winnerId = i;
            }
        }
        winningProposalId = winnerId;
    }

    function getWinner() public view returns (Proposal memory){
        require(workflowStatus == WorkflowStatus.VotesTallied, "Winner has not already been declared");
        return proposals[winningProposalId];
    }


    function startProposalRegistration() public onlyOwner {
        require(whitelistCounter.current() > 0, "Whitelist is empty");
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "Proposal registration already ongoing or ended");
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

    function endProposalRegistration() public onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "Proposal registration already ended");
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    function startVotingSession() public onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationEnded, "Proposal Registration not already ended or voting session ended");
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }

    function endVotingSession() public onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "Voting session not started or already ended");
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    function electWinner() public onlyOwner returns (Proposal memory) {
        require(workflowStatus == WorkflowStatus.VotingSessionEnded, "Voting session not ended or started");
        workflowStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
        setWinner();
        return getWinner();
    }

    function reset() public onlyOwner {
        workflowStatus = WorkflowStatus.RegisteringVoters;
        delete winningProposalId;
        delete proposalsCounter;
        delete whitelistCounter;

        while(proposals.length > 0) {
            proposals.pop();
        }

        for(uint256 i = 0; i < addressForMapping.length; i++) {
            address current = addressForMapping[i];
            delete whitelist[current];
            delete addressForMapping[i];
        }
    }

    modifier isWhitelisted() {
        require(whitelist[msg.sender].isRegistered, "You are not whitelisted");
        _;
    }

}