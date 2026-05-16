# Documentación de Smart Contracts

El núcleo de liquidación de SContract reside en la red Avalanche. El contrato principal es `EscrowSplitV2.sol`.

## EscrowSplitV2.sol

Este contrato gestiona el depósito en garantía (escrow) y la distribución automatizada de fondos (split) entre tres actores principales.

### Configuración de Tasas (Fees)

El contrato utiliza puntos básicos (BPS - Basis Points) para máxima precisión decimal (10000 BPS = 100%).

-   **TAX_FEE_BPS**: 480 (4.8%)
    -   *Composición*: 3.6% Actividades Económicas + 1.2% Impuesto de Sellos (Provincia de Salta/DGR).
-   **SERVICE_FEE_BPS**: Configurable (Default: 0% en demo).
-   **BPS_BASE**: 10000.

### Estados del Acuerdo (DealStatus)

1.  `None`: El acuerdo no existe.
2.  `Funded`: Los fondos han sido depositados y están bloqueados.
3.  `Released`: Los fondos han sido distribuidos con éxito.
4.  `Cancelled`: El acuerdo fue cancelado y los fondos devueltos al depositante.

### Funciones Principales

#### `depositarEscrow(address payable _artist, string calldata _ipfsHash)`
-   **Acceso**: Público.
-   **Propósito**: Bloquea el monto enviado en `msg.value` para un artista específico.
-   **Parámetros**:
    -   `_artist`: Dirección de la wallet del artista.
    -   `_ipfsHash`: Identificador único del contrato legal asociado.
-   **Restricciones**: No se puede depositar para un hash que ya tenga fondos.

#### `liberarPagoEscrow(string calldata _ipfsHash)`
-   **Acceso**: Solo el Propietario (Owner/Productora).
-   **Propósito**: Ejecuta el split triple y transfiere los fondos.
-   **Acciones**:
    1.  Envía el 4.8% a la `municipalWallet`.
    2.  Envía la comisión de servicio a la `corporateWallet`.
    3.  Envía el remanente (neto) a la wallet del artista.
-   **Eventos**: Emite `FundsReleased` y `FiscalRetentionPaid`.

#### `cancelarEscrow(string calldata _ipfsHash)`
-   **Acceso**: Solo el Propietario.
-   **Propósito**: Devuelve el 100% de los fondos al depositante original en caso de cancelación del evento.

### Funciones de Consulta (View)

-   `calcularSplit(uint256 _amount)`: Permite previsualizar cuánto recibirá cada parte antes de realizar la transacción.
-   `getDeal(string _ipfsHash)`: Devuelve la estructura completa de un acuerdo (monto, wallets, estado).

### Eventos para Auditoría

-   `EscrowFunded`: Indexa el hash IPFS y el depositante.
-   `FundsReleased`: Detalla el monto neto recibido por el artista.
-   `FiscalRetentionPaid`: Prueba criptográfica del pago de impuestos en tiempo real.

---

## Despliegue en Fuji Testnet

El contrato se encuentra actualmente desplegado y testeado en la red de pruebas de Avalanche.

-   **Herramientas**: Hardhat, Ethers.js v6, OpenZeppelin.
-   **Dirección de Referencia**: (Ver `.env` o `CONTRACT_V2_ADDRESS` en el frontend).
