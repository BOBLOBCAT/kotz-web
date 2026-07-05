/* ========================================================================== 
   KoTZ — Google Sheets + Drive storage
   --------------------------------------------------------------------------
   Sheets = datos / Drive = capturas y galería.
   Se activa solo si están configuradas las variables GOOGLE_* del .env.
   ========================================================================== */

const { google } = require('googleapis');
const { Readable } = require('stream');

const DUES_TAB = process.env.GOOGLE_SHEET_DUES_TAB || 'dues';
const GALLERY_TAB = process.env.GOOGLE_SHEET_GALLERY_TAB || 'gallery';

// Orden exacto pedido para la pestaña de cuotas.
const DUE_HEADERS = [
  'id', 'createdAt', 'discordId', 'discordUsername', 'discordDisplayName',
  'memberId', 'memberName', 'server', 'date', 'amount',
  'driveFileId', 'driveFileUrl', 'status', 'comment', 'reviewedBy', 'reviewedAt'
];

const GALLERY_HEADERS = [
  'id', 'createdAt', 'title', 'category', 'tone', 'driveFileId', 'imageUrl',
  'createdByDiscordId', 'createdByName', 'deletedAt'
];

let cachedClients = null;
let ensuredTabs = new Set();

function configured(){
  return Boolean(
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );
}

/**
 * Normaliza GOOGLE_PRIVATE_KEY viniendo de un .env.
 * Soporta los 3 formatos habituales que suelen romper la clave:
 *  - Con \n literales (dos caracteres) en vez de saltos de línea reales.
 *  - Envuelta accidentalmente en comillas simples o dobles.
 *  - Espacios/saltos de línea sobrantes al principio o al final.
 */
function normalizePrivateKey(key){
  let k = String(key || '').trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  k = k.replace(/\\n/g, '\n');
  return k;
}

/** Comprueba que la clave normalizada tiene pinta de PEM válido (sin exponer el contenido). */
function hasValidPrivateKeyFormat(){
  const k = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  return k.includes('-----BEGIN PRIVATE KEY-----') && k.includes('-----END PRIVATE KEY-----');
}

/**
 * Traduce errores típicos de la API de Google a mensajes claros en español,
 * sin filtrar nunca el contenido de las credenciales.
 */
function friendlyGoogleError(err){
  const raw = String(err?.response?.data?.error?.message || err?.message || err || '');
  const code = err?.response?.status || err?.code;

  if (/invalid_grant|error:0909006C|PEM routines|DECODER routines/i.test(raw)) {
    return 'La clave privada de Google (GOOGLE_PRIVATE_KEY) no es válida. Revisa que esté completa y que los saltos de línea (\\n) estén bien escritos en el .env.';
  }
  if (/invalid_client|unauthorized_client/i.test(raw)) {
    return 'GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY no corresponden a una cuenta de servicio válida.';
  }
  if (code === 404 || /File not found|Requested entity was not found/i.test(raw)) {
    return 'Google no encuentra la hoja o la carpeta de Drive indicada. Revisa GOOGLE_SHEET_ID / GOOGLE_DRIVE_QUOTAS_FOLDER_ID y que la carpeta exista.';
  }
  if (code === 403 || /permission|forbidden/i.test(raw)) {
    return 'El Service Account no tiene permiso sobre la hoja o la carpeta de Drive. Compártelas con el email de GOOGLE_CLIENT_EMAIL (como Editor).';
  }
  if (code === 429 || /rate limit|quota/i.test(raw)) {
    return 'Se ha alcanzado el límite de peticiones de Google por ahora. Inténtalo de nuevo en unos segundos.';
  }
  return raw || 'Error desconocido al comunicarse con Google.';
}

