# ADR 008: uso de colas BullMQ y webhook para gestión de reservas pendientes de clasificación manual

Identificamos los siguientes aspectos que influyen en la decisión:

- **Restricción de tiempo crítica (F4.1, F19, R7):** cuando el sistema de IA no puede determinar la categoría MOVE de los bienes de un cliente particular, se debe notificar a un operador humano en menos de 1 segundo para que realice la clasificación manual (F19). Este grupo funcional (F2–F6, F19) está marcado como crítico en R7, por lo que la notificación no puede depender de que el operador tenga la interfaz web activa.
- **Perfil operativo del receptor:** el Operador no mantiene necesariamente una sesión abierta en el sistema en todo momento.

## Decisión

Utilizaremos un endpoint webhook configurable para poder hacer llegar una notificación hacia el Operador cuando el BookingService no logre categorizar los bienes de una reserva de cliente particular. El BookingService guardará la reserva y la publicará en BullMQ, un worker realizará intentos a un HTTP POST hacia la URL del webhook configurada con una backoff, enviando los datos de la reserva no reconocida (ID de reserva, descripción de los bienes, cliente, fecha) como payload JSON. La URL del webhook se almacenará como variable de entorno, permitiendo cambiar el destino sin modificar el código.
A su vez, cuando la clasificación por IA falle y la notificación sea o no envíada al operador la reserva quedará guardada en una cola para su clasificación poesterior.

## Justificación

La elección del Webhook como canal de notificación se fundamenta en los siguientes puntos:

- **Performance (F19, R7):** al utilizar un procesamiento asíncrono con BullMQ para desacoplar del flujo principal del envío externo mejoramos la performance.
- **Disponibilidad (R7):** el webhook desacopla completamente la notificación de la interfaz web del sistema. Al utiizar colas tenemos un desacoplamiento lógico.

## Consecuencias

- Positivas:
    - La notificación al Operador se realiza en tiempo real con latencia mínima, cumpliendo la restricción de menos de 1 segundo de F19 y R7.
    - El BookingService permanece desacoplado de la lógica de presentación y del estado de sesión del Operador.
    - El canal de destino puede cambiarse en cualquier momento modificando únicamente la variable de entorno con la URL del webhook, sin redesplegar lógica de negocio.
- Negativas
    - La solución requiere infraestructura adicional gracias al uso de BullMQ, ya que es necesario Redis, pero al ya estar siendo usado para el guardado de roles en caché esta dependencia es mitigada.
    - Dependencia de un servicio externo: si el servicio de webhook externo experimenta una interrupción, las notificaciones pueden no llegarán al Operador. Mitigado gracias al uso de intentos con un exponencional backoff, si falla, entonces si las notificaciones no llegarán, pero igualmente la reserva quedará pendiente para su clasificación manual.
    - No hay confirmación de lectura el webhook garantiza la entrega del mensaje a la plataforma, pero no que el Operador lo haya visto. Si el Operador no está disponible, la reserva quedará pendiente de clasificación hasta que sea atendida.
    - Configuración inicial por entorno: la URL del webhook es específica por organización y canal, por lo que debe gestionarse correctamente como secreto de entorno en cada despliegue Docker (R9).