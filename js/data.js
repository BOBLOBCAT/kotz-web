/* ==========================================================================
   KoTZ — DATA LAYER
   ==========================================================================
   Esto es una capa de datos EN MEMORIA. Sirve para tener el panel 100%
   funcional en pantalla (altas, aprobaciones, sanciones, etc.) sin backend,
   ideal para alojar el sitio como estático en GitHub Pages.

   IMPORTANTE: al recargar la página, todo vuelve a los datos de ejemplo.
   Nada se guarda entre sesiones ni se comparte entre dispositivos.

   CUANDO QUIERAS PERSISTENCIA REAL:
   Sustituye las funciones de KotzStore (abajo) por llamadas a tu backend,
   por ejemplo Supabase:

     async function loadMembers(){
       const { data } = await supabase.from('members').select('*');
       return data;
     }

   El resto del código (site.js / panel.js) llama siempre a través de
   KotzStore, así que puedes cambiar el motor de datos sin tocar el resto
   de la app.
   ========================================================================== */

const KotzData = {

  alliances: [
    { id:'a1', slug:'rose-spines', name:'Rose Spines', emoji:'⚔️', status:'Activa', since:'Jun 2026', trustScore:93, desc:'Alianza basada en apoyo mutuo, respeto y crecimiento conjunto entre comunidades hispanohablantes.', values:['Respeto','Apoyo mutuo','Crecimiento'] },
    { id:'a2', slug:'lacrew', name:'LaCREW', emoji:'🛡️', status:'Activa', since:'Jun 2026', trustScore:100, desc:'Pacto de no agresión, apoyo económico cuando sea necesario y cooperación entre bandas.', values:['Comunicación','Defensa','Confianza'] },
    { id:'a3', slug:'kaos', name:'KAOs', emoji:'ム', status:'Activa', since:'Jun 2026', trustScore:87, desc:'Alianza estratégica de apoyo mutuo, información compartida y cooperación entre líderes.', values:['Estrategia','Respeto','Información'] },
    { id:'a4', slug:'underworld', name:'Underworld', emoji:'⚖️', status:'Activa', since:'Jun 2026', trustScore:100, desc:'Acuerdo económico y comercial para beneficio mutuo y fortalecimiento entre bandas.', values:['Economía','Comercio','Respeto'] },
    { id:'a5', slug:'cult-of-rose', name:'Cult-of-Rose', emoji:'🌹', status:'Activa', since:'Jun 2026', trustScore:100, desc:'Alianza enfocada en comunidad, futuro, apoyo militar y crecimiento conjunto.', values:['Futuro','Apoyo militar','Familia'] },
    { id:'a6', slug:'fallen-angels', name:'Fallen-Angels', emoji:'🪽', status:'Activa', since:'Jun 2026', trustScore:100, desc:'Alianza estratégica para crecer unidos, colaborar y mostrar una imagen fuerte entre comunidades.', values:['Unión','Colaboración','Crecimiento'] },
    { id:'a7', slug:'the-nato', name:'The-NATO', emoji:'💎', status:'Activa', since:'Jun 2026', trustScore:100, desc:'Alianza internacional fuerte basada en valores compartidos, apoyo, respeto y lealtad.', values:['Lealtad','Respeto','Apoyo'] },
    { id:'a8', slug:'crows-of-olympus', name:'Crows Of Olympus', emoji:'⚜️', status:'Activa', since:'Jul 2026', trustScore:100, desc:'Nueva alianza oficial con Crows Of Olympus basada en respeto, no agresión, comercio y protección mutua.', values:['Respeto','Comercio','Protección'] },
      { id:'a9', slug:'neta', name:'Ñeta', emoji:'🩸', status:'Activa', since:'Jul 2026', trustScore:100, desc:'Nueva alianza oficial con Ñeta basada en respeto, no agresión, cooperación, información y apoyo estratégico.', values:['Respeto','No agresión','Futuro'] },
],

  conflicts: [],

  gallery: [
    { id:'g1', title:'Foto oficial de KoTZ', category:'Fotos oficiales', tone:1, image:'assets/gallery-official.jpg' },
    { id:'g2', title:'Reunión de Alto Mando', category:'Reuniones', tone:2 },
    { id:'g3', title:'Operación nocturna', category:'Operaciones', tone:3 },
    { id:'g4', title:'Alianza con The NATO', category:'Alianzas', tone:1 },
    { id:'g6', title:'Cumbre con aliados', category:'Alianzas', tone:3 },
  ],

  members: [
    { id:'m1', name:'Roger', discord:'@Roger', rank:'Owner', joined:'2026-06-01', status:'Activo', notes:'Fundador de KoTZ - Kings of The Zone.', sanctions:[], dues:[] },
    { id:'m2', name:'Kyle Crimson', discord:'@Kyle Crimson', rank:'Capitán', joined:'2026-06-01', status:'Activo', notes:'Capitán de KoTZ.', sanctions:[], dues:[] },

    { id:'m3', name:'Amaru Ocllo', discord:'@Amaru Ocllo', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m4', name:'Isaac Harris', discord:'@Isaac Harris', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m5', name:'Jack Griffin', discord:'@Jack Griffin', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m6', name:'William White', discord:'@William White', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m7', name:'Chino Antrax II', discord:'@Chino Antrax II', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m8', name:'Moon Jackson II', discord:'@Moon Jackson II', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m9', name:'yeyos57', discord:'@yeyos57', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },

    { id:'m10', name:'Aurora Hall', discord:'@Aurora Hall', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m11', name:'Daniel Murphy', discord:'@Daniel Murphy', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m12', name:'Emma Cook', discord:'@Emma Cook', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m13', name:'Eva Grimblade', discord:'@Eva Grimblade', rank:'Capitán', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m14', name:'fxtxxx', discord:'@fxtxxx', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m15', name:'Gigi', discord:'@Gigi', rank:'Capitán', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m16', name:'Ian Grimstone', discord:'@Ian Grimstone', rank:'Co-Owner', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m17', name:'Katherine Anderson', discord:'@Katherine Anderson', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m18', name:'Kayla Allen', discord:'@Kayla Allen', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m19', name:'Levi Smith', discord:'@Levi Smith', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m20', name:'Lobo Ancestral', discord:'@Lobo Ancestral', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m21', name:'Mari', discord:'@Mari', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m22', name:'Owen Grimwood', discord:'@Owen Grimwood', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m23', name:'Peter', discord:'@Peter', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m24', name:'Tame Impala', discord:'@Tame Impala', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m25', name:'Tyler Price', discord:'@Tyler Price', rank:'Capitán', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m26', name:'Victor Wolfstrike', discord:'@Victor Wolfstrike', rank:'Teniente', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
    { id:'m27', name:'Wilson House', discord:'@Wilson House', rank:'Soldado', joined:'2026-06-01', status:'Activo', notes:'', sanctions:[], dues:[] },
  ],

  applications: [],

  ranks: ['Owner','Co-Owner','Capitán','Líder de Comunicación','Líder de Reclutamiento','Líder de Administración','Líder de Venta de Armas','Teniente','Sargento','Soldado','Miembro','Asociado','Recluta'],

  weeklyDues: [
    { week:'Sem 1', amount:300 }, { week:'Sem 2', amount:600 }, { week:'Sem 3', amount:900 },
    { week:'Sem 4', amount:1200 }, { week:'Sem 5', amount:1500 }, { week:'Sem 6', amount:2100 },
  ],

  memberGrowth: [
    { month:'Ene', total:0 }, { month:'Feb', total:0 }, { month:'Mar', total:0 },
    { month:'Abr', total:0 }, { month:'May', total:0 }, { month:'Jun', total:17 }, { month:'Jul', total:29 },
  ],
};
/* ==========================================================================
   KotzStore — capa de acceso a datos. TODO el código de la app pasa por
   aquí. Cuando conectes un backend real, reescribe estos métodos.
   ========================================================================== */
const KotzStore = {
  _backendDues: [],
  _backendGallery: [],
  _backendMembers: [],
  _backendSanctions: [],
  _backendShopItems: [],
  _backendShopOrders: [],
  _backendShopOffers: [],
  _membersLoaded: false,
  _currentMember: null,
  _authUser: null,
  setBackendShopItems(items){ this._backendShopItems = Array.isArray(items) ? items : []; },
  getBackendShopItems(){ return this._backendShopItems || []; },
  setBackendShopOrders(orders){ this._backendShopOrders = Array.isArray(orders) ? orders : []; },
  getBackendShopOrders(){ return this._backendShopOrders || []; },
  setBackendShopOffers(offers){ this._backendShopOffers = Array.isArray(offers) ? offers : []; },
  getBackendShopOffers(){ return this._backendShopOffers || []; },
  setBackendDues(dues){ this._backendDues = Array.isArray(dues) ? dues : []; },
  getBackendDues(){ return this._backendDues || []; },
  setBackendGallery(items){
    this._backendGalleryLoaded = true;
    this._backendGallery = Array.isArray(items) ? items.filter(g => this.isUsableGalleryItem(g)) : [];
  },
  getBackendGallery(){ return this._backendGallery || []; },
  hasBackendGalleryLoaded(){ return Boolean(this._backendGalleryLoaded); },
  getDeletedGalleryIds(){
    try { return new Set(JSON.parse(localStorage.getItem('kotz_gallery_deleted') || '[]').map(String)); }
    catch(e){ return new Set(); }
  },
  markDeletedGalleryItem(id){
    if (!id) return;
    const ids = this.getDeletedGalleryIds();
    ids.add(String(id));
    try { localStorage.setItem('kotz_gallery_deleted', JSON.stringify([...ids].slice(-300))); } catch(e) {}
    this._backendGallery = this.getBackendGallery().filter(g => String(g.id) !== String(id) && String(g.driveFileId || '') !== String(id) && `drive_${g.driveFileId}` !== String(id));
  },
  isUsableGalleryItem(g){
    if (!g) return false;
    const ids = this.getDeletedGalleryIds();
    const id = String(g.id || '');
    const fileId = String(g.driveFileId || g.fileId || '');
    if (ids.has(id) || ids.has(fileId) || ids.has(`drive_${fileId}`)) return false;
    const image = String(g.image || g.imageUrl || g.driveFileUrl || '').trim();
    const title = String(g.title || '').trim();
    // Evita tarjetas fantasma: sin imagen y sin información real no se muestra.
    return Boolean(title || image);
  },
  setBackendSanctions(sanctions){ this._backendSanctions = Array.isArray(sanctions) ? sanctions : []; },
  getBackendSanctions(){ return this._backendSanctions || []; },
  deleteBackendGalleryItem(id){ this.markDeletedGalleryItem(id); },
  setBackendMembers(members){ this._membersLoaded = true; this._backendMembers = Array.isArray(members) ? members.map(m => ({ sanctions:[], dues:[], ...m })) : []; },
  getBackendMembers(){ return this._backendMembers || []; },
  setCurrentMember(member){ this._currentMember = member ? ({ sanctions:[], dues:[], ...member }) : null; },
  getCurrentMember(){ return this._currentMember; },
  setAuthUser(user){ this._authUser = user || null; },
  getAuthUser(){ return this._authUser; },
  getMembers(){ return this._membersLoaded ? this.getBackendMembers() : []; },
  getMember(id){ return this.getMembers().find(m => m.id === id); },
  addMember(member){ member.id = 'm' + (this.getMembers().length + 1) + '_' + Date.now().toString(36); KotzData.members.push(member); return member; },
  updateMember(id, patch){ const m = this.getMember(id); if (m) Object.assign(m, patch); },
  findMemberByDiscordId(discordId){ return this.getMembers().find(m => String(m.discordId||'') === String(discordId||'')); },

  getApplications(){ return KotzData.applications; },
  setApplicationStatus(id, status, comment){
    const app = KotzData.applications.find(a => a.id === id);
    app.status = status; app.comment = comment || app.comment;
    return app;
  },
  submitApplication(app){ app.id = 'r' + Date.now().toString(36); app.status = 'pending'; app.comment=''; KotzData.applications.unshift(app); return app; },

  getStoredDues(){
    try { return JSON.parse(localStorage.getItem('kotz_dues_submissions') || '[]'); }
    catch(e){ return []; }
  },
  saveStoredDues(dues){
    localStorage.setItem('kotz_dues_submissions', JSON.stringify(dues));
  },
  getAllDues(){
    const builtIn = this.getMembers().flatMap(m => (m.dues||[]).map(d => ({...d, memberId:m.id, memberName:m.name, source:'seed'})));
    const stored = this.getStoredDues();
    const backend = this.getBackendDues().map(d => ({...d, source:'server'}));
    const seen = new Set();
    return [...backend, ...stored, ...builtIn]
      .filter(d => { if (!d.id) return true; if (seen.has(d.id)) return false; seen.add(d.id); return true; })
      .sort((a,b) => String(b.createdAt||b.date||'').localeCompare(String(a.createdAt||a.date||'')));
  },
  getDuesForMember(memberId){
    return this.getAllDues().filter(d => d.memberId === memberId);
  },
  setDueStatus(memberId, dueId, status, comment){
    const stored = this.getStoredDues();
    const storedDue = stored.find(d => d.id === dueId);
    if (storedDue){
      storedDue.status = status; storedDue.comment = comment || storedDue.comment || '';
      storedDue.reviewedAt = new Date().toISOString();
      this.saveStoredDues(stored);
      return storedDue;
    }
    const member = this.getMember(memberId);
    const due = member?.dues?.find(d => d.id === dueId);
    if (!due) return null;
    due.status = status; due.comment = comment || due.comment;
    return due;
  },
  addDue(memberId, due){
    const member = this.getMember(memberId);
    const stored = this.getStoredDues();
    const entry = {
      ...due,
      id: 'd' + Date.now().toString(36),
      memberId,
      memberName: member ? member.name : (due.memberName || 'Miembro'),
      status: 'pending',
      comment: '',
      createdAt: new Date().toISOString(),
      source: 'user-panel'
    };
    stored.unshift(entry);
    this.saveStoredDues(stored);
    return entry;
  },

  getAllSanctions(){
    const builtIn = this.getMembers().flatMap(m => (m.sanctions||[]).map(s => ({...s, memberId:m.id, memberName:m.name, source:s.source || 'seed'})));
    const backend = this.getBackendSanctions().map(s => ({...s, source:s.source || 'server'}));
    const seen = new Set();
    return [...backend, ...builtIn]
      .filter(s => { if (!s.id) return true; if (seen.has(s.id)) return false; seen.add(s.id); return true; })
      .sort((a,b) => String(b.createdAt||b.date||'').localeCompare(String(a.createdAt||a.date||'')));
  },
  getSanctionsForMember(memberId){
    return this.getAllSanctions().filter(s => String(s.memberId) === String(memberId));
  },
  addSanction(memberId, sanction){
    const member = this.getMember(memberId);
    const entry = {
      ...sanction,
      id: sanction.id || ('s' + Date.now().toString(36)),
      memberId,
      memberName: member ? member.name : (sanction.memberName || 'Miembro'),
      createdAt: sanction.createdAt || new Date().toISOString(),
      source: sanction.source || 'local'
    };
    if (member) {
      member.sanctions = member.sanctions || [];
      member.sanctions.unshift(entry);
    }
    return entry;
  },

  getAlliances(){ return KotzData.alliances; },
  getConflicts(){ return KotzData.conflicts || []; },
  getGallery(){
    try {
      const serverItems = this.getBackendGallery()
        .map(g => ({...g, image:g.image || g.imageUrl || g.driveFileUrl || '', source:g.source || 'google'}))
        .filter(g => this.isUsableGalleryItem(g));
      const extra = this.getExtraGalleryItems().filter(g => this.isUsableGalleryItem(g));
      // Los ejemplos fijos solo se usan antes de cargar Google. Cuando Google ya responde,
      // la galería real manda y no se mezclan tarjetas fantasma sin imagen.
      const base = this.hasBackendGalleryLoaded() ? [] : KotzData.gallery;
      const seen = new Set();
      return [...serverItems, ...extra, ...base].filter(g => {
        const key = String(g.driveFileId || g.id || g.image || g.imageUrl || `${g.title}|${g.category}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch(e){ return KotzData.gallery; }
  },
  getExtraGalleryItems(){
    try { return JSON.parse(localStorage.getItem('kotz_gallery_extra') || '[]'); }
    catch(e){ return []; }
  },
  isExtraGalleryItem(id){
    return this.getExtraGalleryItems().some(g => g.id === id);
  },
  isBackendGalleryItem(id){
    return this.getBackendGallery().some(g => g.id === id);
  },
  addGalleryItem(item){
    const extra = this.getExtraGalleryItems();
    item.id = 'g' + Date.now().toString(36);
    item.tone = item.tone || ((extra.length % 3) + 1);
    extra.unshift(item);
    try {
      localStorage.setItem('kotz_gallery_extra', JSON.stringify(extra));
    } catch(e){
      alert('No se pudo guardar la foto. Probablemente el navegador se quedó sin espacio. Prueba con una URL directa o exporta/limpia la galería.');
      throw e;
    }
    return item;
  },
  importGalleryItems(items){
    const clean = items.filter(i => i && i.title && i.category && i.image).map((i, idx) => ({
      id: i.id || ('g' + Date.now().toString(36) + '_' + idx),
      title: String(i.title),
      category: String(i.category),
      image: String(i.image),
      tone: Number(i.tone || ((idx % 3) + 1)),
    }));
    localStorage.setItem('kotz_gallery_extra', JSON.stringify(clean));
    return clean;
  },
  clearExtraGalleryItems(){
    localStorage.removeItem('kotz_gallery_extra');
  },
  deleteGalleryItem(id){
    const extra = this.getExtraGalleryItems();
    localStorage.setItem('kotz_gallery_extra', JSON.stringify(extra.filter(g => g.id !== id)));
  },

  getShopItems(){
    return this.getBackendShopItems().sort((a,b) => Number(b.featured === true) - Number(a.featured === true) || String(a.name||'').localeCompare(String(b.name||'')));
  },
  getActiveShopItems(){
    return this.getShopItems().filter(i => String(i.status || 'Activo') === 'Activo');
  },
  getShopItem(id){ return this.getShopItems().find(i => String(i.id) === String(id)); },
  getShopOrders(){ return this.getBackendShopOrders().sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||''))); },
  getShopOffers(){ return this.getBackendShopOffers().sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||''))); },
  getPendingShopOrders(){ return this.getShopOrders().filter(o => o.status === 'pending'); },
  getPendingShopOffers(){ return this.getShopOffers().filter(o => o.status === 'pending'); },
  priceFor(item, mode='member'){
    if (!item) return 0;
    if (mode === 'ally') return Number(item.allyPrice || item.memberPrice || item.basePrice || 0);
    if (mode === 'base') return Number(item.basePrice || item.memberPrice || item.allyPrice || 0);
    return Number(item.memberPrice || item.basePrice || item.allyPrice || 0);
  },
  formatMoney(value){
    return '$' + Number(value || 0).toLocaleString('es-ES');
  },
  shopStatusLabel(status){
    const map = { pending:'Pendiente', approved:'Aprobado', rejected:'Rechazado', delivered:'Entregado', cancelled:'Cancelado', accepted:'Aceptada', countered:'Contraoferta' };
    return map[status] || status || 'Pendiente';
  },
  getRanks(){ return KotzData.ranks; },
  getWeeklyDues(){
    const dues = this.getAllDues().filter(d => d.status === 'approved');
    if (!dues.length) return KotzData.weeklyDues;
    const map = new Map();
    const parse = (value) => {
      const raw = String(value || '').trim();
      const iso = new Date(raw);
      if (!isNaN(iso)) return iso;
      const m = raw.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      if (m){
        const year = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : new Date().getFullYear();
        return new Date(year, Number(m[2])-1, Number(m[1]));
      }
      return new Date();
    };
    const startOfWeek = (date) => {
      const d = new Date(date); d.setHours(0,0,0,0);
      const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1);
      return d;
    };
    dues.forEach(d => {
      const start = startOfWeek(parse(d.date || d.createdAt));
      const key = start.toISOString().slice(0,10);
      const label = `${String(start.getDate()).padStart(2,'0')}/${String(start.getMonth()+1).padStart(2,'0')}`;
      map.set(key, (map.get(key) || 0) + Number(d.amount || 300));
    });
    return [...map.entries()].sort((a,b) => a[0].localeCompare(b[0])).slice(-6).map(([key, amount]) => ({ week:key.slice(5), label:key, amount }));
  },
  getMemberGrowth(){ return KotzData.memberGrowth; },

  stats(){
    const dues = this.getAllDues();
    return {
      totalMembers: 46,
      activeMembers: 46,
      pendingMembers: 0,
      alliances: this.getAlliances().filter(a => a.status === 'Activa').length || 9,
      duesPending: dues.filter(d => d.status === 'pending').length,
      duesApproved: dues.filter(d => d.status === 'approved').length,
      openSanctions: this.getAllSanctions().length,
      shopPending: this.getPendingShopOrders().length + this.getPendingShopOffers().length,
      eventsHeld: 1,
      recruitsAccepted: 46,
      weeklyDuesPct: 95,
      activityPct: 78,
      recruitmentPct: 92,
      diplomacyPct: 99
    };
  }
};
