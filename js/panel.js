/* ==========================================================================
   KoTZ — PANEL PRIVADO (Alto Mando)
   ==========================================================================
   Acceso protegido por Discord OAuth cuando se ejecuta con server.js.
   El backend verifica los roles del usuario dentro del servidor de KoTZ
   antes de permitir acceder al Panel Alto Mando.
   ========================================================================== */

let isAuthed = false;

const panelRoutes = {
  '/resumen': viewResumen,
  '/miembros': viewMiembros,
  '/cuotas': viewCuotas,
  '/sanciones': viewSanciones,
  '/tienda': viewTienda,
  '/estadisticas': viewEstadisticas,
  '/galeria': viewGaleria,
};

const panelNav = [
  ['/resumen','Resumen','◈'],
  ['/miembros','Miembros','☰'],
  ['/cuotas','Cuotas','◆'],
  ['/sanciones','Sanciones','⚑'],
  ['/tienda','Tienda','▰'],
  ['/estadisticas','Estadísticas','▤'],
  ['/galeria','Galería','▣'],
];


async function panelFetchSession(){
  try {
    const res = await fetch('/api/auth/me', { credentials:'same-origin' });
    if (!res.ok) return null;
    return await res.json();
  } catch(e){ return null; }
}

async function panelSyncDues(){
  try {
    const res = await fetch('/api/dues', { credentials:'same-origin' });
    if (res.ok){
      const data = await res.json();
      KotzStore.setBackendDues(data.dues || []);
    }
  } catch(e) {
    // Modo local sin backend: se mantiene localStorage.
  }
}

async function panelSyncGallery(){
  try {
    const res = await fetch('/api/gallery', { credentials:'same-origin' });
    if (res.ok){
      const data = await res.json();
      KotzStore.setBackendGallery(data.items || []);
    }
  } catch(e) {
    // Modo local sin backend: se mantiene localStorage.
  }
}


async function panelSyncMembers(){
  try {
    const res = await fetch('/api/members', { credentials:'same-origin' });
    if (res.ok){
      const data = await res.json();
      KotzStore.setBackendMembers(data.members || []);
    }
  } catch(e) {
    // Modo local sin backend: se mantiene la lista de ejemplo del código.
  }
}

async function panelSyncSanctions(){
  try {
    const res = await fetch('/api/sanctions', { credentials:'same-origin' });
    if (res.ok){
      const data = await res.json();
      KotzStore.setBackendSanctions(data.sanctions || []);
    }
  } catch(e) {
    // Modo local sin backend: se mantiene local.
  }
}


async function panelSyncShop(){
  try {
    const [itemsRes, ordersRes, offersRes] = await Promise.all([
      fetch('/api/shop/items', { credentials:'same-origin' }),
      fetch('/api/shop/orders', { credentials:'same-origin' }),
      fetch('/api/shop/offers', { credentials:'same-origin' })
    ]);
    if (itemsRes.ok){ const data = await itemsRes.json(); KotzStore.setBackendShopItems(data.items || []); }
    if (ordersRes.ok){ const data = await ordersRes.json(); KotzStore.setBackendShopOrders(data.orders || []); }
    if (offersRes.ok){ const data = await offersRes.json(); KotzStore.setBackendShopOffers(data.offers || []); }
  } catch(e) {
    // Sin backend: no hay tienda persistente.
  }
}

async function panelSaveShopItem(payload, id=''){
  try {
    const res = await fetch(id ? `/api/shop/items/${encodeURIComponent(id)}` : '/api/shop/items', {
      method: id ? 'PATCH' : 'POST',
      credentials:'same-origin',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok){ const data = await res.json().catch(() => ({})); throw new Error(data.error || 'No se pudo guardar el producto.'); }
    await panelSyncShop();
    panelRouter();
  } catch(err){
    alert('No se pudo guardar el producto: ' + (err.message || err));
  }
}

async function panelSetShopOrderStatus(id, status){
  try {
    const res = await fetch(`/api/shop/orders/${encodeURIComponent(id)}/status`, {
      method:'PATCH', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ status })
    });
    if (!res.ok){ const data = await res.json().catch(() => ({})); throw new Error(data.error || 'No se pudo actualizar el pedido.'); }
    await panelSyncShop();
    panelRouter();
  } catch(err){ alert('No se pudo actualizar el pedido: ' + (err.message || err)); }
}

async function panelSetShopOfferStatus(id, status, counterOffer=''){
  try {
    const res = await fetch(`/api/shop/offers/${encodeURIComponent(id)}/status`, {
      method:'PATCH', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ status, counterOffer })
    });
    if (!res.ok){ const data = await res.json().catch(() => ({})); throw new Error(data.error || 'No se pudo actualizar la oferta.'); }
    await panelSyncShop();
    panelRouter();
  } catch(err){ alert('No se pudo actualizar la oferta: ' + (err.message || err)); }
}

