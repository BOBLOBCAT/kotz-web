/* ========================================================================== 
   KoTZ — Google Apps Script storage bridge
   --------------------------------------------------------------------------
   Evita el problema de cuota de Service Accounts en Google Drive personal.
   El servidor Node llama a una Web App de Apps Script, y Apps Script guarda
   datos como el propietario del script en Google Sheets + Drive.
   ========================================================================== */

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';
const APPS_SCRIPT_SECRET = process.env.GOOGLE_APPS_SCRIPT_SECRET || '';

function configured(){
  return Boolean(APPS_SCRIPT_URL && APPS_SCRIPT_SECRET);
}

// Compatibilidad con server.js anterior: en modo Apps Script no usamos GOOGLE_PRIVATE_KEY.
function hasValidPrivateKeyFormat(){
  return true;
}

function status(){
  return {
    enabled: configured(),
    mode: configured() ? 'apps-script' : 'disabled',
    appsScriptUrl: Boolean(APPS_SCRIPT_URL),
    secret: Boolean(APPS_SCRIPT_SECRET),
    sheetId: process.env.GOOGLE_SHEET_ID || null,
    quotaFolder: Boolean(process.env.GOOGLE_DRIVE_QUOTAS_FOLDER_ID),
    galleryFolder: Boolean(process.env.GOOGLE_DRIVE_GALLERY_FOLDER_ID),
    duesTab: process.env.GOOGLE_SHEET_DUES_TAB || 'dues',
    galleryTab: process.env.GOOGLE_SHEET_GALLERY_TAB || 'gallery',
    sanctionsTab: process.env.GOOGLE_SHEET_SANCTIONS_TAB || 'sanctions',
    shopItemsTab: process.env.GOOGLE_SHEET_SHOP_ITEMS_TAB || 'shop_items',
    shopOrdersTab: process.env.GOOGLE_SHEET_SHOP_ORDERS_TAB || 'shop_orders',
    shopOffersTab: process.env.GOOGLE_SHEET_SHOP_OFFERS_TAB || 'shop_offers'
  };
}

function friendlyGoogleError(err){
  const raw = String(err?.message || err || '');

  if (/Secret inválido|secret/i.test(raw)) {
    return 'El GOOGLE_APPS_SCRIPT_SECRET del .env no coincide con el SECRET puesto en Google Apps Script.';
  }
  if (/Failed to fetch|fetch failed|ENOTFOUND|ECONNREFUSED|invalid url/i.test(raw)) {
    return 'No se pudo conectar con Google Apps Script. Revisa GOOGLE_APPS_SCRIPT_URL en el .env.';
  }
  if (/No tienes permiso|permission|denied|forbidden|access/i.test(raw)) {
    return 'Apps Script no tiene permisos para escribir en Drive/Sheets. Vuelve a autorizar la implementación o revisa los IDs.';
  }
  if (/data URL|base64|imagen/i.test(raw)) {
    return raw;
  }
  return raw || 'Error comunicando con Google Apps Script.';
}

