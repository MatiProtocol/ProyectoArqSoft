# ADR 007: librerías internas compartidas para autenticación, logs, métricas y manejo de errores

Identificamos los siguientes aspectos que influyen en la decisión:
- **Requerimiento R4:** el sistema debe registrar eventos, errores e interacciones con servicios externos, y permitir visualizar métricas mediante un dashboard o endpoint. Esta funcionalidad debe estar presente en todos los servicios.
- **Requerimiento R6:** el sistema debe garantizar la seguridad de usuarios registrando accesos autorizados y no autorizados. La autenticación y autorización se deben aplicar a todos los servicios.
- **Requerimiento R5:** el sistema debe permitir validar su funcionamiento mediante pruebas y simulaciones. Contar con librerías probadas de forma aislada facilita las pruebas de integración.
- **Modificabilidad:** los cambios en la lógica de autenticación (por ejemplo, cambiar de Auth0 a otro proveedor) o en el formato de logs no deben implicar modificar cada servicio uno por uno.
- **Testabilidad:** las librerías compartidas pueden ser probadas unitariamente de forma aislada, reduciendo la complejidad de las pruebas de cada servicio.
- **Desplegabilidad (R9):** los servicios se despliegan en contenedores independientes; compartir código mediante librerías (no mediante bases de datos o servicios centralizados) evita acoplamiento en tiempo de ejecución.
- **Restricción de equipo:** somos 3 desarrolladores. Mantener la misma lógica en 4 servicios distintos duplicaría esfuerzo y aumentaría el riesgo de inconsistencias.
- **Restricción de tiempo:** la fecha de entrega es fija. La reutilización de código acelera el desarrollo.

## Decisión

Crearemos un conjunto de librerías internas (monorepo o paquetes npm privados) que encapsulen las funcionalidades transversales a todos los servicios del sistema. Cada librería será un paquete independiente, versionado y vinculado mediante npm link. Las librerías iniciales serán:

1. @move/auth-lib: gestión de autenticación y autorización (Auth0 + roles + Redis caché). Se detalla más en ADR 006.
2. @move/logs-lib: logging estructurado (Winston) con formato JSON, niveles, rotación de archivos y envío a stdout para captura por Docker. Registro de métricas (contadores, histogramas) expuestas vía endpoint /metrics para Prometheus o similar. Profundizado en ADR 005.
3. @move/errors-lib: definición de errores base (tipos: NotFoundError, ValidationError, ExternalServiceError, etc.) y middleware unificado de manejo de errores para Express.

Cada servicio importará estas librerías como dependencias, centralizando así la lógica común. En el entorno de desarrollo, se utilizará npm link para facilitar el desarrollo; en producción, se instalarán mediante npm run build y npm run ci.

## Justificación

Esta decisión se fundamenta en su capacidad para satisfacer los siguientes atributos de calidad y requerimientos:

- **Modificabilidad:**
  - Un cambio en la lógica de autenticación (ej. migrar a otro proveedor de autenticación) se realiza en un solo lugar (@move/auth-lib) y todos los servicios lo reflejan al actualizar la dependencia.
  - Cambios en el formato de logs o en las métricas se propagan sin necesidad de tocar los servicios.
  - El versionado semántico de cada librería permite que los servicios evolucionen a ritmos distintos, actualizando solo cuando sea necesario.

- **Testabilidad:**
  - Cada librería puede probarse de forma aislada con mocks de sus dependencias (ej. Redis, MongoDB).
  - Los servicios pueden mockear fácilmente las librerías en sus pruebas de integración (usando jest.mock), reduciendo la complejidad de los tests.
  - El cumplimiento de R5 (simulaciones) se ve facilitado porque las librerías de logging y métricas pueden ser configuradas para modo "silencioso" en entornos de prueba.

- **Desplegabilidad (R9):**
  - Al ser librerías estáticas (código compilado), no introducen dependencias en tiempo de ejecución entre servicios (a diferencia de un microservicio centralizado de autenticación, que sería un punto único de falla).
  - Cada servicio sigue siendo un contenedor independiente; solo comparten código en tiempo de compilación, no en tiempo de ejecución.

- **Performance:**
  - El uso de Redis para cachear roles reduce llamadas a la base de datos.
  - La librería de logs es asíncrona y no bloquea el flujo principal.
  - Al no haber llamadas HTTP a un servicio de autenticación central, la latencia disminuye.

- **Seguridad (R6):**
  - La lógica de autenticación y autorización está centralizada y revisada en un solo lugar, reduciendo la probabilidad de vulnerabilidades por implementaciones inconsistentes.
  - La librería incluye validación de JWT y roles, y el caché en Redis evita consultas repetidas a la base de datos, mejorando la seguridad al minimizar la exposición de datos sensibles.

- **Consistencia y mantenibilidad:**
  - Todos los servicios manejan errores, logs y métricas con el mismo formato, lo que facilita la correlación de eventos en el dashboard y el análisis de logs.
  - El equipo puede enfocarse en la lógica de negocio de cada servicio, delegando las preocupaciones transversales a las librerías.

#### Alternativas rechazadas

- **Servicio centralizado de autenticación:** se rechaza porque introduce una dependencia en tiempo de ejecución y un punto único de falla que afectaría la disponibilidad (R7). Además, añade latencia de red en cada request.
- **Duplicar código en cada servicio:** se rechaza porque viola el principio DRY, incrementa el esfuerzo de mantenimiento y aumenta el riesgo de inconsistencias. Con 3 desarrolladores y 4 servicios, la duplicación sería costosa y propensa a errores.
- **Usar una librería externa no mantenida por el equipo:** se rechaza porque no podríamos adaptarla fácilmente a los requisitos específicos del proyecto (ej. cacheo de roles con Redis, formato de logs particular, métricas personalizadas).

## Estado

Aceptado

## Consecuencias

- Positivas:
    - Aceleración del desarrollo: los desarrolladores podemos crear nuevos servicios reutilizando las librerías, sin tener que realizar en cada servicio la autenticación o el logging.
    - Facilidad de evolución cambios en políticas de seguridad o en el formato de logs se aplican en un solo lugar y se propagan mediante actualización de versión.
    - Consistencia operativa todos los servicios producen logs y métricas en el mismo formato, lo que simplifica la agregación y el monitoreo.
    - Reducción de errores: la lógica común se prueba una vez, no en cada servicio.
    - Menor acoplamiento los servicios no dependen de otro que contenga la lógica de autenticación en tiempo de ejecución, mejorando la disponibilidad (R7) y la resiliencia.

- Negativas:
- Complejidad de gestión de versiones es necesario mantener la compatibilidad entre versiones de las librerías y los servicios. Se mitiga usando versionado semántico estricto y pruebas de integración antes de actualizar.
- Publicación y distribución: se requiere npm link en desarrollo. Esto añade una tarea de configuración inicial.
- Curva de aprendizaje: los nuevos miembros del equipo deben entender cómo usar las librerías y cómo extenderlas.
- Riesgo de sobreingeniería: si solo hubiera un servicio, no tendría sentido. Pero al ser 4 servicios, la inversión vale la pena. Se mitiga manteniendo las librerías enfocadas.