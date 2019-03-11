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
    req.body.timestamp
  );
  const blockIndex = bitcoin.addTransactionToPendingTransactions(
    newTransaction
  );
  res.json({ note: `Transaction will be added in block ${blockIndex}.` });
});

app.get("/mine", function(req, res) {
  const lastBlock = bitcoin.getLastBlock();
  const previousBlockHash = lastBlock["hash"];
  const currentBlockData = {
    transactions: bitcoin.pendingTransactions,
    index: lastBlock["index"] + 1
  };
  const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
  const blockHash = bitcoin.hashBlock(
    previousBlockHash,
    currentBlockData,
    nonce
  );

  const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);

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
      const requestOptions = {
        uri: bitcoin.currentNodeUrl + "/transaction/broadcast",
        method: "POST",
        body: { amount: 12.5, fromAddress: "00", toAddress: nodeAddress },
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
    });
});

app.post("/receive-new-block", function(req, res) {
  console.log(req.body);
  const newBlock = req.body.newBlock;
  const lastBlock = bitcoin.getLastBlock();
  const correctHash = lastBlock.hash === newBlock.previousBlockHash;
  const correctIndex = lastBlock["index"] + 1 === newBlock["index"];

  if (correctHash && correctIndex) {
    bitcoin.chain.push(newBlock);
    bitcoin.pendingTransactions = [];
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

  Promise.all(requestPromises).then(blockchains => {
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
