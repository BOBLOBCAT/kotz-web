# KoTZ - Fix galería estable

Archivos incluidos:
- server.js
- js/site.js
- js/panel.js
- js/data.js
- apps-script-Code.gs

Qué arregla:
- Al borrar fotos, se eliminan/ocultan al instante y se evita que reaparezcan como tarjetas sin imagen.
- Apps Script deja de devolver filas cuyo archivo de Drive está en la papelera o no existe.
- La galería pública ya no mezcla ejemplos fijos cuando Google Drive ya cargó.
- La galería pública muestra estado de carga si entras directamente a /#/galeria.
- Más categorías en el desplegable del panel.

Pasos:
1. Copiar archivos al proyecto local.
2. Reemplazar Code.gs en Apps Script con apps-script-Code.gs y poner el SECRET real.
3. Guardar y desplegar nueva versión del Apps Script.
4. git add -A, commit, push.
5. Render: Manual Deploy -> Deploy latest commit.
