var Web3 = require('web3');
var TestRPC = require("../index.js");
var assert = require('assert');
var temp = require("temp").track();
var fs = require("fs");
var solc = require("solc");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

var source = fs.readFileSync("./test/Example.sol", {encoding: "utf8"});
var result = solc.compile(source, 1);

// Note: Certain properties of the following contract data are hardcoded to
// maintain repeatable tests. If you significantly change the solidity code,
// make sure to update the resulting contract data with the correct values.
var contract = {
  solidity: source,
  abi: result.contracts.Example.interface,
  binary: "0x" + result.contracts.Example.bytecode,
  position_of_value: "0x0000000000000000000000000000000000000000000000000000000000000000",
  expected_default_value: 5,
  call_data: {
    gas: '0x2fefd8',
    gasPrice: '0x01', // This is important, as passing it has exposed errors in the past.
    to: null, // set by test
    data: '0x3fa4f245'
  },
  transaction_data: {
    from: null, // set by test
    gas: '0x2fefd8',
    to: null, // set by test
    data: '0x552410770000000000000000000000000000000000000000000000000000000000000019' // sets value to 25 (base 10)
  }
};

describe("Persistency", function() {
  var web3 = new Web3();
  var provider;
  var cleanup;
  var accs;
  var db_path;
  var web3 = new Web3();

  // initialize a persistant provider
  before('init provider', function (done) {
    temp.mkdir('testrpc-db-', function(err, dirPath) {
      db_path = dirPath;
      provider = TestRPC.provider({
        db_path: dirPath,
        seed: "1337"
      });
      web3.setProvider(provider);
      done();
    });
  });

  before("Gather accounts", function(done) {
    web3.eth.getAccounts(function(err, a) {
      if (err) return done(err);
      accs = a;
      done();
    });
  });

  before("send transaction", function (done) {
    web3.eth.sendTransaction({
      from: accs[0],
      gas: '0x2fefd8',
      data: contract.binary
    }, done);
  });

  it("should have block height 1", function (done) {
    this.timeout(5000);
    web3.eth.getBlockNumber(function(err, res) {
      if (err) return done(err);

      assert(res == 1);

      // close the first provider now that we've gotten where we need to be.
      provider.close(done);
    });
  });

  it("should reopen the provider", function (done) {
    provider = TestRPC.provider({
      db_path: db_path,
      seed: "1337",
      // logger: console,
      // verbose: true
    });
    web3.setProvider(provider);
    done();
  });

  it("should still be on block height 1", function (done) {
    this.timeout(5000);
    web3.eth.getBlockNumber(function(err, result) {
      if (err) return done(err);
      assert(result == 1);
      done();
    });
  });

  it("should still have block data for first block", function (done) {
    web3.eth.getBlock(1, function(err, result) {
      if (err) return done(err);
      done();
    });
  });

});