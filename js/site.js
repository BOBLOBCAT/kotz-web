/* ==========================================================================
   KoTZ — PUBLIC SITE (SPA router, vanilla JS, no dependencies)
   ========================================================================== */

const routes = {
  '/': pageHome,
  '/nosotros': pageAbout,
  '/organizacion': pageOrg,
  '/alianzas': pageAlliances,
  '/estado': pageDiplomaticStatus,
  '/galeria': pageGallery,
  '/cuotas': pageUserDues,
  '/tienda': pageShop,
  '/estadisticas': pageStats,
};

const navMeta = [
  { path:'/', label:'Inicio' },
  { path:'/nosotros', label:'Quiénes Somos' },
  { path:'/organizacion', label:'Organización' },
  { path:'/alianzas', label:'Alianzas' },
  { path:'/estado', label:'Estado' },
  { path:'/galeria', label:'Galería' },
  { path:'/cuotas', label:'Cuotas' },
  { path:'/tienda', label:'Tienda' },
  { path:'/estadisticas', label:'Estadísticas' },
];


let serverDuesLoaded = false;
let serverDuesLoading = false;
let serverGalleryLoaded = false;
let serverGalleryLoading = false;
let currentMemberLoaded = false;
let currentMemberLoading = false;
let shopLoaded = false;
let shopLoading = false;
let alliancesLoaded = false;
let alliancesLoading = false;
let alliancesError = null;
let secureAlliances = [];

async function syncDuesFromServer(rerender = false){
  if (serverDuesLoading) return;
  serverDuesLoading = true;
  try {
    const res = await fetch('/api/dues', { credentials:'same-origin' });
    if (res.ok){
      const data = await res.json();
      KotzStore.setBackendDues(data.dues || []);
      serverDuesLoaded = true;
      if (rerender && (location.hash.replace('#','') || '/') === '/cuotas') router();
    }
  } catch(e) {
    // Modo estático / sin backend: seguimos con localStorage.
  } finally {
    serverDuesLoading = false;
  }
}

async function syncGalleryFromServer(rerender = false){
  if (serverGalleryLoading) return;
  serverGalleryLoading = true;
  try {
    const res = await fetch('/api/gallery', { credentials:'same-origin' });
    if (res.ok){
      const data = await res.json();
      KotzStore.setBackendGallery(data.items || []);
      serverGalleryLoaded = true;
      if (rerender && (location.hash.replace('#','') || '/') === '/galeria') router();
    }
  } catch(e) {
    // Modo estático / sin backend: seguimos con data.js + localStorage.
  } finally {
    serverGalleryLoading = false;
  }
}

async function loadDiscordSession(){
  try {
    const res = await fetch('/api/auth/me', { credentials:'same-origin' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.loggedIn) KotzStore.setAuthUser(data.user);
    return data;
  } catch(e){ return null; }
}


async function syncCurrentMemberFromServer(rerender = false){
  if (currentMemberLoading) return;
  currentMemberLoading = true;
  try {
    const res = await fetch('/api/members/me', { credentials:'same-origin' });
    if (res.ok){
      const data = await res.json();
      KotzStore.setCurrentMember(data.member || null);
    } else {
      KotzStore.setCurrentMember(null);
    }
    currentMemberLoaded = true;
    const path = location.hash.replace('#','') || '/';
    if (rerender && (path === '/cuotas' || path === '/tienda' || path === '/alianzas' || path === '/estado' || path.startsWith('/alianzas/'))) router();
  } catch(e) {
    KotzStore.setCurrentMember(null);
    currentMemberLoaded = true;
  } finally {
    currentMemberLoading = false;
  }
}


async function syncShopFromServer(rerender = false){
  if (shopLoading) return;
  shopLoading = true;
  try {
    const [itemsRes, ordersRes, offersRes] = await Promise.all([
      fetch('/api/shop/items', { credentials:'same-origin' }),
      fetch('/api/shop/orders', { credentials:'same-origin' }),
      fetch('/api/shop/offers', { credentials:'same-origin' })
    ]);
    if (itemsRes.ok){ const data = await itemsRes.json(); KotzStore.setBackendShopItems(data.items || []); }
    if (ordersRes.ok){ const data = await ordersRes.json(); KotzStore.setBackendShopOrders(data.orders || []); }
    if (offersRes.ok){ const data = await offersRes.json(); KotzStore.setBackendShopOffers(data.offers || []); }
    shopLoaded = true;
    if (rerender && (location.hash.replace('#','') || '/') === '/tienda') router();
  } catch(e) {
    // Sin backend: no hay tienda persistente.
  } finally {
    shopLoading = false;
  }
}


async function syncAlliancesFromServer(rerender = false){
  if (alliancesLoading) return;
  alliancesLoading = true;
  alliancesError = null;
  try {
    const res = await fetch('/api/alliances', { credentials:'same-origin' });
    if (res.ok){
      const data = await res.json();
      secureAlliances = Array.isArray(data.alliances) ? data.alliances : [];
      alliancesLoaded = true;
      alliancesError = null;
    } else {
      let error = res.status === 401 ? 'login' : res.status === 403 ? 'forbidden' : 'server';
      try {
        const data = await res.json();
        alliancesError = { type:error, message:data.error || 'No se pudieron cargar las alianzas.' };
      } catch(e) {
        alliancesError = { type:error, message:'No se pudieron cargar las alianzas.' };
      }
      secureAlliances = [];
      alliancesLoaded = true;
    }
    if (rerender) {
      const path = location.hash.replace('#','') || '/';
      if (path === '/alianzas' || path === '/estado' || path.startsWith('/alianzas/')) router();
    }
  } catch(e) {
    alliancesError = { type:'server', message:'No se pudo conectar con el servidor de alianzas.' };
    secureAlliances = [];
    alliancesLoaded = true;
  } finally {
    alliancesLoading = false;
  }
}

function setupSiteLogout(){
  const logout = async () => {
    try { await fetch('/api/logout', { method:'POST', credentials:'same-origin' }); } catch(e) {}
    location.href = 'index.html';
  };
  document.getElementById('logoutBtnSite')?.addEventListener('click', logout);
  document.getElementById('logoutBtnMobile')?.addEventListener('click', logout);
}


function resolveRoute(path){
  if (routes[path]) return routes[path];
  if (path.startsWith('/alianzas/')) {
    const slug = path.split('/').filter(Boolean).pop();
    return () => pageAllianceDetail(slug);
  }
  return pageHome;
}

function isAllianceProtectedPath(path){
  return path === '/alianzas' || path === '/estado' || path.startsWith('/alianzas/');
}

function router(){
  const path = location.hash.replace('#','') || '/';
  const render = resolveRoute(path);
  const view = document.getElementById('view');
  view.innerHTML = render();
  view.classList.remove('page-enter'); void view.offsetWidth; view.classList.add('page-enter');
  document.querySelectorAll('.nav-links a').forEach(a => {
    const hrefPath = (a.getAttribute('href') || '').replace('#','');
    const active = hrefPath === path || (path.startsWith('/alianzas/') && hrefPath === '/alianzas');
    a.classList.toggle('active', active);
  });
  document.getElementById('mobilePanel')?.classList.remove('open');
  window.scrollTo(0,0);
  afterRender(path);
  initReveal();
}

function afterRender(path){
  if (path === '/estadisticas') animateCounters();
  if (path === '/galeria') { initGalleryFilters(); if (!serverGalleryLoaded) syncGalleryFromServer(true); }
  if (path === '/cuotas') { initUserDuesForm(); if (!currentMemberLoaded) syncCurrentMemberFromServer(true); if (!serverDuesLoaded) syncDuesFromServer(true); }
  if (path === '/tienda') { initShopPage(); if (!currentMemberLoaded) syncCurrentMemberFromServer(true); if (!shopLoaded) syncShopFromServer(true); }
  if (isAllianceProtectedPath(path)) { if (!currentMemberLoaded) syncCurrentMemberFromServer(true); if (!alliancesLoaded && !alliancesLoading) syncAlliancesFromServer(true); }
  if (path === '/organizacion') initSecurityLog();
  if (document.getElementById('embers')) initEmbers();
}

function initReveal(){
  const els = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:.12 });
  els.forEach(el => io.observe(el));
}

