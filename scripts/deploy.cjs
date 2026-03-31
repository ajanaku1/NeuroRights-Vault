const hre = require("hardhat");

async function main() {
  const contract = await hre.viem.deployContract("NeuroRightsVault");
  console.log(`NeuroRightsVault deployed to: ${contract.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
