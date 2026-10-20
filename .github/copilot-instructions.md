# Copilot Instructions - MOVE

## Contexto del sistema
MOVE es un sistema backend de traslados urbanos.

### Arquitectura objetivo
- Service-Based Architecture.
- Servicios por dominio: `services/identity-service`, `services/booking-service`, `services/configuration-service` y `services/tracking-service`.
- Base de datos única compartida: MongoDB.
- Cada servicio es un monolito interno con Clean Architecture.
- CQRS dentro de cada servicio: commands para escritura y queries para lectura.
- Comunicación sincrónica por HTTP/REST.
- Comunicación asíncrona con BullMQ sobre Redis.

## Stack
- Node.js LTS.
- TypeScript con `strict: true`.
- Express.
- MongoDB con Mongoose.
- Redis.
- BullMQ para colas y workers.
- Auth0 para autenticación.
- `express-oauth2-jwt-bearer` para validación JWT.
- Winston para logs estructurados.
- Prometheus-compatible `/metrics`.
- Google Gemini 3.1 Flash-Lite via `@google/genai`.
- Docker, Docker Compose, Nginx y PM2.
- Jest, Supertest y MongoMemoryServer.
- k6 para pruebas de carga.
- Postman collections para flujos funcionales.

### Librerías internas compartidas
- `@move/auth-lib`: Auth0, roles, Redis cache y middlewares de autorización.
- `@move/logs-lib`: logging, correlationId, request logging y métricas.
- `@move/errors-lib`: errores de aplicación y middleware de errores.

## Arquitectura interna por servicio (Clean Architecture):

```text
services/<service-name>/src/
  domain/
    entities/
    enums/
    value-objects/
    repositories/
  application/
    commands/
    queries/
    contracts/
    dtos/
  infrastructure/
    models/
    repositories/
    adapters/
    queues/
    config/
    notifications/
  presentation/
    controllers/
    middlewares/
    routes/
  app.ts
  index.ts
```

### Regla de dependencias
- `domain` no depende de ninguna capa.
- `application` depende de `domain` y de contratos/puertos, no de infraestructura concreta.
- `infrastructure` implementa repositorios, clientes externos, modelos Mongoose, colas y adapters.
- `presentation` recibe controllers/casos de uso ya compuestos y no debe contener lógica de negocio.
- La composición de dependencias debe quedar en un composition root (`app.ts`, `index.ts` o equivalente), no dentro de casos de uso.

### Workers
- Los workers BullMQ viven en infraestructura.
- Los workers deben invocar los mismos commands/casos de uso que los controladores cuando procesan el mismo flujo.
- No duplicar lógica de negocio entre HTTP y workers.

## Reglas de código
- Usar `async/await`.
- Los controladores deben validar entrada básica, llamar a un command/query y delegar errores al middleware.
- No crear lógica de negocio en controllers o routes.
- No acceder a MongoDB desde controladores.
- No crear servicios centrales que agreguen acoplamiento en tiempo de ejecución.
- No introducir frameworks o librerías grandes si el patrón local ya resuelve el problema.

## CQRS
- Separar commands y queries en `application/commands` y `application/queries`.
- No mezclar command y query en el mismo caso de uso.
- Commands: escritura, validaciones, cambios de estado y publicación de jobs si corresponde.
- Queries: solo lectura, proyecciones optimizadas, `.lean()`, sin side effects.
- No asumir que todos los commands deben ejecutarse via BullMQ. HTTP puede llamar commands directamente.
- Usar BullMQ para trabajo pesado, diferido, resiliente o asincrónico: GPS, alertas, notificaciones, clasificación manual, emails y reintentos de pago.
- No hacer trabajo pesado dentro del request HTTP.

## Persistencia MongoDB/Mongoose
- Usar Mongoose para validación, schemas, defaults e índices.
- Preferir documentos desnormalizados cuando mejore performance.
- Definir `required`, `enum`, `min/max`, defaults y `timestamps: true` cuando corresponda.
- Indexar campos usados en filtros frecuentes.
- Listados deben tener paginación con `.limit()` y `.skip()` o cursor equivalente.
- Evitar `find({})` sin límite.
- Usar índices `2dsphere` para GeoJSON.

