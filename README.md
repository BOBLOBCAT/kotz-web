# KoTZ · Kings of The Zone

Web oficial de **KoTZ - Kings of The Zone** preparada para:

- Sitio público.
- Panel de usuario.
- Panel Alto Mando.
- Login con Discord OAuth2.
- Control de acceso por roles de Discord.
- Registro de cuotas desde el panel de usuario.
- Revisión, aprobación y rechazo de cuotas desde el Panel Alto Mando.

---

## Estructura

```txt
index.html          Web pública
user.html           Panel Usuario, protegido con Discord
panel.html          Panel Alto Mando, protegido con Discord y roles admin
login.html          Pantalla de login con Discord
access-denied.html  Pantalla de acceso denegado
server.js           Backend Node/Express con OAuth2
server-data.json    Base de datos simple en JSON para cuotas
.env.example        Plantilla de configuración
assets/             Imágenes y estilos
js/                 Lógica del sitio y panel
```

---

## Cómo funciona el login con Discord

1. El usuario pulsa **Panel Usuario** o **Acceso Alto Mando**.
2. Si no ha iniciado sesión, la web lo manda a Discord.
3. Discord devuelve su identidad.
4. El backend comprueba sus roles dentro del servidor KoTZ.
5. Según sus roles:

```txt
Owner / Co-Owner / Capitán / roles admin -> Panel Alto Mando
Teniente / Sargento / Soldado / Asociado / Miembro / Recluta / Pendiente -> Panel Usuario
Sin rol válido o fuera del servidor -> Acceso denegado
```

El `client_secret` y los IDs sensibles se guardan en `.env`, nunca en el frontend.

---

## Instalación local

Necesitas Node.js 18 o superior.

```bash
npm install
cp .env.example .env
npm start
```

Luego abre:

```txt
http://localhost:3000
```

---

## Crear la aplicación de Discord

En Discord Developer Portal:

1. Crea una aplicación nueva.
2. En **OAuth2**, copia el `Client ID` y el `Client Secret`.
3. En **Redirects**, añade:

```txt
http://localhost:3000/auth/discord/callback
```

4. Cuando tengas la web subida a un hosting, añade también la URL real, por ejemplo:

```txt
https://tu-web.onrender.com/auth/discord/callback
```

---

## Configurar `.env`

Copia `.env.example` a `.env` y rellena:

```env
DISCORD_CLIENT_ID=TU_CLIENT_ID_DE_DISCORD
DISCORD_CLIENT_SECRET=TU_CLIENT_SECRET_DE_DISCORD
DISCORD_GUILD_ID=ID_DEL_SERVIDOR_DE_KOTZ
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
SESSION_SECRET=cambia_esto_por_una_clave_larga_y_segura
```

Roles de Alto Mando:

```env
DISCORD_OWNER_ROLE_ID=ID_ROL_OWNER
DISCORD_CO_OWNER_ROLE_ID=ID_ROL_CO_OWNER
DISCORD_CAPITAN_ROLE_ID=ID_ROL_CAPITAN
DISCORD_ADMIN_ROLE_IDS=
```

Roles de usuario normal:

```env
DISCORD_TENIENTE_ROLE_ID=ID_ROL_TENIENTE
DISCORD_SARGENTO_ROLE_ID=ID_ROL_SARGENTO
DISCORD_SOLDADO_ROLE_ID=ID_ROL_SOLDADO
DISCORD_ASOCIADO_ROLE_ID=ID_ROL_ASOCIADO
DISCORD_RECLUTA_ROLE_ID=ID_ROL_RECLUTA
DISCORD_MIEMBRO_ROLE_ID=ID_ROL_MIEMBRO
DISCORD_PENDIENTE_ROLE_ID=ID_ROL_PENDIENTE
DISCORD_USER_ROLE_IDS=
```

También puedes poner varios roles separados por coma:

```env
DISCORD_ADMIN_ROLE_IDS=111111111111111111,222222222222222222
DISCORD_USER_ROLE_IDS=333333333333333333,444444444444444444
```

---

## Cómo sacar IDs de roles en Discord

1. Activa el modo desarrollador en Discord.
2. Ve a Ajustes de usuario > Avanzado > Modo desarrollador.
3. En tu servidor, clic derecho sobre un rol.
4. Copiar ID.
5. Pegar el ID en `.env`.

Usa IDs, no nombres, porque los nombres de roles pueden cambiar.

---

## Cuotas

El panel de usuario permite enviar cuotas con este formato:

```txt
Nombre: Tu nombre de Roleplay
Servidor: Servidor donde realizaste el depósito
Fecha: Hora - Día/Mes
Captura: Imagen donde se vea claramente el depósito realizado
```

Cuando se ejecuta con `server.js`, las cuotas se guardan en `server-data.json` y el Alto Mando puede verlas desde el panel.