/* ---------------------------------------------------------------- HOME */
function pageHome(){
  return `
  <section class="hero">
    <canvas id="embers"></canvas>
    <div class="hero-glow"></div>
    <div class="hero-content">
      <img class="hero-crest crest-img" src="assets/crest.png" alt="Escudo de KoTZ">
      <h1 class="hero-title">KoTZ</h1>
      <div class="hero-sub">Kings of The Zone</div>
      <div class="hero-tagline">Together We Grow.</div>
      <div class="hero-mottos"><span>One Family</span><span>One Vision</span><span>One Zone</span></div>
      <div class="hero-ctas">
        <a href="user.html" class="btn btn-primary">Panel Usuario</a>
        <a href="#/nosotros" class="btn btn-ghost">Conócenos</a>
        <a href="panel.html" class="btn btn-ghost">Alto Mando</a>
      </div>
    </div>
    <div class="ticker"><div class="ticker-track">
      ${Array(2).fill(`
        <span class="ticker-item"><b>PRISON RP</b> · ROBLOX</span>
        <span class="ticker-item"><b>CLEARANCE</b> · FAMILIA</span>
        <span class="ticker-item"><b>ALIANZAS</b> · RED INTERNACIONAL</span>
        <span class="ticker-item"><b>DOCTRINA</b> · CALIDAD SOBRE CANTIDAD</span>
        <span class="ticker-item"><b>ESTADO</b> · ACTIVOS Y CRECIENDO</span>
      `).join('')}
    </div></div>
    <div class="scroll-cue">Explora KoTZ</div>
  </section>

  <section class="section">
    <div class="wrap quick-grid">
      <a href="#/organizacion" class="quick-card reveal">
        <div class="eyebrow">Cadena de mando</div>
        <h3 class="h3">Organización</h3>
        <p class="lede">Una jerarquía clara, de Owner a Recluta.</p>
      </a>
      <a href="#/alianzas" class="quick-card reveal">
        <div class="eyebrow">Red internacional</div>
        <h3 class="h3">Alianzas</h3>
        <p class="lede">Bandas de confianza dentro y fuera de España.</p>
      </a>
      <a href="#/estadisticas" class="quick-card reveal">
        <div class="eyebrow">Números reales</div>
        <h3 class="h3">Estadísticas</h3>
        <p class="lede">Miembros, eventos y crecimiento de la Zona.</p>
      </a>
    </div>
  </section>`;
}

/* ------------------------------------------------------------ NOSOTROS */
function pageAbout(){
  return `
  <section class="page-head">
    <div class="wrap">
      <div class="eyebrow">Quiénes somos</div>
      <h1 class="h1">No es una banda.<br>Es una <span class="accent">familia.</span></h1>
    </div>
  </section>
  <section class="section">
    <div class="wrap about">
      <div class="reveal">
        <p>KoTZ nació con una idea muy clara: crear una comunidad donde las personas disfruten jugando juntas, creciendo juntas y ayudándose unas a otras. <strong>Para nosotros no es simplemente una banda — es una familia.</strong></p>
        <p>Queremos que cualquier miembro se sienta importante. Valoramos más la calidad que la cantidad: no buscamos tener cientos de miembros, buscamos personas comprometidas.</p>
        <div class="about-quote">"Cuando alguien escuche KoTZ, que piense en organización, respeto y profesionalidad."</div>
      </div>
      <div class="about-visual reveal"><img class="crest-img" src="assets/crest.png" alt="Escudo KoTZ"></div>
    </div>
  </section>
  <div class="wrap"><div class="divider"></div></div>
  <section class="section">
    <div class="wrap">
      <div class="section-head center reveal">
        <div class="eyebrow" style="justify-content:center;">Nuestros pilares</div>
        <h2 class="h2">Valores que <span class="accent">sostienen la corona.</span></h2>
      </div>
      <div class="values-grid reveal">
        ${[
          ['👑','Honor','La palabra de un miembro de KoTZ vale más que cualquier acuerdo escrito.'],
          ['🤝','Respeto','Hacia dentro y hacia fuera. Sin respeto no hay organización posible.'],
          ['🐍','Lealtad','Como las cobras que nos representan: pacientes, fieles, inquebrantables.'],
          ['❤️','Familia','Cada miembro importa. No somos un número, somos un nombre.'],
          ['📈','Crecimiento conjunto','Nadie crece solo. Lo que gana uno, lo gana la Zona entera.'],
          ['⚖️','Profesionalidad','Los problemas se resuelven hablando. Las decisiones, en equipo.'],
          ['🌍','Cooperación','Construimos puentes con otras comunidades, no muros.'],
        ].map(([icon,name,desc]) => `
          <div class="value-card">
            <span class="value-icon">${icon}</span>
            <div class="value-name">${name}</div>
            <div class="value-desc">${desc}</div>
          </div>`).join('')}
      </div>
    </div>
  </section>
  <section class="section philosophy">
    <div class="wrap reveal">
      <div class="eyebrow" style="justify-content:center;">Filosofía</div>
      <blockquote>La fuerza de una banda no depende únicamente del dinero. Depende de su <span class="accent">organización</span>, su <span class="accent">liderazgo</span> y su capacidad para mantenerse <span class="accent">unida.</span></blockquote>
      <cite>— Doctrina KoTZ</cite>
    </div>
  </section>`;
}

