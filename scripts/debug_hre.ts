import hre from "hardhat";
console.log("HRE Keys:", Object.keys(hre));
if ((hre as any).ethers) {
  console.log("Ethers found!");
} else {
  console.log("Ethers NOT found on HRE");
}