---

## GitHub

Sube el proyecto a GitHub, pero **no subas `.env`**.

Sí se sube:

```txt
server.js
package.json
.env.example
index.html
user.html
panel.html
assets/
js/
README.md
```

No se sube:

```txt
.env
node_modules/
```

---

## GitHub Pages

GitHub Pages puede mostrar una web estática, pero **no puede ejecutar `server.js`**.

Para que funcione el login con Discord necesitas un hosting con Node.js, por ejemplo:

- Render
- Railway
- VPS
- otro hosting compatible con Node.js

---

## Seguridad

Esta versión ya es mucho más segura que una contraseña compartida porque:

- El `client_secret` queda en el servidor.
- El acceso se decide por roles reales de Discord.
- El Panel Alto Mando está protegido en backend.
- Las cookies son `httpOnly`.

Para producción, cambia siempre:

```env
SESSION_SECRET
```

por una cadena larga y privada.

---

## Actualización: Google Sheets + Google Drive

Esta versión puede guardar datos en Google:

```txt
Google Sheets → datos estructurados
Google Drive → capturas de cuotas y fotos de galería
```

### Qué se guarda ahora en Google

- Cuotas enviadas desde el Panel Usuario.
- Capturas de las cuotas en una carpeta de Drive.
- Galería subida desde el Panel Alto Mando.
- Fotos de galería en una carpeta de Drive.
- Registros de galería en Google Sheets.

También se preparan pestañas para:

```txt
members
sanctions
wars
events
```

Estas pestañas quedan listas para futuras ampliaciones.

### Estructura recomendada en Google Drive

Crea una carpeta principal:

```txt
KoTZ Web
```

Dentro crea:

```txt
Capturas de cuotas
Galería oficial
Backups
```

Crea también un Google Sheet llamado:

```txt
KoTZ Database
```

El código creará automáticamente estas pestañas si no existen:

```txt
dues
gallery
members
sanctions
wars
events
```

### Cómo conectar Google

Necesitas una Service Account de Google Cloud.

Pasos generales:

1. En Google Cloud crea un proyecto.
2. Activa estas APIs:
   - Google Sheets API
   - Google Drive API
3. Crea una Service Account.
4. Crea una clave JSON para esa Service Account.
5. Copia del JSON:
   - `client_email`
   - `private_key`
6. Comparte el Google Sheet y las carpetas de Drive con el email de la Service Account como editor.
7. Copia los IDs del Sheet y carpetas al `.env`.

### Variables nuevas del `.env`

```env
GOOGLE_CLIENT_EMAIL=TU_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=ID_DEL_GOOGLE_SHEET_KOTZ_DATABASE

GOOGLE_DRIVE_QUOTAS_FOLDER_ID=ID_CARPETA_CAPTURAS_CUOTAS
GOOGLE_DRIVE_GALLERY_FOLDER_ID=ID_CARPETA_GALERIA_OFICIAL
GOOGLE_DRIVE_BACKUPS_FOLDER_ID=ID_CARPETA_BACKUPS

GOOGLE_SHEET_DUES_TAB=dues
GOOGLE_SHEET_GALLERY_TAB=gallery
GOOGLE_SHEET_MEMBERS_TAB=members
GOOGLE_SHEET_SANCTIONS_TAB=sanctions
GOOGLE_SHEET_WARS_TAB=wars
GOOGLE_SHEET_EVENTS_TAB=events
```

### Cómo probar si Google está conectado

Con la web arrancada, abre:

```txt
http://localhost:3000/api/storage/status
```

Para crear/preparar pestañas automáticamente:

```txt
http://localhost:3000/api/storage/status?setup=1
```

Si está bien configurado, `enabled` saldrá como `true`.

### Si Google no está configurado

La web no se rompe. Usa `server-data.json` como respaldo para cuotas y `localStorage` como respaldo para galería.

Pero para que funcione de verdad entre todos los usuarios, configura Google Sheets + Drive.

---

## Corrección — cuotas no se guardaban en Google (Julio 2026)

**Síntoma:** al enviar una cuota desde `user.html`, la web mostraba
*"Cuota guardada en este navegador..."* aunque `/api/storage/status` decía
que Google estaba bien configurado.

**Causa real:** el frontend (`js/site.js`) trataba CUALQUIER fallo de
`/api/dues` (incluido un error 500 real de Google) igual que "no hay
servidor", y caía en `localStorage` sin mostrar el error de verdad.

**Qué se cambió:**

1. `js/site.js` y `js/panel.js` ahora distinguen dos casos:
   - El `fetch` lanza una excepción de red (no hay servidor Node al que
     hablarle) → ahí sí se usa el respaldo local, avisando claramente.
   - El servidor responde pero con error (Google falló) → se muestra el
     **error real** devuelto por el backend. Nunca se finge éxito.