/* --------------------------------------------------------- ORGANIZACION */
function pageOrg(){
  const ranks = [
    ['01','Owner',1], ['02','Co-Owner',1], ['03','Capitán',1],
  ];
  const leaders = ['Líder de Comunicación','Líder de Reclutamiento','Líder de Administración','Líder de Venta de Armas'];
  const rest = [['05','Tenientes'],['06','Sargento'],['07','Soldado'],['08','Asociado'],['09','Recluta']];
  return `
  <section class="page-head">
    <div class="wrap">
      <div class="eyebrow">Cadena de mando</div>
      <h1 class="h1">Una jerarquía <span class="accent">clara y estructurada.</span></h1>
      <p class="lede">Cada rol tiene responsabilidades concretas. Las decisiones importantes se toman entre el equipo de liderazgo, nunca en solitario.</p>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="org-tree reveal">
        <div class="org-row"><div class="org-node top"><span class="rank">Nivel 01</span><span class="role">Owner</span></div></div>
        <div class="org-row"><div class="org-node"><span class="rank">Nivel 02</span><span class="role">Co-Owner</span></div></div>
        <div class="org-row"><div class="org-node"><span class="rank">Nivel 03</span><span class="role">Capitán</span></div></div>
        <div class="org-row">
          ${leaders.map(l => `<div class="org-node"><span class="rank">Nivel 04</span><span class="role">${l}</span></div>`).join('')}
        </div>
        ${rest.map(([n,role]) => `<div class="org-row"><div class="org-node"><span class="rank">Nivel ${n}</span><span class="role">${role}</span></div></div>`).join('')}
      </div>
    </div>
  </section>
  <section class="section security">
    <div class="wrap">
      <div class="section-head reveal">
        <div class="eyebrow">Protocolo interno</div>
        <h2 class="h2">La seguridad no es <span class="accent">opcional.</span></h2>
      </div>
      <div class="dossier reveal">
        <div class="dossier-tag">Clasificado · Uso interno</div>
        <p class="redact">Recientemente detectamos un <b>infiltrado</b> de otra banda que intentaba obtener información interna. Gracias a nuestra organización conseguimos descubrirlo antes de que causara problemas.</p>
        <p class="redact">A raíz de eso hemos reforzado enormemente nuestros sistemas de control de acceso y verificación.</p>
        <div class="dossier-grid">
          <div>
            <p class="redact" style="margin-bottom:6px;">Estado del protocolo:</p>
            <p class="redact"><b>Activo</b> — verificación en curso para todo nuevo ingreso.</p>
          </div>
          <div class="log" id="securityLog">
            ${['Verificación previa antes de acceder al servidor','Rol de Pendiente para nuevos ingresos','Canales privados por nivel de acceso','Accesos limitados según rango','Investigación interna ante cualquier sospecha','Protección activa de información sensible']
              .map((t,i) => `<div class="log-line"><span class="tag">[0${i+1}]</span> ${t}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function initSecurityLog(){
  const lines = document.querySelectorAll('#securityLog .log-line');
  if (!lines.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting){ lines.forEach((l,i) => setTimeout(() => l.classList.add('in'), i*130)); io.disconnect(); }
    });
  }, { threshold:.3 });
  io.observe(document.getElementById('securityLog'));
}

/* ------------------------------------------------------------ ALIANZAS */
function pageAlliances(){
  if (!alliancesLoaded) return pageAllianceGate('checking');
  if (alliancesError) return pageAllianceGate(alliancesError.type || 'denied', alliancesError.message);

  const alliances = secureAlliances;
  return `
  <section class="page-head">
    <div class="wrap">
      <div class="eyebrow">Expediente diplomático interno</div>
      <h1 class="h1">Nuestra red de <span class="accent">alianzas.</span></h1>
      <p class="lede">Información reservada para miembros de KoTZ. Cada alianza tiene su propio expediente con acuerdos, protocolos, beneficios y límites de actuación.</p>
    </div>
  </section>
  <section class="section" style="padding-top:0;">
    <div class="wrap">
      <div class="card pad reveal" style="margin-bottom:28px; border-color:rgba(255,122,24,.28);">
        <div class="eyebrow">Acceso restringido</div>
        <p class="lede" style="font-size:.95rem; margin:0;">Estos documentos no son públicos. No compartas capturas, datos internos ni acuerdos con personas ajenas a KoTZ.</p>
      </div>
      <div class="alliance-grid reveal">
        ${alliances.map(a => renderAllianceLinkCard(a)).join('')}
      </div>
    </div>
  </section>`;
}

