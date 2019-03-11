const { Block, Transaction, Blockchain } = require("./Blockchain");
const bitcoin = new Blockchain();

//test the genesisBlock
console.log("Genesis Block is Valid? ", bitcoin.chain[0].isValid());

//test the chain
console.log("The Chain is Valid? ", bitcoin.chainIsValid(bitcoin.chain));