## Autenticación y autorización
- Usar Auth0 para autenticación. No implementar autenticación propia.
- Validar JWT con `validateJwt`.
- Extraer user id con `ensureUserIdFromToken`.
- Adjuntar roles con `attachRoles`.
- Proteger rutas con `requireRole(...roles)`.
- Los roles se almacenan en MongoDB y se cachean en Redis por 15 minutos.
- `@move/auth-lib` es la fuente preferida para middlewares y DTOs de roles.

### Roles exactos
- `UserRoleDTO.CLIENT_COMPANY` = `client_company`
- `UserRoleDTO.CLIENT_INDIVIDUAL` = `client_individual`
- `UserRoleDTO.DRIVER` = `driver`
- `UserRoleDTO.OPERATOR` = `operator`
- `UserRoleDTO.ADMIN` = `admin`

- Todas las rutas protegidas deben validar JWT y roles.
- Las rutas internas entre servicios deben usar token interno dedicado, no saltear seguridad sin justificación.

## Rutas
### Tracking Service esperado
- `POST /gps/reading` recibe `{ vehicleId, deviceId, coordinates: [lng, lat], timestamp, transferId }`.
- Debe responder rápido y encolar procesamiento GPS.
- Debe exponer endpoints de consulta para posiciones, zonas/alertas activas y monitoreo geográfico cuando se implemente el frontend geo.

## Booking e IA
- Booking maneja reservas de particulares y empresas.
- Para particulares, clasificar bienes con Gemini 3.1 Flash-Lite mediante `@google/genai`.
- El catálogo de categorías viene de Configuration Service o del CSV de categorías.
- Si Gemini falla, responde mal o no clasifica con confianza:
  - guardar la reserva;
  - dejarla en `pending_classification`;
  - publicar job de clasificación manual;
  - notificar al operador por webhook en menos de 1 segundo cuando aplique.

## GPS, zonas y alertas
- GPS llega aproximadamente cada 10 segundos por vehículo.
- Validar que `deviceId` esté registrado.
- Guardar lectura GPS y encolar procesamiento en `gps-ingest`.
- Worker `alert-detection` procesa lecturas y detecta:
  - ingreso o permanencia en `RED_ZONE`;
  - detenciones prolongadas;
  - otras reglas configurables.
- Si hay alerta, persistir `Alert` y publicar job en `notification-queue`.
- Usar MongoDB geoespacial: `$geoIntersects`, `$geoWithin` sobre los índices `2dsphere` definidos en los modelos.

### Modelo de zona esperado
```ts
const zoneSchema = new Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['RED_ZONE', 'PREFERRED_ZONE'], required: true },
  polygon: {
    type: { type: String, enum: ['Polygon'], required: true },
    coordinates: { type: [[[Number]]], required: true },
  },
}, { timestamps: true, versionKey: false });

zoneSchema.index({ polygon: '2dsphere' });
zoneSchema.index({ type: 1 });
```

## Resiliencia y servicios externos
- Usar Circuit Breaker con `opossum` para servicios externos críticos.
- El estado del breaker debe compartirse en Redis cuando haya múltiples instancias.
- No hacer reintentos sincrónicos largos en requests HTTP.
- Usar BullMQ con backoff para reintentos diferidos cuando corresponda.
- No hardcodear pasarela de pagos; usar Stripe configurable por variables de entorno.

### Servicios externos y degradación esperada
- Auth0: timeout corto, error claro si no se puede validar; tokens válidos siguen aprovechando cache JWKS.
- Stripe/pagos: si falla, marcar reserva como `pending_payment` y encolar reintento con backoff exponencial.
- OSRM/geolocalización: si falla, degradar a distancia por Haversine.
- Gmail/correo: enviar por cola con reintentos; si persiste la falla, notificar operador.
- Gemini: si falla, delegar a clasificación manual y webhook al operador.

## Logging y métricas
- Usar Winston en JSON.
- Logs a stdout para Docker/PM2.
- Logs rotatorios en archivo cuando corresponda.
- Propagar `correlationId` con AsyncLocalStorage.
- Propagar `correlationId` en llamadas HTTP entre servicios.
- No loguear secretos, tokens, passwords, datos sensibles ni payloads completos innecesarios.
- Exponer `/metrics` con contadores por endpoint, latencias, errores, eventos de negocio, estado de colas y métricas Node.js.

