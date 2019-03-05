const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const uuid = require("uuid/v1");
const rp = require("request-promise");

const port = process.argv[2];

const nodeAddress = uuid()
  .split("-")
  .join("");

const blockchain = require("./Blockchain");

const bitcoin = new blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/blockchain", function(req, res) {
  res.send(bitcoin);
});

app.post("/transaction", function(req, res) {
  console.log(req.body);
  const newTransaction = req.body;
  const blockIndex = bitcoin.addTransactionToPendingTransactions(
    newTransaction
  );
  res.json({ note: `Transaction will be added in block ${blockIndex}.` });
});

app.post("/transaction/broadcast", function(req, res) {
  console.log(req.body);
  //res.send(`The amount of the transaction is ${req.body.amount} bitcoin!`);
  const newTransaction = bitcoin.createNewTransaction(
    req.body.amount,
    req.body.sender,
    req.body.recipient
  );
  bitcoin.addTransactionToPendingTransactions(newTransaction);

  const requestPromises = [];
  bitcoin.networkNodes.forEach(url => {
    const requestOptions = {
      uri: url + "/transaction",
      method: "POST",
      body: newTransaction,
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
      uri: url + "/recieve-new-block",
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
        body: { amount: 12.5, sender: "00", recipient: nodeAddress },
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

app.listen(port, function() {
  console.log(`Listening on port ${port}...`);
});
