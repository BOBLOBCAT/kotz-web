# KoTZ Tienda RP Fix

Añade tienda RP configurable con Google Sheets:

- shop_items
- shop_orders
- shop_offers

Archivos a copiar encima del proyecto:

- server.js
- server/googleStorage.js
- js/data.js
- js/panel.js
- js/site.js
- user.html
- apps-script-Code.gs

Después:

1. Reemplazar Code.gs de Apps Script con apps-script-Code.gs.
2. Cambiar SECRET por el secret real actual.
3. Guardar.
4. Implementar > Gestionar implementaciones > Editar > Nueva versión > Implementar.
5. En local/GitHub:
   git add server.js server/googleStorage.js js/data.js js/panel.js js/site.js user.html apps-script-Code.gs
   git commit -m "Añadir tienda RP KoTZ"
   git push
6. En Render: Manual Deploy > Deploy latest commit.
7. Abrir /api/storage/status?setup=1 para crear pestañas y datos iniciales.

Nota: tienda pensada para Roblox/PrisonRP/rol interno, no para ventas reales.
