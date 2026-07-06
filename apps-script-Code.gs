/************************************************************
 * KoTZ Storage API
 * Guarda cuotas, galería, miembros, sanciones y tienda RP
 * en Google Sheets/Drive.
 *
 * Ejecutar como: Tú
 * Acceso: Cualquiera
 ************************************************************/

const CONFIG = {
  // Debe coincidir EXACTAMENTE con GOOGLE_APPS_SCRIPT_SECRET de Render
  SECRET: "PON_AQUI_EL_MISMO_SECRET_DE_RENDER",
  SHEET_ID: "113r96X_gFAekA9f-pQBNgi_uGu-lQHZscD5lHenk5lY",
  FOLDERS: {
    QUOTAS: "1j8zJd5x-wHyl4S00p9D_jFmVVzoK2Prx",
    GALLERY: "12Gr1OZrVweQ7ubpCwUZDSGZfNsVZ6rO_",
    BACKUPS: "1E9QOAPCZQjgklNnhREBrb1DqtXP6GEll"
  },
  TABS: {
    DUES: "dues",
    GALLERY: "gallery",
    MEMBERS: "members",
    SANCTIONS: "sanctions",
    WARS: "wars",
    EVENTS: "events",
    SHOP_ITEMS: "shop_items",
    SHOP_ORDERS: "shop_orders",
    SHOP_OFFERS: "shop_offers"
  }
};

const DUES_HEADERS = [
  "id", "createdAt", "discordId", "discordUsername", "discordDisplayName",
  "memberId", "memberName", "server", "date", "amount", "driveFileId",
  "driveFileUrl", "status", "comment", "reviewedBy", "reviewedAt"
];

const GALLERY_HEADERS = [
  "id", "createdAt", "title", "category", "driveFileId", "driveFileUrl",
  "imageUrl", "uploadedBy"
];

const MEMBERS_HEADERS = [
  "id", "rpName", "discordUsername", "discordId", "rank", "joinDate",
  "status", "profileUrl", "notes"
];

const SANCTIONS_HEADERS = [
  "id", "createdAt", "memberId", "memberName", "severity", "date",
  "responsible", "reason", "createdByDiscordId", "createdByUsername",
  "createdByDisplayName"
];

const SHOP_ITEMS_HEADERS = [
  "id", "createdAt", "updatedAt", "name", "category", "description",
  "damage", "durability", "basePrice", "memberPrice", "allyPrice",
  "stock", "imageUrl", "status", "featured", "notes"
];

const SHOP_ORDERS_HEADERS = [
  "id", "createdAt", "buyerDiscordId", "buyerUsername", "buyerDisplayName",
  "buyerMemberId", "buyerName", "itemId", "itemName", "price", "quantity",
  "status", "message", "reviewedBy", "reviewedAt"
];

const SHOP_OFFERS_HEADERS = [
  "id", "createdAt", "buyerDiscordId", "buyerUsername", "buyerDisplayName",
  "buyerMemberId", "buyerName", "itemId", "itemName", "originalPrice",
  "offeredPrice", "message", "status", "counterOffer", "reviewedBy",
  "reviewedAt"
];