## Performance
### Objetivos
- Consultas: menos de 300 ms.
- Listados: menos de 500 ms bajo carga máxima.
- Reservas de top 20 clientes empresa: menos de 600 ms end-to-end.
- Empresa no frecuente: 700-1000 ms.
- Particular con IA: 5-10 s aceptable.
- Alertas: persistidas en menos de 5 s.
- Carga normal: 100 reservas/min y 50 conductores GPS simultáneos.
- Pico R8: 50x carga normal.

### Reglas
- Optimizar queries con índices y proyecciones.
- Cachear top 20 clientes frecuentes con TTL aproximado de 1 hora.

## Frontend geográfico
Solo se permite frontend geográfico simple para monitoreo/mapas.

### Reglas
- Usar HTML, CSS y JS vanilla.
- Usar Leaflet.js y OpenStreetMap.
- No usar React, Vue, Angular ni frameworks SPA.
- Mostrar zonas GeoJSON.
- Mostrar vehículos o traslados activos con polling cada 5-10 segundos.
- Los polígonos de zonas pueden definirse con geojson.io.
- No implementar paneles administrativos, formularios de reserva ni lógica de negocio en frontend.

## Simuladores
### Simuladores esperados
- `services/tracking-service/scripts/gps-simulator.ts`
- `services/booking-service/scripts/client-simulator.ts`
- `services/identity-service/scripts/user-simulator.ts` opcional.
- `scripts/run-demo.ts` como orquestador de simuladores.

### GPS simulator
- Enviar lecturas cada 10 segundos.
- Configurar cantidad de vehículos.
- Configurar rutas o coordenadas.
- Permitir pérdida de paquetes.
- Incluir escenarios: ruta normal, entrada a zona roja, detención prolongada.

### Client simulator
- Generar clientes empresa y particulares.
- Crear reservas.
- Simular pagos.
- Simular fallos de IA o pagos.

## Testing
- Usar Jest para unit tests.
- Usar Supertest para endpoints Express.
- Usar MongoMemoryServer para integración con MongoDB real en memoria.
- Mockear Auth0, Gemini, Stripe, OSRM, Gmail y webhooks.
- Probar happy paths, validaciones, errores de autorización, fallas externas, circuit breakers/degradación, reintentos BullMQ, queries con `.lean()` e índices/modelos Mongoose cuando sea relevante.
- Mantener tests cerca de cada servicio en `tests/unit` o `tests/integration` siguiendo el patrón existente.

## Postman
Mantener colecciones Postman versionadas para todos los flujos principales:
- Auth/Identity: registro, login, actualización de roles.
- Configuration: importación CSV, categorías, zonas, vehículos.
- Booking: reserva individual, reserva empresa, clasificación pendiente, pago pendiente.
- Tracking: lectura GPS, consulta de posiciones, alertas.
- Health/metrics.

### Variables de entorno
- `base_url`
- tokens JWT por rol
- `configuration_internal_token`
- ids de entidades comunes

No hardcodear secretos reales en colecciones.

## k6 y pruebas de carga
- Guardar scripts en `tests/k6/`.
- Escenario normal: 100 reservas/min + 50 conductores GPS.
- Escenario pico: 5000 reservas/min + 2500 conductores GPS.
- Medir p95/p99, errores, latencia y throughput.
- Validar R1, R2, R3 y R8.
- Separar carga de Booking, Tracking y flujos mixtos.

## Docker, PM2 y despliegue
- Cada servicio debe tener Dockerfile.
- `docker-compose.yml` levanta MongoDB, Redis, Nginx y servicios.
- Nginx enruta hacia servicios HTTP.
- PM2 dentro de contenedores.
- APIs HTTP en modo `cluster`.
- Workers BullMQ en modo `fork`.
- No usar Kubernetes.
- Health checks por servicio.
- Si se agregan réplicas de contenedores, recordar que Nginx actual no descubre réplicas automáticamente.

## Variables de entorno importantes
Mantener `.env.example` actualizado.

## Git y entregables
- Mantener versionados: código, Dockerfiles, ADRs, Postman, k6, simuladores, `.env.example`.