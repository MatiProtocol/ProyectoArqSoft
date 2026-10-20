# ADR 010: simulación y pruebas de carga

Identificamos los siguientes aspectos que influyen en la decisión:

- **Testeabilidad (R5):** el sistema debe permitir validar su funcionamiento mediante pruebas y simulaciones, incluyendo simulación de GPS, servicios externos y generación de alertas.
- **Rendimiento (R1, R2, R8):** es necesario medir los tiempos de respuesta bajo carga (100 reservas/min, 50 conductores) y validar que se cumplen los umbrales.
- **Disponibilidad (R7):** se deben probar los modos degradados y la recuperación ante fallos.
- **Cohesión y acoplamiento:** los simuladores deben mantenerse alineados con los dominios que simulan, evitando que cambios en un servicio afecten a la simulación de otro.
- **Costo de desarrollo:** las simulaciones deben ser fáciles de construir y ejecutar, sin depender de hardware especializado, y deben poder ejecutarse de forma aislada o conjunta según se necesite.

## Decisión

Implementaremos módulos de simulación distribuidos por servicio, cada uno alojado dentro del servicio que le corresponde, siguiendo el principio de responsabilidad única y la estructura de Service-Based Architecture (SBA). Además, se dispondrá de un script orquestador externo para ejecutar todos los simuladores simultáneamente cuando se requiera una demostración completa (R5).

**1. Simulador de GPS (Tracking Service)**
- **Ubicación:** services/tracking-service/scripts/gps-simulator.ts
- **Responsabilidad:** envía posiciones GPS falsas cada 10 segundos usando rutas predefinidas (GeoJSON) o aleatorias dentro de un polígono.
- **Tecnología:** uso de axios para peticiones HTTP o publicación directa en la cola BullMQ gps-ingest (según modo de ejecución). Generación de datos con @faker-js/faker.
- **Inyección de fallos:** permite configurar tasa de pérdida de paquetes GPS para simular fallos de conectividad.

**2. Simulador de clientes (Booking Service)**
- **Ubicación:** services/booking-service/scripts/client-simulator.ts
- **Responsabilidad:** genera clientes (empresa y particular), preregistros y reservas con datos aleatorios para probar el flujo completo de reservas, cotización y pagos.
- **Tecnología:** uso de axios para llamar a los endpoints REST del sistema; generación de datos con @faker-js/faker.
- **Inyección de fallos:** permite configurar tasas de error para simular fallos en la IA (descripciones ambiguas) o en la pasarela de pagos.

**3. Simulador de usuarios (Identity Service - opcional)**
- **Ubicación:** services/identity-service/scripts/user-simulator.ts
- **Responsabilidad:** genera usuarios y sesiones de autenticación para probar flujos de autorización.
- **Tecnología:** uso de axios y @faker-js/faker.

**4. Orquestador de simuladores (raíz del proyecto)**
- **Ubicación:** scripts/run-demo.ts
- **Responsabilidad:** lanza todos los simuladores en procesos hijos (usando child_process.spawn) para ejecutar una demo completa que abarque todos los flujos. No contiene lógica de simulación, solo orquestación.
- **Gestión de ciclo de vida:** maneja señales SIGINT/SIGTERM para un apagado graceful (cierre de procesos hijos, liberación de recursos).

**5. Pruebas de carga con k6**
- **Scripts:** se almacenan en tests/k6/ y se ejecutan con el comando k6 run.
- **Escenarios:**
  - **Carga normal:** 100 reservas por minuto durante 10 minutos + 50 conductores enviando GPS simultáneamente.
  - **Pico de carga (R8):** 5000 reservas por minuto (50x) y 2500 conductores (50x) durante 5 minutos.
- **Métricas:** percentiles p95, p99 de tiempo de respuesta; verificación de umbrales de R1 (600ms para top clientes, 700-1000ms para empresas no frecuentes, 5-10s para particulares), R2 (300ms consultas, 500ms listados) y R3 (alertas <5s).
- **Autenticación (ROPC):** los endpoints protegidos validan un JWT real de Auth0 (JWKS), sin bypass de desarrollo (ADR 006), y un script headless no puede usar el flujo interactivo de Authorization Code. Por eso los simuladores de clientes y los scripts k6 obtienen el token mediante Resource Owner Password Grant (`grant_type=password`) contra `https://$AUTH0_DOMAIN/oauth/token`, con usuarios de prueba ya registrados en Auth0 (`SIM_USER_*`) y las credenciales de la Auth0 Application (`AUTH0_CLIENT_ID`/`AUTH0_CLIENT_SECRET`); el token tiene el mismo `sub` y roles que un login interactivo y se cachea en memoria hasta poco antes de expirar. El helper se implementa por servicio (`scripts/lib/auth0-token.ts` para los simuladores Node y `tests/k6/lib/auth0-token.js` para k6, que no puede importar módulos de Node). Requiere el Grant Type "Password" habilitado en la Auth0 Application, y que los usuarios de prueba tengan su perfil local creado (`POST /register`, automatizado por el user-simulator del Identity Service).

