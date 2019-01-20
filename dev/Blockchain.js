class Blockchain {
  constructor() {
    this.chain = [];
    this.newTransactions = [];
  }

  createNewBlock(nonce, previousBlockHash, hash) {
    const newBlock = {
      index: this.chain.length + 1,
      timestamp: Date.now(),
      transactions: this.newTransactions,
      nonce: nonce,
      hash: hash,
      previousBlockHash: previousBlockHash
    };

    this.newTransactions = [];
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

    this.newTransactions.push(newTransaction);
  }
}

module.exports = Blockchain;