async function panelCreateSanction(payload){
  let response;
  try {
    response = await fetch('/api/sanctions', {
      method:'POST',
      credentials:'same-origin',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
  } catch(networkErr){
    console.error('[KoTZ] No se pudo contactar con el servidor para guardar sanción:', networkErr);
    KotzStore.addSanction(payload.memberId, payload);
    alert('No se pudo contactar con el servidor. La sanción solo se ha aplicado en este navegador.');
    panelRouter();
    return;
  }

  if (response.ok){
    await panelSyncSanctions();
    panelRouter();
    return;
  }

  let serverError = 'No se pudo guardar la sanción en Google Sheets.';
  try { const data = await response.json(); serverError = data.error || serverError; } catch(e) {}
  console.error('[KoTZ] POST /api/sanctions respondió con error:', response.status, serverError);
  alert('No se pudo guardar la sanción: ' + serverError);
  await panelSyncSanctions();
  panelRouter();
}

async function panelUpdateMember(id, patch){
  let response;
  try {
    response = await fetch(`/api/members/${encodeURIComponent(id)}`, {
      method:'PATCH',
      credentials:'same-origin',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(patch)
    });
  } catch(networkErr){
    console.error('[KoTZ] No se pudo contactar con el servidor para actualizar miembro:', networkErr);
    KotzStore.updateMember(id, patch);
    alert('No se pudo contactar con el servidor. El cambio solo se aplicó en este navegador.');
    panelRouter();
    return;
  }

  if (response.ok){
    const data = await response.json();
    KotzStore.updateMember(id, data.member || patch);
    await panelSyncMembers();
    panelRouter();
    return;
  }

  let serverError = 'No se pudo guardar el miembro en Google Sheets.';
  try { const data = await response.json(); serverError = data.error || serverError; } catch(e) {}
  alert('No se pudo guardar el cambio: ' + serverError);
  await panelSyncMembers();
  panelRouter();
}

async function panelSetDueStatus(memberId, dueId, status, comment=''){
  let response;
  try {
    response = await fetch(`/api/dues/${encodeURIComponent(dueId)}/status`, {
      method:'PATCH',
      credentials:'same-origin',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ status, comment })
    });
  } catch (networkErr) {
    // De verdad no hay servidor al que hablarle: aquí sí tiene sentido el fallback local.
    console.error('[KoTZ] No se pudo contactar con el servidor para actualizar la cuota:', networkErr);
    KotzStore.setDueStatus(memberId, dueId, status, comment);
    alert('No se pudo contactar con el servidor. El cambio solo se ha aplicado en este navegador.');
    panelRouter();
    return;
  }

  if (response.ok){
    await panelSyncDues();
    panelRouter();
    return;
  }

  // El servidor respondió pero falló (p.ej. Google Sheets dio error): NO fingimos éxito.
  let serverError = 'No se pudo actualizar la cuota en el servidor.';
  try {
    const data = await response.json();
    serverError = data.error || serverError;
  } catch (parseErr) {
    serverError = `Error del servidor (${response.status}).`;
  }
  console.error('[KoTZ] PATCH /api/dues/:id/status respondió con error:', response.status, serverError);
  alert('No se pudo guardar el cambio: ' + serverError);
}

function panelRouter(){
  const path = location.hash.replace('#','') || '/resumen';
  const render = panelRoutes[path] || viewResumen;
  document.getElementById('panelView').innerHTML = render();
  document.querySelectorAll('.side-link').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + path));
  bindPanelEvents(path);
}

function mountApp(){
  document.getElementById('loginScreen').style.display = 'none';
  const app = document.getElementById('panelApp');
  app.style.display = 'flex';
  app.innerHTML = `
    <aside class="sidebar">
      <a href="index.html" class="brand" style="padding:0 26px; margin-bottom:36px;">
        <img class="crest-img" src="assets/crest.png" alt="Escudo KoTZ" style="width:32px;height:32px;">
        <span class="brand-name" style="font-size:1.15rem;">Ko<span>TZ</span></span>
      </a>
      <nav class="side-nav">
        ${panelNav.map(([path,label,icon]) => `<a href="#${path}" class="side-link"><span class="side-icon">${icon}</span>${label}</a>`).join('')}
      </nav>
      <div class="side-foot">
        <a href="index.html" class="side-link">← Volver al sitio</a>
        <button class="side-link" id="logoutBtn" style="background:none;border:none;text-align:left;width:100%;cursor:pointer;">Cerrar sesión</button>
      </div>
    </aside>
    <div class="panel-main">
      <div class="panel-topbar">
        <div class="pill pill-green">Alto Mando · Sesión Discord activa</div>
        <div class="topbar-date" id="topbarDate"></div>
      </div>
      <main id="panelView" class="panel-content"></main>
    </div>
  `;
  document.getElementById('topbarDate').textContent = new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  document.getElementById('logoutBtn').addEventListener('click', async () => { try { await fetch('/api/logout', { method:'POST', credentials:'same-origin' }); } catch(e) {} isAuthed = false; location.href='index.html'; });
  document.querySelectorAll('.crest-img').forEach(img => img.src = 'assets/crest.png');
  window.addEventListener('hashchange', panelRouter);
  panelRouter();
  Promise.all([panelSyncMembers(), panelSyncDues(), panelSyncGallery(), panelSyncSanctions(), panelSyncShop()]).then(panelRouter);
}

/* ---------------------------------------------------------------- LOGIN */
function initLogin(){
  const loginScreen = document.getElementById('loginScreen');
  panelFetchSession().then(session => {
    if (session?.loggedIn && session.accessLevel === 'alto-mando'){
      KotzStore.setAuthUser(session.user);
      isAuthed = true;
      mountApp();
      return;
    }
    if (location.protocol !== 'file:'){
      location.href = '/auth/discord?next=/panel.html';
      return;
    }
    if (loginScreen){
      loginScreen.style.display = 'flex';
      const hint = document.getElementById('loginHint');
      if (hint) hint.textContent = 'Modo local: inicia la web con npm start para usar Discord OAuth.';
    }
  });
}

