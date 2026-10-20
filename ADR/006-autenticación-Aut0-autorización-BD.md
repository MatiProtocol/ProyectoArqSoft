## ADR 006: autenticación con Autn0 y autorización con roles en base de datos propia

### Identificación de aspectos que influyen en la decisión

- **F2. Ingreso**: el sistema debe permitir autenticación mediante un servicio externo, garantizando seguridad y disponibilidad.
- **Seguridad (R6)**: se debe proteger el acceso a las funcionalidades según el rol del usuario, registrando accesos autorizados y no autorizados.
- **Disponibilidad (R7)**: la autenticación es crítica; fallos en el servicio externo o en la base de datos de roles no deben impedir completamente el funcionamiento del sistema, aunque se debe manejar degradación.
- **Rendimiento (R1, R2)**: la validación de roles debe ser rápida (idealmente menor a un milisegundo) para no impactar los tiempos de respuesta de las operaciones.
- **Modificabilidad**: el sistema debe poder cambiar de proveedor de autenticación o modificar la lógica de roles sin afectar el resto de la arquitectura.
- **Simplicidad para el equipo**: el equipo es pequeño (3 desarrolladores), por lo que se prioriza una solución con baja complejidad de implementación y mantenimiento.

### Decisión

Utilizaremos Auth0 como proveedor de identidad externo para la autenticación (F2). Los tokens JWT emitidos por Auth0 serán validados en cada request protegido mediante un middleware de la librería express‑oauth2‑jwt‑bearer.

Los roles de los usuarios se almacenarán en la base de datos propia (MongoDB) en la colección para usuarios, con un campo que guardará los roles de los usuarios. Para evitar consultas repetidas a la base de datos, se implementará un caché en Redis con tiempo de expiración de 15 minutos (900 segundos) para almacenar los roles de cada usuario.

Se implementará un middleware que, después de validar el JWT, obtenga el usuario del token y consulte el caché Redis si el usuario está guardado allí con sus roles y, si no existe, consulte la base de datos por ellos y almacene el resultado en caché.

Para la autorización, se utilizará el middleware que verificará si el usuario autenticado posee al menos uno de los roles permitidos para el endpoint. En caso contrario, devolverá un error 403 (Forbidden).

### Justificación

- **Seguridad**: Auth0 es un proveedor de identidad reconocido que implementa estándares como OAuth 2.0 y OpenID Connect, garantizando una autenticación robusta. La validación del token en cada request asegura que solo usuarios autenticados accedan a recursos protegidos. Los roles en base de datos propia permiten un control granular y flexible de permisos, desacoplado del proveedor de identidad.
- **Disponibilidad (R7)**: al cachear los roles en Redis, se reduce la dependencia de la base de datos para cada request. Si la base de datos falla, los roles cacheados (hasta 15 minutos) permiten que el sistema continúe operando, aunque no se reflejen cambios recientes. Si Auth0 falla, el sistema no podrá autenticar nuevos usuarios, pero los usuarios ya autenticados con sesiones válidas (tokens no expirados) podrán seguir operando. Se puede considerar una estrategia de degradación adicional (por ejemplo, permitir acceso a endpoints públicos).
- **Rendimiento (R1, R2)**: la validación JWT es una operación criptográfica rápida. La consulta a Redis es del orden de microsegundos, mucho más rápida que una consulta a MongoDB. Esto contribuye a mantener los tiempos de respuesta por debajo de los límites establecidos (300ms para consultas, 600ms para reservas de clientes frecuentes). El tiempo de expiración de 15 minutos es un equilibrio entre actualización de roles y rendimiento.
- **Modificabilidad**: La separación en middlewares permite cambiar el proveedor de autenticación (ej. pasar a Okta, o a un sistema interno) sin modificar la lógica de autorización. Asimismo, cambiar el almacenamiento de roles (ej. a una tabla SQL) solo implica modificar el repositorio.
- **Simplicidad**: el uso de middlewares de Express es un patrón común y fácil de entender. La integración con Auth0 está bien documentada y la librería express‑oauth2‑jwt‑bearer simplifica la validación. El caché con Redis es directo.

#### Alternativas rechazadas

- **Auth0 Management API para roles**: se rechazó porque implicaría dependencia adicional de Auth0 para autorización, aumentando la latencia y el acoplamiento. Además, Auth0 tiene límites de rate limit que podrían afectar el rendimiento.
- **Roles en base de datos sin caché**: se rechazó por impacto en rendimiento al consultar MongoDB en cada request.

### Estado

Aceptado

### Consecuencias

- Positivas:
  - Autenticación segura y estándar con Auth0.
  - Autorización flexible y desacoplada.
  - Rendimiento optimizado mediante caché Redis.
  - Fácil mantenimiento y evolución gracias a la separación de responsabilidades.
- Negativas:
  - Dependencia de Auth0 para la autenticación; si el servicio cae, los nuevos inicios de sesión fallan. Se debe monitorear y considerar un plan de contingencia.
  - Complejidad adicional al gestionar caché de roles (invalidación, consistencia). Si fuera necesario, se debería implementar una estrategia para invalidar el caché cuando se actualicen los roles de un usuario (ej. mediante un evento de actualización de usuario).
  - El TTL de 15 minutos puede causar que los cambios de roles no se reflejen inmediatamente. Para casos críticos, se podría forzar la invalidación manual.