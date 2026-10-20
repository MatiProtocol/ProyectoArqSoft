# ADR 017: Pago de reservas (F6) mediante pasarela abstraída con resiliencia

Identificamos los siguientes aspectos que influyen en la decisión:

- **Requisito funcional (F6):** el cliente confirma y paga su reserva mediante una pasarela de pago externa, y la letra aclara explícitamente que "el proveedor puede cambiar" con el tiempo. Cada reserva debe quedar registrada con el resultado del pago: aceptado, pendiente o rechazado.
- **Aislamiento de fallas (R7) y resiliencia ante servicios externos:** [ADR 014](./014-manejo-fallas-servicios-externos.md) ya define que, si la pasarela de pagos falla, la reserva queda en `pending_payment` y se encola un reintento con backoff exponencial (hasta 3 intentos); si persiste, se notifica.

## Decisión

Pago de reservas mediante un **puerto `IPaymentGateway`** (`application/contracts/payment-gateway.ts`) con un único método `charge(request)`, que devuelve un resultado de negocio (`accepted` | `rejected` | `pending`). Como adapter se implementa un **gateway simulado** (`SimulatedPaymentGateway`, proveedor `stripe-sim`), sin cobros ni red real, que permite forzar cualquiera de los 3 resultados (`simulateOutcome`) para pruebas. Cambiar de proveedor real en el futuro implica solo agregar otro adapter del mismo puerto, sin tocar el dominio.

El cuarto caso, **pasarela caída**, se maneja igual que el resto de los servicios externos del sistema (ADR 014): el `charge` se invoca a través del circuit breaker compartido (`createExternalServiceCircuitBreaker`, registrado como `'payment'`). Si el breaker falla (timeout, error o circuito abierto), la reserva queda en `pending_payment` y se encola un job en la cola `payment-retry` (BullMQ, 3 intentos con backoff exponencial), que reintenta el mismo caso de uso (`PayBookingHandler`). El worker (`payment-retry.worker.ts`) es como el patrón ya usado para `customer-email` (ADR 008/014).

Cada reserva guarda un subdocumento `payment` embebido con estado, monto, proveedor, referencia, intentos y fecha. El mapeo de resultados a estado de la reserva es: `accepted` → reserva `payed`; `rejected` y `pending` → reserva sigue en `pending_payment`; caída de la pasarela → reserva sigue en `pending_payment` y se encola el reintento.

## Justificación

- **Proveedor intercambiable (F6):** al depender solo del puerto `IPaymentGateway`, reemplazar el adapter simulado por un proveedor real no requiere cambios en el dominio ni en el handler de pago.
- **Consistencia con ADR 014:** se reutiliza el mismo circuit breaker y el mismo patrón de cola/worker que ya rige para OSRM y Gmail.
- **Testabilidad (R5):** al no haber red real, el adapter simulado permite forzar cualquier resultado, incluida la caída, en pruebas unitarias y end-to-end sin credenciales externas.

### Alternativas rechazadas

- **Acoplar el handler a un SDK concreto de pasarela:** viola el requisito de que "el proveedor puede cambiar" y dificulta el testing.
- **Modelar la caída como un cuarto resultado del puerto:** mezclaría errores de infraestructura con resultados de negocio; el circuit breaker ya resuelve esa distinción de forma consistente con el resto del sistema.
- **Colección `payments` separada:** mayor complejidad de consultas sin necesidad real, dado que el pago es 1:1 con la reserva en este alcance.

## Estado

Aceptado

## Consecuencias

- Positivas:
    - El flujo de pago queda resiliente a caídas de la pasarela sin bloquear al cliente.
    - Cambiar de proveedor de pago es un cambio de infraestructura aislado (nuevo adapter del puerto).
    - Reutilización total del patrón circuit breaker y cola/worker ya validado para otros servicios externos.
- Negativas:
    - El registro de pago embebido en la reserva no guarda un historial completo de intentos, solo el contador y el último resultado.
    - El adapter simulado no valida medios de pago reales; integrar un proveedor real requeriría además manejar webhooks de confirmación asíncrona.