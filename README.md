# SContract Artistas Salta

## Objetivo del proyecto

Crear un ecosistema de flujo de dinero para festivales de música y eventos, basado en Avalanche, que permita a productoras, artistas y ticketeras trabajar con acuerdos comerciales inmutables, pagos garantizados y splits automáticos.

El proyecto propone una solución B2B / SaaS para:
- Productoras de eventos que necesitan garantizar pagos a artistas.
- Artistas que exigen seguridad y transparencia en liquidaciones.
- Ticketing y servicios asociados que participan como terceros en el cobro.

## Qué ya hay en el repo

- `contracts/EscrowSplit.sol`: contrato de escrow con depósito, split automático y cancelación.
- `test/EscrowSplit.ts`: pruebas unitarias para validar ownership, depósitos y liberaciones.
- `hardhat.config.ts`: configuración para Avalanche Fuji.
- `package.json`: dependencias de Hardhat, Ethers y OpenZeppelin.

## Qué mejorar para ganar la hackathon

### 1. Convertirlo en un flujo real de festival
- `depositarEscrow(...)`: bloquea fondos en el contrato con datos de artista y hash IPFS.
- `liberarPagoEscrow(...)`: libera los fondos cuando el show se completa.
- `cancelarEscrow(...)`: permite devolver el depósito si el evento se cancela.

### 2. Soporte multi-stakeholder
- Split no solo artista/productora, sino también ticketera, venue o sponsor.
- Metadata en IPFS que describe el evento, la cláusula de fuerza mayor y el reparto.

### 3. Usar stablecoin para reducir riesgo de volatilidad
- Usar USDC.e en Avalanche para que el flujo de dinero de festivales no dependa del precio de AVAX.
- Esto es clave para adoptar productoras tradicionales.

### 4. Enfócate en la experiencia B2B
- Dashboard de eventos y contratos.
- Estados de contrato: `CREATED`, `FUNDED`, `RELEASED`, `CANCELLED`, `DISPUTED`.
- Sincronización en base de datos con eventos on-chain.

### 5. Hazla atractiva para jurados
- Problema real: artistas cobran tarde o no cobran, productoras tienen riesgo y ticketeras no tienen visibilidad.
- Solución: garantía de pago + transparencia + automatización de splits.

## Uso rápido

Instala dependencias y ejecuta tests:

```bash
npm install
npm test
```

## Ideas de futuro inmediato

1. Integrar la venta de tickets como fuente de financiación del escrow.
2. Añadir oráculo o multi-sig para validar el fin del evento.
3. Exponer un dashboard que muestre el estado del contrato y el hash IPFS del acuerdo.
4. Incorporar onboarding de productoras y verificación de artistas.

## Resultado ahora

Con estas mejoras, el proyecto ya tiene:
- Un contrato on-chain que gestiona depósitos y liberaciones.
- Split automático con fee de servicio.
- Seguridad contra doble pago.
- Una base sólida para convertirlo en un MVP de festival.

## App explicativa y pitch

- La app de guía se encuentra en `frontend/src/App.tsx`.
- El pitch deck de la entrega está en `PITCH_DECK.md`.
- Usa la app para presentar el flujo: problema, solución y demo.
- Si desplegás `EscrowSplit.sol`, actualizá `CONTRACT_V2_ADDRESS` en el frontend para activar la demo interactiva.

### Ejecutar la app

```bash
cd frontend
npm install
npm run dev
```
