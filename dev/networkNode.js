const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const uuid = require("uuid/v1");
const rp = require("request-promise");

const port = process.argv[2];

const nodeAddress = uuid()
  .split("-")
  .join("");

const { Block, Transaction, Blockchain } = require("./Blockchain");

const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/blockchain", function(req, res) {
  res.send(bitcoin);
});

// add a new transaction and broadcast to the network
app.post("/transaction/broadcast", function(req, res) {
  const newTransaction = new Transaction(
    req.body.fromAddress,
    req.body.toAddress,
    req.body.amount,
    req.body.remark
  );
  bitcoin.addTransactionToPendingTransactions(newTransaction);

  const requestPromises = [];
  bitcoin.networkNodes.forEach(url => {
    const requestOptions = {
      uri: url + "/transaction",
      method: "POST",
      body: {
        fromAddress: newTransaction.fromAddress,
        toAddress: newTransaction.toAddress,
        amount: newTransaction.amount,
        remark: newTransaction.remark,
        transactionId: newTransaction.transactionId,
        timestamp: newTransaction.timestamp
      },
      json: true
    };

    requestPromises.push(rp(requestOptions));
  });
  Promise.all(requestPromises)
    .then(data => {
      res.json({ note: `Transaction created and broadcast successfully.` });
    })
    .catch(err => {
      console.log(err);
      res.json({ note: "Transaction created and broadcast error!" });
    });
});

// receive transaction from the network and add to the pending transactions
app.post("/transaction", function(req, res) {
  const newTransaction = new Transaction(
    req.body.fromAddress,
    req.body.toAddress,
    req.body.amount,
    req.body.remark,
    req.body.transactionId,
    req.body.timestamp
  );
  const blockIndex = bitcoin.addTransactionToPendingTransactions(
    newTransaction
  );
  res.json({ note: `Transaction will be added in block ${blockIndex}.` });
});

app.get("/mine", function(req, res) {
  //step 1
  //mine a new block using pendingTransactions
  const newBlock = bitcoin.mineNewBlock();
  if (bitcoin.addNewBlock(newBlock)) {
    //step 2
    //broadcast the new block to the network
    const requestPromises = [];
    bitcoin.networkNodes.forEach(url => {
      const requestOptions = {
        uri: url + "/receive-new-block",
        method: "POST",
        body: { newBlock },
        json: true
      };

      requestPromises.push(rp(requestOptions));
    });
    Promise.all(requestPromises)
      .then(data => {
        //step 3
        //add a reward transaction to the network
        const requestOptions = {
          uri: bitcoin.currentNodeUrl + "/transaction/broadcast",
          method: "POST",
          body: {
            amount: bitcoin.rewardData.amount,
            fromAddress: bitcoin.rewardData.fromAddress,
            toAddress: nodeAddress,
            remark: "Reward Transaction"
          },
          json: true
        };
        return rp(requestOptions);
      })
      .then(data => {
        res.json({
          note: "New block mined & broadcast successfully",
          block: newBlock
        });
      })
      .catch(err => {
        console.log(err);

        res.json({
          note: "mining error: " + err,
          block: null
        });
      });
  } else {
    res.json({
      note: "mining error: no block added!",
      block: null
    });
  }
});

app.post("/receive-new-block", function(req, res) {
  const newBlockData = req.body.newBlock;
  const transactionsData = newBlockData.transactions;
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
  const newBlock = new Block(
    newBlockData.index,
    newBlockData.timestamp,
    transactionsObjs,
    newBlockData.difficulty,
    newBlockData.nonce,
    newBlockData.previousHash
  );
  newBlock.hash = newBlock.calculateHash();

  if (bitcoin.addNewBlock(newBlock)) {
    res.json({ note: "New block received and accepted.", newBlock });
  } else {
    res.json({ note: "New block rejected.", newBlock });
  }
});

