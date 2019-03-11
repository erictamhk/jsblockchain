const { Block, Transaction, Blockchain } = require("./Blockchain");
const bitcoin = new Blockchain();

//test the genesisBlock
console.log(bitcoin.chain[0].isValid());
