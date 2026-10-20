# ADR 011: despliegue con contenedores y orquestación con PM2 

Identificamos los siguientes aspectos que influyen en la decisión:

- **Desplegabilidad (R9):** el sistema debe desplegarse utilizando contenedores Docker, permitiendo portabilidad entre plataformas (desarrollo, staging, producción).
- **Escalabilidad (R8):** debe soportar incrementos de carga de hasta 50 veces. Necesitamos escalar servicios horizontalmente sin modificar código.
- **Rendimiento (R1, R2):** los servicios deben poder iniciarse rápidamente y gestionar conexiones eficientemente. Las tareas pesadas (IA, procesamiento de GPS) no deben bloquear las respuestas HTTP.
**Disponibilidad (R7):** el despliegue debe soportar actualizaciones sin downtime (zero-downtime) y reinicios automáticos ante fallos.
**Simplicidad del equipo:** el equipo de 3 personas necesita una solución fácil de operar sin una plataforma compleja como Kubernetes.

## Decisión
Utilizaremos Docker Compose para definir la infraestructura (MongoDB, Redis, Nginx) y PM2 para ejecutar los servicios Node.js dentro de los contenedores. <br>
Cada servicio se empaquetará en su propio Dockerfile, y usaremos un único ecosystem.config.js para declarar todos los procesos. <br>
Refinamiento clave y estado actual de la implementación: dentro de cada servicio, diferenciamos dos tipos de procesos, cada uno con un modo de ejecución distinto:
- Servidores HTTP (API REST): se ejecutarán en modo cluster con 2 o más instancias. Esto aplica a los endpoints de Identity, Configuration, Booking y Tracking. El modo cluster:
    - Aprovecha múltiples núcleos de CPU.
    - Permite pm2 reload con zero-downtime.
    - Balancea la carga de forma nativa entre las instancias.
    - Workers de procesamiento en segundo plano (BullMQ): se ejecutarán en modo fork con instancias dedicadas. Esto aplica a:
        - Worker de notificaciones para operadores: encargado de procesar las notificaciones cuando una reserva particular no puede clasificarse automáticamente (F19).
        - Workers de GPS y alertas: se espera que sigan el mismo patrón, ejecutándose en modo fork para no bloquear el event loop de las APIs.
El orquestador será PM2 dentro de cada contenedor, no Kubernetes. Nginx actúa como proxy frontal y está configurado para enrutar a los servicios HTTP; la salud de los servicios se verifica a nivel de contenedor/endpoint. <br>
**Observación sobre la escalabilidad con Nginx** <br>
Actualmente, Nginx está configurado en Docker Compose con un upstream que apunta a un único contenedor por servicio. El balanceo entre instancias se realiza internamente mediante el modo cluster de PM2, no a nivel de Nginx. <br>
Si en el futuro se decide escalar creando múltiples contenedores del mismo servicio (por ejemplo, 2 contenedores de booking), Nginx no descubrirá automáticamente esas nuevas réplicas sin reconfiguración manual o sin un proxy con descubrimiento dinámico (como Traefik o Consul).

## Justificación
Esta decisión se fundamenta en:
- **Desplegabilidad (R9):** Docker Compose permite levantar todo el entorno con un comando (docker compose up) y es reproducible en cualquier máquina.
- **Rendimiento y Escalabilidad (R8):** el modo cluster escala las APIs horizontalmente sin latencia de red. El modo fork permite escalar solo los workers que realmente lo necesitan (ej. si hay pico de notificaciones, se escala el worker que notifica al operador sin duplicar los servidores HTTP).
- **Disponibilidad (R7):** pm2 reload en cluster mode actualiza las APIs sin downtime. Los workers en fork tienen autorestart y kill_timeout para graceful shutdown.
- **Simplicidad:** el equipo ya tiene experiencia con PM2 y Docker. La separación HTTP/Worker evita la complejidad de tener que elegir un modo único para todo el servicio y permite optimizar cada tipo de carga por separado.

#### Alternativas rechazadas
- Kubernetes: demasiada complejidad operativa para un equipo de 3 personas; aumentaría el costo de despliegue y mantenimiento.
- Despliegue en máquinas desnudas (sin contenedores): violaría R9 y haría el entorno de desarrollo diferente de producción.
- Usar solo PM2 sin contenedores: no garantiza portabilidad entre plataformas (diferentes versiones de Node, variables de entorno, etc.).
- Usar modo cluster para los workers de Bull: no es compatible con worker_threads y dificulta el control fino de la concurrencia por cola.

## Estado
Aceptado

## Consecuencias
- Positivas:
    - Entornos consistentes (dev/staging/prod) gracias a Docker.
    - Escalado granular: se puede escalar el servidor HTTP y los workers de forma independiente según la demanda.
    - Zero-downtime en las APIs gracias a pm2 reload en modo cluster (asegurándose de que cada servicio tenga wait_ready y listen_timeout configurados).
    - Aislamiento de fallas: si un worker de notificaciones falla, el servidor HTTP sigue respondiendo a health checks y atendiendo consultas.
    - Los workers en fork pueden gestionar su propia concurrencia usando BullMQ con límites específicos por cola.
- Negativas:
    - Mayor número de procesos a monitorear (aunque PM2 los agrupa por nombre).
    -Los logs deben incluir el nombre del proceso (process_name) para poder trazarlos correctamente y distinguir si un log viene del HTTP o del worker.
    - El cluster mode de PM2 no es compatible con el uso de worker_threads de Bull en el mismo proceso, pero al separarlos en fork evitamos este problema.
    - El balanceo con Nginx añade un salto de red.
    - Limitación: si se escalan contenedores, Nginx no los detectará automáticamente; se requerirá una solución adicional (Traefik, Consul, o actualización manual de la configuración). Por ahora, se escala dentro del contenedor con PM2 cluster.