/* --------------------------------------------------------------- RESUMEN */
function viewResumen(){
  const s = KotzStore.stats();
  const dues = KotzStore.getAllDues().filter(d => d.status === 'pending').slice(0,4);
  return `
  <div class="view-head">
    <div class="eyebrow">Panel de control</div>
    <h1 class="h2">Resumen general</h1>
  </div>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-num">${s.activeMembers}</div><div class="kpi-label">Miembros activos</div></div>
    <div class="kpi-card"><div class="kpi-num">${s.pendingMembers}</div><div class="kpi-label">Miembros pendientes</div></div>
    <div class="kpi-card"><div class="kpi-num">${s.duesPending}</div><div class="kpi-label">Cuotas por revisar</div></div>
    <div class="kpi-card"><div class="kpi-num">${s.openSanctions}</div><div class="kpi-label">Sanciones registradas</div></div>
    <div class="kpi-card"><div class="kpi-num">${s.shopPending || 0}</div><div class="kpi-label">Pedidos/ofertas tienda</div></div>
    <div class="kpi-card"><div class="kpi-num">${s.alliances}</div><div class="kpi-label">Alianzas activas</div></div>
  </div>

  <div class="panel-grid-2">
    <div class="card pad">
      <div class="eyebrow">Cuotas por revisar</div>
      ${dues.length ? dues.map(d => `
        <div class="mini-row">
          <div><b>${d.memberName}</b><span class="mini-sub">${d.date} · ${d.server}</span></div>
          <span class="pill pill-yellow">Pendiente</span>
        </div>`).join('') : '<p class="lede">Todas las cuotas están al día.</p>'}
      <a href="#/cuotas" class="btn btn-ghost btn-sm" style="margin-top:16px;">Ver todas</a>
    </div>
  </div>`;
}

/* -------------------------------------------------------------- MIEMBROS */
let memberFilter = { q:'', rank:'Todos', status:'Todos' };

function viewMiembros(){
  const ranks = ['Todos', ...KotzStore.getRanks()];
  return `
  <div class="view-head">
    <div class="eyebrow">Gestión</div>
    <h1 class="h2">Miembros</h1>
  </div>
  <div class="toolbar">
    <input type="text" id="memberSearch" placeholder="Buscar por nombre o Discord..." value="${memberFilter.q}">
    <select id="rankFilter">${ranks.map(r => `<option ${r===memberFilter.rank?'selected':''}>${r}</option>`).join('')}</select>
    <select id="statusFilter">
      ${['Todos','Activo','Pendiente','Expulsado'].map(s => `<option ${s===memberFilter.status?'selected':''}>${s}</option>`).join('')}
    </select>
  </div>
  <div class="table-wrap card">
    <table class="kotz-table">
      <thead><tr><th>Nombre RP</th><th>Discord</th><th>Rango</th><th>Ingreso</th><th>Estado</th><th></th></tr></thead>
      <tbody id="membersBody"></tbody>
    </table>
  </div>
  <div id="memberModalRoot"></div>`;
}

