# ADR 009: comunicación asíncrona para procesamiento de GPS y alertas

Identificamos los siguientes aspectos que influyen en la decisión:

- **Performance (R1, R2, R3):** el sistema debe recibir posiciones GPS cada 10 segundos de hasta 50 conductores simultáneos (5000 eventos/minuto). Procesar estas posiciones de forma síncrona dentro de la misma request HTTP generaría latencia inaceptable y bloquearía otros procesamientos.
- **Disponibilidad (R7):** el fallo en el procesamiento de un punto GPS no debe impedir la recepción de los siguientes. Se necesita desacoplar la llegada de datos del análisis para aislar fallas.
- **Escalabilidad (R8):** en períodos de alta demanda (50x la carga normal), la capacidad de procesamiento de GPS debe poder escalarse independientemente del resto del sistema.
- **Complejidad de reintentos:** la detección de zonas y generación de alertas puede fallar transitoriamente (por ejemplo, timeout de API de geolocalización). Se necesita una política de reintentos controlada.

## Decisión

Utilizaremos un sistema de colas basado en BullMQ (Redis) con múltiples colas especializadas y workers independientes para cada etapa del procesamiento: gps-ingest (ingesta ultrarrápida), alert-detection (cálculo de zonas y generación de alertas), y notification-queue (envío de emails y notificaciones externas).
Esta separación de workers, que pueden ejecutarse en procesos distintos (PM2), asegura que una demora o fallo en el envío de un email (servicio externo) no bloquee ni reintente el procesamiento del GPS o la detección de alertas, cumpliendo con R7.

## Justificación

Esta decisión se fundamenta en los siguientes atributos de calidad:

- **Performance:** al desacoplar la ingesta del procesamiento, el endpoint POST /gps responde en menos de 10 ms, cumpliendo con la ventana de 10 segundos entre lecturas y sin afectar a otras operaciones.
- **Disponibilidad:** si un worker de BullMQ falla, los mensajes permanecen en la cola y otro worker los retoma. BullMQ persiste los jobs en Redis, evitando pérdidas ante reinicios.
- **Escalabilidad:** podemos aumentar el número de workers de BullMQ (instances en PM2) para manejar picos de 50x sin modificar el código. Redis y BullMQ soportan alta concurrencia.
- **Reintentos controlados:** BullMQ permite configurar reintentos con backoff exponencial para tareas transitorias (ej. attempts: 3, backoff: { type: 'exponential', delay: 2000 }), alineado con la táctica de reintento sobre la Disponibilidad (R7).

### Alternativas rechazadas
- **Procesamiento síncrono dentro del endpoint:** descartado porque bloquearía el hilo principal y no podría cumplir con R8.
- **RabbitMQ:** también válido, pero BullMQ se integra perfectamente con Redis (ya presente para caché) y ofrece características como removeOnComplete y delayed jobs que simplifican la limpieza y los reintentos.

## Estado

Aceptado

## Consecuencias

- Positivas:
    - La ingesta de GPS se vuelve no bloqueante y resistente a fallos de procesamiento.
    - Permite escalar workers de forma independiente (R8).
    - Se pueden priorizar colas.
    - no se requiere introducir RabbitMQ, simplificando la infraestructura (solo Redis) y reduciendo la complejidad operativa para el equipo.
    - La configuración de reintentos es granular: gps-ingest sin reintentos (fire-and-forget), alert-detection con reintentos moderados, notification-queue con reintentos extensos sin afectar a las colas críticas.
- Negativas:
    - Aumenta la complejidad operativa (monitorear la longitud de las colas, workers caídos).
    - La latencia entre la ingesta y la alerta puede ser de unos pocos segundos adicionales (aún dentro de R3). Se debe dimensionar el número de workers para que la cola no crezca indefinidamente.
    - Si Redis se satura, todas las colas fallan; se debe dimensionar la memoria y usar removeOnComplete: true para liberar espacio.