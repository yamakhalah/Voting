const Voting = artifacts.require("Voting");
const {BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');


contract("Voting", accounts => {
    let votingInstance;

    const owner = accounts[0];

    describe("Initial state and basic test up to next WorkFlowStatus.ProposalRegistrationStarted", () => {
        beforeEach(async function() {
            votingInstance = await Voting.new({ from: accounts[0]})
        })

        it("Not a voter - Should not let me do anything", async() => {
            await expectRevert(votingInstance.getVoter(accounts[0]), "You're not a voter");
            await expectRevert(votingInstance.getOneProposal(1), "You're not a voter");
            await expectRevert(votingInstance.addProposal('Should not be accepted'), "You're not a voter");
            await expectRevert(votingInstance.setVote(1), "You're not a voter");
        })

        it("addVoter - Only owner should be able to add voter", async() => {
            await expectRevert(votingInstance.addVoter(accounts[1], { from: accounts[1] }), 'caller is not the owner')
        })

        it("addVoter - Should emit event", async() => {
            const result = await votingInstance.addVoter(accounts[1]);
            await expectEvent(
                result,
                'VoterRegistered',
                { voterAddress: accounts[1] });
        })

        it("addVoter - Should not let me add same address twice", async() => {
            await votingInstance.addVoter(accounts[1]);
            await expectRevert(votingInstance.addVoter(accounts[1]), 'Already registered');
        })

        it("WorkflowStatus - Should not let me do any action except addVoter", async() => {
            await votingInstance.addVoter(accounts[1]);
            await expectRevert(votingInstance.addProposal('Test', { from: accounts[1] }), 'Proposals are not allowed yet')
            await expectRevert(votingInstance.setVote(1, { from: accounts[1] }), 'Voting session havent started yet');
            await expectRevert(votingInstance.tallyVotes(), "Current status is not voting session ended");
        })

        it("Should close voter registration and change WorkflowStatus except if im not owner", async() => {
            await expectRevert(votingInstance.startProposalsRegistering({ from: accounts[1] }), 'caller is not the owner');
            const result = await votingInstance.startProposalsRegistering();
            await expectEvent(
                result,
                'WorkflowStatusChange',
                {
                    previousStatus: BN(0),
                    newStatus: BN(1)
                });
        })

        it("Should return me voter", async () => {
            await votingInstance.addVoter(accounts[1]);
            const result = await votingInstance.getVoter(accounts[1], { from: accounts[1] });
            expect(result.isRegistered).to.be.equal(true)
        })
    })

    describe("In proposals registration state test", () => {
        beforeEach(async function() {
            votingInstance = await Voting.new({ from: accounts[0]})
            await votingInstance.addVoter(accounts[1]);
            await votingInstance.addVoter(accounts[2]);
            await votingInstance.addVoter(accounts[3]);
            await votingInstance.addVoter(accounts[4]);

            await votingInstance.startProposalsRegistering();
        })

        it("Should have 4 different voter", async () => {
            for(var i = 1; i < 5; i++) {
                const result = await votingInstance.getVoter(accounts[i], { from: accounts[i] });
                expect(result.isRegistered).to.be.equal(true);
            }
        })

        it("Should not be allowed to register more voter", async () => {
            await expectRevert(votingInstance.addVoter(accounts[5]), 'Voters registration is not open yet')
        })

        it("Should not be allowed to add empty description proposal", async () => {
            await expectRevert(votingInstance.addProposal('', { from: accounts[1] }), 'Vous ne pouvez pas ne rien proposer')
        })

        it("Should emit ProposalRegistered event", async () => {
            const result = await votingInstance.addProposal('Test', { from: accounts[1] });
            await expectEvent(
                result,
                'ProposalRegistered',
                { proposalId: BN(1) });
        })

        it("Should return me a proposal", async() => {
            await votingInstance.addProposal('Test', { from: accounts[1] });
            const proposal = await votingInstance.getOneProposal(1, { from: accounts[1] });
            await expect(proposal.description).to.be.equal('Test');
        })

        it("Should close proposal registration and change WorkflowStatus except if im not owner", async () => {
            await expectRevert(votingInstance.endProposalsRegistering({ from: accounts[1] }), 'caller is not the owner');
            const result = await votingInstance.endProposalsRegistering();
            await expectEvent(
                result,
                'WorkflowStatusChange',
                {
                    previousStatus: BN(1),
                    newStatus: BN(2)
                });
        })
    })

    describe("In start voting session state test", () => {
        beforeEach(async function() {
            votingInstance = await Voting.new({ from: accounts[0]})
            await votingInstance.addVoter(accounts[1]);
            await votingInstance.addVoter(accounts[2]);
            await votingInstance.addVoter(accounts[3]);
            await votingInstance.addVoter(accounts[4]);

            await votingInstance.startProposalsRegistering();

            await votingInstance.addProposal('Test 1', { from: accounts[1] });
            await votingInstance.addProposal('Test 2', { from: accounts[2] });
            await votingInstance.addProposal('Test 3', { from: accounts[3] });
            await votingInstance.addProposal('Test 4', { from: accounts[4] });

            await votingInstance.endProposalsRegistering();
            await votingInstance.startVotingSession();
        })

        it("Should not let you vote on undefined proposal", async () => {
            await expectRevert(votingInstance.setVote(8, { from: accounts[1] }), 'Proposal not found');
        })

        it("Should not let you vote twice", async () => {
            await votingInstance.setVote(1, { from: accounts[1] });
            await expectRevert(votingInstance.setVote(1, { from: accounts[1] }), 'You have already voted')
        })

        it("Should emit Voted event", async () => {
            const result = await votingInstance.setVote(1, { from: accounts[1] })
            await expectEvent(
                result,
                'Voted',
                {
                    voter: accounts[1],
                    proposalId: BN(1)
                });
        })

        it("Should close vote and change WorkflowStatus except if im not owner", async () => {
            await expectRevert(votingInstance.endVotingSession({ from: accounts[1] }), 'caller is not the owner');
            const result = await votingInstance.endVotingSession();
            await expectEvent(
                result,
                'WorkflowStatusChange',
                {
                    previousStatus: BN(3),
                    newStatus: BN(4)
                });
        })
    })


    describe("In tallied state test", () => {
        beforeEach(async function() {
            votingInstance = await Voting.new({ from: accounts[0]})
            await votingInstance.addVoter(accounts[1]);
            await votingInstance.addVoter(accounts[2]);
            await votingInstance.addVoter(accounts[3]);
            await votingInstance.addVoter(accounts[4]);

            await votingInstance.startProposalsRegistering();

            await votingInstance.addProposal('Test 1', { from: accounts[1] });
            await votingInstance.addProposal('Test 2', { from: accounts[2] });
            await votingInstance.addProposal('Test 3', { from: accounts[3] });
            await votingInstance.addProposal('Test 4', { from: accounts[4] });

            await votingInstance.endProposalsRegistering();
            await votingInstance.startVotingSession();

            await votingInstance.setVote(1, { from: accounts[1] })
            await votingInstance.setVote(1, { from: accounts[2] })
            await votingInstance.setVote(2, { from: accounts[3] })
            await votingInstance.setVote(3, { from: accounts[4] })

            await votingInstance.endVotingSession();
        })

        it('VoteTallied should emit event', async () => {
            const result = await votingInstance.tallyVotes();
            await expectEvent(
                result,
                'WorkflowStatusChange',
                {
                    previousStatus: BN(4),
                    newStatus: BN(5)
                });
        })

        it('winninProposalID should have been set with the winner', async() => {
            await votingInstance.tallyVotes();
            const winner = await votingInstance.winningProposalID()
            expect(winner).to.be.bignumber.equal(BN(1))
        })
    })

    describe("Test of ended WorkflowStatus", () => {
        beforeEach(async function() {
            votingInstance = await Voting.new({ from: accounts[0]})
        })
        it("Should emit event", async () => {
            await votingInstance.startProposalsRegistering()
            const result = await votingInstance.endProposalsRegistering()
            await expectEvent(
                result,
                'WorkflowStatusChange',
                {
                    previousStatus: BN(1),
                    newStatus: BN(2)
                });
        })

        it("Should emit event", async () => {
            await votingInstance.startProposalsRegistering()
            await votingInstance.endProposalsRegistering()
            await votingInstance.startVotingSession()
            const result = await votingInstance.endVotingSession()
            await expectEvent(
                result,
                'WorkflowStatusChange',
                {
                    previousStatus: BN(3),
                    newStatus: BN(4)
                });
        })
    })
})