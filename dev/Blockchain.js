const sha256 = require("sha256");

class Blockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];

    //create the Genesis Block
    this.createNewBlock(0, "BeforeGenesisBlock", "GenesisBlock");
  }

  createNewBlock(nonce, previousBlockHash, hash) {
    const newBlock = {
      index: this.chain.length + 1,
      timestamp: Date.now(),
      transactions: this.pendingTransactions,
      nonce: nonce,
      hash: hash,
      previousBlockHash: previousBlockHash
    };

    this.pendingTransactions = [];
    this.chain.push(newBlock);

    return newBlock;
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  createNewTransaction(amount, sender, recipient) {
    const newTransaction = {
      amount,
      sender,
      recipient
    };

    this.pendingTransactions.push(newTransaction);

    return this.getLastBlock()["index"] + 1;
  }

  hashBlock(previousBlockHash, currentBlockData, nonce) {
    const dataAsString =
      previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    return sha256(dataAsString);
  }

  proofOfWork(previousBlockHash, currentBlockData) {
    let nonce = -1;
    let hash = "";
    do {
      nonce++;
      hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    } while (hash.substring(0, 4) !== "0000");

    return nonce;
  }
}

module.exports = Blockchain;