function getClients(){
  if (!configured()) throw new Error('Google storage no está configurado. Revisa GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY y GOOGLE_SHEET_ID.');
  if (cachedClients) return cachedClients;

  if (!hasValidPrivateKeyFormat()) {
    throw new Error('GOOGLE_PRIVATE_KEY no tiene formato PEM válido (falta -----BEGIN/END PRIVATE KEY-----). Revisa los saltos de línea en el .env.');
  }

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  cachedClients = {
    sheets: google.sheets({ version:'v4', auth }),
    drive: google.drive({ version:'v3', auth })
  };
  return cachedClients;
}

function sheetName(tab){
  return `'${String(tab).replace(/'/g, "''")}'`;
}

function colName(index){
  let n = index + 1;
  let s = '';
  while (n > 0){
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function objectFromRow(headers, row){
  const obj = {};
  headers.forEach((h, i) => obj[h] = row[i] ?? '');
  return obj;
}

function rowFromObject(headers, obj){
  return headers.map(h => obj[h] ?? '');
}

async function ensureSheet(tab, headers){
  const key = `${tab}:${headers.join('|')}`;
  if (ensuredTabs.has(key)) return;
  const { sheets } = getClients();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === tab);

  if (!exists){
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody:{ requests:[{ addSheet:{ properties:{ title:tab } } }] }
    });
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName(tab)}!1:1`
  }).catch(() => ({ data:{ values:[] } }));

  const current = headerRes.data.values?.[0] || [];
  const missingOrDifferent = headers.some((h, i) => current[i] !== h);
  if (!current.length || missingOrDifferent){
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName(tab)}!A1:${colName(headers.length - 1)}1`,
      valueInputOption:'RAW',
      requestBody:{ values:[headers] }
    });
  }

  ensuredTabs.add(key);
}

function normalizeDue(obj){
  const fileId = obj.driveFileId || '';
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    memberId: obj.memberId,
    memberName: obj.memberName,
    server: obj.server,
    date: obj.date,
    amount: Number(obj.amount || 300),
    status: obj.status || 'pending',
    comment: obj.comment || '',
    proof: fileId ? 'Captura en Google Drive' : 'Sin captura',
    proofImage: fileId ? `/api/files/proof/${encodeURIComponent(fileId)}` : '',
    driveFileId: fileId,
    driveFileUrl: obj.driveFileUrl || '',
    source: 'google',
    submittedBy: {
      id: obj.discordId,
      username: obj.discordUsername,
      displayName: obj.discordDisplayName
    },
    reviewedBy: obj.reviewedBy || '',
    reviewedAt: obj.reviewedAt || ''
  };
}

function normalizeGallery(obj){
  const fileId = obj.driveFileId || '';
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    title: obj.title,
    category: obj.category,
    tone: Number(obj.tone || 1),
    image: fileId ? `/api/files/gallery/${encodeURIComponent(fileId)}` : obj.imageUrl,
    driveFileId: fileId,
    source: 'google'
  };
}

/** Convierte una data URL base64 en {mimeType, buffer, ext}, validando que el resultado no esté vacío. */
function parseDataUrl(dataUrl){
  const match = /^data:([^;]+);base64,(.+)$/i.exec(String(dataUrl || '').trim());
  if (!match) throw new Error('La imagen no tiene formato base64/data URL válido (debe empezar por "data:image/...;base64,").');
  const mimeType = match[1];
  let buffer;
  try {
    buffer = Buffer.from(match[2], 'base64');
  } catch (e) {
    throw new Error('No se pudo decodificar la imagen en base64.');
  }
  if (!buffer || buffer.length < 20) {
    throw new Error('La imagen recibida está vacía o corrupta tras decodificarla.');
  }
  const MAX_BYTES = 8 * 1024 * 1024; // 8MB tras decodificar
  if (buffer.length > MAX_BYTES) {
    throw new Error('La imagen pesa demasiado incluso comprimida (máx. 8MB). Prueba con una captura más pequeña.');
  }
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  return { mimeType, buffer, ext };
}

/** Construye un nombre de archivo legible, p. ej. cuota_Roger_2026-07-04_1820.jpg */
function buildReadableFileName(prefix, label, ext){
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  const safeLabel = String(label || 'miembro')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^a-zA-Z0-9]+/g, '')
    .slice(0, 30) || 'miembro';
  return `${prefix}_${safeLabel}_${datePart}_${timePart}.${ext}`;
}

