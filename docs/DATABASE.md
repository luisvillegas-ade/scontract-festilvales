# Modelo de Datos (Supabase)

SContract utiliza Supabase como motor de base de datos PostgreSQL, gestionando la información off-chain necesaria para el funcionamiento de la aplicación.

## Esquema de Tablas

### 1. `artistas`
Almacena el perfil profesional de los artistas registrados en la provincia.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único (Primary Key). |
| `name` | Text | Nombre artístico o razón social. |
| `cuit` | Text | Identificación fiscal (Único). |
| `wallet` | Text | Dirección de Avalanche (Único). |
| `genre` | Text | Género musical (Default: 'Folklore'). |
| `dni` | Text | Documento Nacional de Identidad. |
| `direccion` | Text | Domicilio legal. |
| `representante` | Text | Nombre del manager o representante legal. |

### 2. `espectaculos`
Gestión de eventos y festivales organizados por las productoras.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único (Primary Key). |
| `nombre` | Text | Nombre del festival (ej: "Serenata a Cafayate"). |
| `empresa_wallet`| Text | Wallet de la productora responsable. |
| `provincia` | Text | Localización (Default: Salta). |
| `anio` | Integer | Año de realización. |
| `presupuesto` | Numeric | Presupuesto total asignado al evento. |
| `fecha_ejecucion`| Date | Fecha programada del show. |

### 3. `contratos`
Relaciona los artistas con los shows y trackea el estado de los pagos en la blockchain.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único (Primary Key). |
| `show_id` | UUID | FK hacia la tabla `espectaculos`. |
| `show_name` | Text | Nombre denormalizado del show para búsquedas rápidas. |
| `artist_wallet` | Text | Wallet del artista beneficiario. |
| `amount` | Numeric | Monto bruto del contrato en AVAX/USDC. |
| `ipfs_hash` | Text | Referencia al contrato legal en IPFS. |
| `status` | Text | Estado actual: `Created`, `Funded`, `Released`, `Cancelled`. |
| `pdf_url` | Text | Link al documento PDF generado (Supabase Storage). |

## Seguridad (RLS)

Todas las tablas tienen habilitado **Row Level Security (RLS)**:
-   **Lectura Pública**: Los datos de transparencia (contratos ejecutados y retenciones) pueden ser consultados por cualquier usuario.
-   **Escritura**: Solo usuarios autenticados con rol de `Productora` pueden crear espectáculos y contratos.
-   **Perfiles**: Solo el dueño de la wallet puede editar su perfil de artista.

## Integración On-Chain

La tabla `contratos` actúa como un espejo del estado en la blockchain. Cuando el frontend detecta una transacción exitosa (ej: `liberarPagoEscrow`), envía una señal a Supabase para actualizar el campo `status` a `Released`. Esto permite generar reportes históricos sin necesidad de re-escanear la blockchain constantemente.
