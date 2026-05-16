# Arquitectura de Soluciones: EscrowSplit - Producción de Eventos

Este documento define la estructura de datos y las interfaces para la automatización de pagos (Escrow) y split de comisiones corporativas para Productoras de Eventos en Avalanche.

## 1. Esquema de Base de Datos (Supabase)

### Tabla: `artist_profiles`
Maneja la información de los prestadores de servicios artísticos.

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `wallet_address` | TEXT | Única, Indexada (Dirección de cobro) |
| `razon_social` | TEXT | Nombre artístico o legal |
| `cuit` | TEXT | Identificación fiscal |
| `is_verified` | BOOLEAN | Verificación por la productora |

### Tabla: `commercial_contracts`
Seguimiento de acuerdos comerciales y estados del Escrow.

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `ipfs_hash` | TEXT | Único, ID del contrato en IPFS |
| `artist_wallet` | TEXT | Dirección del beneficiario |
| `total_amount` | NUMERIC | Monto bruto depositado |
| `service_fee` | NUMERIC | 3% (o variable) para la ticketera |
| `status` | ENUM | `LOCKED`, `RELEASED`, `CANCELLED` |
| `tx_hash` | TEXT | Hash de la transacción de depósito |

---

## 2. Smart Contract: `EscrowSplit.sol`

### Variables de Estado
- `corporateWallet`: Billetera colectora del fee de servicio.
- `serviceFeeBps`: Comisión en puntos básicos (default 300 = 3%).
- `deals`: Mapping de `ipfsHash` a la estructura del trato.

### Funciones Principales
- `depositarEscrow(address artist, string ipfsHash)`: Bloquea los fondos en el contrato.
- `liberarPagoEscrow(string ipfsHash)`: Ejecuta el split (97% Artista, 3% Fee).
- `cancelarEscrow(string ipfsHash)`: Devuelve los fondos a la Productora.

### Eventos para Indexación
```solidity
event EscrowDeposited(string indexed ipfsHash, address indexed artist, uint256 amount);
event FundsReleased(string indexed ipfsHash, address indexed artist, uint256 netAmount, uint256 corporateFee, uint256 timestamp);
```

---

## 3. Flujo de Garantía Comercial

1. **Garantía**: La Productora deposita el caché del artista en el contrato `EscrowSplit`.
2. **Resguardo**: Los fondos quedan inmovilizados, brindando seguridad al artista.
3. **Liquidación**: Una vez finalizado el show, la Productora dispara `liberarPagoEscrow`.
4. **Split Inmutable**: Avalanche divide el pago automáticamente:
   - Envío instantáneo al Artista.
   - Cobro automático de la comisión por servicio de la plataforma B2B.

