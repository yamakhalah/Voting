const SimpleStorage = artifacts.require("Storage");
const {BN, expectRevert, expectEvent} = require('@openzeppelin/test-helpers');
const {expect} = require('chai');

contract("SimpleStorage", accounts => {

    beforeEach(async function () {
        SimpleStorageInstance = await SimpleStorage.new({from: accounts[0]});
    })

    it("... should return the value 89", async() => {

        await SimpleStorageInstance.store(89,{from: accounts[0]});

        const storedData = await SimpleStorageInstance.retrieve.call();

        assert.equal(storedData,89, "the value 89 was not stored");
        expect(storedData).to.be.bignumber.equal(BN(89));
    });


    it("Should emit an Event with the value stored", async() => {
        const result = await SimpleStorageInstance.store(89,{from: accounts[0]});
        await expectEvent(result, 'stored',{_data:BN(89)});
    })

    it("Should retun an error when the value is <10", async() => {
        await expectRevert(SimpleStorageInstance.store(2,{from: accounts[0]}), "j'aime pas ce nombre");
    })


});