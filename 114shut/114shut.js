// Take contract address, take token numbers
// Get their tokenURI
// Use their tokenURI to get attributes
// Get array of all number attributes
// Calculate rarity

const axios = require("axios").default;
const fs = require("fs");
const { performance } = require("perf_hooks");

const symb = "114shut";

async function main() {
  let traitInfo = {};
  let uniqueTraits = [];
  let nftInfo = [];
  let nftRarity = {};
  const now = performance.now();
  if (fs.existsSync("./" + symb + "TraitRarities.json")) {
    console.log("Traits exist, reading");
    traitInfo = JSON.parse(fs.readFileSync("./" + symb + "TraitRarities.json"));
    nftInfo = JSON.parse(fs.readFileSync("./" + symb + "NftTraits.json"));
    uniqueTraits = JSON.parse(fs.readFileSync("./" + symb + "TraitList.json"));
  } else {
    console.log("Traits don't exist, pulling");
    let numTotal = 5000;
    let info;
    let startIndex = 1;
    let baseInfo =
      "bafybeiboxnnsbqgfs4btvojupmooz5rpfr5fns5ldzxbh2m76jhugia2di/galaxyqqfSba/";

    for (let j = 0; j < 50; j++) {
      let infoLinks = [];
      console.log("Operation #" + j);
      for (
        let i = startIndex + j * 100;
        i < numTotal / 50 + startIndex + j * 100;
        i++
      ) {
        info = "http://127.0.0.1:8080/ipfs/" + baseInfo.concat(i);
        infoLinks.push(info);
      }

      await axios
        .all(infoLinks.map((endpoint) => axios.get(endpoint)))
        .then((pull) => {
          for (let h = 0; h < 100; h++) {
            let traits = pull[h].data.attributes;
            nftInfo.push(traits);
            if ("Trait Count " + traits.length in traitInfo) {
              traitInfo["Trait Count " + traits.length] += 1;
            } else {
              traitInfo["Trait Count " + traits.length] = 1;
            }

            for (let k = 0; k < traits.length; k++) {
              let traitName = `${traits[k].trait_type}-${traits[k].value}`;
              let traitType = traits[k].trait_type;

              if (traitName in traitInfo) {
                traitInfo[traitName] += 1;
              } else {
                traitInfo[traitName] = 1;
              }

              if (!uniqueTraits.includes(traitType)) {
                uniqueTraits.push(traitType);
              }
            }
          }
        });
    }
  }

  const finished = performance.now();

  console.log("Time to pull: ", finished - now);

  fs.writeFileSync(
    "./" + symb + "TraitRarities.json",
    JSON.stringify(traitInfo)
  );
  fs.writeFileSync("./" + symb + "NftTraits.json", JSON.stringify(nftInfo));
  fs.writeFileSync(
    "./" + symb + "TraitList.json",
    JSON.stringify(uniqueTraits)
  );

  for (const property in traitInfo) {
    if (traitInfo[property] != 0) {
      traitInfo[property] = 1 / (traitInfo[property] / 5000);
    }
  }

  for (let p = 0; p < 5000; p++) {
    let nftTrait = nftInfo[p];
    let rarity = 0;

    rarity += traitInfo["Trait Count " + nftTrait.length];

    for (let q = 0; q < nftTrait.length; q++) {
      let traitName = `${nftTrait[q].trait_type}-${nftTrait[q].value}`;

      rarity += traitInfo[traitName];
    }
    nftRarity[p + 1] = rarity;
  }

  let nftRaritySorted = Object.entries(nftRarity).sort((a, b) => b[1] - a[1]);

  fs.writeFileSync("./" + symb + "NftRarity.json", JSON.stringify(nftRarity));
  fs.writeFileSync(
    "./" + symb + "NftRaritySorted.json",
    JSON.stringify(nftRaritySorted)
  );
}

main();
