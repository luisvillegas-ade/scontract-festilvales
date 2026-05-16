import { network } from "hardhat";

async function main() {
  console.log("--- Despliegue de EscrowSplit en Avalanche Fuji ---");

  // Hardhat v3 pattern found in other scripts
  const { ethers } = await (network as any).create();

  const CORPORATE_WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; 

  console.log(`Configurando billetera corporativa: ${CORPORATE_WALLET}`);

  const EscrowSplit = await ethers.getContractFactory("EscrowSplit");

  console.log("Desplegando contrato...");

  const escrow = await EscrowSplit.deploy(CORPORATE_WALLET);

  await escrow.waitForDeployment();

  const contractAddress = await escrow.getAddress();

  console.log("----------------------------------------------------");
  console.log(`✅ Contrato EscrowSplit desplegado exitosamente!`);
  console.log(`📍 Dirección: ${contractAddress}`);
  console.log(`🏢 Corporate Wallet vinculada: ${CORPORATE_WALLET}`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
