# ADR 013: categorización de la reserva con IA

Identificamos que el requerimiento R10 del obligatorio exige evaluar y comparar el uso de IA generativa para la funcionalidad F4.1 (Categorización MOVE para clientes particulares). Realizamos un experimento inicial ejecutando modelos locales de 2b y 4b parámetros utilizando LocalAI. Los resultados fueron negativos ya que los tiempos de procesamiento fueron muy altos o directamente no se obtiene una respuesta, además generaron una degradación crítica del hardware local, comprometiendo la disponibilidad del sistema completo. Ante esta restricción de recursos, surge la necesidad de buscar una alternativa de procesamiento externo. Investigamos también sobre búsqueda semántica, utilizando vectores sobre las categorías y descripciones cargadas desde el archivo CSV. Esta opción también tenía la posibilidad de correrlo local o por API externa, pero al ver como era su implementación encontramos que era mucho más complejo que implementar la IA con API externa por lo que terminó siendo descartada como opción.

## Decisión 

Utilizaremos un servicio de IA remoto basado en la API de Google Gemini 3.1 Flash-Lite integrado mediante el paquete oficial de npm @google/genai. De esta forma tercerizamos el procesamiento de lenguaje natural necesario para la categorización de bienes a una infraestructura de nube, en lugar de mantener una carga computacional intensiva en los servidores locales del sistema
  

## Justificación

La elección de una IA remota a través de API se fundamenta en los siguientes puntos técnicos y requerimientos del obligatorio:

- **Performance:** el requerimiento R1 establece que la clasificación para clientes particulares se debe de realizar en un rango de 5 a 10 segundos, y nuestros experimentos demostraron que el procesamiento local no cumplía. Al utilizar Gemini Flash-Lite, el tiempo de respuesta incluyendo el procesamiento y viajes por la red es de aproximadamente 1 segundo. La búsqueda semántica sería aún más rápida que nuestra situación actual, pero al ya estar bien dentro de los límites aceptables, no consideramos que tenga beneficios reales
- **Disponibilidad:** se exige que fallos en el sistema no afecten los componentes marcados como críticos, si se usara IA local pondríamos en riesgo a todo el sistema por el uso intensivo de recursos. Al hacerlo de forma remota, eliminamos este riesgo innecesario ya que evitamos caídas del sistema por falta de recursos. 
- **Simplicidad de desarrollo** con el experimento de modelos locales notamos que una alta complejidad operativa por las configuraciones iniciales y la gestión de recursos. En contraste, la solución de Google permite integrar la categorización en pocas líneas de código. Esto cumple directamente con el énfasis del requerimiento R10 en la "simplicidad del desarrollo". En cambio, la búsqueda semántica requeriría generar vectores para cada fila del CSV, almacenarlos correctamente, implementar un algoritmo de similitud y definir un umbral de confianza manual. Todo esto añade una capa de complejidad innecesaria para el beneficio obtenido.
- **Cambios en categoría**: si usamos IA generativa, este cambio implicaría únicamente cambiar el archivo subido al modelo, pero en búsqueda semántica esta modificación implica regenerar todos los vectores para indexar los nuevos datos. En este punto la IA es mejor que la opción de la búsqueda semántica.
- **Precisión**: la IA generativa entiende y puede clasificar descripciones ambiguas o incluso mal escritas, pero si utilizamos búsqueda semántica estos casos seguramente serían enviados a revisión manual por un operador. 

## Estado

Aceptado

## Consecuencias

- Positivas:
    - Escalabilidad: tenemos acceso a diversos modelos con diferentes capacidades de procesamiento que se podrían intercambiar fácilmente en caso de ser necesario.
    - Precisión: los modelos remotos de IA ofrecen una precisión de categorización superior a los modelos reducidos (2b/4b) probados localmente, cumpliendo mejor la funcionalidad F4.1. Esto también es mejor a la precisión que ofrecería la búsqueda semántica. 
- Negativas:
    - Dependencia externa: si la API de Google falla, la categorización automática se detiene, provocando que se delegue automáticamente a un operador mediante una notificación (F19).
    - Privacidad: los datos de las descripciones de los bienes de los clientes se envían a un tercero, lo que debe considerarse en el análisis de seguridad y privacidad del sistema.
    - Latencia de red: el sistema ahora depende de la estabilidad de la conexión a internet, si bien el procesamiento es rápido, la red no es 100% confiable.