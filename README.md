# KoTZ — Fix galería + tienda

Cambios:
- Galería: eliminar fotos guardadas en Google Sheets/Drive funciona.
- Galería: acepta URL o archivo, y queda más estable al cargar imágenes.
- Galería: categoría como desplegable con más opciones.
- Tienda Alto Mando: permite seleccionar imagen desde el ordenador además de URL.
- Tienda: si subes imagen desde archivo, Apps Script la guarda en Drive y usa el thumbnail.

Archivos a copiar:
- server.js
- server/googleStorage.js
- js/panel.js
- js/site.js
- js/data.js
- apps-script-Code.gs

IMPORTANTE:
En Apps Script, reemplaza Code.gs entero por apps-script-Code.gs y cambia:
SECRET: "PON_AQUI_EL_MISMO_SECRET_DE_RENDER"
por el mismo valor de GOOGLE_APPS_SCRIPT_SECRET de Render.
Luego despliega una NUEVA versión.