function pageAllianceDetail(slug){
  if (!alliancesLoaded) return pageAllianceGate('checking');
  if (alliancesError) return pageAllianceGate(alliancesError.type || 'denied', alliancesError.message);

  const alliance = secureAlliances.find(a => a.slug === slug);
  if (!alliance) {
    return `
    <section class="page-head"><div class="wrap">
      <div class="eyebrow">Expediente no encontrado</div>
      <h1 class="h1">Alianza no <span class="accent">registrada.</span></h1>
      <p class="lede">No existe un expediente interno para esa alianza.</p>
      <a class="btn btn-primary" href="#/alianzas">Volver a alianzas</a>
    </div></section>`;
  }

  const c1 = alliance.colors?.primary || '#ff7a18';
  const c2 = alliance.colors?.secondary || '#ff2ea6';
  return `
  <section class="page-head" style="background:radial-gradient(circle at 88% 10%, ${c1}24, transparent 34%), radial-gradient(circle at 12% 0%, ${c2}18, transparent 28%);">
    <div class="wrap">
      <a href="#/alianzas" class="mini-sub" style="display:inline-block; margin-bottom:18px; text-decoration:none;">← Volver a alianzas</a>
      <div class="eyebrow" style="color:${c1};">${alliance.type || 'Alianza oficial'}</div>
      <h1 class="h1">${alliance.name}</h1>
      <p class="lede">${alliance.full || alliance.desc}</p>
      <div class="detail-chip-row">
        <span class="pill pill-green">${alliance.status}</span>
        <span class="pill" style="border-color:${c1}66; color:${c1};">Desde ${alliance.since}</span>
        <span class="pill" style="border-color:${c2}66; color:${c2};">${alliance.level || 'Confianza estable'}</span>
      </div>
    </div>
  </section>
  <section class="section" style="padding-top:0;">
    <div class="wrap alliance-dossier-wrap">
      <div class="card pad reveal" style="border-color:${c1}44; box-shadow:0 0 0 1px ${c1}12 inset, 0 20px 60px rgba(0,0,0,.28);">
        <div class="alliance-top" style="margin-bottom:22px;">
          <div class="alliance-logo" style="background:linear-gradient(135deg, ${c1}26, ${c2}18); border-color:${c1}55; color:${c1};">${alliance.emoji || '🤝'}</div>
          <span class="mini-sub">Código diplomático · ${alliance.code || alliance.slug}</span>
        </div>
        <div class="dossier-grid">
          ${renderDossierSection('Pilares de la alianza', alliance.pillars, c1)}
          ${renderDossierSection('Acuerdos principales', alliance.agreements, c2)}
          ${renderDossierSection('Beneficios para KoTZ', alliance.benefits, c1)}
          ${renderDossierSection('Protocolo obligatorio', alliance.protocol, c2)}
        </div>
        <div class="alliance-note" style="margin-top:26px; border-left:3px solid ${c1}; padding:16px 18px; background:${c1}10;">
          <div class="eyebrow" style="color:${c1};">Nota interna</div>
          <p class="lede" style="font-size:.95rem; margin:0;">${alliance.note || 'Mantener respeto, discreción y comunicación con Alto Mando.'}</p>
        </div>
      </div>
    </div>
  </section>`;
}

function renderAllianceLinkCard(a){
  const c1 = a.colors?.primary || '#ff7a18';
  const c2 = a.colors?.secondary || '#ff2ea6';
  return `
    <a href="#/alianzas/${a.slug}" class="alliance-card" style="text-decoration:none; color:inherit; border-color:${c1}33; background:linear-gradient(135deg, ${c1}10, ${c2}08 42%, rgba(12,12,16,.96));">
      <div class="alliance-top">
        <div class="alliance-logo" style="background:linear-gradient(135deg, ${c1}24, ${c2}16); border-color:${c1}55; color:${c1};">${a.emoji || '🤝'}</div>
        <span class="pill ${a.status === 'Activa' ? 'pill-green' : 'pill-yellow'}">${a.status}</span>
      </div>
      <div class="eyebrow" style="color:${c1};">${a.type || 'Alianza oficial'}</div>
      <h3 class="h3">${a.name}</h3>
      <p class="lede" style="font-size:.88rem; margin-bottom:14px;">${a.desc}</p>
      <div class="alliance-meta"><span>Desde ${a.since}</span><span>${(a.pillars || a.values || []).slice(0,3).join(' · ')}</span></div>
      <div class="mini-sub" style="margin-top:16px; color:${c1};">Abrir expediente →</div>
    </a>`;
}

function renderDossierSection(title, items = [], color = '#ff7a18'){
  return `
    <div class="dossier-section" style="border-top:1px solid ${color}44; padding-top:16px;">
      <div class="eyebrow" style="color:${color};">${title}</div>
      <ul class="rule-list" style="margin-top:12px;">
        ${(items || []).map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>`;
}

function pageAllianceGate(type = 'checking', message = ''){
  const isChecking = type === 'checking';
  const title = isChecking ? 'Verificando acceso...' : 'Alianzas protegidas';
  const text = isChecking
    ? 'Estamos comprobando tu sesión de Discord y tu rango dentro de KoTZ.'
    : (message || 'Este apartado solo está disponible para miembros de KoTZ con sesión de Discord activa.');
  return `
  <section class="page-head">
    <div class="wrap">
      <div class="eyebrow">Acceso interno</div>
      <h1 class="h1">${title}</h1>
      <p class="lede">${text}</p>
      ${isChecking ? `<div class="mini-sub">Un momento...</div>` : `
        <div class="hero-ctas" style="justify-content:flex-start; margin-top:22px;">
          <a class="btn btn-primary" href="/auth/discord?next=${encodeURIComponent('/index.html#/alianzas')}">Iniciar sesión con Discord</a>
          <a class="btn btn-ghost" href="#/">Volver al inicio</a>
        </div>`}
    </div>
  </section>`;
}

