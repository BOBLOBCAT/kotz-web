/* ==========================================================================
   KoTZ — Discord OAuth backend
   --------------------------------------------------------------------------
   Ejecutar con: npm install && npm start
   Configurar .env usando .env.example.
   ========================================================================== */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const googleStorage = require('./server/googleStorage');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DB_PATH = path.join(__dirname, 'server-data.json');
const DISCORD_API = 'https://discord.com/api/v10';

function readDb(){
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ dues: [] }, null, 2));
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return { dues: [] }; }
}
function writeDb(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }
function envList(name){ return String(process.env[name] || '').split(',').map(v => v.trim()).filter(Boolean); }

const roleConfig = {
  admin: [
    process.env.DISCORD_OWNER_ROLE_ID,
    process.env.DISCORD_CO_OWNER_ROLE_ID,
    process.env.DISCORD_CAPITAN_ROLE_ID,
    ...envList('DISCORD_ADMIN_ROLE_IDS')
  ].filter(Boolean),
  user: [
    process.env.DISCORD_TENIENTE_ROLE_ID,
    process.env.DISCORD_SARGENTO_ROLE_ID,
    process.env.DISCORD_SOLDADO_ROLE_ID,
    process.env.DISCORD_ASOCIADO_ROLE_ID,
    process.env.DISCORD_RECLUTA_ROLE_ID,
    process.env.DISCORD_MIEMBRO_ROLE_ID,
    process.env.DISCORD_PENDIENTE_ROLE_ID,
    ...envList('DISCORD_USER_ROLE_IDS')
  ].filter(Boolean)
};

function hasAnyRole(userRoles = [], allowed = []){ return allowed.some(roleId => userRoles.includes(roleId)); }
function getAccessLevel(roles = []){
  if (hasAnyRole(roles, roleConfig.admin)) return 'alto-mando';
  if (hasAnyRole(roles, roleConfig.user)) return 'usuario';
  return 'denegado';
}
function requireDiscordConfig(){
  return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET && process.env.DISCORD_GUILD_ID);
}
function getRedirectUri(req){
  return process.env.DISCORD_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/discord/callback`;
}

app.set('trust proxy', 1);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Si el body viene mal formado o supera el límite, Express lanza un error
// ANTES de llegar a nuestras rutas. Sin este handler, el cliente recibe HTML
// en vez de JSON y el fetch del frontend no puede leer el motivo real.
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.type === 'entity.parse.failed' || err.status === 413)) {
    console.error('[KoTZ] Petición rechazada por body-parser:', err.type || err.message);
    return res.status(413).json({ ok:false, error: 'La imagen enviada es demasiado grande o la petición está mal formada. Prueba con una captura más pequeña.' });
  }
  return next(err);
});

if (googleStorage.configured() && !googleStorage.hasValidPrivateKeyFormat()) {
  console.warn('[KoTZ] Aviso: GOOGLE_PRIVATE_KEY está definida pero no tiene formato PEM válido (revisa los saltos de línea \\n en el .env). Las cuotas fallarán al guardar en Google.');
}

app.use(session({
  name: 'kotz.sid',
  secret: process.env.SESSION_SECRET || 'CAMBIA_ESTA_CLAVE_EN_PRODUCCION_KOTZ',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

function requireLogin(req, res, next){
  if (req.session?.user) return next();
  return res.redirect(`/login.html?next=${encodeURIComponent(req.originalUrl || '/user.html')}`);
}
function requireUserOrAdmin(req, res, next){
  if (!req.session?.user) return requireLogin(req, res, next);
  if (['usuario', 'alto-mando'].includes(req.session.accessLevel)) return next();
  return res.status(403).sendFile(path.join(PUBLIC_DIR, 'access-denied.html'));
}
function requireAdmin(req, res, next){
  if (!req.session?.user) return requireLogin(req, res, next);
  if (req.session.accessLevel === 'alto-mando') return next();
  return res.status(403).sendFile(path.join(PUBLIC_DIR, 'access-denied.html'));
}

app.get('/auth/discord', (req, res) => {
  if (!requireDiscordConfig()) return res.redirect('/login.html?setup=1');
  const next = String(req.query.next || '/user.html');
  const state = crypto.randomBytes(24).toString('hex');
  req.session.oauthState = state;
  req.session.nextAfterLogin = next.startsWith('/') ? next : '/user.html';
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: getRedirectUri(req),
    response_type: 'code',
    scope: 'identify guilds.members.read',
    state
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get('/auth/discord/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.oauthState) return res.status(400).send('Estado OAuth inválido. Vuelve a iniciar sesión.');
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: getRedirectUri(req)
      })
    });
    if (!tokenRes.ok) throw new Error(`No se pudo obtener token de Discord (${tokenRes.status})`);
    const token = await tokenRes.json();

    const userRes = await fetch(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!userRes.ok) throw new Error(`No se pudo leer el usuario de Discord (${userRes.status})`);
    const user = await userRes.json();

    const memberRes = await fetch(`${DISCORD_API}/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    if (!memberRes.ok) {
      req.session.user = { id:user.id, username:user.username, globalName:user.global_name, avatar:user.avatar };
      req.session.roles = [];
      req.session.accessLevel = 'denegado';
      return res.redirect('/access-denied.html?reason=not-member');
    }
    const member = await memberRes.json();
    const roles = member.roles || [];
    const accessLevel = getAccessLevel(roles);
    req.session.user = {
      id: user.id,
      username: user.username,
      globalName: user.global_name,
      avatar: user.avatar,
      displayName: member.nick || user.global_name || user.username
    };
    req.session.roles = roles;
    req.session.accessLevel = accessLevel;
    delete req.session.oauthState;

    const next = req.session.nextAfterLogin || (accessLevel === 'alto-mando' ? '/panel.html' : '/user.html');
    delete req.session.nextAfterLogin;
    if (accessLevel === 'denegado') return res.redirect('/access-denied.html?reason=no-valid-role');
    if (next.includes('panel') && accessLevel !== 'alto-mando') return res.redirect('/user.html?denied=alto-mando');
    return res.redirect(next);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error iniciando sesión con Discord. Revisa variables .env y logs del servidor.');
  }
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    loggedIn: Boolean(req.session?.user),
    user: req.session?.user || null,
    accessLevel: req.session?.accessLevel || null,
    roles: req.session?.roles || []
  });
});
app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok:true })));
app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/index.html')));


