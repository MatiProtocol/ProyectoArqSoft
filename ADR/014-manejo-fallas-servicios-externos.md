# ADR 014: manejo de fallas de servicios externos de autenticación, pagos, geolocalización y correo electrónico (degradación y circuit breaker)

## Contexto

Identificamos los siguientes aspectos que influyen en la decisión:

- **Disponibilidad (R7):** es crítico que los grupos funcionales F2-F6 (registro, ingreso, preregistro, creación de reservas, cotización, pago) y F13-F15 (inicio de traslado, recepción GPS, detección de situaciones) no se vean afectados por fallos en otras partes del sistema o en servicios externos. En particular, los servicios de autenticación (Auth0), pagos (Stripe),geolocalización (OSRM) y envío de correos electrónicos (Gmail) pueden fallar o experimentar latencia.
- **Rendimiento (R1, R2):** las fallas no deben degradar los tiempos de respuesta por debajo de los umbrales aceptables. Timeouts largos o reintentos sin control pueden impactar negativamente en la experiencia del usuario.
- **Experiencia de usuario:** el cliente debe recibir feedback claro cuando un servicio externo no está disponible, y el sistema debe continuar operando en modo degradado siempre que sea posible.
- **Testabilidad (R5):** se deben poder simular fallas de servicios externos para validar el comportamiento del sistema en escenarios degradados.

## Decisión

Implementaremos un patrón de Circuit Breaker para cada llamada a servicio externo crítico combinado con timeouts y reintentos limitados. Utilizaremos la biblioteca opossum (Node.js) para gestionar los circuit breakers, y almacenaremos su estado en Redis para que sea compartido entre múltiples instancias del servicio (en entornos cluster o escalados horizontalmente).

Estrategias de degradación específicas:
- **Auth0 (autenticación):** si el circuito está abierto o la validación falla por red, se devuelve un error 502 con un mensaje claro. Los tokens ya autenticados siguen funcionando gracias al caché de claves JWKS.
- **Stripe (pagos):** si falla la llamada, la reserva queda marcada como payment_pending y se encola un trabajo en Bull para reintentar con backoff exponencial (hasta 3 intentos). Si persiste, se notifica al usuario y la reserva queda en estado pending_payment.
- **OSRM (ruteo/geolocalización):** si falla, se recurre a una estimación en línea recta (modo degradado) a partir de la fórmula del Haversine y se registra el incidente. El cálculo de distancia y costo puede ser menos preciso, pero el flujo continúa.
- **Gmail (envío de correos):** el envío se encola en BullMQ (cola email-notifications) con 3 reintentos con backoff. Si falla se notifica al operador.

**Almacenamiento compartido en Redis:**
Para que el estado del breaker sea consistente entre múltiples instancias del servicio (ej. si escalamos con PM2 cluster), usaremos un adaptador de caché para opossum que persista el estado en Redis.
Además, implementaremos un health check periódico a los servicios externos y publicaremos su estado en el endpoint /health, permitiendo que el balanceador (Nginx) y los operadores conozcan el estado del sistema.

**Esquema de integración con Opossum:**

```typescript
// Ejemplo para Auth0 (similar para los demás servicios)
import CircuitBreaker from 'opossum';
import { validateTokenProgrammatically } from './auth0-validator';
import { ErrorFactory } from '@move/errors-lib';

const options = {
  timeout: 3000,                      // 3s
  errorThresholdPercentage: 50,       // Abre al 50% de fallos
  resetTimeout: 30000,                // 30s para half-open
  rollingCountTimeout: 10000,         // Ventana de 10s
  rollingCountBuckets: 10,
  name: 'auth0-validation',
};

export const auth0Breaker = new CircuitBreaker(validateTokenProgrammatically, options);

auth0Breaker.fallback(() => {
  throw ErrorFactory.externalService(
    'Auth0',
    'Authentication service is temporarily unavailable',
    undefined,
    { retryAfter: '30s' }
  );
});
```

## Justificación

Esta decisión se fundamenta en:

- **Disponibilidad (R7):** el Circuit Breaker evita que un servicio externo lento agote los recursos (threads, conexiones) del sistema, afectando a otros clientes. Al abrirse, las llamadas fallan rápidamente (fail fast), permitiendo degradar sin bloquear.
- **Rendimiento (R1, R2):** los timeouts cortos (ej: 200 ms para OSRM, 3s para Auth0, 5s para Stripe) evitan esperas largas. El uso de colas para reintentos desacopla aún más y permite que el cliente reciba una respuesta inmediata mientras el procesamiento continúa en background.
- **Testabilidad (R5):** opossum permite simular fallos y forzar la apertura del circuito, facilitando las pruebas de escenarios degradados. Además, el fallback a Haversine puede testearse unitariamente sin dependencias externas.
- **Simplicidad del equipo:** implementar un Circuit Breaker básico con opossum es sencillo y ya ha sido probado en proyectos similares. La lógica de degradación es clara y se puede aplicar de forma consistente a todos los servicios externos.
- **Alineación con R7:** la letra exige que F2-F6 y F13-F15 no se vean afectados por fallos en otras partes. Separar el flujo de pago y clasificación mediante colas y degradación cumple este requisito.

## Alternativas rechazadas

- **Reintentos infinitos sin circuit breaker:** peligro de saturar el sistema si el servicio externo está caído (efecto avalancha).
- **Sincronizar toda la operación sin degradación:** haría que la interfaz se congele o supere los tiempos de respuesta R1.
- **Ignorar la falla y devolver error genérico:** no cumple con la experiencia de usuario esperada y no permite la operación degradada.

## Estado

Aceptado

## Consecuencias

- **Positivas:**
    - Mayor resiliencia ante fallos de terceros.
    - El sistema puede seguir operando (con funcionalidad limitada) cuando un servicio externo falla.
    - Experiencia de usuario mejorada (mensajes claros en lugar de timeouts genéricos).
    - Mejor capacidad de diagnóstico gracias a los logs estructurados y al estado del circuito en el health check.
- **Negativas:**
    - Mayor complejidad en el código (estados del breaker, métricas, fallbacks).
    - Se necesita almacenar el estado del breaker en un caché compartido (Redis) si hay múltiples instancias del servicio, para que todas conozcan el estado.
    - Las decisiones de degradación pueden llevar a inconsistencias si no se manejan bien las transacciones (ej. una reserva pagada pero no clasificada). Se deben diseñar estados claros y mecanismos de reconciliación (ej. jobs de BullMQ).
    - Se debe implementar un monitoreo proactivo (alertas) para cuando los circuit breakers se abren, para que el equipo pueda reaccionar.
    - La distancia de Haversine (fallback) puede subestimar la distancia real por calles, resultando en cotizaciones menos precisas en modo degradado. Se debe comunicar al cliente que el costo es estimado.
    - El envío de correos depende de la configuración OAuth2 de Gmail, que puede caducar si no se renueva el refresh token.