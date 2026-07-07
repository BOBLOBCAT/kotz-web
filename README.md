# KoTZ — Diplomacy V2 + Gallery URL Fix

Archivos incluidos:

- `js/site.js`
- `assets/styles.css`

Cambios principales:

- Rediseño completo de `#/alianzas` como centro diplomático interno.
- Mapa visual tipo radar con KoTZ en el centro y aliados alrededor.
- Tarjetas con colores reales de cada alianza, glow, tags y botón de expediente.
- Expedientes individuales más visuales: hero propio, ficha rápida, métricas, panel lateral, tarjetas de protocolo, nota interna y navegación a otras alianzas.
- `#/estado` usa la misma estética V2.
- Arreglo de galería: evita comillas rotas dentro de `background-image: url(...)` para que los thumbnails de Google Drive no se queden negros.

No toca Apps Script, `.env`, variables de Render ni base de datos.
