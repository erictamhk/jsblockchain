const sha256 = require("sha256");
const uuid = require("uuid/v1");
const currentNodeUrl = process.argv[3];

class Blockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];

    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];

    //create the Genesis Block
    this.createNewBlock(0, "BeforeGenesisBlock", "GenesisBlock");
  }

  addNodeUrl(newNodeUrl) {
    const nodeNotAlreadyPresent = this.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = this.currentNodeUrl !== newNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode) {
      this.networkNodes.push(newNodeUrl);
      return true;
    } else {
      return false;
    }
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
      recipient,
      transactionId: uuid()
        .split("-")
        .join("")
    };

    return newTransaction;
  }

  addTransactionToPendingTransactions(transactionObj) {
    this.pendingTransactions.push(transactionObj);
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

  chainIsValid(chain) {
    let validChain = true;
    const self = this;

    chain.forEach((val, idx, arr) => {
      if (idx > 0) {
        const currentBlock = val;
        const prevBlock = arr[idx - 1];
        const blockHash = self.hashBlock(
          prevBlock["hash"],
          {
            transactions: currentBlock["transactions"],
            index: currentBlock["index"]
          },
          currentBlock["nonce"]
        );

        //check the previous hash
        if (currentBlock["previousBlockHash"] !== prevBlock["hash"]) {
          validChain = false;
        }
        //check the hash data
        if (blockHash !== currentBlock["hash"]) {
          validChain = false;
        }
        //check the proof of work
        if (blockHash.substring(0, 4) !== "0000") {
          validChain = false;
        }
      }
    });

    //check the genesisBlock
    const genesisBlock = chain[0];
    const correctNonce = genesisBlock["nonce"] === 0;
    const correctPreviousBlockHash =
      genesisBlock["previousBlockHash"] === "BeforeGenesisBlock";
    const correctTransactions = genesisBlock["transactions"].length === 0;
    if (!(correctNonce && correctPreviousBlockHash && correctTransactions)) {
      validChain = false;
    }

    return validChain;
  }
}

module.exports = Blockchain;
