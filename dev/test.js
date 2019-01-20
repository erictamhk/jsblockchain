const Blockchain = require("./Blockchain");

const bitcoin = new Blockchain();

bitcoin.createNewBlock(1, "A", "B");

bitcoin.createNewTransaction(100, "userA", "userB");

bitcoin.createNewBlock(2, "B", "C");

bitcoin.createNewTransaction(101, "userA", "userB");
bitcoin.createNewTransaction(102, "userB", "userC");
bitcoin.createNewTransaction(103, "userC", "userD");

console.log(bitcoin);

console.log(bitcoin.chain[1]);