async function uploadBufferToDrive({ buffer, mimeType }, folderId, fileName){
  if (!folderId) throw new Error('Falta configurar la carpeta de Google Drive para subir imágenes.');
  const { drive } = getClients();
  const created = await drive.files.create({
    requestBody:{ name: fileName, parents:[folderId] },
    media:{ mimeType, body: Readable.from(buffer) },
    fields:'id,name,mimeType,webViewLink'
  });
  return created.data;
}

async function listDues(){
  await ensureSheet(DUES_TAB, DUE_HEADERS);
  const { sheets } = getClients();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName(DUES_TAB)}!A2:${colName(DUE_HEADERS.length - 1)}`
  }).catch(() => ({ data:{ values:[] } }));

  return (res.data.values || [])
    .map(row => normalizeDue(objectFromRow(DUE_HEADERS, row)))
    .filter(d => d.id)
    .sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

async function appendDue(input, user){
  await ensureSheet(DUES_TAB, DUE_HEADERS);

  const parsed = parseDataUrl(input.proofImage);
  const fileName = buildReadableFileName('cuota', input.memberName || input.memberId, parsed.ext);
  const file = await uploadBufferToDrive(parsed, process.env.GOOGLE_DRIVE_QUOTAS_FOLDER_ID, fileName);
  const driveFileUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;

  const due = {
    id: input.id || `due_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    discordId: user?.id || '',
    discordUsername: user?.username || '',
    discordDisplayName: user?.displayName || user?.globalName || user?.username || '',
    memberId: String(input.memberId || ''),
    memberName: String(input.memberName || ''),
    server: String(input.server || ''),
    date: String(input.date || ''),
    amount: Number(input.amount || 300),
    driveFileId: file.id,
    driveFileUrl,
    status: 'pending',
    comment: '',
    reviewedBy: '',
    reviewedAt: ''
  };

  const { sheets } = getClients();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName(DUES_TAB)}!A:${colName(DUE_HEADERS.length - 1)}`,
    valueInputOption:'RAW',
    insertDataOption:'INSERT_ROWS',
    requestBody:{ values:[rowFromObject(DUE_HEADERS, due)] }
  });

  return normalizeDue(due);
}

async function updateDueStatus(id, status, comment, reviewer){
  await ensureSheet(DUES_TAB, DUE_HEADERS);
  const { sheets } = getClients();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName(DUES_TAB)}!A2:${colName(DUE_HEADERS.length - 1)}`
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex(row => row[0] === id);
  if (idx === -1) return null;

  const obj = objectFromRow(DUE_HEADERS, rows[idx]);
  obj.status = status;
  obj.comment = comment || obj.comment || '';
  obj.reviewedAt = new Date().toISOString();
  obj.reviewedBy = reviewer?.displayName || reviewer?.globalName || reviewer?.username || '';

  const rowNumber = idx + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName(DUES_TAB)}!A${rowNumber}:${colName(DUE_HEADERS.length - 1)}${rowNumber}`,
    valueInputOption:'RAW',
    requestBody:{ values:[rowFromObject(DUE_HEADERS, obj)] }
  });
  return normalizeDue(obj);
}

async function listGallery(){
  await ensureSheet(GALLERY_TAB, GALLERY_HEADERS);
  const { sheets } = getClients();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName(GALLERY_TAB)}!A2:${colName(GALLERY_HEADERS.length - 1)}`
  }).catch(() => ({ data:{ values:[] } }));

  return (res.data.values || [])
    .map(row => objectFromRow(GALLERY_HEADERS, row))
    .filter(obj => obj.id && !obj.deletedAt)
    .map(normalizeGallery)
    .sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

