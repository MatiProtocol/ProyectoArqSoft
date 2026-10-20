# ADR 001: uso de una base de datos documental única (MongoDB)

Identificamos los siguientes aspectos que influyen en la decisión:

* **Bienes con propiedades distintas (F4.1, F4.2):** los bienes transportados tienen atributos opcionales como valor o tamaño y las categorías asociadas para cada uno difieren en número.  
* **Configurabilidad de reglas (F8):** el administrador debe poder modificar reglas de monitoreo, alertas y recargos mediante archivos CSV sin alterar el código fuente.  
* **Características de vehículos (F10):** los vehículos pueden tener características customizadas que servirán para optimizar su selección a los envíos.  
* **Rendimiento (R1, R2):** el sistema debe procesar reservas en \<600 ms (para los mejores clientes), responder consultas en \<300 ms y listados en \<500 ms operando a carga máxima (100 reservas/min con 50 conductores transmitiendo en simultáneo).
* **Escalabilidad (R8):** se deben soportar picos de 50x la carga normal, lo que exige un modelo de datos que permita escalar horizontalmente sin grandes migraciones.
* **Simplicidad para el equipo:** es fundamental reducir la complejidad técnica del mapeo objeto-relacional y de las actualizaciones de las bases de datos.

## Decisión

Nosotros utilizaremos una base de datos única documental basada en MongoDB. Implementaremos un modelo de datos desnormalizado donde las entidades se almacenen como documentos en formato BSON/JSON. <br>
Para gestionar la validación y el modelado de datos a nivel de aplicación, utilizaremos Mongoose como ODM, definiendo esquemas con tipos, campos requeridos, valores por defecto y reglas de validación personalizadas. <br>
Se harán proyecciones optimizadas para CQRS. Los modelos de lectura (queries) se implementarán con agregaciones y proyecciones que devuelvan solo los campos necesarios.

## Justificación

Esta decisión se fundamenta en su capacidad para satisfacer los siguientes atributos de calidad:

* **Modificabilidad (F8, F10):** el esquema flexible de MongoDB permite que las reglas de negocio cargadas por CSV (F8) y las características personalizadas de los vehículos (F10) se almacenen dinámicamente sin necesidad de migraciones o tablas con múltiples campos nulos.  
* **Performance (R1, R2):** al utilizar un modelo de documentos, por ejemplo, toda la información de una reserva y sus bienes asociados se recupera en una única operación de lectura, eliminando la necesidad de joins complejos que poseen mayor latencia en bases de datos relacionales. Esto asegura el cumplimiento de las respuestas en milisegundos exigidas.  
* **Desplegabilidad (R9):** MongoDB es desplegable de forma sencilla a través de Docker.  
* **Relación con la arquitectura basada en servicios (ADR 01):** en una arquitectura basada en servicios, compartir una base de datos única simplifica la gestión para un equipo pequeño, manteniendo la integridad mediante transacciones ACID locales (soportadas por MongoDB).  
* **Simplicidad para el equipo:** el uso de Mongoose ofrece una capa de abstracción clara y familiar, reduciendo la posibilidad de errores de validación y acelerando el desarrollo.

#### Alternativas rechazadas {#alternativas-rechazadas}

* **Base de Datos Relacional (SQL):** rechazada por la rigidez del esquema, que complicaría la gestión de bienes heterogéneos y aumentaría la latencia de las consultas de reportes (R2) debido a la fragmentación de los datos en múltiples tablas.

## Estado

Aceptado

## Consecuencias

* Positivas:  
  * Aceleración del ciclo de desarrollo al mapear directamente los objetos del dominio con los documentos de la base de datos.  
  * Flexibilidad para la estructura de los bienes y reglas creadas a partir del CSV sin paradas del sistema.  
  * Facilidad para cumplir con las métricas de rendimiento bajo estrés (R2), ya que nos evitamos joins.  
* Negativas:  
  * Redundancia de datos: el almacenamiento de datos duplicados para favorecer el rendimiento incrementará el consumo de espacio en disco.  
  * Responsabilidad del equipo: al no haber un esquema estricto forzado (restricciones estructurales y no estructurales) por la base de datos, los desarrolladores deben ser rigurosos en la validación de datos a nivel de aplicación.  
    *Mitigación:* se usará Mongoose para centralizar las reglas de validación en la capa de acceso a datos. Sin embargo, esto no elimina la responsabilidad del equipo, ya que:  
    - Las validaciones solo se aplican si se accede a MongoDB a través de la aplicación; escrituras directas (consola, Compass) podrían omitirlas.  
    - La disciplina en las revisiones de código y en las migraciones de datos sigue siendo necesaria.