/* --------------------------------------------------------- ESTADO DIPLOMÁTICO */
function pageDiplomaticStatus(){
  if (!alliancesLoaded) return pageAllianceGate('checking');
  if (alliancesError) return pageAllianceGate(alliancesError.type || 'denied', alliancesError.message);

  const alliances = secureAlliances;
  const conflicts = KotzStore.getConflicts ? KotzStore.getConflicts() : [];
  return `
  <section class="page-head">
    <div class="wrap">
      <div class="eyebrow">Estado diplomático interno</div>
      <h1 class="h1">Aliados, conflictos y <span class="accent">órdenes activas.</span></h1>
      <p class="lede">Este apartado sirve para que los miembros de KoTZ sepan con quién tenemos alianza, si existe algún conflicto activo y qué conducta deben seguir.</p>
    </div>
  </section>
  <section class="section" style="padding-top:0;">
    <div class="wrap">
      <div class="section-head reveal">
        <div class="eyebrow">Alianzas activas</div>
        <h2 class="h2">Nuestra red de confianza</h2>
      </div>
      <div class="alliance-grid reveal" style="margin-bottom:48px;">
        ${alliances.map(a => renderAllianceLinkCard(a)).join('')}
      </div>

      <div class="section-head reveal">
        <div class="eyebrow">Guerras / conflictos</div>
        <h2 class="h2">Situación actual</h2>
      </div>
      <div class="war-grid reveal">
        ${conflicts.map(w => `
          <div class="war-card">
            <div class="alliance-top">
              <div class="alliance-logo">${w.emoji || '⚠️'}</div>
              <span class="pill ${w.status === 'Estable' ? 'pill-green' : 'pill-red'}">${w.status}</span>
            </div>
            <h3 class="h3">${w.name}</h3>
            <p class="lede" style="font-size:.9rem;">${w.desc}</p>
            <div class="mini-sub" style="margin-top:14px;">Desde: ${w.since}</div>
            <ul class="rule-list">
              ${(w.rules||[]).map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>`).join('') || `<div class="card pad"><p class="lede">No hay conflictos registrados.</p></div>`}
      </div>
    </div>
  </section>`;
}

/* -------------------------------------------------------------- CUOTAS USUARIO */
function pageUserDues(){
  const member = KotzStore.getCurrentMember();
  const dues = KotzStore.getAllDues().filter(d => !member || d.memberId === member.id || d.discordId === KotzStore.getAuthUser()?.id);
  const profileBlock = member ? `
    <div class="linked-member-card">
      <div class="eyebrow">Perfil vinculado</div>
      <h3 class="h3">${member.name}</h3>
      <p class="lede" style="font-size:.9rem; margin-bottom:10px;">${member.discord || member.discordUsername || 'Discord vinculado'} · ${member.rank || 'Sin rango'} · ${member.status || 'Activo'}</p>
      <input type="hidden" name="memberId" value="${member.id}">
    </div>` : `
    <div class="form-error" style="display:block; margin-bottom:18px;">
      Tu Discord todavía no está vinculado en la pestaña members de Google Sheets. Pide al Alto Mando que añada tu discordId o tu username.
    </div>`;

  return `
  <section class="page-head">
    <div class="wrap">
      <div class="eyebrow">Panel de usuario</div>
      <h1 class="h1">Registro de <span class="accent">cuotas.</span></h1>
      <p class="lede">Cada miembro puede registrar aquí su cuota semanal de 300$. El Alto Mando revisará la captura y validará el pago desde el panel de administración.</p>
    </div>
  </section>
  <section class="section" style="padding-top:0;">
    <div class="wrap user-dues-layout">
      <div class="card pad">
        <div class="eyebrow">Nueva cuota</div>
        <h2 class="h3" style="margin-bottom:12px;">Formato obligatorio</h2>
        <p class="lede" style="font-size:.9rem; margin-bottom:18px;">Tu nombre RP se toma automáticamente desde Google Sheets según tu Discord.</p>
        <form id="userDueForm">
          ${profileBlock}
          <div class="field-row">
            <div class="field"><label>Servidor</label><input type="text" name="server" placeholder="Servidor 1" required ${member?'':'disabled'}></div>
            <div class="field"><label>Fecha</label><input type="text" name="date" placeholder="00:30 - 29/06" required ${member?'':'disabled'}></div>
          </div>
          <div class="field"><label>Cantidad</label><input type="number" name="amount" value="300" min="1" required ${member?'':'disabled'}></div>
          <div class="field">
            <label>Captura del depósito</label>
            <input type="file" name="proofImage" accept="image/*" required ${member?'':'disabled'}>
            <p class="mini-sub">La imagen se comprime automáticamente y se sube a Google Drive.</p>
          </div>
          <img id="duePreview" class="photo-preview" alt="Vista previa de la captura">
          <div id="dueError" class="form-error" style="display:none; margin-top:12px;"></div>
          <button type="submit" class="btn btn-primary" style="width:100%; margin-top:14px;" ${member?'':'disabled'}>Enviar cuota para revisión</button>
        </form>
      </div>

      <div class="card pad">
        <div class="eyebrow">Mis cuotas</div>
        <h2 class="h3" style="margin-bottom:12px;">Últimos registros</h2>
        <div class="dues-list">
          ${dues.length ? dues.slice(0,10).map(d => `
            <div class="due-public-row">
              <div>
                <b>${d.memberName}</b>
                <div class="mini-sub">${d.server || 'Servidor no indicado'} · ${d.date || 'Sin fecha'} · ${d.amount || 300}$</div>
              </div>
              <span class="pill ${d.status==='approved'?'pill-green':d.status==='rejected'?'pill-red':'pill-yellow'}">${d.status==='approved'?'Pagada':d.status==='rejected'?'Rechazada':'Pendiente'}</span>
            </div>`).join('') : `<p class="lede" style="font-size:.9rem;">Todavía no hay cuotas registradas para tu perfil.</p>`}
        </div>
      </div>
    </div>
  </section>`;
}
function compressImageForStorage(file, maxSize = 1200, quality = 0.78){
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Selecciona una imagen válida.'));
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
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function initUserDuesForm(){
  const form = document.getElementById('userDueForm');
  if (!form) return;
  const fileInput = form.elements['proofImage'];
  const preview = document.getElementById('duePreview');
  const error = document.getElementById('dueError');
  const showError = msg => { error.textContent = msg || ''; error.style.display = msg ? 'block' : 'none'; };
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file){ preview.style.display = 'none'; return; }
    try { showError(''); preview.src = await compressImageForStorage(file); preview.style.display = 'block'; }
    catch(err){ showError(err.message || 'No se pudo procesar la captura.'); }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const submitBtn = form.querySelector('button[type="submit"]');
    const fd = new FormData(form);
    try {
      const file = fileInput.files?.[0];
      const proofImage = await compressImageForStorage(file);
      const memberId = fd.get('memberId');
      const member = KotzStore.getMember(memberId) || KotzStore.getCurrentMember();
      const payload = {
        memberId,
        memberName: member ? member.name : 'Miembro',
        server: fd.get('server'),
        date: fd.get('date'),
        amount: Number(fd.get('amount') || 300),
        proofImage
      };

      if (submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Enviando...'; }

      // IMPORTANTE: distinguimos dos escenarios muy distintos:
      //  1) El fetch lanza una excepción -> no hay servidor Node al que hablarle
      //     (p.ej. la web se está viendo como estático, sin backend). Ahí SÍ
      //     tiene sentido el fallback a localStorage.
      //  2) El fetch responde pero con un error (res.ok === false) -> el
      //     servidor SÍ está ahí y algo falló guardando en Google/base local.
      //     En ese caso NUNCA debemos fingir que se guardó: mostramos el
      //     error real y no tocamos localStorage.
      let response;
      try {
        response = await fetch('/api/dues', {
          method:'POST',
          credentials:'same-origin',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (networkErr) {
        console.error('[KoTZ] No se pudo contactar con el servidor:', networkErr);
        KotzStore.addDue(memberId, {
          server: payload.server, date: payload.date, amount: payload.amount,
          proof: 'Captura adjunta', proofImage
        });
        alert('No se pudo contactar con el servidor (¿estás abriendo la web sin el backend Node arrancado?). La cuota se ha guardado solo en este navegador.');
        location.hash = '#/cuotas';
        router();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        KotzStore.setBackendDues([data.due, ...KotzStore.getBackendDues()]);
        alert('Cuota enviada correctamente al Panel Alto Mando.');
        location.hash = '#/cuotas';
        router();
        return;
      }

      // El servidor respondió pero con error: lo mostramos tal cual, sin fallback silencioso.
      let serverError = 'No se pudo guardar la cuota en el servidor.';
      try {
        const data = await response.json();
        serverError = data.error || serverError;
      } catch (parseErr) {
        serverError = `Error del servidor (${response.status}). Revisa los logs de Node.`;
      }
      console.error('[KoTZ] /api/dues respondió con error:', response.status, serverError);
      showError(serverError);
    } catch(err){
      showError(err.message || 'No se pudo enviar la cuota.');
    } finally {
      if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Enviar cuota para revisión'; }
    }
  });
}

/* -------------------------------------------------------------- GALERIA */
function pageGallery(){
  const items = KotzStore.getGallery();
  const cats = ['Todos', ...new Set(items.map(i => i.category))];
  return `
  <section class="page-head">
    <div class="wrap">
      <div class="eyebrow">Galería</div>
      <h1 class="h1">Momentos que <span class="accent">construyen historia.</span></h1>
    </div>
  </section>
  <section class="section" style="padding-top:0;">
    <div class="wrap">
      <div class="filter-row reveal">
        ${cats.map((c,i) => `<button class="chip ${i===0?'active':''}" data-cat="${c}">${c}</button>`).join('')}
      </div>
      <div class="gallery-grid reveal" id="galleryGrid">
        ${items.map(g => `
          <div class="gallery-tile tone-${g.tone}" data-cat="${g.category}" ${g.image ? `style="background-image:linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.78)), url('${g.image}')"` : ''}>
            <span class="gallery-cat">${g.category}</span>
            <span class="gallery-title">${g.title}</span>
          </div>`).join('')}
      </div>
    </div>
  </section>`;
}

function initGalleryFilters(){
  const chips = document.querySelectorAll('.filter-row .chip');
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const cat = chip.dataset.cat;
    document.querySelectorAll('.gallery-tile').forEach(tile => {
      tile.style.display = (cat === 'Todos' || tile.dataset.cat === cat) ? '' : 'none';
    });
  }));
}


