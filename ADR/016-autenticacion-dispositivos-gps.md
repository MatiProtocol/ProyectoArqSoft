# ADR 016: Autenticación de dispositivos GPS (no Auth0) en el endpoint de ingesta

Identificamos los siguientes aspectos que influyen en la decisión:

- **Naturaleza del cliente:** las lecturas GPS (F14) provienen de **dispositivos** instalados en los vehículos, no de usuarios humanos. No tienen identidad Auth0 ni rol RBAC.
- **Requisito funcional (F14):** el sistema debe verificar que las lecturas provengan de **dispositivos registrados**.
- **Seguridad (R6):** se deben registrar los accesos autorizados y no autorizados.
- **Performance (R1, R7):** el endpoint debe responder en pocos ms y no debe depender sincrónicamente de Auth0 (que protege otras rutas), para no acoplar el camino crítico F13–F15 a un servicio externo.

## Decisión

El endpoint `POST /api/v1/tracking/gps/reading` se autentica mediante un **secreto compartido de dispositivos** (header `x-device-secret`, configurado por variable de entorno `GPS_DEVICE_SECRET`) en lugar del JWT de Auth0. Adicionalmente, el caso de uso de ingesta valida que el `deviceId` esté **registrado** (contra el conjunto de dispositivos de la colección `vehicles`, ver [ADR 015](./015-tracking-acceso-datos-compartidos.md)).

Las lecturas rechazadas (secreto inválido o dispositivo no registrado) se registran con `logger.warn` para auditoría (R6). El resto de las rutas del servicio (F12, F13, F17, F18, monitoreo) sí usan el flujo estándar Auth0 + `requireRole` de `@move/auth-lib`.

## Justificación

- **Adecuación al cliente:** los dispositivos no son usuarios; forzar JWT de Auth0 sería incorrecto e introduciría una dependencia externa en el camino crítico (R7).
- **Performance (R1):** la validación del secreto es local y la del dispositivo se resuelve por caché en memoria, manteniendo el endpoint < 10 ms.
- **Seguridad (R6):** doble verificación (secreto + dispositivo registrado) y registro de accesos no autorizados.

### Alternativas rechazadas

- **Auth0/JWT para el endpoint GPS:** inapropiado para dispositivos y acopla la ingesta a un servicio externo (R7).
- **Sin autenticación, solo `deviceId` registrado:** permitiría que cualquiera inyecte lecturas conociendo un `deviceId`; insuficiente para R6.
- **mTLS por dispositivo:** más robusto, pero excede el alcance y la complejidad operativa de un equipo de 3 personas para esta entrega.

## Estado

Aceptado

## Consecuencias

- Positivas:
    - Ingesta GPS desacoplada de Auth0 y de baja latencia (R1, R7).
    - Cumple F14 (verificación de dispositivo) y R6 (auditoría de accesos).
- Negativas:
    - El secreto compartido es un único factor; su rotación debe gestionarse por entorno (variable `GPS_DEVICE_SECRET`). Una evolución futura podría usar credenciales por dispositivo o mTLS.
