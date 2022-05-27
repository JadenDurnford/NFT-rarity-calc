// Take contract address, take token numbers
// Get their tokenURI
// Use their tokenURI to get attributes
// Get array of all number attributes
// Calculate rarity

const { ethers } = require("ethers");
const { Contract, Provider } = require("ethers-multicall");
const axios = require("axios").default;
const fs = require("fs");
const { performance } = require("perf_hooks");

const etherscanKey = config.SCAN_KEY;
const alchemyKey = config.ALC_KEY;

const provider = new ethers.providers.JsonRpcProvider(
  "https://eth-mainnet.alchemyapi.io/v2/" + alchemyKey
);
const contractAddress = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";

async function main() {
  const interface = await axios.get(
    "https://api.etherscan.io/api?module=contract&action=getabi&address=" +
      contractAddress +
      etherscanKey
  );
  const contract = new ethers.Contract(
    contractAddress,
    interface.data.result,
    provider
  );
  const symb = await contract.symbol();

  let traitInfo = {};
  let uniqueTraits = [];
  let nftInfo = [];
  let nftRarity = {};

  if (fs.existsSync("./" + symb + "TraitRarities.json")) {
    console.log("Traits exist, reading");
    traitInfo = JSON.parse(fs.readFileSync("./" + symb + "TraitRarities.json"));
    nftInfo = JSON.parse(fs.readFileSync("./" + symb + "NftTraits.json"));
    uniqueTraits = JSON.parse(fs.readFileSync("./" + symb + "TraitList.json"));
  } else {
    console.log("Traits don't exist, pulling");
    let numTotal = await contract.totalSupply();
    numTotal = numTotal.toNumber();
    let info;
    let startIndex = 0;
    let baseInfo;
    let ipfs = false;
    let link = false;
    let other = false;

    try {
      info = await contract.tokenURI(0);
    } catch {
      info = await contract.tokenURI(1);
      startIndex = 1;
    }

    if (info.substring(0, 4) == "ipfs") {
      baseInfo = info.slice(7, -1);
      ipfs = true;
    } else if (info.substring(0, 4) == "http") {
      baseInfo = info.slice(0, -1);
      link = true;
    } else {
      other = true;
    }

    const now = performance.now();

    for (let j = 0; j < numTotal / 5000; j++) {
      let infoLinks = [];
      if (ipfs) {
        for (
          let i = startIndex + j * 5000;
          i < 5000 + startIndex + j * 5000;
          i++
        ) {
          info = "http://127.0.0.1:8080/ipfs/" + baseInfo.concat(i);
          infoLinks.push(info);
        }
      } else if (link) {
        for (
          let i = startIndex + j * 5000;
          i < 5000 + startIndex + j * 5000;
          i++
        ) {
          info = baseInfo.concat(i);
          infoLinks.push(info);
        }
      } else if (other) {
        for (
          let i = startIndex + j * 5000;
          i < 5000 + startIndex + j * 5000;
          i++
        ) {
          if (startIndex == 0) {
            infoLinks[i] = await contract.tokenURI(i);
          } else {
            infoLinks[i - 1] = await contract.tokenURI(i);
          }
          console.log(i);
        }
        for (let h = 0; h < 5000; h++) {
          let traits = infoLinks[h].data.attributes;
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

            if (uniqueTraits.includes(traitType)) {
              traitInfo[traitType + "-None"] -= 1;
            } else {
              uniqueTraits.push(traitType);
              traitInfo[traitType + "-None"] = 9999;
            }
          }
        }
      }
      if (!other) {
        await axios
          .all(infoLinks.map((endpoint) => axios.get(endpoint)))
          .then((pull) => {
            for (let h = 0; h < 5000; h++) {
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

                if (uniqueTraits.includes(traitType)) {
                  traitInfo[traitType + "-None"] -= 1;
                } else {
                  uniqueTraits.push(traitType);
                  traitInfo[traitType + "-None"] = 9999;
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
  }

  for (const property in traitInfo) {
    if (traitInfo[property] != 0) {
      traitInfo[property] = 1 / (traitInfo[property] / 10000);
    }
  }

  let allTraits = [];
  let traitWeighting = { Type: 1.2 };

  for (let p = 0; p < 10000; p++) {
    let uniqueTraits = JSON.parse(
      fs.readFileSync("./" + symb + "TraitList.json")
    );
    let nftTrait = nftInfo[p];
    let rarity = 0;
    allTraits = uniqueTraits;

    rarity += traitInfo["Trait Count " + nftTrait.length] * 1;

    for (let q = 0; q < nftTrait.length; q++) {
      let traitName = `${nftTrait[q].trait_type}-${nftTrait[q].value}`;
      let traitType = nftTrait[q].trait_type;

      if (nftTrait[q].trait_type in traitWeighting) {
        rarity += traitInfo[traitName] * traitWeighting[traitType];
      } else {
        rarity += traitInfo[traitName];
      }

      if (allTraits.includes(traitType)) {
        allTraits.splice(allTraits.indexOf(traitType), 1);
      }
    }

    for (let o = 0; o < uniqueTraits.length; o++) {
      function noneFunc(value) {
        let traitName = `${value}-None`;
        let traitType = value;

        if (value in traitWeighting) {
          rarity += traitInfo[traitName] * traitWeighting[traitType];
        } else {
          rarity += traitInfo[traitName];
        }
      }

      if (allTraits.includes(uniqueTraits[o])) {
        noneFunc(uniqueTraits[o]);
      }
    }
    nftRarity[p] = rarity;
  }
  fs.writeFileSync("./" + symb + "nftRarity.json", JSON.stringify(nftRarity));
}

main();
