# ADR 005: logging centralizado y estructurado
Identificamos los siguientes aspectos que influyen en la decisión:

* **Testeabilidad (R4, R5):** el sistema debe registrar eventos, errores e interacciones con servicios externos, y permitir visualizar métricas. Los logs deben ser fácilmente consultables para debugging y análisis post‑mortem.  
* **Disponibilidad (R7):** cuando un servicio falla, los logs deben estar disponibles centralizadamente para diagnóstico rápido, sin necesidad de acceder a cada contenedor.  
* **Desplegabilidad (R9):** en un entorno de contenedores, los logs deben enviarse a stdout para que Docker los capture, pero también persistirse para análisis histórico.  
* **Trazabilidad entre servicios:** las reservas generan una cadena de llamadas entre Identity, Booking, Tracking y servicios externos. Se necesita un correlationId para seguir el flujo completo sin interferir con la lógica de negocio.

## Decisión {#decisión-6}

Implementaremos un sistema de logging estructurado en formato JSON utilizando la biblioteca Winston, con tres destinos:

1. Consola (stdout): para que Docker y PM2 capturen los logs en tiempo real.  
2. Archivo rotatorio (/var/log/move/service-{instance}.log): para retención local y análisis offline, con rotación diaria y límite de tamaño.  
3. Opcional (producción): envío a un agregador central como Grafana Loki o ELK vía HTTP (dejamos la puerta abierta sin implementarlo ahora).

Además, incorporaremos un mecanismo de contexto basado en AsyncLocalStorage (Node.js nativo) que propaga automáticamente el correlationId a través de toda la cadena de ejecución, sin necesidad de pasarlo manualmente en cada función.  
Cada entrada de log incluirá obligatoriamente:

* timestamp (ISO 8601\)  
* service (nombre del servicio, ej. booking-service)  
* instanceId (identificador del worker de PM2)  
* correlationId (UUID generado al inicio de cada flujo y propagado automáticamente)  
* level (info, warn, error, etc.)  
* message (texto legible)  
* metadata (objeto con datos adicionales: userId, orderId, etc.)

Para cumplir con el requisito R4 (métricas), cada servicio expondrá un endpoint /metrics en formato Prometheus que ofrecerá:

* Cantidad de requests por endpoint, método y código de estado.  
* Histograma de duración de requests (percentiles).  
* Contadores de eventos de negocio (reservas creadas, pagos, alertas, etc.).  
* Métricas estándar de Node.js (uso de CPU, memoria, etc.).

Estas métricas serán consumibles por un dashboard (Grafana) o mediante consultas directas al endpoint.

## Justificación {#justificación-6}

Esta decisión se fundamenta en:

* **Testeabilidad (R4, R5):**  
  * Los logs estructurados permiten filtrar por correlationId para reconstruir una transacción completa a través de múltiples servicios.  
  * Los archivos rotatorios facilitan simulaciones (R5) porque se pueden inspeccionar sin afectar producción.  
  * El endpoint /metrics proporciona datos cuantitativos para verificar el estado del sistema en tiempo real.  
* **Disponibilidad (R7):**  
  * Centralizar logs (via stdout y archivos) acelera la identificación de fallas.  
  * El uso de stdout es estándar en Docker y es capturado por docker logs y por PM2.  
  * El contexto con AsyncLocalStorage asegura que el correlationId esté siempre disponible en los logs, incluso en llamadas asíncronas, sin sobrecargar el código de negocio.  
* **Desplegabilidad (R9):** 
  * La salida a stdout es la práctica recomendada en contenedores.  
  * Los archivos rotatorios se montan como un volumen, asegurando persistencia incluso si el contenedor se reinicia.  
* **Trazabilidad sin acoplamiento:** 
  * Usar AsyncLocalStorage evita tener que pasar el correlationId como parámetro en cada función, reduciendo el acoplamiento y el ruido en el código.  
  * El middleware de Express inyecta el correlationId al inicio de cada request y el cliente HTTP (axios) lo propaga automáticamente a los servicios llamados, garantizando trazabilidad extremo a extremo.

### Alternativas rechazadas:

* Logs solo a archivo: no funcionaría bien en contenedores (volumen efímero) y dificulta la agregación centralizada.  
* Enviar logs a MongoDB directamente: genera latencia y dependencia excesiva; los logs no deben afectar el rendimiento de la base de datos operacional.  
* console.log plano: no permite niveles, ni formato estructurado, ni rotación.  
* Propagación manual del correlationId: aumenta el acoplamiento y la carga cognitiva; se descarta en favor de AsyncLocalStorage.

## Estado

Aceptado

## Consecuencias

Positivas:

* Trazabilidad de extremo a extremo gracias a correlationId inyectado automáticamente.  
* Logs estructurados consumibles por herramientas de análisis (jq, Loki, Splunk).  
* Métricas listas para ser visualizadas en Grafana.  
* Bajo acoplamiento: el código de negocio no necesita conocer el correlationId.  
* Fácil de implementar (Winston y Prometheus son livianos y ampliamente usados).

Negativas:

* Sobrecarga de I/O (escritura de logs). Se mitigará usando nivel info en producción y debug solo en desarrollo.  
* El almacenamiento de logs rotados debe gestionarse (ej. maxFiles para evitar llenar el disco).  
* El AsyncLocalStorage requiere Node.js 12+ y debe usarse con cuidado en entornos con muchas operaciones asíncronas concurrentes (pero es ampliamente soportado).  
* El correlationId se propaga automáticamente solo si todas las llamadas HTTP usan el cliente provisto; las llamadas a servicios externos con bibliotecas de terceros deben adaptarse.