/* ------------------------------------------------------------ TIENDA */
function pageShop(){
  const items = KotzStore.getActiveShopItems();
  const orders = KotzStore.getShopOrders();
  const offers = KotzStore.getShopOffers();
  const current = KotzStore.getCurrentMember();
  const pill = status => status === 'pending' ? 'pill-yellow' : ['approved','accepted','delivered'].includes(status) ? 'pill-green' : status === 'countered' ? 'pill-yellow' : 'pill-red';
  return `
  <section class="page-head">
    <div class="wrap">
      <div class="eyebrow">Catálogo interno RP</div>
      <h1 class="h1">Tienda <span class="accent">KoTZ.</span></h1>
      <p class="lede">Catálogo interno de rol. Compra, solicita autorización o lanza una oferta al Alto Mando.</p>
      ${current ? `<p class="lede" style="font-size:.92rem;">Entrando como <b>${current.name || current.rpName}</b> · ${current.rank || 'Miembro'}</p>` : `<p class="lede" style="font-size:.92rem;">Cargando tu perfil de miembro...</p>`}
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head reveal">
        <div><div class="eyebrow">Disponibles</div><h2 class="h2">Arsenal RP y equipo.</h2></div>
      </div>
      <div class="cards-grid">
        ${items.map(item => `
          <article class="glass-card reveal" style="padding:18px; display:flex; flex-direction:column; gap:14px; min-height:320px;">
            <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
              <div>
                <div class="eyebrow">${item.category || 'Producto'}</div>
                <h3 class="h3" style="margin:4px 0 6px;">${escapeHtml(item.name)}</h3>
                <p class="lede" style="font-size:.9rem; margin:0;">${escapeHtml(item.description || 'Producto configurable por Alto Mando.')}</p>
              </div>
              ${item.featured ? `<span class="pill pill-yellow">Oferta</span>` : ''}
            </div>
            <div style="height:130px;border:1px solid rgba(255,255,255,.12);border-radius:18px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.03);overflow:hidden;">
              ${item.imageUrl ? `<img src="${escapeAttr(item.imageUrl)}" alt="${escapeAttr(item.name)}" style="max-width:100%;max-height:100%;object-fit:contain;">` : `<div style="font-size:3rem;opacity:.7;">▰</div>`}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="mini-row" style="margin:0;"><div><b>Daño</b><span class="mini-sub">${Number(item.damage||0)}</span></div></div>
              <div class="mini-row" style="margin:0;"><div><b>Durabilidad</b><span class="mini-sub">${Number(item.durability||0)}</span></div></div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:.85rem;">
              <div><span class="mini-sub">Normal</span><br><b>${KotzStore.formatMoney(item.basePrice)}</b></div>
              <div><span class="mini-sub">Miembro</span><br><b class="accent">${KotzStore.formatMoney(item.memberPrice)}</b></div>
              <div><span class="mini-sub">Aliado</span><br><b>${KotzStore.formatMoney(item.allyPrice)}</b></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;gap:10px;">
              <span class="pill ${Number(item.stock||0)>0?'pill-green':'pill-red'}">Stock: ${Number(item.stock||0)}</span>
              <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                <button class="btn btn-primary btn-sm" data-shop-buy="${item.id}" ${Number(item.stock||0)<=0?'disabled':''}>Solicitar compra</button>
                <button class="btn btn-ghost btn-sm" data-shop-offer="${item.id}" ${Number(item.stock||0)<=0?'disabled':''}>Hacer oferta</button>
              </div>
            </div>
          </article>`).join('') || `<div class="glass-card pad"><p class="lede">No hay productos activos todavía.</p></div>`}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap panel-grid-2">
      <div class="card pad reveal">
        <div class="eyebrow">Mis pedidos</div>
        ${orders.length ? orders.map(o => `<div class="mini-row"><div><b>${escapeHtml(o.itemName)}</b><span class="mini-sub">${KotzStore.formatMoney(o.price)} · x${o.quantity} · ${o.message || 'Sin mensaje'}</span></div><span class="pill ${pill(o.status)}">${KotzStore.shopStatusLabel(o.status)}</span></div>`).join('') : `<p class="lede" style="font-size:.9rem;">Aún no has enviado pedidos.</p>`}
      </div>
      <div class="card pad reveal">
        <div class="eyebrow">Mis ofertas</div>
        ${offers.length ? offers.map(o => `
          <div class="mini-row">
            <div>
              <b>${escapeHtml(o.itemName)}</b>
              <span class="mini-sub">Ofreciste ${KotzStore.formatMoney(o.offeredPrice)} · Original ${KotzStore.formatMoney(o.originalPrice)}${o.counterOffer ? ' · Contra: ' + KotzStore.formatMoney(o.counterOffer) : ''}</span>
              ${o.status === 'countered' ? `
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
                  <button class="btn btn-primary btn-sm" data-shop-counter-accept="${escapeHtml(o.id)}">Aceptar contra</button>
                  <button class="btn btn-ghost btn-sm" data-shop-counter-again="${escapeHtml(o.id)}">Nueva oferta</button>
                  <button class="btn btn-danger btn-sm" data-shop-counter-reject="${escapeHtml(o.id)}">Rechazar</button>
                </div>` : ''}
            </div>
            <span class="pill ${pill(o.status)}">${KotzStore.shopStatusLabel(o.status)}</span>
          </div>`).join('') : `<p class="lede" style="font-size:.9rem;">Aún no has enviado ofertas.</p>`}
      </div>
    </div>
  </section>`;
}

