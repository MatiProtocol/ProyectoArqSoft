# ADR 004: implementación del patrón CQRS (Command Query Responsibility Segregation)

Existen diversas fuerzas y restricciones que impulsan esta decisión de diseño para el sistema MOVE:

* **Rendimiento consultas (R2):** el sistema debe garantizar tiempos de respuesta en consultas y reportes menores a 300 ms y listados en menos de 500 ms, operando bajo una carga máxima de 100 reservas por minuto y 50 conductores transmitiendo en simultáneo.  
* **Ingreso de información constante (F14):** se recibe información de ubicación GPS cada 10 segundos por cada vehículo activo, lo que genera una carga de escritura constante y masiva que compite por recursos con las consultas operativas.  
* **Escalabilidad ante demanda (R8):** MOVE debe soportar incrementos de carga de hasta 50 veces en períodos críticos.  
* **Monitoreo en tiempo real (F18):** el operador requiere una visibilidad fluida de los traslados en curso y alertas activas (generadas en menos de 5 segundos según R3) sin que el procesamiento de las coordenadas GPS degrade la operación.

## Decisión

Nosotros implementaremos el patrón CQRS para separar las operaciones de modificación de estado (Commands) de las operaciones de consulta de datos (Queries) dentro de los servicios del sistema. Se usarán modelos de datos independientes y flujos de ejecución diferenciados para la lógica de escritura (validación de reservas) y la lógica de lectura (endpoint o dashboard de monitoreo, historial de reservas), permitiendo que cada lado sea óptimo y escale de forma autónoma.

## Justificación

Esta decisión se fundamenta en la necesidad de cumplir con los estrictos atributos de calidad del proyecto:

* **Performance (R2):** al separar las lecturas, podemos emplear "modelos de lectura" o  proyecciones sobre los documentos desnormalizados en MongoDB que contengan exactamente los datos requeridos por el operador (F18), eliminando cálculos complejos en tiempo de ejecución y asegurando respuestas en menos de 300 ms.  
* **Modificabilidad (Escalabilidad) (R8):** el lado de "Commands" puede escalar horizontalmente para procesar el ingreso masivo de GPS (F14) o el flujo de reservas (F4.1/4.2) durante picos.  
* **Reducción de contención de recursos:** al no compartir el mismo modelo de objetos ni bloqueos para leer y escribir, garantizamos que las alertas de seguridad física se procesen y registren en menos de 5 segundos (R3), incluso bajo estrés máximo.

### Alternativas rechazadas

* **Modelo CRUD Tradicional:** fue rechazado debido a que un modelo de datos único para cargas de trabajo mixtas (altas escrituras de GPS vs. lecturas rápidas de monitoreo) genera cuellos de botella y bloqueos que pondrían en riesgo el cumplimiento de los tiempos de respuesta exigidos en R2.

## Estado {#estado-3}

Aceptado.

## Consecuencias {#consecuencias-3}

La aplicación de esta decisión genera el siguiente contexto:

* **Positivas:**  
  * **Maximización del rendimiento:** consultas extremadamente rápidas alineadas con los ASRs de performance.  
  * **Evolución:** permite modificar los modelos de lectura para nuevos dashboards sin afectar la integridad de la lógica de negocio de las reservas.  
  * **Aislamiento de fallas:** un fallo en la generación de listados pesados no impedirá la recepción y verificación crítica de señales GPS (F14/R7).  
* **Negativas:**  
  * **Complejidad en el desarrollo:** el equipo debe gestionar dos flujos de código por servicio, lo que incrementa el esfuerzo inicial de implementación y mantenimiento.  
  * **Consistencia eventual:** existe un desfase temporal mínimo entre la escritura de un dato (ej. nueva ubicación GPS) y su aparición en las consultas, lo cual debe ser gestionado a nivel de UX para el operador.  
  * **Mayor consumo de almacenamiento:** la duplicidad de datos en proyecciones optimizadas para lectura incrementará el uso de espacio en disco.