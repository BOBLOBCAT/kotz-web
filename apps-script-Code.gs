/************************************************************
 * KoTZ Storage API
 * Guarda cuotas en Google Sheets y capturas/fotos en Google Drive.
 * Ejecutar como: Tú
 * Acceso: Cualquiera
 ************************************************************/

const CONFIG = {
  // Debe coincidir con GOOGLE_APPS_SCRIPT_SECRET del .env
  SECRET: "CAMBIA_ESTA_CLAVE_PRIVADA_KOTZ_2026",

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
    EVENTS: "events"
  }
};

const DUES_HEADERS = [
  "id", "createdAt", "discordId", "discordUsername", "discordDisplayName",
  "memberId", "memberName", "server", "date", "amount",
  "driveFileId", "driveFileUrl", "status", "comment", "reviewedBy", "reviewedAt"
];

const GALLERY_HEADERS = [
  "id", "createdAt", "title", "category", "driveFileId", "driveFileUrl", "imageUrl", "uploadedBy"
];

const MEMBERS_HEADERS = [
  "id", "rpName", "discordUsername", "discordId", "rank", "joinDate", "status", "profileUrl", "notes"
];

function doGet(e) {
  try {
    const action = e.parameter.action || "status";

    if (action === "status") {
      return jsonResponse({ ok: true, service: "KoTZ Storage API", sheetId: CONFIG.SHEET_ID, tabs: CONFIG.TABS, folders: CONFIG.FOLDERS });
    }

    if (action === "listDues") {
      checkSecret(e.parameter.secret);
      return jsonResponse({ ok: true, dues: listDues() });
    }

    if (action === "listGallery") {
      checkSecret(e.parameter.secret);
      return jsonResponse({ ok: true, items: listGallery() });
    }

    if (action === "listMembers") {
      checkSecret(e.parameter.secret);
      return jsonResponse({ ok: true, members: listMembers() });
    }

    return jsonResponse({ ok: false, error: "Acción GET no reconocida." }, 400);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) }, 500);
  }
}

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
      return jsonResponse({ ok: true, deleted: deleteGallery(body.id) });
    }

    if (body.action === "updateMember") {
      const member = updateMember(body.id, body.patch || {});
      return jsonResponse({ ok: true, member });
    }

    return jsonResponse({ ok: false, error: "Acción POST no reconocida." }, 400);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) }, 500);
  }
}

