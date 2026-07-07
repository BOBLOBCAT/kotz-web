# KoTZ - Fix router alianzas

Arregla que al cambiar a `#/alianzas` la URL cambiara pero la vista siguiera en la sección anterior.

Causa: `pageAlliances()` llamaba a `normalizeText(...)`, pero esa función no existía en `js/site.js`. El render lanzaba un ReferenceError y el router no llegaba a reemplazar el HTML.

Cambios:
- Añadida función `normalizeText()` en `js/site.js`.
- Router protegido con try/catch para que futuras vistas rotas muestren un error en pantalla y no congelen la página anterior.
- Se mantiene Diplomacia V2 y el fix de galería.

Archivos:
- js/site.js
- assets/styles.css
