# Guía de Usuario - SContract

Bienvenido a SContract Artistas Salta. Esta guía describe cómo utilizar la plataforma según tu rol.

## 1. Rol: Productora de Eventos

Tu objetivo es gestionar festivales y garantizar el pago a los artistas mediante contratos inteligentes.

### Paso 1: Crear un Espectáculo
- Ve al módulo **"Gestión de Espectáculos"**.
- Registra un nuevo evento completando nombre, presupuesto y fecha.
- Esto creará un contenedor en la base de datos para agrupar los contratos de los artistas.

### Paso 2: Generar Contrato y Fondear (Escrow)
- Selecciona un artista registrado.
- Ingresa el monto acordado.
- La plataforma generará automáticamente un contrato legal con el sello de SContract.
- Haz clic en **"Confirmar y Fondear"**. Metamask se abrirá para que deposites los fondos en el Smart Contract.
- **Estado**: El contrato pasará a estar `Funded` (Fondeado).

### Paso 3: Liberar el Pago
- Una vez finalizado el show, busca el contrato en tu dashboard.
- Haz clic en **"Liberar Pago"**.
- El Smart Contract distribuirá automáticamente el dinero al artista y pagará las retenciones fiscales a la DGR Salta.

---

## 2. Rol: Artista

Tu objetivo es tener previsibilidad sobre tus cobros y transparencia fiscal.

### Registro de Perfil
- Asegúrate de estar registrado en la base de datos de artistas.
- Proporciona tu wallet de Avalanche (Fuji) para recibir los pagos.

### Verificación de Pago
- Cuando una productora fondee un contrato para ti, lo verás en tu dashboard con el estado `Funded`.
- Esto garantiza que el dinero ya está bloqueado y reservado exclusivamente para tu pago.
- Puedes descargar el contrato legal firmado en formato PDF.

### Recepción de Fondos
- Una vez que la productora libere el pago, recibirás el monto neto directamente en tu wallet.
- No necesitas realizar ninguna acción adicional; el proceso es automático.

---

## 3. Rol: Auditoría / Ente Fiscal (DGR Salta)

SContract proporciona transparencia absoluta sobre los fondos públicos y privados destinados a cultura.

### Visualización de Transparencia
- Accede al módulo de **"Auditoría"**.
- Aquí verás una tabla con todos los contratos ejecutados en la red Avalanche.
- Cada fila muestra:
    - Artista y Productora.
    - Monto total de la transacción.
    - **Retención Fiscal (4.8%)**: Monto exacto enviado a las arcas públicas en tiempo real.
    - Link a Snowtrace para verificar la transacción on-chain.

### Verificación Criptográfica
- Puedes copiar el hash de la transacción y pegarlo en un explorador de bloques de Avalanche para confirmar que la transferencia a la wallet municipal fue exitosa y definitiva.
