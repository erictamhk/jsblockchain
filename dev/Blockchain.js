const sha256 = require("sha256");
const uuid = require("uuid/v1");
const currentNodeUrl = process.argv[3];

class Transaction {
  constructor(
    fromAddress,
    toAddress,
    amount,
    remark = "",
    transactionId = uuid()
      .split("-")
      .join(""),
    timestamp = Date.now()
  ) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.remark = remark;
    this.transactionId = transactionId;
    this.timestamp = timestamp;
  }

  calculateHash() {
    const dataAsString =
      this.fromAddress +
      this.toAddress +
      this.amount +
      this.remark +
      this.timestamp +
      this.transactionId;
    return sha256(dataAsString);
  }
}

class Block {
  constructor(
    index,
    timestamp,
    transactions,
    difficulty,
    nonce = 0,
    previousHash = ""
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.difficulty = difficulty;
    this.nonce = nonce;
    this.previousHash = previousHash;
    this.hash = "";
  }

  calculateHash() {
    const dataAsString =
      this.index +
      this.timestamp +
      this.difficulty +
      this.nonce +
      this.previousHash +
      JSON.stringify(this.transactions);
    return sha256(dataAsString);
  }

  isValid() {
    if (this.hash !== this.calculateHash()) {
      return false;
    }

    if (
      this.hash.substring(0, this.difficulty) !==
      Array(this.difficulty + 1).join("0")
    ) {
      return false;
    }

    return true;
  }
}

class Blockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];

    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];

    this.currentDifficulty = 4;
    this.rewardData = {
      amount: 12.5,
      fromAddress: "00"
    };

    //create the Genesis Block
    const genesisBlock = this.createGenesisBlock();
    genesisBlock.hash = genesisBlock.calculateHash();
    this.chain.push(genesisBlock);
  }

  createGenesisBlock() {
    return new Block(
      0,
      Date.parse("2019-01-01"),
      [],
      0,
      0,
      "BeforeGenesisBlock"
    );
  }

  addNewBlock(newBlock) {
    const lastBlock = this.getLastBlock();
    const correctHash = lastBlock.hash === newBlock.previousHash;
    const correctIndex = lastBlock["index"] + 1 === newBlock["index"];
    if (correctHash && correctIndex) {
      this.pendingTransactions = [];
      this.chain.push(newBlock);

      return true;
    } else {
      return false;
    }
  }

  mineNewBlock() {
    let nonce = -1;
    const newBlock = new Block(
      this.getLastBlock().index + 1,
      Date.now(),
      this.pendingTransactions,
      this.currentDifficulty,
      -1,
      this.getLastBlock().hash
    );
    do {
      nonce++;
      newBlock.nonce = nonce;
      newBlock.hash = newBlock.calculateHash();
    } while (!newBlock.isValid());

    return newBlock;
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

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  addTransactionToPendingTransactions(transactionObj) {
    this.pendingTransactions.push(transactionObj);
    return this.getLastBlock()["index"] + 1;
  }

  chainIsValid(chain) {
    //check the chain without genesisBlock
    for (let i = 1; i < chain.length; i++) {
      const currentBlockData = chain[i];

      const transactionsData = currentBlockData.transactions;
      const transactionsObjs = [];
      transactionsData.forEach(tran => {
        transactionsObjs.push(
          new Transaction(
            tran.fromAddress,
            tran.toAddress,
            tran.amount,
            tran.remark,
            tran.transactionId,
            tran.timestamp
          )
        );
      });
      const currentBlock = new Block(
        currentBlockData.index,
        currentBlockData.timestamp,
        transactionsObjs,
        currentBlockData.difficulty,
        currentBlockData.nonce,
        currentBlockData.previousHash
      );
      currentBlock.hash = currentBlockData.hash;

      const prevBlock = chain[i - 1];

      //check the previous hash
      if (currentBlock["previousHash"] !== prevBlock["hash"]) {
        return false;
      }
      if (!currentBlock.isValid()) {
        return false;
      }
    }

    //check the Genesis block
    const genesisBlock = chain[0];
    const realGenesis = this.createGenesisBlock();
    realGenesis.hash = realGenesis.calculateHash();
    if (JSON.stringify(realGenesis) !== JSON.stringify(genesisBlock)) {
      return false;
    }

    return true;
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
          transaction.fromAddress === address ||
          transaction.toAddress === address
        ) {
          addressTransactions.push(transaction);
        }
      });
    });

    let balance = 0;
    addressTransactions.forEach(transaction => {
      if (transaction.toAddress === address) {
        balance += transaction.amount;
      }
      if (transaction.fromAddress === address) {
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
        const { fromAddress, toAddress } = transaction;
        if (
          addresses.indexOf(fromAddress) === -1 &&
          addresses.indexOf(toAddress) === -1
        ) {
          if (
            addresses.indexOf(fromAddress) === -1 &&
            fromAddress !== this.rewardData.fromAddress
          ) {
            addresses.push(fromAddress);
          } else if (addresses.indexOf(toAddress) === -1) {
            addresses.push(toAddress);
          }
        }
      });
    });

    return addresses;
  }
}

module.exports = { Block, Transaction, Blockchain };
