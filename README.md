# KoTZ Diplomacia V2 - fix acceso alianzas

Este parche corrige el bucle de "Verificando acceso..." en `user.html#/alianzas`.

Cambios:
- `/api/alliances` se pide también al iniciar la web tras cargar la sesión.
- Si la ruta protegida se renderiza mientras ya hay una petición en curso, se agenda un repintado.
- El repintado de alianzas se hace en `finally`, después de bajar `alliancesLoading=false`.
- La petición usa `cache:'no-store'` y `?ts=` para evitar caché vieja.

Copiar:
- `js/site.js`

Luego subir a GitHub y hacer `Manual Deploy -> Deploy latest commit` en Render.