app.get('/api/storage/status', async (req, res) => {
  try {
    if (req.query.setup === '1' && googleStorage.configured()) await googleStorage.ensureBaseTabs();
    res.json({ ok:true, google: googleStorage.status() });
  } catch(err){
    console.error(err);
    res.status(500).json({ ok:false, error:err.message || 'Error revisando Google Storage.' });
  }
});

app.get('/api/dues', requireUserOrAdmin, async (req, res) => {
  try {
    if (googleStorage.configured()) return res.json({ dues: await googleStorage.listDues(), storage:'google' });
    return res.json({ dues: readDb().dues || [], storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error leyendo cuotas:', '\n', err?.stack || err?.message || err);
    const friendly = googleStorage.configured() ? googleStorage.friendlyGoogleError(err) : 'No se pudieron leer las cuotas.';
    return res.status(502).json({ ok:false, error: friendly });
  }
});

app.post('/api/dues', requireUserOrAdmin, async (req, res) => {
  const { memberId, memberName, server, date, amount, proofImage } = req.body || {};
  const context = { memberId, memberName, server, date, amount, hasProof: Boolean(proofImage), user: req.session.user?.username };

  if (!memberId || !memberName || !server || !date || !proofImage) {
    console.error('[KoTZ] POST /api/dues — faltan campos obligatorios:', { ...context, hasProof: Boolean(proofImage) });
    return res.status(400).json({ ok:false, error:'Faltan campos obligatorios (memberId, memberName, server, date o proofImage).' });
  }

  if (googleStorage.configured()){
    try {
      const due = await googleStorage.appendDue({ memberId, memberName, server, date, amount, proofImage }, req.session.user);
      return res.json({ ok:true, due, storage:'google' });
    } catch(err){
      // Log detallado en servidor (sin volcar el proofImage completo ni credenciales).
      console.error('[KoTZ] Error guardando cuota en Google:', context, '\n', err?.stack || err?.message || err);
      const friendly = googleStorage.friendlyGoogleError(err);
      return res.status(502).json({ ok:false, error: friendly, storage:'google' });
    }
  }

  // Google no está configurado en absoluto: aquí sí es correcto usar el
  // almacén local del servidor (server-data.json), NO localStorage del navegador.
  try {
    const db = readDb();
    const due = {
      id: 'due_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex'),
      memberId: String(memberId),
      memberName: String(memberName),
      server: String(server),
      date: String(date),
      amount: Number(amount || 300),
      proof: 'Captura adjunta',
      proofImage: String(proofImage),
      status: 'pending',
      comment: '',
      source: 'server',
      createdAt: new Date().toISOString(),
      submittedBy: req.session.user
    };
    db.dues = db.dues || [];
    db.dues.unshift(due);
    writeDb(db);
    return res.json({ ok:true, due, storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error guardando cuota en server-data.json:', context, '\n', err?.stack || err?.message || err);
    return res.status(500).json({ ok:false, error: 'No se pudo guardar la cuota en el servidor.' });
  }
});

app.patch('/api/dues/:id/status', requireAdmin, async (req, res) => {
  const { status, comment } = req.body || {};
  if (!['approved','rejected','pending'].includes(status)) return res.status(400).json({ ok:false, error:'Estado inválido.' });

  if (googleStorage.configured()){
    try {
      const due = await googleStorage.updateDueStatus(req.params.id, status, comment, req.session.user);
      if (!due) return res.status(404).json({ ok:false, error:'Cuota no encontrada.' });
      return res.json({ ok:true, due, storage:'google' });
    } catch(err){
      console.error('[KoTZ] Error actualizando estado de cuota en Google:', req.params.id, status, '\n', err?.stack || err?.message || err);
      return res.status(502).json({ ok:false, error: googleStorage.friendlyGoogleError(err), storage:'google' });
    }
  }

  try {
    const db = readDb();
    const due = (db.dues || []).find(d => d.id === req.params.id);
    if (!due) return res.status(404).json({ ok:false, error:'Cuota no encontrada.' });
    due.status = status;
    due.comment = comment || due.comment || '';
    due.reviewedAt = new Date().toISOString();
    due.reviewedBy = req.session.user;
    writeDb(db);
    return res.json({ ok:true, due, storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error actualizando estado de cuota en server-data.json:', req.params.id, '\n', err?.stack || err?.message || err);
    return res.status(500).json({ ok:false, error:'No se pudo actualizar la cuota.' });
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    if (googleStorage.configured()) return res.json({ items: await googleStorage.listGallery(), storage:'google' });
    return res.json({ items: [], storage:'json' });
  } catch(err){
    console.error(err);
    return res.status(500).json({ ok:false, error:'No se pudo leer la galería de Google.' });
  }
});

app.post('/api/gallery', requireAdmin, async (req, res) => {
  try {
    const { title, category, imageData, imageUrl, tone } = req.body || {};
    if (!title || !category || (!imageData && !imageUrl)) return res.status(400).json({ ok:false, error:'Faltan campos de galería.' });
    if (!googleStorage.configured()) return res.status(501).json({ ok:false, error:'Google Storage no está configurado.' });
    const item = await googleStorage.appendGallery({ title, category, imageData, imageUrl, tone }, req.session.user);
    return res.json({ ok:true, item, storage:'google' });
  } catch(err){
    console.error(err);
    return res.status(500).json({ ok:false, error:err.message || 'No se pudo guardar la foto en Google Drive.' });
  }
});

app.delete('/api/gallery/:id', requireAdmin, async (req, res) => {
  try {
    if (!googleStorage.configured()) return res.status(501).json({ ok:false, error:'Google Storage no está configurado.' });
    const ok = await googleStorage.deleteGallery(req.params.id);
    if (!ok) return res.status(404).json({ ok:false, error:'Foto no encontrada.' });
    return res.json({ ok:true });
  } catch(err){
    console.error(err);
    return res.status(500).json({ ok:false, error:'No se pudo borrar la foto.' });
  }
});

async function streamGoogleFile(req, res, fileId){
  try {
    if (!googleStorage.configured()) return res.status(404).send('Google Drive no configurado.');
    const file = await googleStorage.getDriveFile(fileId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    file.stream.on('error', err => {
      console.error(err);
      if (!res.headersSent) res.status(500).end('Error leyendo archivo de Drive.');
    });
    file.stream.pipe(res);
  } catch(err){
    console.error(err);
    return res.status(404).send('Archivo no encontrado en Google Drive.');
  }
}

app.get('/api/files/proof/:fileId', requireAdmin, (req, res) => streamGoogleFile(req, res, req.params.fileId));
app.get('/api/files/gallery/:fileId', (req, res) => streamGoogleFile(req, res, req.params.fileId));

app.get('/user.html', requireUserOrAdmin, (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'user.html')));
app.get('/panel.html', requireAdmin, (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'panel.html')));
app.use(express.static(PUBLIC_DIR, { extensions:['html'] }));

// Red de seguridad final: cualquier error no controlado explícitamente en una
// ruta llega aquí. Siempre respondemos JSON (nunca HTML) y sin secretos.
app.use((err, req, res, next) => {
  console.error('[KoTZ] Error no controlado en', req.method, req.path, '-', err?.message);
  if (res.headersSent) return next(err);
  res.status(err?.status || 500).json({ ok:false, error: 'Error interno del servidor.' });
});

app.listen(PORT, () => console.log(`KoTZ web lista en http://localhost:${PORT}`));
