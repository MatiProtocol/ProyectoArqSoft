# ADR 003: uso de arquitectura en capas para la estructura interna de los servicios

Decisión motivada por los siguientes aspectos:

* **Testabilidad (R5):** El obligatorio exige validar el funcionamiento mediante pruebas y simulaciones. La arquitectura en capas soporta bien la testabilidad al permitir probar las capas inferiores de forma independiente o utilizar *mocks/stubs* para simular capas inferiores.  
* **Rendimiento (R2):** Las consultas deben responder en menos de 300 ms. Aunque las capas cerradas añaden una ligera latencia, este estilo permite un control claro del rendimiento.

## Decisión

Vamos a implementar el estilo de arquitectura en capas para la organización interna del código dentro de cada servicio de la plataforma.

De forma específica, cada servicio se dividirá internamente en las siguientes capas:

1. Capa de API (Controlador): encargada de recibir las peticiones REST y gestionar la comunicación externa.  
2. Capa de negocio: donde residirán las reglas de dominio de MOVE (ej. reglas de cotización de F5 o detección de alertas de F15).  
3. Capa de persistencia: encargada del acceso a los datos y la ejecución de consultas separada en Queries y Commands.

## Justificación

* **Simplicidad y bajo costo:** al ser un estilo muy común, simplifica el diseño de los servicios y permite comenzar la codificación de forma clara.  
* **Aislamiento de cambios:** el concepto de capas de aislamiento garantiza que los cambios en una capa no impacten a las capas superiores, siempre que las interfaces se mantengan.  
* **Testabilidad:** facilita las pruebas de unidad y de integración al permitir simular el comportamiento de capas inferiores durante el proceso de validación exigido en R5.

## Estado

**Reemplazado** (reemplazado por [ADR 012: adopción de Clean Architecture](./012-clean-architecture.md))

## Consecuencias

* **Positivas:**   
  * Estructura altamente organizada, fácil de entender para nuevos integrantes y con una clara asignación de responsabilidades de trabajo.  
  * El rendimiento si bien puede verse impactado ligeramente por la latencia de comunicación entre capas, es aceptable dentro de los márgenes de \<300 ms establecidos en el requisito R2.  
* **Negativas:**   
  * Existe el riesgo de caer en capas intermedias que actúan como pasamanos de datos sin aplicar lógica, afectando levemente el rendimiento por la instalación innecesaria de objetos.