function buildUrl(params = {}){
  if (!configured()) throw new Error('Google Apps Script no está configurado. Revisa GOOGLE_APPS_SCRIPT_URL y GOOGLE_APPS_SCRIPT_SECRET.');
  const url = new URL(APPS_SCRIPT_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function readJsonResponse(res){
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text || '{}');
  } catch(e) {
    throw new Error(`Apps Script no devolvió JSON válido. HTTP ${res.status}. Respuesta: ${text.slice(0, 250)}`);
  }

  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Apps Script devolvió HTTP ${res.status}`);
  }

  return data;
}

async function appsScriptGet(action){
  const res = await fetch(buildUrl({ action, secret: APPS_SCRIPT_SECRET }), {
    method: 'GET',
    redirect: 'follow'
  });
  return readJsonResponse(res);
}

async function appsScriptPost(action, payload = {}){
  const res = await fetch(buildUrl(), {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ secret: APPS_SCRIPT_SECRET, action, ...payload })
  });
  return readJsonResponse(res);
}

async function ensureBaseTabs(){
  // Llama a las lecturas para que Apps Script cree las pestañas base si no existen.
  if (!configured()) return false;
  await Promise.all([listDues(), listGallery(), listMembers(), listSanctions(), listShopItems(), listShopOrders(), listShopOffers()]);
  return true;
}

function normalizeDue(d){
  return {
    id: d.id,
    createdAt: d.createdAt,
    discordId: d.discordId || d.submittedBy?.id || '',
    discordUsername: d.discordUsername || d.submittedBy?.username || '',
    discordDisplayName: d.discordDisplayName || d.submittedBy?.displayName || '',
    memberId: d.memberId,
    memberName: d.memberName,
    server: d.server,
    date: d.date,
    amount: Number(d.amount || 300),
    driveFileId: d.driveFileId || '',
    driveFileUrl: d.driveFileUrl || d.proofImage || '',
    proof: d.proof || (d.driveFileUrl || d.proofImage ? 'Captura en Google Drive' : 'Sin captura'),
    proofImage: d.proofImage || d.driveFileUrl || '',
    status: d.status || 'pending',
    comment: d.comment || '',
    reviewedBy: d.reviewedBy || '',
    reviewedAt: d.reviewedAt || '',
    source: 'apps-script',
    submittedBy: {
      id: d.discordId || '',
      username: d.discordUsername || '',
      displayName: d.discordDisplayName || ''
    }
  };
}

function normalizeMember(m){
  const rpName = m.rpName || m.name || '';
  const discordUsername = m.discordUsername || m.discord || '';
  return {
    id: m.id || ('member_' + String(rpName || discordUsername).toLowerCase().replace(/[^a-z0-9]+/g, '_')),
    name: rpName,
    rpName,
    discord: discordUsername ? (String(discordUsername).startsWith('@') ? discordUsername : '@' + discordUsername) : '',
    discordUsername: String(discordUsername).replace(/^@/, ''),
    discordId: String(m.discordId || ''),
    rank: m.rank || 'Soldado',
    joined: m.joinDate || m.joined || '',
    joinDate: m.joinDate || m.joined || '',
    status: m.status || 'Activo',
    profileUrl: m.profileUrl || '',
    notes: m.notes || '',
    sanctions: Array.isArray(m.sanctions) ? m.sanctions : [],
    dues: Array.isArray(m.dues) ? m.dues : [],
    source: 'apps-script'
  };
}

async function listMembers(){
  const data = await appsScriptGet('listMembers');
  return (data.members || []).map(normalizeMember);
}

async function updateMember(id, patch = {}, user){
  const data = await appsScriptPost('updateMember', {
    id,
    patch,
    reviewedBy: user?.displayName || user?.globalName || user?.username || ''
  });
  return normalizeMember(data.member || {});
}

async function getMemberForDiscordUser(user){
  const members = await listMembers();
  const discordId = String(user?.id || '');
  const username = String(user?.username || '').toLowerCase();
  const displayName = String(user?.displayName || user?.globalName || '').toLowerCase();
  return members.find(m => String(m.discordId || '') === discordId)
    || members.find(m => String(m.discordUsername || '').toLowerCase() === username)
    || members.find(m => String(m.discord || '').replace(/^@/, '').toLowerCase() === username)
    || members.find(m => String(m.name || '').toLowerCase() === displayName)
    || null;
}

async function listDues(){
  const data = await appsScriptGet('listDues');
  return (data.dues || []).map(normalizeDue);
}

async function appendDue(input, user){
  const data = await appsScriptPost('appendDue', {
    due: {
      memberId: input.memberId,
      memberName: input.memberName,
      server: input.server,
      date: input.date,
      amount: Number(input.amount || 300),
      proofImage: input.proofImage,
      discordId: user?.id || '',
      discordUsername: user?.username || '',
      discordDisplayName: user?.displayName || user?.globalName || user?.username || ''
    }
  });
  return normalizeDue(data.due);
}

async function updateDueStatus(id, statusValue, comment, user){
  const data = await appsScriptPost('updateDueStatus', {
    id,
    status: statusValue,
    comment: comment || '',
    reviewedBy: user?.displayName || user?.globalName || user?.username || ''
  });
  return normalizeDue(data.due);
}

function normalizeSanction(s){
  return {
    id: s.id || ('sanction_' + Date.now()),
    createdAt: s.createdAt || '',
    memberId: String(s.memberId || ''),
    memberName: s.memberName || '',
    severity: s.severity || 'Leve',
    date: s.date || '',
    responsible: s.responsible || '',
    reason: s.reason || '',
    createdByDiscordId: String(s.createdByDiscordId || ''),
    createdByUsername: s.createdByUsername || '',
    createdByDisplayName: s.createdByDisplayName || '',
    source: 'apps-script'
  };
}

async function listSanctions(){
  const data = await appsScriptGet('listSanctions');
  return (data.sanctions || []).map(normalizeSanction);
}

async function appendSanction(input, user){
  const data = await appsScriptPost('appendSanction', {
    sanction: {
      memberId: input.memberId,
      memberName: input.memberName,
      severity: input.severity || 'Leve',
      date: input.date,
      responsible: input.responsible,
      reason: input.reason,
      createdByDiscordId: user?.id || '',
      createdByUsername: user?.username || '',
      createdByDisplayName: user?.displayName || user?.globalName || user?.username || ''
    }
  });
  return normalizeSanction(data.sanction || {});
}


function normalizeShopItem(item = {}){
  return {
    id: item.id || ('shop_' + Date.now()),
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
    name: item.name || 'Producto RP',
    category: item.category || 'General',
    description: item.description || '',
    damage: Number(item.damage || 0),
    durability: Number(item.durability || 0),
    basePrice: Number(item.basePrice || item.price || 0),
    memberPrice: Number(item.memberPrice || item.basePrice || item.price || 0),
    allyPrice: Number(item.allyPrice || item.memberPrice || item.basePrice || item.price || 0),
    stock: Number(item.stock || 0),
    imageUrl: item.imageUrl || item.image || '',
    image: item.image || item.imageUrl || '',
    driveFileId: item.driveFileId || item.fileId || '',
    status: item.status || 'Activo',
    featured: item.featured === true || String(item.featured || '').toLowerCase() === 'true' || String(item.featured || '').toLowerCase() === 'si' || String(item.featured || '').toLowerCase() === 'sí',
    notes: item.notes || '',
    source: 'apps-script'
  };
}

function normalizeShopOrder(order = {}){
  return {
    id: order.id || ('order_' + Date.now()),
    createdAt: order.createdAt || '',
    buyerDiscordId: String(order.buyerDiscordId || ''),
    buyerUsername: order.buyerUsername || '',
    buyerDisplayName: order.buyerDisplayName || '',
    buyerMemberId: order.buyerMemberId || '',
    buyerName: order.buyerName || '',
    itemId: order.itemId || '',
    itemName: order.itemName || '',
    price: Number(order.price || 0),
    quantity: Number(order.quantity || 1),
    status: order.status || 'pending',
    message: order.message || '',
    reviewedBy: order.reviewedBy || '',
    reviewedAt: order.reviewedAt || '',
    source: 'apps-script'
  };
}

function normalizeShopOffer(offer = {}){
  return {
    id: offer.id || ('offer_' + Date.now()),
    createdAt: offer.createdAt || '',
    buyerDiscordId: String(offer.buyerDiscordId || ''),
    buyerUsername: offer.buyerUsername || '',
    buyerDisplayName: offer.buyerDisplayName || '',
    buyerMemberId: offer.buyerMemberId || '',
    buyerName: offer.buyerName || '',
    itemId: offer.itemId || '',
    itemName: offer.itemName || '',
    originalPrice: Number(offer.originalPrice || 0),
    offeredPrice: Number(offer.offeredPrice || 0),
    message: offer.message || '',
    status: offer.status || 'pending',
    counterOffer: offer.counterOffer || '',
    reviewedBy: offer.reviewedBy || '',
    reviewedAt: offer.reviewedAt || '',
    source: 'apps-script'
  };
}

async function listShopItems(){
  const data = await appsScriptGet('listShopItems');
  return (data.items || []).map(normalizeShopItem);
}

async function appendShopItem(input = {}, user){
  const data = await appsScriptPost('appendShopItem', {
    item: {
      ...input,
      updatedBy: user?.displayName || user?.globalName || user?.username || ''
    }
  });
  return normalizeShopItem(data.item || {});
}

async function updateShopItem(id, patch = {}, user){
  const data = await appsScriptPost('updateShopItem', {
    id,
    patch: {
      ...patch,
      updatedBy: user?.displayName || user?.globalName || user?.username || ''
    }
  });
  return normalizeShopItem(data.item || {});
}

async function listShopOrders(){
  const data = await appsScriptGet('listShopOrders');
  return (data.orders || []).map(normalizeShopOrder);
}

async function appendShopOrder(input = {}, user, member){
  const data = await appsScriptPost('appendShopOrder', {
    order: {
      ...input,
      buyerDiscordId: user?.id || '',
      buyerUsername: user?.username || '',
      buyerDisplayName: user?.displayName || user?.globalName || user?.username || '',
      buyerMemberId: member?.id || input.buyerMemberId || '',
      buyerName: member?.name || member?.rpName || user?.displayName || user?.globalName || user?.username || input.buyerName || ''
    }
  });
  return normalizeShopOrder(data.order || {});
}

async function updateShopOrderStatus(id, statusValue, user){
  const data = await appsScriptPost('updateShopOrderStatus', {
    id,
    status: statusValue,
    reviewedBy: user?.displayName || user?.globalName || user?.username || ''
  });
  return normalizeShopOrder(data.order || {});
}

async function listShopOffers(){
  const data = await appsScriptGet('listShopOffers');
  return (data.offers || []).map(normalizeShopOffer);
}

async function appendShopOffer(input = {}, user, member){
  const data = await appsScriptPost('appendShopOffer', {
    offer: {
      ...input,
      buyerDiscordId: user?.id || '',
      buyerUsername: user?.username || '',
      buyerDisplayName: user?.displayName || user?.globalName || user?.username || '',
      buyerMemberId: member?.id || input.buyerMemberId || '',
      buyerName: member?.name || member?.rpName || user?.displayName || user?.globalName || user?.username || input.buyerName || ''
    }
  });
  return normalizeShopOffer(data.offer || {});
}

async function updateShopOfferStatus(id, statusValue, counterOffer, user){
  const data = await appsScriptPost('updateShopOfferStatus', {
    id,
    status: statusValue,
    counterOffer: counterOffer || '',
    reviewedBy: user?.displayName || user?.globalName || user?.username || ''
  });
  return normalizeShopOffer(data.offer || {});
}

function normalizeGalleryItem(g){
  const fileId = g.driveFileId || g.fileId || '';
  const fallbackImage = fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600` : '';
  return {
    id: g.id || fileId || ('gallery_' + Date.now()),
    createdAt: g.createdAt || '',
    title: g.title || g.name || 'Foto de galería',
    category: g.category || 'Galería oficial',
    driveFileId: fileId,
    driveFileUrl: g.driveFileUrl || g.fileUrl || '',
    image: g.image || g.imageUrl || fallbackImage || g.driveFileUrl || '',
    imageUrl: g.imageUrl || g.image || fallbackImage || g.driveFileUrl || '',
    uploadedBy: g.uploadedBy || '',
    source: 'apps-script',
    tone: Number(g.tone || 1)
  };
}

