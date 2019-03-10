const Blockchain = require("./Blockchain");
const bitcoin = new Blockchain();

bc1 = {
  chain: [
    {
      index: 1,
      timestamp: 1552210577683,
      transactions: [],
      nonce: 0,
      hash: "GenesisBlock",
      previousBlockHash: "BeforeGenesisBlock"
    },
    {
      index: 2,
      timestamp: 1552210864229,
      transactions: [
        {
          amount: 12,
          sender: "c0c178f03a8f11e9894c131203f40ed4",
          recipient: "11223399",
          transactionId: "9a67a2b0431811e9a54cd11f319851cb"
        },
        {
          amount: 12,
          sender: "c0c178f03a8f11e9894c131203f40ed4",
          recipient: "11223399",
          transactionId: "9dbac550431811e9a0c01b3eadc78ae7"
        }
      ],
      nonce: 26606,
      hash: "00100b82b65ad5df8a9003c0373cc687a1e235565130af91e06d88a15346cf145",
      previousBlockHash: "GenesisBlock"
    },
    {
      index: 3,
      timestamp: 1552210887840,
      transactions: [
        {
          amount: 12.5,
          sender: "00",
          recipient: "f4a16f00431711e9a0c01b3eadc78ae7",
          transactionId: "9f4d7340431811e9a0c01b3eadc78ae7"
        }
      ],
      nonce: 6569,
      hash: "000092f0126f21095a2d3e5f5a8dfec49d006cff012d81928fd82bd872fd88a9",
      previousBlockHash:
        "0000b82b65ad5df8a9003c0373cc687a1e235565130af91e06d88a15346cf145"
    }
  ]
};

console.log("VALID: ", bitcoin.chainIsValid(bc1.chain));
