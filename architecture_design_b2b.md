# Arquitectura Rediseñada: SaaS B2B "SContract Escrow" (Pivot Privado)

Este documento reemplaza la arquitectura municipal anterior, enfocándose en una solución **Software as a Service (SaaS)** para Productoras de Eventos y Ticketeras.

---

## 1. Esquema SQL (Supabase / PostgreSQL)

Diseño multitenant para empresas productoras y gestión de artistas.

```sql
-- 1. Empresas Productoras (Clientes del SaaS)
CREATE TABLE empresas_productoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial TEXT NOT NULL,
    cuit TEXT UNIQUE,
    wallet_corporativa TEXT NOT NULL, -- Wallet que recibe las comisiones
    plan_suscripcion TEXT DEFAULT 'BASIC', -- Tier del SaaS
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Artistas y Proveedores de Servicios
CREATE TABLE artistas_proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_artistico TEXT NOT NULL,
    cuit_tax_id TEXT,
    wallet_pago TEXT NOT NULL, -- Wallet de destino de los fondos netos
    email_contacto TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Contratos de Garantía (Escrow)
CREATE TABLE contratos_escrow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    productora_id UUID REFERENCES empresas_productoras(id),
    artista_id UUID REFERENCES artistas_proveedores(id),
    
    -- Datos de Negocio
    nombre_evento TEXT NOT NULL, -- Ej: "Salta Rock 2026"
    ticketera_ref_id TEXT, -- ID externo de integración (opcional)
    
    -- Blockchain Data
    blockchain_contract_id INT8 UNIQUE, -- ID correlativo en el Smart Contract
    monto_total_bruto NUMERIC NOT NULL, -- Depósito inicial en Escrow
    fee_productora_bps INT DEFAULT 1000, -- Comisión (ej: 10% = 1000 bps)
    monto_neto_artista NUMERIC NOT NULL, -- Calculado: Bruto - Comisiones
    
    -- Metadata e Integridad
    ipfs_hash_metadata TEXT NOT NULL, -- Link al JSON de términos comerciales
    
    -- Estado del Flujo
    status TEXT CHECK (status IN ('CREATED', 'FUNDED', 'RELEASED', 'DISPUTED', 'CANCELLED')),
    tx_hash_funding TEXT,
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. Estructura de Metadatos IPFS (Contrato Comercial)

Este JSON define los términos del show privado y se vincula al Smart Contract.

```json
{
  "protocol_version": "2.1.0",
  "metadata_id": "ESCROW-SALTA-2026-001",
  "show_details": {
    "event_name": "Festival de Invierno Privado",
    "line_up": ["Los Huayra", "Artistas Locales"],
    "venue": {
      "name": "Teatro Provincial de Salta",
      "capacity": 1500
    },
    "date": "2026-07-20T21:00:00Z"
  },
  "commercial_terms": {
    "producer_id": "UUID-PRODUCTORA-99",
    "producer_name": "Salta Live Productions",
    "contract_clauses": [
      {
        "id": "C_RESCISSION_01",
        "title": "Cláusula de Rescisión",
        "content": "Si el artista cancela con menos de 15 días, el depósito se devuelve 100% a la productora más multa del 10%."
      },
      {
        "id": "C_FORCE_MAJEURE",
        "title": "Fuerza Mayor",
        "content": "En caso de catástrofes naturales, el pago queda en suspenso y renegociable."
      }
    ]
  },
  "distribution_logic": {
    "total_deposit_amount": "5000.0",
    "currency": "USDC",
    "split_rules": {
      "producer_fee_bps": 500,
      "management_commission_bps": 300,
      "artist_net_amount": "4600.0"
    }
  },
  "legal_attachment": "ipfs://QmSignedLegalContractPDF..."
}
```

---

## 3. Flujo Sincrónico B2B (Lógica del Sistema)

1.  **Onboarding**: La **Productora** se registra en el SaaS y vincula su `wallet_corporativa`.
2.  **Creation**: La Productora define un show, selecciona al **Artista** y sube el PDF firmado. El sistema genera el JSON IPFS.
3.  **Deployment**: Se llama al `EscrowContract` en Avalanche Fuji enviando los fondos (o garantizándolos).
4.  **Split Automático**: Al marcarse el evento como "Finalizado" (vía Oráculo o Firma de Productora):
    *   El **Artista** recibe el `Neto` inmediatamente.
    *   La **Productora** recupera su `Fee` (comisión de management o gastos).
    *   Cualquier **Tercero** (ej. Ticketera) cobra su tasa configurada.
5.  **Audit**: Supabase refleja el cambio de estado de `FUNDED` a `RELEASED` sincronizado mediante eventos de blockchain.
