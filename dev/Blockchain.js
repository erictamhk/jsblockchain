const sha256 = require("sha256");
const uuid = require("uuid/v1");
const currentNodeUrl = process.argv[3];

class Block {
  constructor(index, timestamp, data, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = "";
  }

  calculateHash() {
    const dataAsString =
      this.index +
      this.previousHash +
      this.timestamp +
      this.nonce +
      JSON.stringify(this.data);
    return sha256(dataAsString);
  }
}

class Blockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];

    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];

    this.genesisBlockData = {
      nonce: 0,
      previousHash: "BeforeGenesisBlock",
      hash: "GenesisBlock"
    };

    //create the Genesis Block
    this.createNewBlock(
      this.genesisBlockData.nonce,
      this.genesisBlockData.previousHash,
      this.genesisBlockData.hash
    );
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
    const correctNonce = genesisBlock["nonce"] === this.genesisBlockData.nonce;
    const correctPreviousBlockHash =
      genesisBlock["previousBlockHash"] === this.genesisBlockData.previousHash;
    const correctTransactions = genesisBlock["transactions"].length === 0;
    if (!(correctNonce && correctPreviousBlockHash && correctTransactions)) {
      validChain = false;
    }

    return validChain;
  }

  getBlock(blockHash) {
    let correctBlock = null;
    this.chain.forEach(block => {
      if (block.hash === blockHash) {
        correctBlock = block;
      }
    });
    return correctBlock;
  }

  getTransaction(transactionId) {
    let correctTransaction = null;
    let correctBlock = null;
    this.chain.forEach(block => {
      block.transactions.forEach(transaction => {
        if (transaction.transactionId === transactionId) {
          correctTransaction = transaction;
          correctBlock = block;
        }
      });
    });
    return {
      transaction: correctTransaction,
      block: correctBlock
    };
  }

  getAddressData(address) {
    const addressTransactions = [];
    this.chain.forEach(block => {
      block.transactions.forEach(transaction => {
        if (
          transaction.sender === address ||
          transaction.recipient === address
        ) {
          addressTransactions.push(transaction);
        }
      });
    });

    let balance = 0;
    addressTransactions.forEach(transaction => {
      if (transaction.recipient === address) {
        balance += transaction.amount;
      }
      if (transaction.sender === address) {
        balance -= transaction.amount;
      }
    });

    return {
      addressTransactions,
      addressBalance: balance
    };
  }

  getAllAddress() {
    const addresses = [];
    this.chain.forEach(block => {
      block.transactions.forEach(transaction => {
        const { sender, recipient } = transaction;
        if (
          addresses.indexOf(sender) === -1 &&
          addresses.indexOf(recipient) === -1
        ) {
          if (addresses.indexOf(sender) === -1 && sender !== "00") {
            addresses.push(sender);
          } else if (addresses.indexOf(recipient) === -1) {
            addresses.push(recipient);
          }
        }
      });
    });

    return addresses;
  }
}

module.exports = Blockchain;
