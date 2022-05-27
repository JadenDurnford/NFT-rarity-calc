const fs = require("fs");
const prompt = require("prompt");
const symb = "StarPunks";

let nftRaritySorted = JSON.parse(
  fs.readFileSync("./" + symb + "NftRaritySorted.json")
);

const arrayToObject = (arr = []) => {
  const res = {};
  for (pair of arr) {
    const [key, value] = pair;
    res[key] = value;
  }
  return res;
};

let count = 0;

prompt.start();
prompt.get("NFTID", function (err, result) {
  let id = result.NFTID;
  let index = nftRaritySorted.findIndex(function (nft) {
    count++;
    return nft[0] == id;
  });
  console.log("Your NFT is rank #" + count);
});
