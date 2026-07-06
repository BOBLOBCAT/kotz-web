# KoTZ - Alianzas internas protegidas

Cambios incluidos:
- `/api/alliances` protegido por sesión Discord y rol válido de KoTZ.
- `#/alianzas` ya no muestra información a visitantes sin login.
- `#/estado` también queda protegido porque incluye datos diplomáticos.
- Cada alianza es clicable y abre su expediente interno: `#/alianzas/rose-spines`, `#/alianzas/the-nato`, etc.
- Las descripciones largas quedan en `server.js`, no en `data.js` público.

Archivos a copiar:
- `server.js`
- `js/site.js`
- `js/data.js`

Después:
```powershell
git add server.js js/site.js js/data.js
git commit -m "Proteger alianzas y añadir expedientes"
git push
```

En Render: Manual Deploy -> Deploy latest commit.