//register a node and broadcast it the network
app.post("/register-and-broadcast-node", function(req, res) {
  const newNodeUrl = req.body.newNodeUrl;
  //check the new node in the node list or not
  if (bitcoin.addNodeUrl(newNodeUrl)) {
    const regNodesPromises = [];
    bitcoin.networkNodes.forEach(url => {
      const requestOptions = {
        uri: url + "/register-node",
        method: "POST",
        body: { newNodeUrl },
        json: true
      };

      regNodesPromises.push(rp(requestOptions));
    });

    Promise.all(regNodesPromises)
      .then(data => {
        const bulkRegisterOptions = {
          uri: newNodeUrl + "/register-nodes-bulk",
          method: "POST",
          body: {
            allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl]
          },
          json: true
        };

        return rp(bulkRegisterOptions);
      })
      .then(data => {
        res.json({ note: "New node registered with network successfully." });
      })
      .catch(err => {
        console.log(err);
        res.json({ note: "New node registered error!" });
      });
  } else {
    res.json({ note: "No node registered, already in the list!" });
  }
});

//register a node with the network
app.post("/register-node", function(req, res) {
  const newNodeUrl = req.body.newNodeUrl;

  if (bitcoin.addNodeUrl(newNodeUrl)) {
    res.json({ note: "New node registered successfully with node." });
  } else {
    res.json({ note: "No node registered." });
  }
});

//register multiple nodes at once
app.post("/register-nodes-bulk", function(req, res) {
  const allNetworkNodes = req.body.allNetworkNodes;

  allNetworkNodes.forEach(url => {
    bitcoin.addNodeUrl(url);
  });

  res.json({ note: "Bulk registeration successful." });
});

//this consesnsus algo is for longest chain rule
app.get("/consensus", function(req, res) {
  const requestPromises = [];
  bitcoin.networkNodes.forEach(url => {
    const requestOptions = {
      uri: url + "/blockchain",
      method: "GET",
      json: true
    };

    requestPromises.push(rp(requestOptions));
  });

  Promise.all(requestPromises)
    .then(blockchains => {
      const currentChainLength = bitcoin.chainIsValid(bitcoin.chain)
        ? bitcoin.chain.length
        : 0;
      let maxChainLength = currentChainLength;
      let newLongestChain = null;
      let newPendingTransactions = null;

      blockchains.forEach(blockchain => {
        if (
          blockchain.chain.length > maxChainLength &&
          bitcoin.chainIsValid(blockchain.chain)
        ) {
          maxChainLength = blockchain.chain.length;
          newLongestChain = blockchain.chain;
          newPendingTransactions = blockchain.pendingTransactions;
        }
      });

      if (newLongestChain === null) {
        res.json({
          note: "Current chain has not been replaced!",
          chain: bitcoin.chain
        });
      } else {
        bitcoin.chain = newLongestChain;
        bitcoin.pendingTransactions = newPendingTransactions;
        res.json({
          note: "Current chain has been replaced!",
          chain: bitcoin.chain
        });
      }
    })
    .catch(err => {
      res.json({
        note: "consensus got error! " + err,
        chain: null
      });
    });
});

app.get("/block/:blockHash", function(req, res) {
  const blockHash = req.params.blockHash;
  const correctBlock = bitcoin.getBlock(blockHash);
  if (correctBlock !== null) {
    res.json({
      note: "Block found!",
      block: correctBlock
    });
  } else {
    res.json({
      note: "Block not found!",
      block: null
    });
  }
});

app.get("/transaction/:transactionId", function(req, res) {
  const transactionId = req.params.transactionId;
  const {
    transaction: correctTransaction,
    block: correctBlock
  } = bitcoin.getTransaction(transactionId);

  if (correctTransaction !== null) {
    res.json({
      note: "Transaction found!",
      transaction: correctTransaction,
      block: correctBlock
    });
  } else {
    res.json({
      note: "Transaction not found!",
      transaction: null,
      block: null
    });
  }
});

app.get("/address/:address", function(req, res) {
  const address = req.params.address;
  const addressData = bitcoin.getAddressData(address);

  res.json({
    note: "address data.",
    addressData
  });
});

app.get("/alladdress", function(req, res) {
  const allAddress = bitcoin.getAllAddress();

  res.json({
    note: "all addresses.",
    allAddress
  });
});

app.get("/block-explorer", function(req, res) {
  res.sendFile("./block-explorer/index.html", { root: __dirname });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}...`);
});
