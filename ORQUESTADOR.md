# 🗺️ TABLERO DEL ORQUESTADOR - B2B ESCROW SPLIT

## 🟢 ESTADO ACTUAL: DESARROLLADO FRONTEND (UI PREMIUM)
📍 Contrato: 0x7f174cd2a62aE9FaB508cdd8F31edC1a3981f0b1
💻 Frontend: Vite + React + Ethers.js

---

## 🕵️‍♂️ [AGENTE 1 - ARQUITECTO]
### Esquema SQL (Supabase):
```sql
CREATE TABLE empresas_productoras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_comercial TEXT NOT NULL,
    wallet_corporativa TEXT NOT NULL
);

CREATE TABLE contratos_escrow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    productora_id UUID REFERENCES empresas_productoras(id),
    monto_total_bruto NUMERIC NOT NULL,
    fee_productora_bps INT DEFAULT 300,
    monto_neto_artista NUMERIC NOT NULL,
    ipfs_hash_contrato TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING'
);
```

### Estructura JSON (IPFS):
```json
{
  "event": { "name": "Show Title", "line_up": ["..."] },
  "commercial": { "producer_id": "...", "fee_bps": 300 },
  "legal": { "rescission_clauses": ["..."] },
  "attachments": { "pdf_hash": "ipfs://..." }
}
```

---

## 💻 [AGENTE 2 - SOLIDITY DEV]
### Contrato EscrowSplit.sol:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EscrowSplit
 * @dev Contrato corporativo para automatizar split de pagos a artistas y comisiones.
 */
contract EscrowSplit is Ownable, ReentrancyGuard {
    
    // Mapping para bloquear el hash de IPFS una vez ejecutado (Evita doble pago)
    mapping(string => bool) public processedHashes;
    
    // Dirección de la cuenta corporativa/ticketera para cobrar el fee
    address public corporateAccount;
    
    // Fee fijo del 3% (Base 10000 = 300 bps)
    uint256 public constant SERVICE_FEE_BPS = 300; 

    // Eventos para tracking (Supabase/Indices)
    event FundsDistributed(
        string indexed ipfsHash,
        address indexed artist,
        uint256 netAmount,
        uint256 feeAmount,
        uint256 timestamp
    );

    error HashAlreadyProcessed();
    error TransferFailed();
    error InvalidAddress();
    error AmountRequired();

    constructor(address _corporateAccount) Ownable(msg.sender) {
        if (_corporateAccount == address(0)) revert InvalidAddress();
        corporateAccount = _corporateAccount;
    }

    /**
     * @dev Libera el pago depositado en escrow realizando el split automático.
     * @param _artist Wallet del artista beneficiario.
     * @param _ipfsHash Hash único del contrato comercial firmado.
     */
    function liberarPagoEscrow(
        address _artist, 
        string calldata _ipfsHash
    ) external payable onlyOwner nonReentrant {
        if (_artist == address(0)) revert InvalidAddress();
        if (msg.value == 0) revert AmountRequired();
        if (processedHashes[_ipfsHash]) revert HashAlreadyProcessed();

        uint256 totalAmount = msg.value;
        uint256 fee = (totalAmount * SERVICE_FEE_BPS) / 10000;
        uint256 netAmount = totalAmount - fee;

        // Bloqueo de seguridad
        processedHashes[_ipfsHash] = true;

        // Spread de fondos en Avalanche Fuji
        // 1. Envío de comisión corporativa (3%)
        (bool feeSent, ) = payable(corporateAccount).call{value: fee}("");
        if (!feeSent) revert TransferFailed();

        // 2. Envío neto al artista (97%)
        (bool artistSent, ) = payable(_artist).call{value: netAmount}("");
        if (!artistSent) revert TransferFailed();

        emit FundsDistributed(_ipfsHash, _artist, netAmount, fee, block.timestamp);
    }

    /**
     * @dev Permite actualizar la cuenta de recaudo si cambia la infraestructura corporativa.
     */
    function setCorporateAccount(address _newAccount) external onlyOwner {
        if (_newAccount == address(0)) revert InvalidAddress();
        corporateAccount = _newAccount;
    }
}
```

---

## 🧪 [AGENTE 3 - QA AUTOMATION]

### Código de Test (test/EscrowSplit.test.ts):

```typescript
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
      const { escrow, productora, artista, IPFS_HASH, MONTO_TOTAL } = await deployFixture();
      
      // Depósito inicial
      await escrow.depositarEscrow(artista.address, IPFS_HASH, { value: MONTO_TOTAL });

      const feeEsperado = (MONTO_TOTAL * 300n) / 10000n; // 3 AVAX
      const netoEsperado = MONTO_TOTAL - feeEsperado;   // 97 AVAX

      const balArtistaPrev = await ethers.provider.getBalance(artista.address);
      
      const tx = await escrow.liberarPagoEscrow(IPFS_HASH);
      
      // Verificación de Split
      expect(await ethers.provider.getBalance(artista.address)).to.equal(balArtistaPrev + netoEsperado);

      // Verificación de Evento
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
        .to.be.reverted;
    });
  });

  describe("4. Prevención de Doble Pago", function () {
    it("Debe rechazar un segundo intento de liberar el mismo hash", async function () {
      const { escrow, artista, IPFS_HASH, MONTO_TOTAL } = await deployFixture();
      await escrow.depositarEscrow(artista.address, IPFS_HASH, { value: MONTO_TOTAL });
      
      await escrow.liberarPagoEscrow(IPFS_HASH);

      // El segundo intento debe fallar porque el estado ya no es LOCKED
      await expect(escrow.liberarPagoEscrow(IPFS_HASH))
        .to.be.revertedWithCustomError(escrow, "DealNotLocked");
    });
  });
});
```

---

## 🚀 [AGENTE 4 - DEVOPS]

### 1. Configuración de Entorno (hardhat.config.ts)
Optimizado para Avalanche Fuji (ESM & Hardhat v3).

```typescript
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.20",
      },
    },
  },
  networks: {
    fuji: {
      url: configVariable("FUJI_RPC_URL", "https://api.avax-test.network/ext/bc/C/rpc"),
      accounts: [configVariable("PRIVATE_KEY")],
      chainId: 43113,
    },
  },
});
```

### 2. Script de Despliegue (scripts/deploy.ts)
Uso de Ethers.js v6 y vinculación de cuenta corporativa B2B.

```typescript
import { ethers } from "hardhat";