/* ------------------------------------------------------------
 ROUTER GET
------------------------------------------------------------ */
function doGet(e) {
  try {
    const action = e.parameter.action || "status";

    if (action === "status") {
      if (String(e.parameter.setup || "") === "1") {
        setupSheets();
      }
      return jsonResponse({
        ok: true,
        service: "KoTZ Storage API",
        sheetId: CONFIG.SHEET_ID,
        tabs: CONFIG.TABS,
        folders: CONFIG.FOLDERS
      });
    }

    if (action === "listDues") {
      checkSecret(e.parameter.secret);
      return jsonResponse({ ok: true, dues: listDues() });
    }

    if (action === "listMembers") {
      checkSecret(e.parameter.secret);
      return jsonResponse({ ok: true, members: listMembers() });
    }

    if (action === "listGallery") {
      checkSecret(e.parameter.secret);
      const gallery = listGallery();
      return jsonResponse({ ok: true, gallery, items: gallery });
    }

    if (action === "listSanctions") {
      checkSecret(e.parameter.secret);
      return jsonResponse({ ok: true, sanctions: listSanctions() });
    }

    if (action === "listShopItems") {
      checkSecret(e.parameter.secret);
      return jsonResponse({ ok: true, items: listShopItems() });
    }

    if (action === "listShopOrders") {
      checkSecret(e.parameter.secret);
      return jsonResponse({ ok: true, orders: listShopOrders() });
    }

    if (action === "listShopOffers") {
      checkSecret(e.parameter.secret);
      return jsonResponse({ ok: true, offers: listShopOffers() });
    }

    return jsonResponse({ ok: false, error: "Acción GET no reconocida.", receivedAction: action });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

/* ------------------------------------------------------------
 ROUTER POST
------------------------------------------------------------ */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    checkSecret(body.secret);

    if (body.action === "appendDue") {
      const due = appendDue(body.due);
      return jsonResponse({ ok: true, due });
    }

    if (body.action === "updateDueStatus") {
      const due = updateDueStatus(body.id, body.status, body.comment, body.reviewedBy);
      return jsonResponse({ ok: true, due });
    }

    if (body.action === "appendGallery") {
      const item = appendGallery(body.item);
      return jsonResponse({ ok: true, item });
    }

    if (body.action === "deleteGallery") {
      const deleted = deleteGallery(body.id);
      return jsonResponse({ ok: true, deleted });
    }

    if (body.action === "appendMember") {
      const member = appendMember(body.member);
      return jsonResponse({ ok: true, member });
    }

    if (body.action === "updateMember") {
      const member = updateMember(body.id, body.member || body.patch || {});
      return jsonResponse({ ok: true, member });
    }

    if (body.action === "appendSanction") {
      const sanction = appendSanction(body.sanction);
      return jsonResponse({ ok: true, sanction });
    }

    if (body.action === "appendShopItem") {
      const item = appendShopItem(body.item);
      return jsonResponse({ ok: true, item });
    }

    if (body.action === "updateShopItem") {
      const item = updateShopItem(body.id, body.patch || body.item || {});
      return jsonResponse({ ok: true, item });
    }

    if (body.action === "deleteShopItem") {
      const deleted = deleteShopItem(body.id);
      return jsonResponse({ ok: true, deleted });
    }

    if (body.action === "appendShopOrder") {
      const order = appendShopOrder(body.order);
      return jsonResponse({ ok: true, order });
    }

    if (body.action === "updateShopOrderStatus") {
      const order = updateShopOrderStatus(body.id, body.status, body.reviewedBy);
      return jsonResponse({ ok: true, order });
    }

    if (body.action === "appendShopOffer") {
      const offer = appendShopOffer(body.offer);
      return jsonResponse({ ok: true, offer });
    }

    if (body.action === "updateShopOfferStatus") {
      const offer = updateShopOfferStatus(body.id, body.status, body.counterOffer, body.reviewedBy);
      return jsonResponse({ ok: true, offer });
    }

    return jsonResponse({ ok: false, error: "Acción POST no reconocida.", receivedAction: body.action });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

/* ------------------------------------------------------------
 SETUP
------------------------------------------------------------ */
function setupSheets() {
  getSheet(CONFIG.TABS.DUES, DUES_HEADERS);
  getSheet(CONFIG.TABS.GALLERY, GALLERY_HEADERS);
  getSheet(CONFIG.TABS.MEMBERS, MEMBERS_HEADERS);
  getSheet(CONFIG.TABS.SANCTIONS, SANCTIONS_HEADERS);
  getSheet(CONFIG.TABS.SHOP_ITEMS, SHOP_ITEMS_HEADERS);
  getSheet(CONFIG.TABS.SHOP_ORDERS, SHOP_ORDERS_HEADERS);
  getSheet(CONFIG.TABS.SHOP_OFFERS, SHOP_OFFERS_HEADERS);

  const shopSheet = getSheet(CONFIG.TABS.SHOP_ITEMS, SHOP_ITEMS_HEADERS);
  const values = shopSheet.getDataRange().getValues();
  if (values.length <= 1) {
    seedShopItems(shopSheet);
  }
}

/* ------------------------------------------------------------
 DUES
------------------------------------------------------------ */
function appendDue(due) {
  if (!due) throw new Error("Falta el objeto due.");
  if (!due.memberId) throw new Error("Falta memberId.");
  if (!due.memberName) throw new Error("Falta memberName.");
  if (!due.server) throw new Error("Falta server.");
  if (!due.date) throw new Error("Falta date.");
  if (!due.proofImage) throw new Error("Falta proofImage.");

  const id = due.id || makeId("due");
  const createdAt = new Date().toISOString();
  const fileName = makeQuotaFileName(due.memberName, due.date);
  const uploaded = uploadDataUrlToDrive(due.proofImage, CONFIG.FOLDERS.QUOTAS, fileName);

  const row = [
    id, createdAt, due.discordId || "", due.discordUsername || "",
    due.discordDisplayName || "", due.memberId, due.memberName, due.server,
    due.date, Number(due.amount || 300), uploaded.fileId, uploaded.fileUrl,
    "pending", "", "", ""
  ];

  const sheet = getSheet(CONFIG.TABS.DUES, DUES_HEADERS);
  sheet.appendRow(row);
  return rowToDue(row);
}

function listDues() {
  const sheet = getSheet(CONFIG.TABS.DUES, DUES_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).filter(row => row[0]).map(rowToDue).reverse();
}

function updateDueStatus(id, status, comment, reviewedBy) {
  if (!id) throw new Error("Falta id de cuota.");
  if (!["pending", "approved", "rejected"].includes(status)) {
    throw new Error("Estado inválido.");
  }

  const sheet = getSheet(CONFIG.TABS.DUES, DUES_HEADERS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      const rowNumber = i + 1;
      sheet.getRange(rowNumber, DUES_HEADERS.indexOf("status") + 1).setValue(status);
      sheet.getRange(rowNumber, DUES_HEADERS.indexOf("comment") + 1).setValue(comment || "");
      sheet.getRange(rowNumber, DUES_HEADERS.indexOf("reviewedBy") + 1).setValue(reviewedBy || "");
      sheet.getRange(rowNumber, DUES_HEADERS.indexOf("reviewedAt") + 1).setValue(new Date().toISOString());
      const updated = sheet.getRange(rowNumber, 1, 1, DUES_HEADERS.length).getValues()[0];
      return rowToDue(updated);
    }
  }

  throw new Error("Cuota no encontrada.");
}

function rowToDue(row) {
  return {
    id: row[0],
    createdAt: row[1],
    discordId: row[2],
    discordUsername: row[3],
    discordDisplayName: row[4],
    memberId: row[5],
    memberName: row[6],
    server: row[7],
    date: row[8],
    amount: row[9],
    driveFileId: row[10],
    driveFileUrl: row[11],
    proof: row[11] ? "Captura adjunta" : "",
    proofImage: row[11] || "",
    status: row[12] || "pending",
    comment: row[13] || "",
    reviewedBy: row[14] || "",
    reviewedAt: row[15] || "",
    source: "apps-script"
  };
}

/* ------------------------------------------------------------
 MEMBERS
------------------------------------------------------------ */
function listMembers() {
  const sheet = getSheet(CONFIG.TABS.MEMBERS, MEMBERS_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).filter(row => row[0] || row[1] || row[2] || row[3]).map(rowToMember);
}

function appendMember(member) {
  if (!member) throw new Error("Falta el objeto member.");
  const id = member.id || makeId("m");
  const row = [
    id,
    member.rpName || member.name || "",
    cleanDiscordUsername(member.discordUsername || member.discord || ""),
    member.discordId || "",
    normalizeRank(member.rank || "Soldado"),
    member.joinDate || member.joined || "",
    member.status || "Activo",
    member.profileUrl || "",
    member.notes || ""
  ];

  const sheet = getSheet(CONFIG.TABS.MEMBERS, MEMBERS_HEADERS);
  sheet.appendRow(row);
  return rowToMember(row);
}

function updateMember(id, patch) {
  if (!id) throw new Error("Falta id de miembro.");
  if (!patch) throw new Error("Falta objeto member.");

  const sheet = getSheet(CONFIG.TABS.MEMBERS, MEMBERS_HEADERS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      const rowNumber = i + 1;
      const current = rowToMember(values[i]);

      const updated = {
        ...current,
        ...patch,
        rpName: patch.rpName || patch.name || current.rpName || "",
        discordUsername: cleanDiscordUsername(
          patch.discordUsername !== undefined ? patch.discordUsername :
          patch.discord !== undefined ? patch.discord :
          current.discordUsername
        ),
        discordId: patch.discordId !== undefined ? patch.discordId : current.discordId,
        rank: normalizeRank(patch.rank !== undefined ? patch.rank : current.rank),
        joinDate: patch.joinDate || patch.joined || current.joinDate || "",
        status: patch.status || current.status || "Activo",
        profileUrl: patch.profileUrl !== undefined ? patch.profileUrl : current.profileUrl,
        notes: patch.notes !== undefined ? patch.notes : current.notes
      };

      const row = memberToRow(updated);
      sheet.getRange(rowNumber, 1, 1, MEMBERS_HEADERS.length).setValues([row]);
      return rowToMember(row);
    }
  }

  throw new Error("Miembro no encontrado.");
}

