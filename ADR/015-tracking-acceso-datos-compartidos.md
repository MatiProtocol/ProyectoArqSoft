# ADR 015: Acceso de Tracking a zonas y vehículos vía base de datos compartida + caché

Identificamos los siguientes aspectos que influyen en la decisión:

- **Aislamiento de fallas (R7):** la detección de zonas rojas (F15) y la verificación de dispositivos GPS registrados (F14) forman parte del camino crítico que no debe verse afectado por fallas de otros servicios. Una llamada HTTP síncrona a configuration-service por cada lectura GPS introduciría una dependencia que podría tumbar F13–F15.
- **Performance (R2, R3):** las alertas deben persistirse en <5s (R3) y el sistema procesa hasta 5000 lecturas/min. Resolver zonas/dispositivos debe ser de muy baja latencia.
- **Propiedad de los datos:** las zonas (F9) y los vehículos (F10) son propiedad de configuration-service. Tracking solo necesita **leerlos**.

## Decisión

Tracking & Safety Service accede a las zonas y vehículos **leyendo directamente la base de datos compartida** (sancionado por [ADR 002](./002-service-based-architecture.md): "única base de datos compartida"), definiendo modelos Mongoose de **solo lectura** sobre las colecciones `zones` y `vehicles`. Nunca escribe sobre ellas (configuration-service sigue siendo el dueño).

- **Zonas rojas (F15):** se consultan con `$geoIntersects` sobre el índice `2dsphere` del polígono, directamente contra la colección compartida.
- **Dispositivos registrados (F14):** se mantiene un **caché en memoria con TTL** del conjunto de `deviceId` registrados (construido desde `vehicles`), con verificación puntual en DB ante un fallo de caché, para no consultar la base en el camino ultrarrápido del endpoint de ingesta.

## Justificación

- **Disponibilidad (R7):** elimina la dependencia HTTP síncrona con configuration-service en el camino crítico; una caída de ese servicio no afecta la ingesta GPS ni la detección de alertas.
- **Performance (R3):** la intersección geoespacial usa el índice `2dsphere` existente; la validación de dispositivos se resuelve en memoria (O(1)).
- **Coherencia con la arquitectura:** la comunicación por base de datos compartida es el mecanismo definido por el estilo Service-Based del proyecto (ADR 002).

### Alternativas rechazadas

- **Llamada HTTP a configuration-service por lectura/validación:** agrega latencia y una dependencia de disponibilidad que viola R7 para F13–F15; además satura configuration bajo picos de 50x (R8).
- **Replicar zonas/vehículos por mensajería a una colección propia:** complejidad de sincronización innecesaria para datos de baja tasa de cambio.

## Estado

Aceptado

## Consecuencias

- Positivas:
    - Camino crítico de GPS/alertas resiliente y de baja latencia (R3, R7).
    - Sin sobrecarga de red ni de configuration-service bajo alta demanda (R8).
- Negativas:
    - Acoplamiento a nivel de esquema: tracking-service conoce la forma de las colecciones `zones` y `vehicles`. Se mitiga restringiéndose a lectura y a los pocos campos necesarios.
    - El caché de dispositivos puede quedar momentáneamente desactualizado (TTL); se mitiga con verificación puntual en DB ante fallo de caché.
