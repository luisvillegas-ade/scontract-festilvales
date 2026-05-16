import { expect } from "chai";
import { network } from "hardhat";

// Hardhat v3 / EDR initialization
const { ethers } = await (network as any).create();

describe("EscrowSplit Unit Tests - Agent 3 Certification", function () {
  
  async function deployFixture() {
    const [productora, artista, tercero] = await ethers.getSigners();
    // La cuenta de la productora se usa como corporateWallet para recibir el 3%
    const escrow = await ethers.deployContract("EscrowSplit", [productora.address]);
    
    const IPFS_HASH = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
    const MONTO_TOTAL = ethers.parseUnits("100", 18); // 100 AVAX

    return { escrow, productora, artista, tercero, IPFS_HASH, MONTO_TOTAL };
  }

  describe("1. Despliegue y Ownership", function () {
    it("Debe setear al deployer como dueño y la wallet corporativa correctamente", async function () {
      const { escrow, productora } = await deployFixture();
      expect(await escrow.owner()).to.equal(productora.address);
      expect(await escrow.corporateWallet()).to.equal(productora.address);
    });
  });

  describe("2. Split de Pagos (3% Productora / 97% Artista)", function () {
    it("Debe liquidar con split exacto y emitir evento FundsReleased", async function () {
      const { escrow, artista, IPFS_HASH, MONTO_TOTAL } = await deployFixture();
      
      const feeEsperado = (MONTO_TOTAL * 300n) / 10000n; // 3 AVAX
      const netoEsperado = MONTO_TOTAL - feeEsperado;   // 97 AVAX

      const balArtistaPrev = await ethers.provider.getBalance(artista.address);

      // La productora deposita el escrow primero
      await escrow.depositarEscrow(artista.address, IPFS_HASH, { value: MONTO_TOTAL });

      const tx = await escrow.liberarPagoEscrow(IPFS_HASH);
      
      // Verificación de Split en Artista
      expect(await ethers.provider.getBalance(artista.address)).to.equal(balArtistaPrev + netoEsperado);

      // Verificación de Evento con argumentos corregidos
      await expect(tx)
        .to.emit(escrow, "FundsReleased")
        .withArgs(IPFS_HASH, artista.address, netoEsperado, feeEsperado, (ts: any) => ts > 0n);
    });
  });

  describe("3. Seguridad y Acceso", function () {
    it("Debe revertir si una wallet ajena intenta liberar fondos", async function () {
      const { escrow, artista, tercero, IPFS_HASH, MONTO_TOTAL } = await deployFixture();

      await escrow.depositarEscrow(artista.address, IPFS_HASH, { value: MONTO_TOTAL });

      await expect(escrow.connect(tercero).liberarPagoEscrow(IPFS_HASH))
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  describe("4. Prevención de Doble Pago", function () {
    it("Debe rechazar un segundo intento de liberar el mismo hash", async function () {
      const { escrow, artista, IPFS_HASH, MONTO_TOTAL } = await deployFixture();
      
      await escrow.depositarEscrow(artista.address, IPFS_HASH, { value: MONTO_TOTAL });
      await escrow.liberarPagoEscrow(IPFS_HASH);

      // El segundo intento debe fallar porque ya no está en estado Funded
      await expect(escrow.liberarPagoEscrow(IPFS_HASH))
        .to.be.revertedWithCustomError(escrow, "DealNotFunded");
    });
  });
});