function rowToMember(row) {
  const username = cleanDiscordUsername(row[2] || "");
  return {
    id: row[0],
    rpName: row[1],
    name: row[1],
    discordUsername: username,
    discord: username ? "@" + username : "",
    discordId: String(row[3] || ""),
    rank: normalizeRank(row[4] || "Soldado"),
    joinDate: row[5] || "",
    joined: row[5] || "",
    status: row[6] || "Activo",
    profileUrl: row[7] || "",
    notes: row[8] || "",
    sanctions: [],
    dues: [],
    source: "apps-script"
  };
}

function memberToRow(member) {
  return [
    member.id || makeId("m"),
    member.rpName || member.name || "",
    cleanDiscordUsername(member.discordUsername || member.discord || ""),
    member.discordId || "",
    normalizeRank(member.rank || "Soldado"),
    member.joinDate || member.joined || "",
    member.status || "Activo",
    member.profileUrl || "",
    member.notes || ""
  ];
}

function cleanDiscordUsername(value) {
  return String(value || "").replace(/^@/, "").trim();
}

function normalizeRank(rank) {
  const raw = String(rank || "").trim();
  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_\s-]+/g, "");

  const map = {
    "owner": "Owner",
    "coowner": "Co-Owner",
    "capitan": "Capitán",
    "teniente": "Teniente",
    "sargento": "Sargento",
    "soldado": "Soldado",
    "asociado": "Asociado",
    "recluta": "Recluta",
    "miembro": "Soldado"
  };

  return map[key] || raw || "Soldado";
}