**6. Pruebas unitarias y de integración**
- **Herramienta:** Jest.
- **Pruebas unitarias (servicios, casos de uso):** se utilizarán mocks de Mongoose (y de otros servicios externos) para aislar completamente la lógica de negocio de la base de datos y de dependencias externas. Esto garantiza pruebas rápidas, deterministas y sin efectos secundarios.
- **Pruebas de integración (repositorios, controladores con base de datos):** se utilizará mongodb-memory-server para levantar una instancia real de MongoDB en memoria. Esto permite probar la capa de persistencia con el mismo motor que producción, incluyendo validaciones de schema, índices y operaciones geospatiales (ej. $geoWithin), sin necesidad de un servidor MongoDB externo.
- **Simulación de servicios externos:** uso de mocks para IA, pagos y geolocalización, permitiendo probar modos degradados (R7).

## Justificación

Esta decisión se fundamenta en los siguientes atributos de calidad y principios arquitectónicos:

- **Cohesión y separación de responsabilidades (Domain-Driven Design):**
  - El GPS es del dominio de Tracking. Las reservas son del dominio de Booking. Mantener los simuladores dentro de sus servicios respectivos respeta los límites del dominio y evita que cambios en un modelo de datos (ej. añadir speed al GPS) afecten al simulador de Booking.
  - Esto se alinea con la cohesión funcional promovida por SBA.

- **Aislamiento de cambios (R7):**
  - Un cambio en el modelo de datos de Tracking (ej. nueva propiedad en el payload GPS) solo requiere actualizar el script de GPS. El simulador de Booking permanece inalterado, reduciendo el riesgo de errores colaterales.
  - La ejecución de simulaciones independientes permite probar un servicio sin tener que levantar todo el ecosistema.

- **Testeabilidad (R5):**
  - El simulador de GPS permite probar la detección de zonas y generación de alertas sin necesidad de dispositivos reales.
  - La inyección de fallos valida la resiliencia (R7) y los modos degradados.
  - El uso de mongodb-memory-server en pruebas de integración asegura que las pruebas sean rápidas, aisladas y reflejen fielmente el comportamiento de MongoDB en producción, incluyendo operaciones necesarias para la detección de zonas (F15).

- **Rendimiento (R1, R2, R8):**
  - k6 es la herramienta sugerida por la letra y es ampliamente utilizada para pruebas de carga. Se integra fácilmente con CI/CD.
  - Los simuladores distribuidos permiten generar carga específica sobre cada servicio sin depender de los demás, facilitando la identificación de cuellos de botella.

- **Reutilización de experiencia técnica:**
  - El uso de axios, @faker-js/faker y child_process.spawn son prácticas comunes en ecosistema Node.js, con ejemplos ampliamente documentados y de fácil implementación.
  - El enfoque de simulación distribuida es una práctica reconocida en arquitecturas de microservicios y SBA.

- **Costo de desarrollo:**
  - Todas las herramientas son open source y se ejecutan en local.
  - La separación de simuladores permite que cada desarrollador trabaje en su servicio sin conflictos de dependencias.

## Alternativas rechazadas
- **Un único simulador monolítico:** rompe la cohesión de SBA, mezcla dominios y dificulta el mantenimiento. Un cambio en Tracking obligaría a modificar un script que también contiene lógica de Booking, aumentando el riesgo de errores y dependencias cruzadas.
- **Simular GPS manualmente:** inviable para probar 50 conductores concurrentes o picos de 50x.
- **No hacer pruebas de carga:** incumpliría R1, R2 y R8, además de ser una negligencia técnica.
- **Usar servicios de pago de pruebas (ej. Loader.io)_** no necesario; k6 es gratuito, suficiente y se integra con CI/CD.
- **SQLite en memoria para pruebas de integración:** el sistema utiliza MongoDB con operaciones geospatiales ($geoWithin) y agregaciones complejas; SQLite no emula fielmente este comportamiento. mongodb-memory-server es más adecuado porque usa el mismo motor.

## Estado

Aceptado

## Consecuencias

- Positivas
  - Independencia de pruebas: se puede ejecutar solo el simulador de GPS para probar el Tracking Service sin necesidad de Booking.
  - Mantenibilidad los cambios en un servicio solo afectan a su propio simulador.
  - Demostraciones flexibles el orquestador permite lanzar todos los simuladores para una demo completa (R5) o solo un subconjunto para pruebas focalizadas.
  - Alineación con SBA: refuerza la estructura de servicios y la separación de dominios.
  - Pruebas de integración fieles: mongodb-memory-server replica el comportamiento real de MongoDB, asegurando que las pruebas de repositorios y consultas geospatiales sean válidas.

- Negativas
  - Esfuerzo adicional de mantenimiento: se deben mantener varios scripts (GPS, clientes, usuarios) en lugar de uno solo. Sin embargo, este esfuerzo se compensa con la reducción del acoplamiento.
  - Coordinación de versiones: si un cambio en el contrato de API (ej. nuevo campo en reserva) afecta a varios simuladores, se deben actualizar todos. Esto se mitiga con pruebas de integración y el orquestador.
  - Contaminación de datos: las pruebas de carga pueden generar datos de prueba que contaminen la base de datos si no se aislan. Solución: usar una base de datos de testing separada (ej. move_test) y un header X-Simulation: true para que los servicios identifiquen tráfico de prueba.
  - k6 y Jest son herramientas separadas: k6 no puede ejecutarse dentro de los tests de Jest. Se debe integrar en el pipeline de CI como un paso aparte, lo que añade complejidad al proceso de integración continua.
  - Dependencias distribuidas: cada servicio debe tener sus propias devDependencies (ej. @faker-js/faker en Tracking y Booking). Esto incrementa el espacio en disco, pero es aceptable y evita conflictos de versiones.