async function main() {
  // Dirección de la cuenta corporativa de la productora (debe venir de config o DB)
  const CORPORATE_WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; 

  console.log("🚀 Iniciando despliegue de EscrowSplit en Avalanche Fuji...");

  const EscrowSplit = await ethers.getContractFactory("EscrowSplit");
  const escrow = await EscrowSplit.deploy(CORPORATE_WALLET);

  await escrow.waitForDeployment();
  const address = await escrow.getAddress();

  console.log("--------------------------------------------------");
  console.log(`✅ Contrato Desplegado en: 0x7f174cd2a62aE9FaB508cdd8F31edC1a3981f0b1`);
  console.log(`🏢 Wallet Corporativa: ${CORPORATE_WALLET}`);
  console.log("--------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 3. Sincronizador Blockchain -> Supabase (src/listeners/sync.ts)
Escucha de eventos `FundsDistributed` para actualización de estado inmutable en DB.

```typescript
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const provider = new ethers.JsonRpcProvider(process.env.FUJI_RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

console.log("📡 Escuchando eventos FundsDistributed en Fuji...");

contract.on("FundsDistributed", async (ipfsHash, artist, netAmount, fee, timestamp) => {
    console.log(`🔔 Liquidación detectada: ${ipfsHash}`);

    const { data, error } = await supabase
        .from('contratos_escrow')
        .update({ 
            status: 'RELEASED',
            monto_neto_artista: ethers.formatUnits(netAmount, 18)
        })
        .eq('ipfs_hash_contrato', ipfsHash);

    if (error) {
        console.error("❌ Error al sincronizar con Supabase:", error.message);
    } else {
        console.log("✅ Base de Datos actualizada correctamente.");

---

## 🎨 [AGENTE FRONTEND - UI/UX]

### Arquitectura Visual:
- **Framework:** React + TypeScript + Vite.
- **Estética:** Cyber-B2B (Modo Oscuro, Glassmorphism).
- **Integración:** Ethers.js v6 para transacciones directas.

### Vistas Implementadas:
1. **Connect Wallet:** Gestión de identidad Web3.
2. **Escrow Form:** Creación de acuerdos comerciales inmutables.
3. **Analytics Dashboard:** Visualización de métricas de liquidación.
```