/* ------------------------------------------------------------
 SANCTIONS
------------------------------------------------------------ */
function listSanctions() {
  const sheet = getSheet(CONFIG.TABS.SANCTIONS, SANCTIONS_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).filter(row => row[0] || row[2] || row[3]).map(rowToSanction).reverse();
}

function appendSanction(sanction) {
  if (!sanction) throw new Error("Falta el objeto sanction.");
  if (!sanction.memberId) throw new Error("Falta memberId.");
  if (!sanction.memberName) throw new Error("Falta memberName.");
  if (!sanction.reason) throw new Error("Falta reason.");
  if (!sanction.date) throw new Error("Falta date.");

  const id = sanction.id || makeId("sanction");
  const createdAt = new Date().toISOString();
  const severity = normalizeSeverity(sanction.severity || sanction.gravity || "Leve");

  const row = [
    id, createdAt, sanction.memberId, sanction.memberName, severity,
    sanction.date, sanction.responsible || "", sanction.reason || "",
    sanction.createdByDiscordId || "", sanction.createdByUsername || "",
    sanction.createdByDisplayName || ""
  ];

  const sheet = getSheet(CONFIG.TABS.SANCTIONS, SANCTIONS_HEADERS);
  sheet.appendRow(row);
  return rowToSanction(row);
}

function rowToSanction(row) {
  return {
    id: row[0],
    createdAt: row[1],
    memberId: row[2],
    memberName: row[3],
    severity: normalizeSeverity(row[4] || "Leve"),
    gravity: normalizeSeverity(row[4] || "Leve"),
    date: row[5] || "",
    responsible: row[6] || "",
    reason: row[7] || "",
    createdByDiscordId: String(row[8] || ""),
    createdByUsername: row[9] || "",
    createdByDisplayName: row[10] || "",
    source: "apps-script"
  };
}

function normalizeSeverity(severity) {
  const raw = String(severity || "Leve").trim();
  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_\s-]+/g, "");

  const map = {
    "leve": "Leve",
    "grave": "Grave",
    "muygrave": "Muy grave",
    "muysevera": "Muy grave",
    "severa": "Grave"
  };

  return map[key] || raw || "Leve";
}

/* ------------------------------------------------------------
 SHOP
------------------------------------------------------------ */
function listShopItems() {
  const sheet = getSheet(CONFIG.TABS.SHOP_ITEMS, SHOP_ITEMS_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return seedShopItems(sheet);
  }
  return values.slice(1).filter(row => row[0] || row[3]).map(rowToShopItem);
}

function seedShopItems(sheet) {
  const now = new Date().toISOString();
  const rows = [
    [ "shop_screwdriver", now, now, "Destornillador", "Herramienta", "Herramienta RP compacta. Útil para operaciones discretas.", 15, 15, 87, 75, 70, 5, "", "Activo", true, "Producto inicial" ],
    [ "shop_knuckles", now, now, "Nudillos de latón", "Cuerpo a cuerpo", "Artículo RP de contacto. Precio editable desde Alto Mando.", 20, 30, 131, 115, 105, 2, "", "Activo", false, "Producto inicial" ],
    [ "shop_combat_knife", now, now, "Cuchillo de combate", "Cuerpo a cuerpo", "Artículo RP ligero con buena durabilidad.", 20, 40, 292, 260, 240, 1, "", "Activo", true, "Producto inicial" ],
    [ "shop_bat", now, now, "Bate de béisbol", "Cuerpo a cuerpo", "Artículo RP resistente para defensa y presión.", 30, 30, 660, 590, 540, 2, "", "Activo", false, "Producto inicial" ],
    [ "shop_handmade", now, now, "Arma hecha a mano", "Arma corta", "Pieza RP de alto valor. Requiere aprobación.", 0, 25, 8279, 7800, 7400, 1, "", "Activo", true, "Producto inicial" ],
    [ "shop_shotgun", now, now, "Escopeta", "Arma larga", "Artículo RP premium. Venta revisada por Alto Mando.", 30, 40, 13922, 13200, 12500, 2, "", "Activo", true, "Producto inicial" ]
  ];

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, SHOP_ITEMS_HEADERS.length).setValues(rows);
  }

  return rows.map(rowToShopItem);
}