function appendDue(due) {
  if (!due) throw new Error("Falta el objeto due.");
  if (!due.memberId) throw new Error("Falta memberId.");
  if (!due.memberName) throw new Error("Falta memberName.");
  if (!due.server) throw new Error("Falta server.");
  if (!due.date) throw new Error("Falta date.");
  if (!due.proofImage) throw new Error("Falta proofImage.");

  const id = due.id || makeId("due");
  const createdAt = new Date().toISOString();
  const uploaded = uploadDataUrlToDrive(due.proofImage, CONFIG.FOLDERS.QUOTAS, makeQuotaFileName(due.memberName, due.date));

  const row = [
    id, createdAt, due.discordId || "", due.discordUsername || "", due.discordDisplayName || "",
    due.memberId, due.memberName, due.server, due.date, Number(due.amount || 300),
    uploaded.fileId, uploaded.fileUrl, "pending", "", "", ""
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
  if (!["pending", "approved", "rejected"].includes(status)) throw new Error("Estado inválido.");

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

function appendGallery(item) {
  if (!item) throw new Error("Falta el objeto item.");
  if (!item.title) throw new Error("Falta title.");
  if (!item.image) throw new Error("Falta image.");

  const id = item.id || makeId("gallery");
  const createdAt = new Date().toISOString();
  const uploaded = uploadDataUrlToDrive(item.image, CONFIG.FOLDERS.GALLERY, safeFileName(`${item.title}_${id}.jpg`));

  const imageUrl = makeDriveImageUrl(uploaded.fileId);
  const row = [
    id, createdAt, item.title, item.category || "Galería oficial",
    uploaded.fileId, uploaded.fileUrl, imageUrl, item.uploadedBy || ""
  ];

  const sheet = getSheet(CONFIG.TABS.GALLERY, GALLERY_HEADERS);
  sheet.appendRow(row);
  return rowToGalleryItem(row);
}

function listGallery() {
  const sheetItems = listGalleryFromSheet();
  const folderItems = listGalleryFromDriveFolder();
  const seen = {};
  const all = [];

  sheetItems.concat(folderItems).forEach(item => {
    const key = item.driveFileId || item.id;
    if (!key || seen[key]) return;
    seen[key] = true;
    all.push(item);
  });

  return all.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function listGalleryFromSheet() {
  const sheet = getSheet(CONFIG.TABS.GALLERY, GALLERY_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).filter(row => row[0]).map(rowToGalleryItem);
}

function listGalleryFromDriveFolder() {
  const folder = DriveApp.getFolderById(CONFIG.FOLDERS.GALLERY);
  const files = folder.getFiles();
  const items = [];

  while (files.hasNext()) {
    const file = files.next();
    const mime = file.getMimeType() || "";
    if (!mime.startsWith("image/")) continue;

    // Para que el navegador pueda pintar la imagen en la galería pública.
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}

    const fileId = file.getId();
    items.push({
      id: `drive_${fileId}`,
      createdAt: file.getDateCreated().toISOString(),
      title: cleanTitleFromFileName(file.getName()),
      category: "Galería oficial",
      driveFileId: fileId,
      driveFileUrl: file.getUrl(),
      imageUrl: makeDriveImageUrl(fileId),
      image: makeDriveImageUrl(fileId),
      uploadedBy: "Drive"
    });
  }
  return items;
}

function deleteGallery(id) {
  if (!id) throw new Error("Falta id de galería.");
  const sheet = getSheet(CONFIG.TABS.GALLERY, GALLERY_HEADERS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}


function listMembers() {
  const sheet = getSheet(CONFIG.TABS.MEMBERS, MEMBERS_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).filter(row => row[0] || row[1] || row[2] || row[3]).map(rowToMember);
}

function updateMember(id, patch) {
  if (!id) throw new Error("Falta id de miembro.");
  const sheet = getSheet(CONFIG.TABS.MEMBERS, MEMBERS_HEADERS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      const rowNumber = i + 1;
      const allowed = {
        rpName: "rpName",
        name: "rpName",
        discordUsername: "discordUsername",
        discord: "discordUsername",
        discordId: "discordId",
        rank: "rank",
        joinDate: "joinDate",
        joined: "joinDate",
        status: "status",
        profileUrl: "profileUrl",
        notes: "notes"
      };

      Object.keys(patch || {}).forEach(key => {
        const header = allowed[key];
        if (!header) return;
        const col = MEMBERS_HEADERS.indexOf(header) + 1;
        if (col > 0) sheet.getRange(rowNumber, col).setValue(patch[key]);
      });

      const updated = sheet.getRange(rowNumber, 1, 1, MEMBERS_HEADERS.length).getValues()[0];
      return rowToMember(updated);
    }
  }

  throw new Error("Miembro no encontrado.");
}

function uploadDataUrlToDrive(dataUrl, folderId, fileName) {
  const parsed = parseDataUrl(dataUrl);
  const bytes = Utilities.base64Decode(parsed.base64);
  const blob = Utilities.newBlob(bytes, parsed.mimeType, fileName);
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return { fileId: file.getId(), fileUrl: file.getUrl() };
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("La imagen no es un data URL base64 válido.");
  return { mimeType: match[1], base64: match[2] };
}

function getSheet(tabName, headers) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) sheet = ss.insertSheet(tabName);

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = firstRow.some(value => value);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function rowToDue(row) {
  return {
    id: row[0], createdAt: row[1], discordId: row[2], discordUsername: row[3], discordDisplayName: row[4],
    memberId: row[5], memberName: row[6], server: row[7], date: row[8], amount: row[9],
    driveFileId: row[10], driveFileUrl: row[11], proof: row[11] ? "Captura adjunta" : "",
    proofImage: row[11] || "", status: row[12] || "pending", comment: row[13] || "",
    reviewedBy: row[14] || "", reviewedAt: row[15] || "", source: "apps-script"
  };
}

function rowToGalleryItem(row) {
  const fileId = row[4] || "";
  const imageUrl = row[6] || (fileId ? makeDriveImageUrl(fileId) : "");
  return {
    id: row[0], createdAt: row[1], title: row[2], category: row[3] || "Galería oficial",
    driveFileId: fileId, driveFileUrl: row[5] || "", imageUrl, image: imageUrl,
    uploadedBy: row[7] || "", source: "apps-script"
  };
}


function rowToMember(row) {
  return {
    id: row[0],
    rpName: row[1],
    name: row[1],
    discordUsername: String(row[2] || "").replace(/^@/, ""),
    discord: row[2] ? (String(row[2]).startsWith("@") ? row[2] : "@" + row[2]) : "",
    discordId: String(row[3] || ""),
    rank: row[4] || "Soldado",
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

function makeDriveImageUrl(fileId) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`;
}

function makeQuotaFileName(memberName, dateText) {
  const now = new Date();
  const stamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd_HHmmss");
  return safeFileName(`cuota_${memberName}_${dateText}_${stamp}.jpg`);
}

function safeFileName(name) {
  return String(name).replace(/[\\/:*?"<>|#%{}~&]/g, "_").replace(/\s+/g, "_").slice(0, 150);
}

function cleanTitleFromFileName(name) {
  return String(name).replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim() || "Foto de galería";
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function checkSecret(secret) {
  if (!secret || secret !== CONFIG.SECRET) throw new Error("Secret inválido.");
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data, null, 2)).setMimeType(ContentService.MimeType.JSON);
}