2. `server.js` ahora tiene un manejador de errores para peticiones mal
   formadas o demasiado grandes (antes esto devolvía HTML y rompía el
   `fetch().json()` del cliente), y loguea contexto detallado (sin
   secretos) en cada fallo.
3. `server/googleStorage.js`:
   - `normalizePrivateKey` ahora también quita comillas envolventes y
     espacios sobrantes, además de convertir `\n` literales.
   - Nueva `friendlyGoogleError()`: traduce errores típicos de Google
     (permisos, carpeta no encontrada, clave inválida, rate limit) a
     mensajes claros en español.
   - `parseDataUrl` valida que el buffer decodificado no esté vacío/corrupto
     y limita el tamaño máximo tras decodificar (8MB).
   - Los archivos subidos a Drive ahora tienen nombre legible:
     `cuota_Roger_2026-07-04_1820.jpg`.
   - **La pestaña `dues` cambia de columnas** a exactamente:
     `id, createdAt, discordId, discordUsername, discordDisplayName, memberId, memberName, server, date, amount, driveFileId, driveFileUrl, status, comment, reviewedBy, reviewedAt`.

     ⚠️ **Si ya tenías la pestaña `dues` creada en tu Google Sheet con el
     orden de columnas anterior**, bórrala (o renómbrala) antes de volver a
     probar — el servidor la recreará automáticamente con las columnas
     correctas la primera vez que se guarde una cuota o se visite
     `/api/storage/status?setup=1`. Si no la borras, las columnas del
     encabezado se actualizarán solas, pero las filas antiguas (si las hay)
     quedarán desalineadas.

**Cómo comprobar que ya funciona:**

1. Reinicia el servidor (`npm start`) para que cargue el código nuevo.
2. Si ves en la consola del servidor un aviso sobre `GOOGLE_PRIVATE_KEY`,
   revisa esa variable en tu `.env` (probablemente le faltan los `\n` o
   tiene comillas de más).
3. Entra a `user.html` → Cuotas → envía una cuota de prueba.
   - Si todo va bien: verás *"Cuota enviada correctamente al Panel Alto
     Mando"* y aparecerá en tu Google Sheet + la imagen en Drive con nombre
     `cuota_...`.
   - Si algo falla, ahora verás el motivo exacto en rojo en el propio
     formulario (por ejemplo, permisos de la carpeta de Drive) en vez del
     mensaje genérico de antes.



## Actualización Apps Script

Esta versión usa Google Apps Script para guardar cuotas en Google Drive y Google Sheets usando tu cuenta de Google.

Variables nuevas necesarias en `.env`:

```env
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXX/exec
GOOGLE_APPS_SCRIPT_SECRET=la_misma_clave_que_pusiste_en_el_script
```

En este modo ya no hacen falta para guardar cuotas:

```env
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

Puedes dejarlas vacías o borrarlas del `.env` después de comprobar que Apps Script funciona.


## Fix galería con Apps Script

Para que la galería se actualice desde Google Drive, reemplaza el contenido de `Code.gs` en Google Apps Script por el archivo `apps-script-Code.gs` incluido en este ZIP.

Después vuelve a desplegar Apps Script:

1. Implementar > Gestionar implementaciones.
2. Editar implementación.
3. Nueva versión.
4. Implementar.

Luego reinicia Node:

```powershell
Ctrl + C
npm.cmd start
```

La galería se lee desde:

- La pestaña `gallery` de Google Sheets.
- Las imágenes que estén directamente dentro de la carpeta `Galería oficial` de Drive.

Si subes una imagen manualmente a Drive, la web la mostrará como categoría `Galería oficial`.

## Miembros desde Google Sheets

La lista de miembros ya no debe editarse desde `js/data.js`. Ahora el Panel Alto Mando puede leer y actualizar la pestaña `members` de Google Sheets mediante Apps Script.

Crea o revisa la pestaña `members` con estas columnas exactas:

```txt
id | rpName | discordUsername | discordId | rank | joinDate | status | profileUrl | notes
```

Ejemplo:

```txt
m1 | Roger | boblobcat8489 | 948660846060507176 | Owner | 2026-06-01 | Activo | | Fundador de KoTZ
```

Notas importantes:

- `discordId` es lo más seguro para vincular cada cuenta con su perfil.
- `discordUsername` sirve como respaldo si todavía no tienes el ID.
- El Panel Usuario ya no debería dejar elegir libremente un nombre RP: toma el perfil desde `members` según la cuenta de Discord iniciada.
- El Panel Alto Mando puede cambiar `rank`, `status` y `notes`; esos cambios se guardan en Google Sheets.

Después de pegar el nuevo `apps-script-Code.gs`, vuelve a desplegar Apps Script como nueva versión.