function appendShopItem(item) {
  if (!item) throw new Error("Falta el objeto item.");
  if (!item.name) throw new Error("Falta name.");

  const now = new Date().toISOString();
  const id = item.id || makeId("shop");
  const imageUrl = resolveShopImageUrl(item, item.name || "producto", id, "");

  const row = [
    id,
    now,
    now,
    item.name || "",
    item.category || "General",
    item.description || "",
    Number(item.damage || 0),
    Number(item.durability || 0),
    Number(item.basePrice || item.price || 0),
    Number(item.memberPrice || item.basePrice || item.price || 0),
    Number(item.allyPrice || item.memberPrice || item.basePrice || item.price || 0),
    Number(item.stock || 0),
    imageUrl,
    item.status || "Activo",
    toBool(item.featured),
    item.notes || ""
  ];

  const sheet = getSheet(CONFIG.TABS.SHOP_ITEMS, SHOP_ITEMS_HEADERS);
  sheet.appendRow(row);
  return rowToShopItem(row);
}

function updateShopItem(id, patch) {
  if (!id) throw new Error("Falta id de producto.");

  const sheet = getSheet(CONFIG.TABS.SHOP_ITEMS, SHOP_ITEMS_HEADERS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      const current = rowToShopItem(values[i]);
      const updated = {
        ...current,
        ...patch,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
        name: patch.name !== undefined ? patch.name : current.name,
        category: patch.category !== undefined ? patch.category : current.category,
        description: patch.description !== undefined ? patch.description : current.description,
        damage: Number(patch.damage !== undefined ? patch.damage : current.damage),
        durability: Number(patch.durability !== undefined ? patch.durability : current.durability),
        basePrice: Number(patch.basePrice !== undefined ? patch.basePrice : current.basePrice),
        memberPrice: Number(patch.memberPrice !== undefined ? patch.memberPrice : current.memberPrice),
        allyPrice: Number(patch.allyPrice !== undefined ? patch.allyPrice : current.allyPrice),
        stock: Number(patch.stock !== undefined ? patch.stock : current.stock),
        imageUrl: resolveShopImageUrl(patch, patch.name || current.name || "producto", current.id, current.imageUrl),
        status: patch.status !== undefined ? patch.status : current.status,
        featured: patch.featured !== undefined ? toBool(patch.featured) : toBool(current.featured),
        notes: patch.notes !== undefined ? patch.notes : current.notes
      };

      const row = shopItemToRow(updated);
      sheet.getRange(i + 1, 1, 1, SHOP_ITEMS_HEADERS.length).setValues([row]);
      return rowToShopItem(row);
    }
  }

  throw new Error("Producto no encontrado.");
}

function deleteShopItem(id) {
  if (!id) throw new Error("Falta id de producto.");

  const sheet = getSheet(CONFIG.TABS.SHOP_ITEMS, SHOP_ITEMS_HEADERS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }

  return false;
}

function listShopOrders() {
  const sheet = getSheet(CONFIG.TABS.SHOP_ORDERS, SHOP_ORDERS_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).filter(row => row[0] || row[7]).map(rowToShopOrder).reverse();
}

function appendShopOrder(order) {
  if (!order) throw new Error("Falta el objeto order.");
  if (!order.itemId) throw new Error("Falta itemId.");
  if (!order.itemName) throw new Error("Falta itemName.");
  if (!order.buyerName) throw new Error("Falta buyerName.");

  const row = [
    order.id || makeId("order"),
    new Date().toISOString(),
    order.buyerDiscordId || "",
    order.buyerUsername || "",
    order.buyerDisplayName || "",
    order.buyerMemberId || "",
    order.buyerName || "",
    order.itemId,
    order.itemName,
    Number(order.price || 0),
    Number(order.quantity || 1),
    order.status || "pending",
    order.message || "",
    "",
    ""
  ];

  const sheet = getSheet(CONFIG.TABS.SHOP_ORDERS, SHOP_ORDERS_HEADERS);
  sheet.appendRow(row);
  return rowToShopOrder(row);
}

