# ADR 012: adopción de Clean Architecture para la estructura interna de los servicios

## Contexto y fuerzas impulsoras

Identificamos los siguientes aspectos que influyen en la decisión:

- **Testabilidad (R5):** se exige validar el funcionamiento mediante pruebas y simulaciones (GPS, servicios externos, alertas). La arquitectura debe permitir simular capas inferiores (repositorios, clientes HTTP) sin afectar la lógica de negocio.
- **Rendimiento (R2):** Las consultas deben responder en menos de 300 ms. Aunque las capas añaden una ligera latencia, el mayor costo está en las operaciones de red (servicios externos) y escritura/lectura de la base de datos, no en la comunicación entre capas en memoria.
- **Reutilización de lógica:** el sistema tiene procesamiento tanto síncrono (requests HTTP) como asíncrono (workers de Bull para GPS, por ejemplo). La lógica de negocio (ej. detección de zonas, cálculo de costos, asignación de vehículos) debe ser la misma en ambos contextos.
- **Alineación con CQRS (ADR 004):** se necesita separar claramente los comandos (escritura) de las queries (lectura) dentro de cada servicio.
- **Restricciones del equipo:** equipo de 3 personas, por lo que la estructura debe ser clara, con responsabilidades bien delimitadas.

## Decisión

Adoptamos una Clean Architecture para la estructura interna de *todos* los servicios del sistema (Identity, Booking, Configuration, Tracking).

Cada servicio se dividirá en las siguientes 4 capas lógicas, con una regla de dependencia estricta: las dependencias apuntan siempre hacia adentro (el dominio no conoce a nadie).
**1. Dominio** (domain/): entidades puras, Value Objects e interfaces de repositorio (puertos). Sin dependencias externas. Ekemplos: Booking, Item,IBookingRepository (interfaz).
**2. Aplicación** (application/): commands y queries (casos de uso). Contienen la lógica de negocio pura (validaciones, cálculos, orquestación). Dependen solo de las interfaces del dominio. Ejemplos: CreateBookingCommand, GetActiveTransfersQuery.
**3. Infraestructura** (infrastructure/): implementaciones concretas de las interfaces del dominio. Incluye repositorios (Mongoose), adaptadores de colas (Bull), clientes HTTP (Gemini, Google Maps, Stripe) y configuración. Ejemplos: BookingRepository, GeminiAIClient, BullGPSQueueAdapter.
**4. Presentación** (presentation/): controladores, manejo de errores y enrutamiento. Ejemplos: BookingController, validarCrearReservaDTO.

**Workers asíncronos:** los workers de Bull se consideran parte de la capa de infraestructura, pero invocan los mismos casos de uso de la capa de aplicación. De esta forma, la lógica de procesamiento de GPS es idéntica tanto si se dispara por un webhook REST como por un job encolado.

## Justificación

La elección de esta arquitectura se fundamenta en los siguientes atributos de calidad y requerimientos:

- **Testabilidad (R5):** la inversión de dependencias permite reemplazar fácilmente:
  - Un repositorio real de MongoDB por un repositorio en memoria (para pruebas unitarias).
  - El cliente HTTP de Google Maps por un stub que devuelve distancias fijas.
  - La cola Bull por una cola simulada (sin Redis).
  Esto cumple con la exigencia de simulaciones de GPS, servicios externos y generación de alertas sin necesidad de infraestructura real durante las pruebas.
- **Rendimiento (R2):** la latencia introducida por las capas es mínima (microsegundos). El overhead de los objetos y la indirección es irrelevante comparado con la red y la base de datos, por lo que no afecta los umbrales de <300 ms.
- **Reutilización (R7):** al tener la lógica de negocio encapsulada en casos de uso, tanto el endpoint REST de GPS como el worker de Bull pueden invocar el mismo ProcessGpsPositionCommand, garantizando que las reglas de detección de zonas y alertas sean consistentes y evitando duplicación de código.
- **Alineación con CQRS (ADR 004):** la capa de aplicación se subdivide naturalmente en: commands y queries.
- **Aislamiento de cambios:** si cambiamos de base de datos (ej. de MongoDB a PostgreSQL), solo debemos modificar la capa de infraestructura. El dominio y la aplicación permanecen intactos.

### Alternativas rechazadas

- **Arquitectura en 3 capas tradicional (API - Negocio - Persistencia):** rechazada porque la capa de negocio queda fuertemente acoplada a la implementación de la base de datos y a los detalles de infraestructura, lo que dificulta las pruebas unitarias y la simulación de fallos exigida en R5.
- **Modelo sin capas (todo en controladores):** rechazado porque la lógica de negocio se dispersa, se duplica (síncrono/asíncrono) y se vuelve imposible de probar de forma aislada, incumpliendo R5 y R7.

## Estado

**Aceptado.** Reemplaza al ADR 003 original (capas genéricas) para alinearse con las mejores prácticas de Clean Architecture y los proyectos de referencia.

## Consecuencias

- Positivas:
  - Testabilidad máxima: podemos probar cada caso de uso de forma aislada con mocks/stubs, cumpliendo R5.
  - Reutilización: la misma lógica de negocio sirve para procesamiento síncrono y asíncrono (Bull workers).
  - Evolución: cambiar de tecnología (ej. pasar de Bull a RabbitMQ) solo afecta al adaptador de infraestructura, no a la lógica de negocio.
  - Estructura estandarizada: todos los servicios siguen el mismo patrón, reduciendo la carga cognitiva del equipo.
- Negativas:
  - Aumento de archivos: se generan más archivos (interfaces, implementaciones, DTOs, mappers) que en una arquitectura simple.
  - Curva de aprendizaje: la arquitectura hexagonal requieren una comprensión inicial.
  - Sobreingeniería para servicios muy simples: servicios como configuration-service (solo CRUD de CSV y zonas) podrían parecer excesivos.