function renderMembersBody(){
  const ranks = KotzStore.getRanks();
  const rows = KotzStore.getMembers().filter(m => {
    const matchesQ = (m.name+m.discord).toLowerCase().includes(memberFilter.q.toLowerCase());
    const matchesRank = memberFilter.rank === 'Todos' || m.rank === memberFilter.rank;
    const matchesStatus = memberFilter.status === 'Todos' || m.status === memberFilter.status;
    return matchesQ && matchesRank && matchesStatus;
  });
  const statusPill = st => st === 'Activo' ? 'pill-green' : st === 'Pendiente' ? 'pill-yellow' : 'pill-red';
  document.getElementById('membersBody').innerHTML = rows.map(m => `
    <tr>
      <td><b>${m.name}</b></td>
      <td class="mono-cell">${m.discord}</td>
      <td>
        <select class="inline-select" data-action="rank" data-id="${m.id}">
          ${ranks.map(r => `<option ${r===m.rank?'selected':''}>${r}</option>`).join('')}
        </select>
      </td>
      <td class="mono-cell">${m.joined}</td>
      <td>
        <select class="inline-select" data-action="status" data-id="${m.id}">
          ${['Activo','Pendiente','Expulsado'].map(s => `<option ${s===m.status?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td><button class="btn btn-ghost btn-sm" data-action="open" data-id="${m.id}">Ver ficha</button></td>
    </tr>`).join('') || `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--bone-faint);">Sin resultados</td></tr>`;
}

function openMemberModal(id){
  const m = KotzStore.getMember(id);
  const sanctions = KotzStore.getSanctionsForMember(id);
  const dues = KotzStore.getDuesForMember(id);
  document.getElementById('memberModalRoot').innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal">
        <div class="modal-head">
          <div><div class="eyebrow" style="margin-bottom:4px;">Ficha de miembro</div><h3 class="h3">${m.name}</h3></div>
          <button class="modal-close" id="modalClose">✕</button>
        </div>
        <div class="modal-body">
          <div class="field"><label>Notas internas (solo Alto Mando)</label>
            <textarea id="memberNotes" rows="3">${m.notes||''}</textarea>
          </div>
          <button class="btn btn-primary btn-sm" id="saveNotes">Guardar notas</button>
          <div class="divider" style="margin:22px 0;"></div>
          <div class="eyebrow">Historial de sanciones</div>
          ${sanctions.length ? sanctions.map(s => `
            <div class="mini-row"><div><b>${s.reason}</b><span class="mini-sub">${s.date} · Responsable: ${s.responsible}</span></div><span class="pill pill-red">${s.severity}</span></div>
          `).join('') : '<p class="lede" style="margin-bottom:16px;">Sin sanciones registradas.</p>'}
          <div class="divider" style="margin:22px 0;"></div>
          <div class="eyebrow">Historial de cuotas</div>
          ${dues.length ? dues.map(d => `
            <div class="mini-row"><div><b>${d.date}</b><span class="mini-sub">${d.server} · ${d.proof}</span></div><span class="pill ${d.status==='approved'?'pill-green':d.status==='rejected'?'pill-red':'pill-yellow'}">${d.status}</span></div>
          `).join('') : '<p class="lede">Sin cuotas registradas.</p>'}
        </div>
      </div>
    </div>`;
  document.getElementById('modalClose').addEventListener('click', closeMemberModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => { if (e.target.id==='modalBackdrop') closeMemberModal(); });
  document.getElementById('saveNotes').addEventListener('click', async () => {
    await panelUpdateMember(id, { notes: document.getElementById('memberNotes').value });
    closeMemberModal();
  });
}
function closeMemberModal(){ document.getElementById('memberModalRoot').innerHTML = ''; }

/* ---------------------------------------------------------------- CUOTAS */
function viewCuotas(){
  const dues = KotzStore.getAllDues();
  const approved = dues.filter(d => d.status === 'approved').length;
  const pending = dues.filter(d => d.status === 'pending').length;
  const weekly = KotzStore.getWeeklyDues();
  const maxW = Math.max(...weekly.map(w => w.amount));
  return `
  <div class="view-head">
    <div class="eyebrow">Finanzas internas</div>
    <h1 class="h2">Cuotas</h1>
  </div>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-num">${approved}</div><div class="kpi-label">Cuotas aprobadas</div></div>
    <div class="kpi-card"><div class="kpi-num">${pending}</div><div class="kpi-label">Pendientes de revisión</div></div>
    <div class="kpi-card"><div class="kpi-num">${weekly.reduce((a,w)=>a+w.amount,0)} R$</div><div class="kpi-label">Total recaudado</div></div>
  </div>
  <div class="chart-card" style="margin-bottom:28px;">
    <div class="eyebrow">Recaudación semanal</div>
    <div class="bars">
      ${weekly.map(w => `<div class="bar-col"><div class="bar" style="height:${(w.amount/maxW*100).toFixed(0)}%"></div><span class="bar-label">${w.week}</span></div>`).join('')}
    </div>
  </div>
  <div class="table-wrap card">
    <table class="kotz-table">
      <thead><tr><th>Miembro</th><th>Fecha</th><th>Servidor</th><th>Comprobante</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody id="duesBody">
        ${dues.map(d => `
          <tr>
            <td><b>${d.memberName}</b></td>
            <td class="mono-cell">${d.date}</td>
            <td class="mono-cell">${d.server}</td>
            <td class="mono-cell">${d.proofImage ? `<a class="btn btn-ghost btn-sm" href="${d.proofImage}" target="_blank" rel="noopener">Ver captura</a>` : (d.proof || '—')}</td>
            <td><span class="pill ${d.status==='approved'?'pill-green':d.status==='rejected'?'pill-red':'pill-yellow'}">${d.status==='approved'?'Pagado':d.status==='rejected'?'Rechazado':'Pendiente'}</span></td>
            <td class="actions-cell">
              ${d.status === 'pending' ? `
                <button class="btn btn-ok btn-sm" data-action="approve-due" data-member="${d.memberId}" data-due="${d.id}">Aprobar</button>
                <button class="btn btn-danger btn-sm" data-action="reject-due" data-member="${d.memberId}" data-due="${d.id}">Rechazar</button>
              ` : `<span class="mini-sub">${d.comment||'—'}</span>`}
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

/* ------------------------------------------------------------- SANCIONES */
function viewSanciones(){
  const members = KotzStore.getMembers();
  const sanctions = KotzStore.getAllSanctions().sort((a,b) => b.date.localeCompare(a.date));
  return `
  <div class="view-head">
    <div class="eyebrow">Disciplina interna</div>
    <h1 class="h2">Sanciones</h1>
  </div>
  <div class="card pad" style="margin-bottom:28px;">
    <div class="eyebrow">Nueva sanción</div>
    <form id="sanctionForm">
      <div class="field-row">
        <div class="field"><label>Miembro</label>
          <select name="memberId" required>${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Gravedad</label>
          <select name="severity" required><option>Leve</option><option>Grave</option><option>Muy grave</option></select>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Responsable</label><input type="text" name="responsible" value="${KotzStore.getAuthUser()?.displayName || KotzStore.getAuthUser()?.globalName || KotzStore.getAuthUser()?.username || ''}" required></div>
        <div class="field"><label>Fecha</label><input type="date" name="date" value="${new Date().toISOString().slice(0,10)}" required></div>
      </div>
      <div class="field"><label>Motivo</label><textarea name="reason" rows="2" required></textarea></div>
      <button type="submit" class="btn btn-primary">Registrar sanción</button>
    </form>
  </div>
  <div class="table-wrap card">
    <table class="kotz-table">
      <thead><tr><th>Miembro</th><th>Motivo</th><th>Responsable</th><th>Fecha</th><th>Gravedad</th></tr></thead>
      <tbody>
        ${sanctions.map(s => `
          <tr><td><b>${s.memberName}</b></td><td>${s.reason}</td><td>${s.responsible}</td><td class="mono-cell">${s.date}</td>
          <td><span class="pill ${s.severity==='Leve'?'pill-yellow':'pill-red'}">${s.severity}</span></td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--bone-faint);">Sin sanciones registradas</td></tr>`}
      </tbody>
    </table>
  </div>`;
}

/* -------------------------------------------------------------- GALERIA */
function viewGaleria(){
  const items = KotzStore.getGallery();
  return `
  <div class="view-head">
    <div class="eyebrow">Archivo visual</div>
    <h1 class="h2">Galería</h1>
    <p class="lede">Ahora puedes añadir fotos subiéndolas desde tu dispositivo o pegando una URL directa. Si Google está configurado, las fotos se guardan en Google Drive y el registro queda en Google Sheets. Si no hay backend/Google, se usa guardado local de emergencia.</p>
  </div>

  <div class="card pad" style="margin-bottom:28px;">
    <div class="eyebrow">Añadir nueva foto</div>
    <form id="galleryForm">
      <div class="field-row">
        <div class="field"><label>Título</label><input type="text" name="title" placeholder="Foto oficial de KoTZ" required></div>
        <div class="field"><label>Categoría</label><input type="text" name="category" placeholder="Fotos oficiales" required></div>
      </div>

      <div class="field">
        <label>Método de imagen</label>
        <select name="imageMode" id="imageMode">
          <option value="file">Subir foto desde mi dispositivo</option>
          <option value="url">Pegar URL directa de imagen</option>
        </select>
      </div>

      <div class="field" id="galleryFileBox">
        <label>Foto desde tu dispositivo</label>
        <input type="file" name="image" accept="image/*">
        <p class="mini-sub">La imagen se comprimirá automáticamente para evitar errores de almacenamiento.</p>
      </div>

      <div class="field" id="galleryUrlBox" style="display:none;">
        <label>URL directa de imagen</label>
        <input type="url" name="imageUrl" placeholder="https://.../foto.png">
        <p class="mini-sub">También puedes usar rutas del proyecto como <b>assets/gallery/foto.jpg</b>.</p>
      </div>

      <img id="galleryPreview" class="photo-preview" alt="Vista previa">
      <div id="galleryError" class="form-error" style="display:none; margin-top:12px;"></div>
      <button type="submit" class="btn btn-primary">Guardar foto</button>
    </form>
  </div>

  <div class="card pad" style="margin-bottom:28px;">
    <div class="eyebrow">Herramientas</div>
    <p class="lede" style="font-size:.9rem; margin-bottom:14px;">Las fotos guardadas en Google Drive se comparten con toda la web. Las herramientas de exportar/importar siguen disponibles para el modo local.</p>
    <div class="actions-cell">
      <button class="btn btn-ghost btn-sm" id="exportGallery">Exportar galería JSON</button>
      <label class="btn btn-ghost btn-sm" style="cursor:pointer;">
        Importar JSON
        <input type="file" id="importGallery" accept="application/json" style="display:none;">
      </label>
      <button class="btn btn-danger btn-sm" id="clearExtraGallery">Borrar fotos añadidas</button>
    </div>
  </div>

  <div class="gallery-admin-grid">
    ${items.map(g => `
      <div class="card pad gallery-admin-card" ${g.image ? `style="background-image:url('${g.image}')"` : ''}>
        <span class="pill pill-yellow">${g.category}</span>
        <h3 class="h3" style="margin-top:58px; margin-bottom:8px;">${g.title}</h3>
        ${(KotzStore.isExtraGalleryItem(g.id) || KotzStore.isBackendGalleryItem(g.id)) ? `<button class="btn btn-danger btn-sm" data-action="delete-photo" data-id="${g.id}">Eliminar</button>` : `<span class="mini-sub">Foto fija / ejemplo</span>`}
      </div>`).join('')}
  </div>`;
}

function compressImageFile(file, maxSize = 1400, quality = 0.82){
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('El archivo seleccionado no es una imagen.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function downloadTextFile(filename, text){
  const blob = new Blob([text], { type:'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


/* ---------------------------------------------------------------- TIENDA */
function viewTienda(){
  const items = KotzStore.getShopItems();
  const orders = KotzStore.getShopOrders();
  const offers = KotzStore.getShopOffers();
  const pill = status => status === 'pending' ? 'pill-yellow' : ['approved','accepted','delivered'].includes(status) ? 'pill-green' : status === 'countered' ? 'pill-yellow' : 'pill-red';
  return `
  <div class="view-head">
    <div class="eyebrow">Economía RP</div>
    <h1 class="h2">Tienda</h1>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-num">${items.length}</div><div class="kpi-label">Productos configurados</div></div>
    <div class="kpi-card"><div class="kpi-num">${items.filter(i => i.status === 'Activo').length}</div><div class="kpi-label">Productos activos</div></div>
    <div class="kpi-card"><div class="kpi-num">${orders.filter(o => o.status === 'pending').length}</div><div class="kpi-label">Pedidos pendientes</div></div>
    <div class="kpi-card"><div class="kpi-num">${offers.filter(o => o.status === 'pending').length}</div><div class="kpi-label">Ofertas pendientes</div></div>
  </div>

  <div class="card pad" style="margin-bottom:24px;">
    <div class="eyebrow">Nuevo producto RP</div>
    <form id="shopItemForm" class="form-grid">
      <div class="field"><label>Nombre</label><input name="name" required placeholder="Escopeta, Bate, etc."></div>
      <div class="field"><label>Categoría</label><input name="category" placeholder="Arma larga / Cuerpo a cuerpo / Herramienta"></div>
      <div class="field"><label>Daño</label><input name="damage" type="number" min="0" value="0"></div>
      <div class="field"><label>Durabilidad</label><input name="durability" type="number" min="0" value="0"></div>
      <div class="field"><label>Precio normal</label><input name="basePrice" type="number" min="0" value="0"></div>
      <div class="field"><label>Precio miembros</label><input name="memberPrice" type="number" min="0" value="0"></div>
      <div class="field"><label>Precio aliados</label><input name="allyPrice" type="number" min="0" value="0"></div>
      <div class="field"><label>Stock</label><input name="stock" type="number" min="0" value="1"></div>
      <div class="field"><label>Estado</label><select name="status"><option>Activo</option><option>Oculto</option><option>Agotado</option></select></div>
      <div class="field"><label>Destacado</label><select name="featured"><option value="false">No</option><option value="true">Sí</option></select></div>
      <div class="field" style="grid-column:1/-1;"><label>Imagen URL</label><input name="imageUrl" placeholder="URL de imagen o thumbnail de Drive"></div>
      <div class="field" style="grid-column:1/-1;"><label>Descripción</label><textarea name="description" rows="3" placeholder="Información visible para clientes"></textarea></div>
      <div class="field" style="grid-column:1/-1;"><label>Notas internas</label><textarea name="notes" rows="2" placeholder="Solo Alto Mando"></textarea></div>
      <button class="btn btn-primary" type="submit">Crear producto</button>
    </form>
  </div>

  <div class="card pad" style="margin-bottom:24px;">
    <div class="eyebrow">Productos</div>
    <div class="table-wrap">
      <table class="kotz-table">
        <thead><tr><th>Producto</th><th>Stats</th><th>Precios</th><th>Stock/Estado</th><th>Imagen</th><th></th></tr></thead>
        <tbody>
          ${items.map(i => `
            <tr data-shop-item-row="${i.id}">
              <td><input class="inline-select" data-field="name" value="${escapeAttr(i.name)}"><br><input class="inline-select" data-field="category" value="${escapeAttr(i.category)}" style="margin-top:8px;"></td>
              <td><input class="inline-select" data-field="damage" type="number" value="${Number(i.damage||0)}" title="Daño"><br><input class="inline-select" data-field="durability" type="number" value="${Number(i.durability||0)}" style="margin-top:8px;" title="Durabilidad"></td>
              <td><input class="inline-select" data-field="basePrice" type="number" value="${Number(i.basePrice||0)}" title="Normal"><br><input class="inline-select" data-field="memberPrice" type="number" value="${Number(i.memberPrice||0)}" style="margin-top:8px;" title="Miembros"><br><input class="inline-select" data-field="allyPrice" type="number" value="${Number(i.allyPrice||0)}" style="margin-top:8px;" title="Aliados"></td>
              <td><input class="inline-select" data-field="stock" type="number" value="${Number(i.stock||0)}"><br><select class="inline-select" data-field="status" style="margin-top:8px;">${['Activo','Oculto','Agotado'].map(st => `<option ${st===i.status?'selected':''}>${st}</option>`).join('')}</select><br><select class="inline-select" data-field="featured" style="margin-top:8px;"><option value="false" ${!i.featured?'selected':''}>Normal</option><option value="true" ${i.featured?'selected':''}>Destacado</option></select></td>
              <td><input class="inline-select" data-field="imageUrl" value="${escapeAttr(i.imageUrl||'')}" placeholder="URL"><textarea class="inline-select" data-field="description" rows="2" style="margin-top:8px;" placeholder="Descripción">${escapeHtml(i.description||'')}</textarea></td>
              <td><button class="btn btn-primary btn-sm" data-action="save-shop-item" data-id="${i.id}">Guardar</button></td>
            </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--bone-faint);">Sin productos todavía</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>

  <div class="panel-grid-2">
    <div class="card pad">
      <div class="eyebrow">Pedidos</div>
      <div class="table-wrap">
        <table class="kotz-table">
          <thead><tr><th>Cliente</th><th>Producto</th><th>Precio</th><th>Estado</th><th></th></tr></thead>
          <tbody>${orders.map(o => `
            <tr><td><b>${o.buyerName}</b><div class="mini-sub">@${o.buyerUsername || 'discord'}</div></td><td>${o.itemName}<div class="mini-sub">x${o.quantity} · ${o.message || 'Sin mensaje'}</div></td><td>${KotzStore.formatMoney(o.price)}</td><td><span class="pill ${pill(o.status)}">${KotzStore.shopStatusLabel(o.status)}</span></td><td class="actions-cell">${o.status==='pending' ? `<button class="btn btn-ok btn-sm" data-action="order-status" data-id="${o.id}" data-status="approved">Aprobar</button><button class="btn btn-danger btn-sm" data-action="order-status" data-id="${o.id}" data-status="rejected">Rechazar</button>` : `<button class="btn btn-ghost btn-sm" data-action="order-status" data-id="${o.id}" data-status="delivered">Entregado</button>`}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--bone-faint);">Sin pedidos</td></tr>`}</tbody>
        </table>
      </div>
    </div>
    <div class="card pad">
      <div class="eyebrow">Ofertas</div>
      <div class="table-wrap">
        <table class="kotz-table">
          <thead><tr><th>Cliente</th><th>Producto</th><th>Oferta</th><th>Estado</th><th></th></tr></thead>
          <tbody>${offers.map(o => `
            <tr><td><b>${o.buyerName}</b><div class="mini-sub">@${o.buyerUsername || 'discord'}</div></td><td>${o.itemName}<div class="mini-sub">${o.message || 'Sin mensaje'}</div></td><td>${KotzStore.formatMoney(o.offeredPrice)}<div class="mini-sub">Original: ${KotzStore.formatMoney(o.originalPrice)}</div></td><td><span class="pill ${pill(o.status)}">${KotzStore.shopStatusLabel(o.status)}</span>${o.counterOffer ? `<div class="mini-sub">Contra: ${KotzStore.formatMoney(o.counterOffer)}</div>` : ''}</td><td class="actions-cell">${o.status==='pending' ? `<button class="btn btn-ok btn-sm" data-action="offer-status" data-id="${o.id}" data-status="accepted">Aceptar</button><button class="btn btn-danger btn-sm" data-action="offer-status" data-id="${o.id}" data-status="rejected">Rechazar</button><button class="btn btn-ghost btn-sm" data-action="offer-counter" data-id="${o.id}">Contraoferta</button>` : '—'}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--bone-faint);">Sin ofertas</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}
function escapeAttr(value){ return escapeHtml(value).replace(/'/g, '&#39;'); }

function collectShopRow(row){
  const payload = {};
  row.querySelectorAll('[data-field]').forEach(el => {
    const key = el.dataset.field;
    let value = el.value;
    if (['basePrice','memberPrice','allyPrice','stock','damage','durability'].includes(key)) value = Number(value || 0);
    if (key === 'featured') value = value === 'true';
    payload[key] = value;
  });
  return payload;
}

/* --------------------------------------------------------- ESTADISTICAS */
function viewEstadisticas(){
  const growth = KotzStore.getMemberGrowth();
  const maxG = Math.max(...growth.map(g => g.total));
  const weekly = KotzStore.getWeeklyDues();
  const maxW = Math.max(...weekly.map(w => w.amount));
  const sanctions = KotzStore.getAllSanctions();
  const bySeverity = ['Leve','Grave','Muy grave'].map(sv => ({ sv, count: sanctions.filter(s => s.severity===sv).length }));
  const maxS = Math.max(1, ...bySeverity.map(s => s.count));
  return `
  <div class="view-head">
    <div class="eyebrow">Analítica interna</div>
    <h1 class="h2">Estadísticas</h1>
  </div>
  <div class="chart-card" style="margin-bottom:24px;">
    <div class="eyebrow">Crecimiento de miembros (2026)</div>
    <div class="bars">${growth.map(g => `<div class="bar-col"><div class="bar" style="height:${(g.total/maxG*100).toFixed(0)}%"></div><span class="bar-label">${g.month}</span></div>`).join('')}</div>
  </div>
  <div class="panel-grid-2">
    <div class="chart-card">
      <div class="eyebrow">Cuotas recaudadas por semana</div>
      <div class="bars" style="height:150px;">${weekly.map(w => `<div class="bar-col"><div class="bar" style="height:${(w.amount/maxW*100).toFixed(0)}%"></div><span class="bar-label">${w.week}</span></div>`).join('')}</div>
    </div>
    <div class="chart-card">
      <div class="eyebrow">Sanciones por gravedad</div>
      <div class="hbars">
        ${bySeverity.map(s => `
          <div class="hbar-row">
            <span class="hbar-label">${s.sv}</span>
            <div class="hbar-track"><div class="hbar-fill" style="width:${(s.count/maxS*100).toFixed(0)}%"></div></div>
            <span class="hbar-val">${s.count}</span>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

/* -------------------------------------------------------- EVENT BINDING */
function bindPanelEvents(path){
  if (path === '/miembros'){
    renderMembersBody();
    document.getElementById('memberSearch').addEventListener('input', e => { memberFilter.q = e.target.value; renderMembersBody(); });
    document.getElementById('rankFilter').addEventListener('change', e => { memberFilter.rank = e.target.value; renderMembersBody(); });
    document.getElementById('statusFilter').addEventListener('change', e => { memberFilter.status = e.target.value; renderMembersBody(); });
    document.getElementById('membersBody').addEventListener('click', e => {
      const btn = e.target.closest('[data-action="open"]');
      if (btn) openMemberModal(btn.dataset.id);
    });
    document.getElementById('membersBody').addEventListener('change', e => {
      const el = e.target.closest('[data-action="rank"], [data-action="status"]');
      if (!el) return;
      const field = el.dataset.action;
      panelUpdateMember(el.dataset.id, { [field]: el.value });
    });
  }
  if (path === '/cuotas'){
    document.getElementById('duesBody').addEventListener('click', e => {
      const approve = e.target.closest('[data-action="approve-due"]');
      const reject = e.target.closest('[data-action="reject-due"]');
      if (approve){ panelSetDueStatus(approve.dataset.member, approve.dataset.due, 'approved'); }
      if (reject){ panelSetDueStatus(reject.dataset.member, reject.dataset.due, 'rejected', 'Revisar y volver a enviar'); }
    });
  }
  if (path === '/sanciones'){
    document.getElementById('sanctionForm').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const memberId = fd.get('memberId');
      const member = KotzStore.getMember(memberId);
      if (!member) return alert('No se ha encontrado ese miembro. Recarga la página e inténtalo de nuevo.');
      await panelCreateSanction({
        memberId,
        memberName: member.name || member.rpName || 'Miembro',
        reason: fd.get('reason'),
        responsible: fd.get('responsible'),
        date: fd.get('date'),
        severity: fd.get('severity')
      });
    });
  }

  if (path === '/tienda'){
    document.getElementById('shopItemForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await panelSaveShopItem({
        name: fd.get('name'),
        category: fd.get('category'),
        description: fd.get('description'),
        damage: Number(fd.get('damage') || 0),
        durability: Number(fd.get('durability') || 0),
        basePrice: Number(fd.get('basePrice') || 0),
        memberPrice: Number(fd.get('memberPrice') || 0),
        allyPrice: Number(fd.get('allyPrice') || 0),
        stock: Number(fd.get('stock') || 0),
        imageUrl: fd.get('imageUrl'),
        status: fd.get('status'),
        featured: fd.get('featured') === 'true',
        notes: fd.get('notes')
      });
    });
    document.querySelectorAll('[data-action="save-shop-item"]').forEach(btn => btn.addEventListener('click', async () => {
      const row = btn.closest('[data-shop-item-row]');
      await panelSaveShopItem(collectShopRow(row), btn.dataset.id);
    }));
    document.querySelectorAll('[data-action="order-status"]').forEach(btn => btn.addEventListener('click', () => panelSetShopOrderStatus(btn.dataset.id, btn.dataset.status)));
    document.querySelectorAll('[data-action="offer-status"]').forEach(btn => btn.addEventListener('click', () => panelSetShopOfferStatus(btn.dataset.id, btn.dataset.status)));
    document.querySelectorAll('[data-action="offer-counter"]').forEach(btn => btn.addEventListener('click', () => {
      const value = prompt('¿Qué contraoferta quieres enviar?');
      if (value) panelSetShopOfferStatus(btn.dataset.id, 'countered', value);
    }));
  }

  if (path === '/galeria'){
    const form = document.getElementById('galleryForm');
    const fileInput = form?.elements['image'];
    const urlInput = form?.elements['imageUrl'];
    const imageMode = document.getElementById('imageMode');
    const fileBox = document.getElementById('galleryFileBox');
    const urlBox = document.getElementById('galleryUrlBox');
    const preview = document.getElementById('galleryPreview');
    const error = document.getElementById('galleryError');

    const showError = (msg) => { if (!error) return; error.textContent = msg; error.style.display = msg ? 'block' : 'none'; };
    const setPreview = (src) => { if (!preview) return; preview.src = src || ''; preview.style.display = src ? 'block' : 'none'; };

    imageMode?.addEventListener('change', () => {
      const mode = imageMode.value;
      fileBox.style.display = mode === 'file' ? '' : 'none';
      urlBox.style.display = mode === 'url' ? '' : 'none';
      setPreview(mode === 'url' ? urlInput.value.trim() : '');
      showError('');
    });

    urlInput?.addEventListener('input', () => {
      if (imageMode.value === 'url') setPreview(urlInput.value.trim());
    });

    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return setPreview('');
      try {
        showError('');
        const dataUrl = await compressImageFile(file);
        setPreview(dataUrl);
      } catch (err) { showError(err.message || 'No se pudo procesar la imagen.'); }
    });

    form?.addEventListener('submit', async e => {
      e.preventDefault();
      showError('');
      const fd = new FormData(form);
      const mode = fd.get('imageMode');
      let image = '';
      let payload = { title: fd.get('title'), category: fd.get('category'), tone: 1 };
      try {
        if (mode === 'url') {
          image = String(fd.get('imageUrl') || '').trim();
          if (!image) throw new Error('Pega una URL o una ruta de imagen válida.');
          payload.imageUrl = image;
        } else {
          const file = fileInput.files?.[0];
          if (!file) throw new Error('Selecciona una foto desde tu dispositivo.');
          image = await compressImageFile(file);
          payload.imageData = image;
        }

        let savedOnGoogle = false;
        try {
          const res = await fetch('/api/gallery', {
            method:'POST',
            credentials:'same-origin',
            headers:{ 'Content-Type':'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok){
            await panelSyncGallery();
            savedOnGoogle = true;
          } else {
            const data = await res.json().catch(() => ({}));
            if (data.error) console.warn(data.error);
          }
        } catch(serverErr) {}

        if (!savedOnGoogle){
          KotzStore.addGalleryItem({ title: fd.get('title'), category: fd.get('category'), image, tone: 1 });
          alert('Foto guardada solo en este navegador. Para guardarla en Drive, configura Google en el .env y usa npm start.');
        }
        panelRouter();
      } catch (err) {
        showError(err.message || 'No se pudo guardar la foto.');
      }
    });

    document.getElementById('exportGallery')?.addEventListener('click', () => {
      downloadTextFile('kotz-galeria.json', JSON.stringify(KotzStore.getExtraGalleryItems(), null, 2));
    });

    document.getElementById('importGallery')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const items = JSON.parse(reader.result);
          if (!Array.isArray(items)) throw new Error('El JSON no contiene una lista de fotos.');
          KotzStore.importGalleryItems(items);
          panelRouter();
        } catch(err){ alert('No se pudo importar la galería: ' + (err.message || err)); }
      };
      reader.readAsText(file);
    });

    document.getElementById('clearExtraGallery')?.addEventListener('click', () => {
      if (confirm('¿Seguro que quieres borrar todas las fotos añadidas desde el panel?')){
        KotzStore.clearExtraGalleryItems();
        panelRouter();
      }
    });

    document.querySelectorAll('[data-action="delete-photo"]').forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (KotzStore.isBackendGalleryItem(id)){
        try {
          const res = await fetch(`/api/gallery/${encodeURIComponent(id)}`, { method:'DELETE', credentials:'same-origin' });
          if (res.ok){
            KotzStore.deleteBackendGalleryItem(id);
            panelRouter();
            return;
          }
        } catch(e) {}
      }
      KotzStore.deleteGalleryItem(id);
      panelRouter();
    }));
  }
}

window.addEventListener('DOMContentLoaded', initLogin);