async function appendGallery(input, user){
  await ensureSheet(GALLERY_TAB, GALLERY_HEADERS);
  let driveFileId = '';
  let imageUrl = String(input.imageUrl || '');

  if (input.imageData){
    const parsed = parseDataUrl(input.imageData);
    const fileName = buildReadableFileName('galeria', input.title || 'foto', parsed.ext);
    const file = await uploadBufferToDrive(parsed, process.env.GOOGLE_DRIVE_GALLERY_FOLDER_ID, fileName);
    driveFileId = file.id;
    imageUrl = `/api/files/gallery/${encodeURIComponent(file.id)}`;
  }

  const item = {
    id: input.id || `g_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    title: String(input.title || 'Foto KoTZ'),
    category: String(input.category || 'Galería'),
    tone: Number(input.tone || 1),
    driveFileId,
    imageUrl,
    createdByDiscordId: user?.id || '',
    createdByName: user?.displayName || user?.globalName || user?.username || '',
    deletedAt: ''
  };

  const { sheets } = getClients();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName(GALLERY_TAB)}!A:${colName(GALLERY_HEADERS.length - 1)}`,
    valueInputOption:'RAW',
    insertDataOption:'INSERT_ROWS',
    requestBody:{ values:[rowFromObject(GALLERY_HEADERS, item)] }
  });

  return normalizeGallery(item);
}

async function deleteGallery(id){
  await ensureSheet(GALLERY_TAB, GALLERY_HEADERS);
  const { sheets } = getClients();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName(GALLERY_TAB)}!A2:${colName(GALLERY_HEADERS.length - 1)}`
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex(row => row[0] === id);
  if (idx === -1) return false;
  const obj = objectFromRow(GALLERY_HEADERS, rows[idx]);
  obj.deletedAt = new Date().toISOString();
  const rowNumber = idx + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName(GALLERY_TAB)}!A${rowNumber}:${colName(GALLERY_HEADERS.length - 1)}${rowNumber}`,
    valueInputOption:'RAW',
    requestBody:{ values:[rowFromObject(GALLERY_HEADERS, obj)] }
  });
  return true;
}

async function getDriveFile(fileId){
  const { drive } = getClients();
  const meta = await drive.files.get({ fileId, fields:'id,name,mimeType' });
  const media = await drive.files.get({ fileId, alt:'media' }, { responseType:'stream' });
  return { stream: media.data, mimeType: meta.data.mimeType || 'application/octet-stream', name: meta.data.name || 'file' };
}

async function ensureBaseTabs(){
  if (!configured()) return false;
  await ensureSheet(DUES_TAB, DUE_HEADERS);
  await ensureSheet(GALLERY_TAB, GALLERY_HEADERS);
  await ensureSheet(process.env.GOOGLE_SHEET_MEMBERS_TAB || 'members', ['id','name','discord','rank','joined','status','notes']);
  await ensureSheet(process.env.GOOGLE_SHEET_SANCTIONS_TAB || 'sanctions', ['id','memberId','memberName','reason','responsible','date','severity','createdAt']);
  await ensureSheet(process.env.GOOGLE_SHEET_WARS_TAB || 'wars', ['id','name','status','since','desc','rules']);
  await ensureSheet(process.env.GOOGLE_SHEET_EVENTS_TAB || 'events', ['id','title','date','desc','status']);
  return true;
}

function status(){
  return {
    enabled: configured(),
    sheetId: process.env.GOOGLE_SHEET_ID || '',
    quotaFolder: Boolean(process.env.GOOGLE_DRIVE_QUOTAS_FOLDER_ID),
    galleryFolder: Boolean(process.env.GOOGLE_DRIVE_GALLERY_FOLDER_ID),
    duesTab: DUES_TAB,
    galleryTab: GALLERY_TAB,
    privateKeyFormatOk: configured() ? hasValidPrivateKeyFormat() : null
  };
}

module.exports = {
  configured,
  status,
  hasValidPrivateKeyFormat,
  friendlyGoogleError,
  ensureBaseTabs,
  listDues,
  appendDue,
  updateDueStatus,
  listGallery,
  appendGallery,
  deleteGallery,
  getDriveFile
};