function updateShopOrderStatus(id, status, reviewedBy) {
  if (!id) throw new Error("Falta id de pedido.");
  const valid = ["pending", "approved", "rejected", "delivered", "cancelled"];
  if (!valid.includes(status)) {
    throw new Error("Estado de pedido inválido.");
  }

  const sheet = getSheet(CONFIG.TABS.SHOP_ORDERS, SHOP_ORDERS_HEADERS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      const rowNumber = i + 1;
      sheet.getRange(rowNumber, SHOP_ORDERS_HEADERS.indexOf("status") + 1).setValue(status);
      sheet.getRange(rowNumber, SHOP_ORDERS_HEADERS.indexOf("reviewedBy") + 1).setValue(reviewedBy || "");
      sheet.getRange(rowNumber, SHOP_ORDERS_HEADERS.indexOf("reviewedAt") + 1).setValue(new Date().toISOString());
      const row = sheet.getRange(rowNumber, 1, 1, SHOP_ORDERS_HEADERS.length).getValues()[0];
      return rowToShopOrder(row);
    }
  }

  throw new Error("Pedido no encontrado.");
}

function listShopOffers() {
  const sheet = getSheet(CONFIG.TABS.SHOP_OFFERS, SHOP_OFFERS_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).filter(row => row[0] || row[7]).map(rowToShopOffer).reverse();
}

function appendShopOffer(offer) {
  if (!offer) throw new Error("Falta el objeto offer.");
  if (!offer.itemId) throw new Error("Falta itemId.");
  if (!offer.itemName) throw new Error("Falta itemName.");
  if (!offer.buyerName) throw new Error("Falta buyerName.");

  const offeredPrice = Number(offer.offeredPrice || 0);
  if (!offeredPrice || offeredPrice <= 0) {
    throw new Error("Falta offeredPrice válido.");
  }

  const row = [
    offer.id || makeId("offer"),
    new Date().toISOString(),
    offer.buyerDiscordId || "",
    offer.buyerUsername || "",
    offer.buyerDisplayName || "",
    offer.buyerMemberId || "",
    offer.buyerName || "",
    offer.itemId,
    offer.itemName,
    Number(offer.originalPrice || 0),
    offeredPrice,
    offer.message || "",
    offer.status || "pending",
    offer.counterOffer || "",
    "",
    ""
  ];

  const sheet = getSheet(CONFIG.TABS.SHOP_OFFERS, SHOP_OFFERS_HEADERS);
  sheet.appendRow(row);
  return rowToShopOffer(row);
}

function updateShopOfferStatus(id, status, counterOffer, reviewedBy) {
  if (!id) throw new Error("Falta id de oferta.");
  const valid = ["pending", "accepted", "rejected", "countered", "cancelled"];
  if (!valid.includes(status)) {
    throw new Error("Estado de oferta inválido.");
  }

  const sheet = getSheet(CONFIG.TABS.SHOP_OFFERS, SHOP_OFFERS_HEADERS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      const rowNumber = i + 1;
      sheet.getRange(rowNumber, SHOP_OFFERS_HEADERS.indexOf("status") + 1).setValue(status);
      sheet.getRange(rowNumber, SHOP_OFFERS_HEADERS.indexOf("counterOffer") + 1).setValue(counterOffer || "");
      sheet.getRange(rowNumber, SHOP_OFFERS_HEADERS.indexOf("reviewedBy") + 1).setValue(reviewedBy || "");
      sheet.getRange(rowNumber, SHOP_OFFERS_HEADERS.indexOf("reviewedAt") + 1).setValue(new Date().toISOString());
      const row = sheet.getRange(rowNumber, 1, 1, SHOP_OFFERS_HEADERS.length).getValues()[0];
      return rowToShopOffer(row);
    }
  }

  throw new Error("Oferta no encontrada.");
}

function resolveShopImageUrl(input, name, id, currentUrl) {
  input = input || {};
  const rawImage = String(input.image || "").trim();
  const dataUrl = input.imageDataUrl || input.imageData || (rawImage.startsWith("data:") ? rawImage : "");

  if (dataUrl) {
    const fileName = safeFileName(`tienda_${name || "producto"}_${id || Date.now()}.jpg`);
    const uploaded = uploadDataUrlToDrive(dataUrl, CONFIG.FOLDERS.GALLERY, fileName);
    return makeDriveImageUrl(uploaded.fileId);
  }

  if (input.imageUrl !== undefined) return String(input.imageUrl || "").trim();
  if (input.image !== undefined && !rawImage.startsWith("data:")) return rawImage;

  return currentUrl || "";
}