async function submitShopOrder(itemId, offer=false){
  const item = KotzStore.getShopItem(itemId);
  if (!item) return alert('Producto no encontrado.');
  try {
    if (offer){
      const offeredPrice = prompt(`¿Cuánto ofreces por ${item.name}? Precio miembro: ${KotzStore.formatMoney(item.memberPrice)}`);
      if (!offeredPrice) return;
      const message = prompt('Mensaje para Alto Mando (opcional):') || '';
      const res = await fetch('/api/shop/offers', { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ itemId, offeredPrice:Number(offeredPrice), message, priceMode:'member' }) });
      if (!res.ok){ const data = await res.json().catch(() => ({})); throw new Error(data.error || 'No se pudo enviar la oferta.'); }
      alert('Oferta enviada a Alto Mando.');
    } else {
      const message = prompt(`Mensaje para Alto Mando sobre ${item.name} (opcional):`) || '';
      const res = await fetch('/api/shop/orders', { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ itemId, quantity:1, message, priceMode:'member' }) });
      if (!res.ok){ const data = await res.json().catch(() => ({})); throw new Error(data.error || 'No se pudo enviar el pedido.'); }
      alert('Pedido enviado a Alto Mando.');
    }
    await syncShopFromServer(true);
  } catch(err){
    alert('Error en tienda: ' + (err.message || err));
  }
}

async function respondShopCounter(offerId, action){
  const offer = KotzStore.getShopOffers().find(o => String(o.id) === String(offerId));
  if (!offer) return alert('Oferta no encontrada.');

  let body = { action };

  if (action === 'accept-counter') {
    const ok = confirm(`¿Aceptar la contraoferta de ${KotzStore.formatMoney(offer.counterOffer)} por ${offer.itemName}?`);
    if (!ok) return;
  }

  if (action === 'reject-counter') {
    const ok = confirm(`¿Rechazar la contraoferta por ${offer.itemName}?`);
    if (!ok) return;
  }

  if (action === 'counter-again') {
    const offeredPrice = prompt(`Nueva oferta para ${offer.itemName}:
Tu oferta anterior: ${KotzStore.formatMoney(offer.offeredPrice)}
Contraoferta de Alto Mando: ${KotzStore.formatMoney(offer.counterOffer)}`);
    if (!offeredPrice) return;
    body.offeredPrice = Number(offeredPrice);
    body.message = prompt('Mensaje para Alto Mando (opcional):') || 'Nueva contraoferta del cliente';
  }

  try {
    const res = await fetch(`/api/shop/offers/${encodeURIComponent(offerId)}/respond`, {
      method:'PATCH',
      credentials:'same-origin',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok){
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'No se pudo responder la contraoferta.');
    }

    if (action === 'accept-counter') alert('Contraoferta aceptada. Alto Mando verá la oferta como aceptada.');
    if (action === 'reject-counter') alert('Contraoferta rechazada.');
    if (action === 'counter-again') alert('Nueva oferta enviada a Alto Mando.');

    await syncShopFromServer(true);
  } catch(err){
    alert('Error en tienda: ' + (err.message || err));
  }
}