async function listGallery(){
  const data = await appsScriptGet('listGallery');
  return (data.items || data.gallery || []).map(normalizeGalleryItem);
}

async function appendGallery(input, user){
  const data = await appsScriptPost('appendGallery', {
    item: {
      title: input.title,
      category: input.category,
      // Puede venir de archivo comprimido desde el panel o como URL directa.
      image: input.imageData || input.image || '',
      imageUrl: input.imageUrl || '',
      tone: input.tone || 1,
      uploadedBy: user?.displayName || user?.globalName || user?.username || ''
    }
  });
  return normalizeGalleryItem(data.item || {});
}

async function deleteGallery(id){
  const data = await appsScriptPost('deleteGallery', { id });
  return Boolean(data.deleted);
}

async function getDriveFile(){
  throw new Error('Los archivos se abren directamente desde Google Drive en modo Apps Script.');
}

module.exports = {
  configured,
  hasValidPrivateKeyFormat,
  status,
  friendlyGoogleError,
  ensureBaseTabs,
  listMembers,
  updateMember,
  getMemberForDiscordUser,
  listDues,
  appendDue,
  updateDueStatus,
  listSanctions,
  appendSanction,
  listShopItems,
  appendShopItem,
  updateShopItem,
  listShopOrders,
  appendShopOrder,
  updateShopOrderStatus,
  listShopOffers,
  appendShopOffer,
  updateShopOfferStatus,
  listGallery,
  appendGallery,
  deleteGallery,
  getDriveFile
};
