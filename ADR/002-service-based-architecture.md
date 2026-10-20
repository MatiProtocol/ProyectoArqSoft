# ADR 002: Estilo arquitectónico Service-Based Architecture

Identificamos los siguientes aspectos que influyen en la decisión:

* **Aislamiento de fallas (R7):** los grupos funcionales críticos (F2 al F6, el F19 y del F13 al F15) no se deben ver afectados por fallos en otras partes del sistema.   
* **Rendimiento estricto (R1, R2, R3):** se requieren tiempos de respuesta bajos, <300ms para consultas, <600ms en reservas de veinte mejores clientes y <500ms para listados con cargas máximas. La carga máxima implica 100 reservas por minuto y 50 conductores enviando GPS simultáneamente.  
* **Escalabilidad ante picos de carga (R8):** el sistema debe soportar incrementos de carga de hasta 50x en períodos de alta demanda.  
* **Restricciones organizacionales:** el equipo está compuesto por 3 desarrolladores con una fecha de entrega fijo.

## Decisión
Utilizaremos el estilo Service-Based Architecture (SBA). El sistema se dividirá en servicios independientes separados por particionamiento por dominio, de esta forma tendríamos servicios como por ejemplo: servicio de identidad y acceso o servicio de reservas y ventas. De esta forma nos aseguramos de reducir el acoplamiento ya que solo se realizan las comunicaciones estrictamente necesarias, también se mejora la cohesión ya que cada servicio cumple una única función. Todos los servicios que lo requieran, se comunicarán con una única base de datos compartida. La estructura de la base de datos y especificaciones de cómo se comunica con los servicios está detallada en los ADR 001, 003 y 004. 

### Justificación

La elección de este estilo arquitectónico se fundamenta en los siguientes atributos de calidad, vinculándolos directamente con los requerimientos del obligatorio:

* **Disponibilidad:** SBA se destaca por su alta capacidad de aislamiento de fallas (4 estrellas en este atributo). Al ser unidades de despliegue independientes, un error en un servicio no crítico no derriba toda la aplicación. Esto cumple con la restricción del R7, permitiendo que los servicios críticos (como el monitoreo de GPS o la pasarela de pagos) sigan operativos aunque fallen otros módulos del sistema.  
* **Performance:** en este aspecto tiene 3 estrellas, una ganancia considerable en comparación con estilos monolíticos. Con esto podemos cumplir con los requerimientos R1, R2, R3, R8 ya que permite que procesos lógicos vinculados trabajen dentro de un mismo despliegue, con esto se evita la penalización de latencia de comunicaciones por la red.  
* **Modificabilidad (Escalabilidad):** permite escalar de forma independiente solo aquellos servicios que realmente lo necesitan. Esto es clave para el requerimiento de recepción de GPS (F14), el cual debe soportar picos de carga de 50x según el R8. Por ejemplo, en el caso que sea necesario se podrá instanciar múltiples réplicas de un servicio específico junto a un balanceador de carga, sin necesidad de replicar la infraestructura de todo el sistema.  
* **Restricciones de equipo:** debido a que el equipo es de solo 3 estudiantes y el tiempo es limitado, este estilo nos permite obtener los beneficios de las divisiones de servicios sin la complejidad de los microservicios.  
* **Testeabilidad y desplegabilidad**: este estilo califica ambas con 4 estrellas. De esta forma podemos cumplir con el R5 (pruebas y simulaciones) al permitir aislar dominios, y con el R9 (Docker), ya que los servicios independientes son ideales para contenedores, reduciendo el riesgo de despliegue.

## Estado

Aceptado

### Consecuencias

* Positivas:  
  * Disponibilidad: permite manejar las fallas del sistema de tal forma que los componentes críticos sigan funcionando  
  * Performance: mejora los tiempos de respuesta general de la aplicación  
  * Agilidad de desarrollo: los 3 desarrolladores pueden trabajar en dominios separados disminuyendo el acoplamiento  
* Negativas:  
  * Latencia de red: aunque la latencia es menor que en microservicios, al tener que comunicar las distintas partes se genera un retraso que otras estructuras como la monolítica no tienen.