function initShopPage(){
  document.querySelectorAll('[data-shop-buy]').forEach(btn => btn.addEventListener('click', () => submitShopOrder(btn.dataset.shopBuy, false)));
  document.querySelectorAll('[data-shop-offer]').forEach(btn => btn.addEventListener('click', () => submitShopOrder(btn.dataset.shopOffer, true)));
  document.querySelectorAll('[data-shop-counter-accept]').forEach(btn => btn.addEventListener('click', () => respondShopCounter(btn.dataset.shopCounterAccept, 'accept-counter')));
  document.querySelectorAll('[data-shop-counter-reject]').forEach(btn => btn.addEventListener('click', () => respondShopCounter(btn.dataset.shopCounterReject, 'reject-counter')));
  document.querySelectorAll('[data-shop-counter-again]').forEach(btn => btn.addEventListener('click', () => respondShopCounter(btn.dataset.shopCounterAgain, 'counter-again')));
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}
function escapeAttr(value){ return escapeHtml(value).replace(/'/g, '&#39;'); }

/* --------------------------------------------------------- ESTADISTICAS */
function pageStats(){
  const s = KotzStore.stats();
  const growth = KotzStore.getMemberGrowth();
  const maxGrowth = Math.max(...growth.map(g => g.total));
  return `
  <section class="page-head">
    <div class="wrap">
      <div class="eyebrow">Números de la Zona</div>
      <h1 class="h1">Crecemos <span class="accent">con criterio.</span></h1>
    </div>
  </section>
  <section class="section" style="padding-top:0;">
    <div class="wrap">
      <div class="stat-grid reveal">
        ${[
          [s.totalMembers,'Miembros'],
          [s.alliances,'Alianzas activas'],
          [s.eventsHeld,'Eventos realizados'],
          [s.activeMembers,'Miembros activos'],
          [s.recruitsAccepted,'Reclutas aceptados'],
          [Math.round((s.duesApproved/(s.duesApproved+s.duesPending||1))*100)+'%','Cuotas al día'],
        ].map(([val,label]) => `
          <div class="stat-card">
            <div class="stat-num" data-count="${String(val).replace('%','')}">0${String(val).includes('%')?'%':''}</div>
            <div class="stat-label">${label}</div>
          </div>`).join('')}
      </div>

      <div class="chart-card reveal" style="margin-top:40px;">
        <div class="eyebrow">Crecimiento de miembros</div>
        <div class="bars">
          ${growth.map(g => `
            <div class="bar-col">
              <div class="bar" style="height:${(g.total/maxGrowth*100).toFixed(0)}%"></div>
              <span class="bar-label">${g.month}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </section>`;
}

function animateCounters(){
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const isPct = el.textContent.includes('%');
    let cur = 0;
    const step = Math.max(1, Math.round(target/40));
    const tick = () => {
      cur = Math.min(target, cur + step);
      el.textContent = cur + (isPct ? '%' : '');
      if (cur < target) requestAnimationFrame(tick);
    };
    tick();
  });
}

/* -------------------------------------------------------------- UNETE */
function pageJoin(){
  return `
  <section class="page-head">
    <div class="wrap">
      <div class="eyebrow">Únete a la Zona</div>
      <h1 class="h1">¿Listo para ser <span class="accent">parte de la familia?</span></h1>
      <p class="lede">Buscamos personas comprometidas, no números. Rellena la solicitud y el Alto Mando la revisará.</p>
    </div>
  </section>
  <section class="section" style="padding-top:0;">
    <div class="wrap" style="max-width:640px;">
      <form id="joinForm" class="reveal">
        <div class="field-row">
          <div class="field"><label>Nombre RP</label><input type="text" name="name" required></div>
          <div class="field"><label>Usuario de Discord</label><input type="text" name="discord" placeholder="usuario#0000" required></div>
        </div>
        <div class="field"><label>Edad</label><input type="number" name="age" min="13" max="99" required></div>
        <div class="field"><label>Experiencia previa en bandas</label><textarea name="experience" rows="3"></textarea></div>
        <div class="field"><label>¿Por qué quieres unirte a KoTZ?</label><textarea name="reason" rows="4" required></textarea></div>
        <div class="field"><label>¿Cómo nos conociste?</label><input type="text" name="found"></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Enviar solicitud</button>
      </form>
      <div id="joinSuccess" class="card" style="display:none; padding:40px; text-align:center;">
        <div class="eyebrow" style="justify-content:center;">Solicitud recibida</div>
        <h3 class="h3" style="margin-bottom:10px;">Gracias por dar el paso.</h3>
        <p class="lede" style="margin:0 auto;">Tu solicitud ha entrado en el panel del Alto Mando y será revisada pronto. Te contactaremos por Discord.</p>
      </div>
    </div>
  </section>`;
}

function initJoinForm(){
  const form = document.getElementById('joinForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    KotzStore.submitApplication({
      name: fd.get('name'), discord: fd.get('discord'), age: fd.get('age'),
      experience: fd.get('experience'), reason: fd.get('reason'), found: fd.get('found'),
    });
    form.style.display = 'none';
    document.getElementById('joinSuccess').style.display = 'block';
  });
}

/* ---------------------------------------------------------- EMBERS BG */
function initEmbers(){
  const canvas = document.getElementById('embers');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canvas || reduceMotion) return;
  const ctx = canvas.getContext('2d');
  let w,h,particles;
  function resize(){ w = canvas.width = canvas.parentElement.offsetWidth; h = canvas.height = canvas.parentElement.offsetHeight; }
  function make(){
    const count = Math.min(60, Math.floor(w/22));
    particles = Array.from({length:count}, () => ({
      x: Math.random()*w, y: h + Math.random()*h*0.5, r: Math.random()*2+.6,
      speed: Math.random()*.6+.2, drift:(Math.random()-.5)*.4,
      hue: Math.random()>.5?'255,122,0':'255,46,154', alpha: Math.random()*.5+.2
    }));
  }
  resize(); make();
  window.addEventListener('resize', () => { resize(); make(); });
  (function tick(){
    ctx.clearRect(0,0,w,h);
    particles.forEach(p => {
      p.y -= p.speed; p.x += p.drift;
      if (p.y < -10){ p.y = h+10; p.x = Math.random()*w; }
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(${p.hue},${p.alpha})`; ctx.fill();
    });
    requestAnimationFrame(tick);
  })();
}

/* ---------------------------------------------------------------- INIT */
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.crest-img').forEach(img => img.src = 'assets/crest.png');
  loadDiscordSession().then(() => syncCurrentMemberFromServer(false));
  syncDuesFromServer(false);
  syncGalleryFromServer(false);
  setupSiteLogout();
  router();
  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 40), { passive:true });
  const burger = document.getElementById('burger');
  const panel = document.getElementById('mobilePanel');
  burger.addEventListener('click', () => { panel.classList.toggle('open'); burger.classList.toggle('open'); });
});
