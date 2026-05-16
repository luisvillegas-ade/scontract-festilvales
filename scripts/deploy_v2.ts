import { network } from "hardhat";

async function main() {
  console.log("--- Despliegue de EscrowSplitV2 en Avalanche Fuji ---");

  const { ethers } = await (network as any).create();

  // Wallets from screenshot (lowercased to avoid checksum errors)
  const CORPORATE_WALLET = "0x4ccb7b5046a4ced166c4c4d29c16ee4dffbfa4e7"; // Productora
  const MUNICIPAL_WALLET = "0x6424e19557c3e8f81e48b0970e9d9d999903adb4"; // Municipalidad

  console.log(`Billetera Corporativa: ${CORPORATE_WALLET}`);
  console.log(`Billetera Municipal: ${MUNICIPAL_WALLET}`);

  const EscrowSplitV2 = await ethers.getContractFactory("EscrowSplitV2");

  console.log("Desplegando EscrowSplitV2...");

  const escrow = await EscrowSplitV2.deploy(CORPORATE_WALLET, MUNICIPAL_WALLET);

  await escrow.waitForDeployment();

  const contractAddress = await escrow.getAddress();

  console.log("----------------------------------------------------");
  console.log(`✅ Contrato EscrowSplitV2 desplegado exitosamente!`);
  console.log(`📍 Dirección: ${contractAddress}`);
  console.log(`🏢 Corporate Wallet: ${CORPORATE_WALLET}`);
  console.log(`🏛️ Municipal Wallet: ${MUNICIPAL_WALLET}`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