function shopItemToRow(item) {
  return [
    item.id || makeId("shop"),
    item.createdAt || new Date().toISOString(),
    item.updatedAt || new Date().toISOString(),
    item.name || "",
    item.category || "General",
    item.description || "",
    Number(item.damage || 0),
    Number(item.durability || 0),
    Number(item.basePrice || 0),
    Number(item.memberPrice || item.basePrice || 0),
    Number(item.allyPrice || item.memberPrice || item.basePrice || 0),
    Number(item.stock || 0),
    item.imageUrl || item.image || "",
    item.status || "Activo",
    toBool(item.featured),
    item.notes || ""
  ];
}

function rowToShopItem(row) {
  return {
    id: row[0],
    createdAt: row[1],
    updatedAt: row[2],
    name: row[3],
    category: row[4] || "General",
    description: row[5] || "",
    damage: Number(row[6] || 0),
    durability: Number(row[7] || 0),
    basePrice: Number(row[8] || 0),
    memberPrice: Number(row[9] || row[8] || 0),
    allyPrice: Number(row[10] || row[9] || row[8] || 0),
    stock: Number(row[11] || 0),
    imageUrl: row[12] || "",
    image: row[12] || "",
    status: row[13] || "Activo",
    featured: toBool(row[14]),
    notes: row[15] || "",
    source: "apps-script"
  };
}

function rowToShopOrder(row) {
  return {
    id: row[0],
    createdAt: row[1],
    buyerDiscordId: String(row[2] || ""),
    buyerUsername: row[3] || "",
    buyerDisplayName: row[4] || "",
    buyerMemberId: row[5] || "",
    buyerName: row[6] || "",
    itemId: row[7],
    itemName: row[8],
    price: Number(row[9] || 0),
    quantity: Number(row[10] || 1),
    status: row[11] || "pending",
    message: row[12] || "",
    reviewedBy: row[13] || "",
    reviewedAt: row[14] || "",
    source: "apps-script"
  };
}

function rowToShopOffer(row) {
  return {
    id: row[0],
    createdAt: row[1],
    buyerDiscordId: String(row[2] || ""),
    buyerUsername: row[3] || "",
    buyerDisplayName: row[4] || "",
    buyerMemberId: row[5] || "",
    buyerName: row[6] || "",
    itemId: row[7],
    itemName: row[8],
    originalPrice: Number(row[9] || 0),
    offeredPrice: Number(row[10] || 0),
    message: row[11] || "",
    status: row[12] || "pending",
    counterOffer: row[13] || "",
    reviewedBy: row[14] || "",
    reviewedAt: row[15] || "",
    source: "apps-script"
  };
}

function toBool(value) {
  const text = String(value || "").toLowerCase().trim();
  return value === true || text === "true" || text === "sí" || text === "si" || text === "1" || text === "yes";
}

/* ------------------------------------------------------------
 GALLERY
------------------------------------------------------------ */
function appendGallery(item) {
  if (!item) throw new Error("Falta el objeto item.");
  if (!item.title) throw new Error("Falta title.");
  if (!item.image && !item.imageUrl) throw new Error("Falta image o imageUrl.");

  const id = item.id || makeId("gallery");
  const createdAt = new Date().toISOString();
  let driveFileId = "";
  let driveFileUrl = "";
  let imageUrl = String(item.imageUrl || "").trim();

  if (item.image) {
    const fileName = safeFileName(`${item.title}_${id}.jpg`);
    const uploaded = uploadDataUrlToDrive(item.image, CONFIG.FOLDERS.GALLERY, fileName);
    driveFileId = uploaded.fileId;
    driveFileUrl = uploaded.fileUrl;
    imageUrl = makeDriveImageUrl(uploaded.fileId);
  }

  const row = [
    id, createdAt, item.title, item.category || "Fotos oficiales",
    driveFileId, driveFileUrl || imageUrl, imageUrl, item.uploadedBy || ""
  ];

  const sheet = getSheet(CONFIG.TABS.GALLERY, GALLERY_HEADERS);
  sheet.appendRow(row);
  return rowToGallery(row);
}

function deleteGallery(id) {
  if (!id) throw new Error("Falta id de galería.");

  const rawId = String(id);
  const possibleFileId = rawId.startsWith("drive_") ? rawId.replace(/^drive_/, "") : rawId;
  const sheet = getSheet(CONFIG.TABS.GALLERY, GALLERY_HEADERS);
  const values = sheet.getDataRange().getValues();
  let deleted = false;

  // Borramos de abajo hacia arriba por si hay filas duplicadas del mismo archivo.
  for (let i = values.length - 1; i >= 1; i--) {
    const rowId = String(values[i][0] || "");
    const rowFileId = String(values[i][4] || "");

    if (rowId === rawId || rowId === possibleFileId || rowFileId === rawId || rowFileId === possibleFileId || (rowFileId && rawId === "drive_" + rowFileId)) {
      if (rowFileId) trashDriveFileQuietly(rowFileId);
      sheet.deleteRow(i + 1);
      deleted = true;
    }
  }

  // Compatibilidad: fotos que vienen directamente de la carpeta de Drive y no tienen fila en Sheets.
  if (!deleted && rawId.startsWith("drive_")) {
    trashDriveFileQuietly(possibleFileId);
    deleted = true;
  }

  // Otro caso: el frontend manda directamente el fileId.
  if (!deleted && isDriveFileUsable(possibleFileId)) {
    trashDriveFileQuietly(possibleFileId);
    deleted = true;
  }

  return deleted;
}


