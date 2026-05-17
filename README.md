# Eventum 🚀
### Ecosistema de Liquidación Automatizada para Festivales de Música

Eventum es una solución B2B basada en la red **Avalanche** diseñada para profesionalizar la industria de festivales. Permite a productoras, artistas y entes gubernamentales trabajar con acuerdos comerciales inmutables, pagos garantizados mediante Escrow y splits fiscales automáticos.

---

## 🌟 Propuesta de Valor

- **Para Artistas**: Seguridad de cobro garantizada. El dinero se bloquea en la blockchain antes del show.
- **Para Productoras**: Eficiencia operativa. Automatización de pagos y cumplimiento fiscal en una sola transacción.
- **Para el Estado (DGR Salta)**: Recaudación en tiempo real. Retención automática del 4.8% (Sellos + Actividades Económicas) eliminando la evasión.

---

## 🛠️ Stack Tecnológico

- **Blockchain**: Avalanche (Fuji Testnet)
- **Smart Contracts**: Solidity ^0.8.20 (OpenZeppelin)
- **Backend/DB**: Supabase (PostgreSQL + Auth)
- **Frontend**: React + Vite + TypeScript
- **Web3**: Ethers.js v6 + Metamask

---

## 📂 Estructura del Proyecto

```text
├── contracts/          # Smart Contracts en Solidity
├── frontend/           # Aplicación React (Vite)
├── docs/               # Documentación detallada del sistema
├── scripts/            # Scripts de despliegue y automatización
└── test/               # Pruebas unitarias de Smart Contracts
```

---

## 📖 Documentación Detallada

Hemos preparado guías completas para entender y operar el sistema:

1.  **[Arquitectura del Sistema](docs/ARCHITECTURE.md)**: Flujo de datos y stack tecnológico.
2.  **[Contratos Inteligentes](docs/SMART_CONTRACTS.md)**: Detalle de la lógica de Escrow y Split.
3.  **[Modelo de Datos](docs/DATABASE.md)**: Estructura de tablas en Supabase.
4.  **[Guía de Usuario](docs/USER_GUIDE.md)**: Manual para Productoras, Artistas y Auditores.

---

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js v18+
- Wallet Metamask configurada para **Avalanche Fuji**.

### Instalación del Entorno
1. Clonar el repositorio.
2. Instalar dependencias globales:
   ```bash
   npm install
   ```
3. Configurar variables de entorno (ver `.env.example`).

### Ejecución del Frontend
```bash
cd frontend
npm install
npm run dev
```

### Ejecución de Tests (Contracts)
```bash
npm test
```

---

## 🏆 Proyecto para la Hackathon Avalanche 2026

Este proyecto busca transformar la realidad de los festivales en el norte argentino, utilizando la tecnología blockchain para traer transparencia y agilidad a una industria tradicionalmente lenta y burocrática.

**Desarrollado con ❤️ para Salta y el ecosistema Avalanche.**

