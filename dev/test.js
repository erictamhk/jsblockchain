const Blockchain = require("./Blockchain");
const bitcoin = new Blockchain();

const previousBlockHash = "A";
const currentBlockData = [
  { amount: 100, sender: "userB", recipient: "userC" },
  { amount: 101, sender: "userB", recipient: "userC" },
  { amount: 102, sender: "userC", recipient: "userD" }
];

const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
console.log(nonce);

const hash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);

console.log(hash);