function listGallery() {
  const fromSheet = listGalleryFromSheet();
  const fromDrive = listGalleryFromDrive();
  const seen = {};
  const merged = [];

  fromSheet.concat(fromDrive).forEach(item => {
    const key = item.driveFileId || item.id;
    if (!key || seen[key]) return;
    seen[key] = true;
    merged.push(item);
  });

  return merged.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function listGalleryFromSheet() {
  const sheet = getSheet(CONFIG.TABS.GALLERY, GALLERY_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).filter(row => row[0]).map(rowToGallery).filter(isGalleryItemVisible);
}

function listGalleryFromDrive() {
  const folder = DriveApp.getFolderById(CONFIG.FOLDERS.GALLERY);
  const files = folder.getFiles();
  const items = [];

  while (files.hasNext()) {
    const file = files.next();
    if (typeof file.isTrashed === "function" && file.isTrashed()) continue;
    const mime = file.getMimeType() || "";
    if (!String(mime).startsWith("image/")) continue;

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (err) {}

    const fileId = file.getId();
    items.push({
      id: "drive_" + fileId,
      createdAt: file.getDateCreated().toISOString(),
      title: cleanTitleFromFileName(file.getName()),
      category: "Galería oficial",
      driveFileId: fileId,
      driveFileUrl: file.getUrl(),
      imageUrl: makeDriveImageUrl(fileId),
      image: makeDriveImageUrl(fileId),
      uploadedBy: "Drive",
      source: "drive"
    });
  }

  return items;
}

function rowToGallery(row) {
  const fileId = row[4] || "";
  const imageUrl = row[6] || (fileId ? makeDriveImageUrl(fileId) : row[5]);
  return {
    id: row[0],
    createdAt: row[1],
    title: row[2],
    category: row[3] || "Galería oficial",
    driveFileId: fileId,
    driveFileUrl: row[5] || "",
    imageUrl,
    image: imageUrl,
    uploadedBy: row[7] || "",
    source: "apps-script"
  };
}

function isGalleryItemVisible(item) {
  if (!item) return false;
  const fileId = String(item.driveFileId || "").trim();
  const image = String(item.image || item.imageUrl || "").trim();

  // Si la fila apunta a un archivo de Drive borrado/en papelera, no lo devolvemos.
  if (fileId && !isDriveFileUsable(fileId)) return false;

  // Evita tarjetas fantasma sin imagen.
  return Boolean(image || fileId);
}

function isDriveFileUsable(fileId) {
  if (!fileId) return false;
  try {
    const file = DriveApp.getFileById(fileId);
    if (typeof file.isTrashed === "function" && file.isTrashed()) return false;
    return true;
  } catch (err) {
    return false;
  }
}

function makeDriveImageUrl(fileId) {
  return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w1600";
}

function trashDriveFileQuietly(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
  } catch (err) {}
}

/* ------------------------------------------------------------
 HELPERS
------------------------------------------------------------ */
function uploadDataUrlToDrive(dataUrl, folderId, fileName) {
  const parsed = parseDataUrl(dataUrl);
  const bytes = Utilities.base64Decode(parsed.base64);
  const blob = Utilities.newBlob(bytes, parsed.mimeType, fileName);
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {}

  return { fileId: file.getId(), fileUrl: file.getUrl() };
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("La imagen no es un data URL base64 válido.");
  }
  return { mimeType: match[1], base64: match[2] };
}

function getSheet(tabName, headers) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = firstRow.some(value => value);

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function makeQuotaFileName(memberName, dateText) {
  const now = new Date();
  const stamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd_HHmmss");
  return safeFileName(`cuota_${memberName}_${dateText}_${stamp}.jpg`);
}

function safeFileName(name) {
  return String(name)
    .replace(/[\\/:*?"<>|#%{}~&]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 150);
}

function cleanTitleFromFileName(name) {
  return String(name)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .trim() || "Foto de galería";
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function checkSecret(secret) {
  if (!secret || secret !== CONFIG.SECRET) {
    throw new Error("Secret inválido.");
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}