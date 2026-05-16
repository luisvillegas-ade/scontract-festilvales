# Pitch Deck: AvalanchePay Festival Hub

## Slide 1 — Título
**AvalanchePay Festival Hub**

Ecosistema B2B para financiamiento y liquidación de festivales de música en Avalanche.

- Pago garantizado a artistas
- Split automático para productoras, ticketeras y sponsors
- Transparencia on-chain para municipios y auditoría

---

## Slide 2 — Problema

1. Productoras arriesgan dinero al pagar artistas antes o después del evento.
2. Artistas no tienen visibilidad de cuándo y cuánto recibirán.
3. Ticketeras y sponsors no pueden comprobar fácilmente el reparto de ingresos.
4. Municipios y gobiernos no tienen una forma sencilla de auditar retenciones.

---

## Slide 3 — Solución

**EscrowSplit** pone los fondos en un contrato inteligente que:

- bloquea el depósito del show
- ejecuta el split automático
- libera pago solo si el evento se cierra
- devuelve fondos en caso de cancelación

Beneficio clave: seguridad para artistas + control B2B para productoras + transparencia para el ecosistema.

---

## Slide 4 — MVP actual

- `contracts/EscrowSplit.sol`: Escrow con depósito, split y cancelación.
- `test/EscrowSplit.ts`: Pruebas unitarias para flujo de depósito y liberación.
- `frontend`: App guía para explicar el proyecto y simular el proceso.
- `README.md`: documentación del producto y roadmap.

---

## Slide 5 — Qué lo hace ganador

- Enfoque real en festivales y eventos musicales.
- Uso de Avalanche Fuji como red de prueba para demostraciones.
- Arquitectura B2B/SaaS que puede crecer a ticketing, stablecoins y verificación.
- Presentación clara para jurado y pitch de negocio.

---

## Slide 6 — Roadmap inmediato

1. Integrar stablecoin USDC.e para minimizar volatilidad.
2. Extender split a ticketing, venue y sponsor.
3. Añadir dashboard de contratos y estados.
4. Incluir oráculo o multi-sig para validación de fin de evento.

---

## Slide 7 — Entregables

- Repositorio GitHub con código completo.
- App explicativa en `frontend`.
- Documentación del proyecto en `README.md`.
- Pitch deck en este archivo `PITCH_DECK.md`.
- Propuesta de valor lista para presentación.
