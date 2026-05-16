import { network } from "hardhat";

async function main() {
  const { ethers } = await (network as any).create();
  const [deployer] = await ethers.getSigners();

  // ─── Wallets ───────────────────────────────────────────────────────
  // La productora (corporateWallet) es la misma que despliega (el owner)
  const CORPORATE_WALLET = deployer.address;
  const MUNICIPAL_WALLET = "0x6424E7f96027e00a379e40ef8de5e61361d3AdB4";

  console.log("🏔️  AvalanchePay Salta — Despliegue EscrowSplitV2");
  console.log("══════════════════════════════════════════════════════");
  console.log(`📬 Deployer / Productora: ${CORPORATE_WALLET}`);
  console.log(`🏛️  Municipalidad Salta:   ${MUNICIPAL_WALLET}`);
  console.log("──────────────────────────────────────────────────────");
  console.log("📡 Desplegando en Avalanche Fuji Testnet...");

  const EscrowSplitV2 = await ethers.getContractFactory("EscrowSplitV2");
  const escrow = await EscrowSplitV2.deploy(CORPORATE_WALLET, MUNICIPAL_WALLET);

  await escrow.waitForDeployment();
  const address = await escrow.getAddress();

  console.log("══════════════════════════════════════════════════════");
  console.log(`✅ Contrato EscrowSplitV2 desplegado!`);
  console.log(`📍 Dirección:             ${address}`);
  console.log(`🏢 Corporate Wallet (1%): ${CORPORATE_WALLET}`);
  console.log(`🏛️  Municipal Wallet (2%): ${MUNICIPAL_WALLET}`);
  console.log(`🎤 Artista recibe:        97%`);
  console.log("──────────────────────────────────────────────────────");
  console.log(`🔗 Snowtrace: https://testnet.snowtrace.io/address/${address}`);
  console.log("══════════════════════════════════════════════════════");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
