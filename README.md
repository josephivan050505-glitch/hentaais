# Hentai Vault 

Un organizador de enlaces local y privado con una interfaz elegante, hermosa y minimalista. Diseñado para recopilar, calificar y clasificar contenido de manera eficiente.

Características

- **Diseño Ultra-Minimalista**: Fondo oscuro sofisticado con micro-acentos violetas y bordes translúcidos sumamente finos.
- **Hero Banner Inteligente**: Muestra de forma destacada tu título de 5 estrellas más reciente en la cabecera, con su sinopsis, tags y acceso rápido.
- **Pestañas de Categoría**: Navegación horizontal fluida para filtrar contenido al instante.
- **Búsqueda Avanzada**: Filtrado por título, notas o tags en tiempo real desde la barra de búsqueda.
- **Efectos Hover**: Zoom suave en portadas y aparición de un overlay de reproducción (▶).
- **Notificaciones Flotantes (Toasts)**: Avisos de guardado, actualización o errores sin alertas intrusivas.
- **Persistencia en LocalStorage**: Todos tus enlaces se guardan de forma privada en tu navegador.
- **Importación y Exportación JSON**: Realiza copias de seguridad de toda tu base de datos y llévatela a cualquier dispositivo con un par de clics.
Instalación y Ejecución

Dado que es una aplicación web estática pura (HTML, CSS y JS vanila), no requiere de compilación ni bases de datos en servidor.

Opción 1: Abrir localmente
Simplemente descarga el repositorio y haz doble clic sobre el archivo `index.html` para abrirlo en tu navegador.

Opción 2: Servidor local de desarrollo
Si deseas correrlo a través de un servidor web local:
```bash
python3 -m http.server 8000
```
Luego abre [http://localhost:8000](http://localhost:8000) en tu navegador.

📂Estructura del Proyecto

- `index.html`: Estructura semántica de la aplicación y modales.
- `styles.css`: Hoja de estilos con el sistema de diseño minimalista responsivo.
- `app.js`: Lógica del estado de datos (localStorage), filtros, estadísticas e importación/exportación.
- `README.md`: Documentación del proyecto.
