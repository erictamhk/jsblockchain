const express = require("express");
const app = express();
const bodyParser = require("body-parser");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/blockchain", function(req, res) {
  res.send("get blockchain!!");
});

app.post("/transaction", function(req, res) {
  res.send("post transaction!!");
});

app.get("/mine", function(req, res) {
  res.send("get mine!!");
});

app.listen(3001, function() {
  console.log("Listening on port 3000...");
});
