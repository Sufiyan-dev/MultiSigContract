// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const addr2 = "0xC9DDd4a9640DE6a774A231F5862c922AC6cb394D";
  const addr3 = "0x896388fe71D9e61ae564b315A3F5aBFf444aBb13";
  const contract = await hre.ethers.getContractFactory("multiSig");
  const newPartners = [addr2, addr3]
  const multiSig = await contract.deploy(newPartners);

  await multiSig.deployed();

  console.log("multiSig contract deployed to :", multiSig.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
