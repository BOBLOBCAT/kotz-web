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
let serverGalleryError = null;
let currentMemberLoaded = false;
let currentMemberLoading = false;
let shopLoaded = false;
let shopLoading = false;
let alliancesLoaded = false;
let alliancesLoading = false;
let alliancesNeedsRerender = false;
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
  serverGalleryError = null;
  try {
    const res = await fetch('/api/gallery?ts=' + Date.now(), {
      credentials:'same-origin',
      cache:'no-store'
    });
    if (res.ok){
      const data = await res.json();
      KotzStore.setBackendGallery(data.items || data.gallery || []);
      serverGalleryLoaded = true;
    } else {
      serverGalleryLoaded = true;
      serverGalleryError = 'No se pudo cargar la galería.';
    }
  } catch(e) {
    serverGalleryLoaded = true;
    serverGalleryError = 'No se pudo conectar con la galería.';
  } finally {
    serverGalleryLoading = false;
    if (rerender && (location.hash.replace('#','') || '/') === '/galeria') router();
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
  if (alliancesLoading) {
    if (rerender) alliancesNeedsRerender = true;
    return;
  }

  alliancesLoading = true;
  alliancesNeedsRerender = Boolean(rerender);
  alliancesError = null;

  try {
    const res = await fetch('/api/alliances?ts=' + Date.now(), {
      credentials:'same-origin',
      cache:'no-store'
    });

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
  } catch(e) {
    alliancesError = { type:'server', message:'No se pudo conectar con el servidor de alianzas.' };
    secureAlliances = [];
    alliancesLoaded = true;
  } finally {
    alliancesLoading = false;

    const path = location.hash.replace('#','') || '/';
    const shouldRerender = alliancesNeedsRerender && (path === '/alianzas' || path === '/estado' || path.startsWith('/alianzas/'));
    alliancesNeedsRerender = false;

    if (shouldRerender) router();
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

  let html = '';
  try {
    html = render();
  } catch (err) {
    console.error('[KoTZ] Error renderizando ruta', path, err);
    html = `
      <section class="page-head">
        <div class="wrap">
          <div class="eyebrow">Error de vista</div>
          <h1 class="h1">No se pudo abrir esta sección.</h1>
          <p class="lede">La ruta cambió correctamente, pero el render de la página falló. Revisa la consola para ver el error exacto.</p>
          <a class="btn btn-primary" href="#/">Volver al inicio</a>
        </div>
      </section>`;
  }

  view.innerHTML = html;
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
  if (path === '/estadisticas') { animateCounters(); initStatsConsole(); }
  if (path === '/galeria') { initGalleryFilters(); verifyGalleryImages(); if (!serverGalleryLoaded && !serverGalleryLoading) syncGalleryFromServer(true); }
  if (path === '/cuotas') { initUserDuesForm(); if (!currentMemberLoaded) syncCurrentMemberFromServer(true); if (!serverDuesLoaded) syncDuesFromServer(true); }
  if (path === '/tienda') { initShopPage(); if (!currentMemberLoaded) syncCurrentMemberFromServer(true); if (!shopLoaded) syncShopFromServer(true); }
  if (isAllianceProtectedPath(path)) {
    if (!currentMemberLoaded) syncCurrentMemberFromServer(true);
    if (!alliancesLoaded) syncAlliancesFromServer(true);
  }
  if (path === '/organizacion') initSecurityLog();
  if (path === '/nosotros') initAboutConsole();
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
  const systems = [
    ['Panel Usuario','Acceso para miembros verificados, cuotas, tienda RP y galería interna.','user.html','Abrir panel','100%','👤'],
    ['Alto Mando','Control de miembros, sanciones, cuotas, tienda, galería y administración.','panel.html','Entrar mando','Privado','👑'],
    ['Organización','Cadena de mando, rangos, áreas internas y protocolos de crecimiento.','#/organizacion','Ver estructura','9 rangos','▰'],
    ['Diplomacia','Alianzas protegidas, expedientes, posiciones TOP y red internacional.','#/alianzas','Ver red','9 aliados','🤝']
  ];
  const topAllies = [
    ['#8','KAOS','Alianza estratégica','Información · táctica · apoyo','#D8C84A'],
    ['#9','The NATO','Alianza internacional','Prioridad · respeto · coordinación','#9FE8FF'],
    ['#17','Fallen Angels','Crecimiento conjunto','Eventos · presencia · colaboración','#B88CFF']
  ];
  const doctrine = [
    ['01','Identidad','No entrar por entrar. Representar KoTZ significa cuidar el nombre, la imagen y la zona.'],
    ['02','Estructura','Cada rango tiene función. Cada área tiene objetivo. Cada decisión deja rastro.'],
    ['03','Diplomacia','Los aliados se respetan como extensión de la red KoTZ. Sin caos, sin traiciones, sin improvisar.'],
    ['04','Futuro','La meta no es parecer grandes un día. Es construir algo que aguante, crezca y se recuerde.']
  ];
  const dataLines = ['AUTH: VERIFIED','ZONE: ONLINE','DIPLOMACY: ACTIVE','COMMAND: READY','GALLERY: SYNC','SHOP RP: OPEN','RANKS: STABLE','SIGNAL: STRONG'];
  return `
  <section class="home-v3-hero">
    <canvas id="embers"></canvas>
    <div class="home-aurora"></div>
    <div class="home-grid-bg"></div>
    <div class="home-scan"></div>
    <div class="home-data-rain" aria-hidden="true">
      ${dataLines.map((line,i)=>`<span class="home-data-line" style="--i:${i}; --x:${(i*13+7)%92}%">${line}</span>`).join('')}
    </div>

    <div class="wrap home-hero-layout">
      <div class="home-hero-copy reveal">
        <div class="home-status-pill"><span></span> KoTZ NETWORK ONLINE</div>
        <h1 class="home-title">Kings of<br><span>The Zone</span></h1>
        <p class="home-lede">Una comunidad de PrisonRP con identidad, mando, diplomacia, economía RP, galería, panel interno y una red que no solo se ve: se siente.</p>
        <div class="home-hero-actions">
          <a href="user.html" class="btn btn-primary">Entrar al panel</a>
          <a href="#/nosotros" class="btn btn-ghost">Conocer KoTZ</a>
          <a href="panel.html" class="btn btn-ghost">Alto Mando</a>
        </div>
        <div class="home-motto-wall">
          <span>ONE FAMILY</span><span>ONE VISION</span><span>ONE ZONE</span><span>TOGETHER WE GROW</span>
        </div>
      </div>

      <div class="home-command-visual reveal" aria-label="Núcleo KoTZ">
        <div class="home-orbit-ring r1"></div>
        <div class="home-orbit-ring r2"></div>
        <div class="home-orbit-ring r3"></div>
        <div class="home-orbit-pulse"></div>
        <div class="home-core-card">
          <img class="crest-img" src="assets/crest.png" alt="Escudo de KoTZ">
          <b>KoTZ</b>
          <small>Command Core</small>
        </div>
        <a href="#/organizacion" class="home-orbit-node n1"><b>09</b><span>Rangos</span></a>
        <a href="#/alianzas" class="home-orbit-node n2"><b>09</b><span>Alianzas</span></a>
        <a href="#/estadisticas" class="home-orbit-node n3"><b>DATA</b><span>Core</span></a>
        <a href="#/galeria" class="home-orbit-node n4"><b>MEDIA</b><span>Galería</span></a>
      </div>
    </div>

    <div class="home-signal-strip">
      <div class="home-signal-track">
        ${Array(2).fill(`
          <span>⚡ SISTEMA INTERNO ACTIVO</span>
          <span>👑 ALTO MANDO ONLINE</span>
          <span>🤝 DIPLOMACIA EN MOVIMIENTO</span>
          <span>📊 ESTADÍSTICAS SINCRONIZADAS</span>
          <span>🛡️ ACCESO VERIFICADO</span>
        `).join('')}
      </div>
    </div>
  </section>

  <section class="section home-overview-section">
    <div class="wrap">
      <div class="home-kpi-grid reveal">
        <div class="home-kpi-card hot"><small>Red diplomática</small><b>KoTZ #15 · aliados #8/#9/#17</b><span>Ranking operativo actualizado</span></div>
        <div class="home-kpi-card"><small>Estructura</small><b>9 rangos</b><span>De Recluta a Owner</span></div>
        <div class="home-kpi-card"><small>Operación</small><b>24/7</b><span>Panel, roles y registros</span></div>
        <div class="home-kpi-card"><small>Identidad</small><b>1 familia</b><span>Una visión, una zona</span></div>
      </div>

      <div class="home-live-layout">
        <div class="home-live-board reveal">
          <div class="home-board-top"><span></span><b>KoTZ Live Command</b><em>PUBLIC VIEW</em></div>
          <div class="home-board-grid">
            <div><small>Estado</small><b>Operativo</b></div>
            <div><small>Acceso</small><b>Discord OAuth</b></div>
            <div><small>Datos</small><b>Google Sync</b></div>
            <div><small>Zona</small><b>En expansión</b></div>
          </div>
          <div class="home-terminal-mini">
            <p><span>[01]</span> Cargando identidad KoTZ...</p>
            <p><span>[02]</span> Sincronizando red de alianzas...</p>
            <p><span>[03]</span> Verificando estructura interna...</p>
            <p><span>[04]</span> Estado final: comunidad activa.</p>
          </div>
        </div>
        <div class="home-intro-copy reveal">
          <div class="eyebrow">Inicio remodelado</div>
          <h2 class="h2">La primera impresión tiene que decir: <span class="accent">aquí hay algo serio.</span></h2>
          <p class="lede">La página de inicio ahora funciona como una entrada principal a todo el ecosistema KoTZ: muestra identidad, sistemas, estructura, diplomacia y actividad sin parecer una portada vacía.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section home-systems-section">
    <div class="wrap">
      <div class="section-head center reveal">
        <div class="eyebrow" style="justify-content:center;">Ecosistema KoTZ</div>
        <h2 class="h2">Todo conectado dentro de <span class="accent">una sola zona.</span></h2>
        <p class="lede" style="margin-inline:auto;">Inicio, usuarios, Alto Mando, organización, diplomacia, galería, cuotas, tienda y estadísticas no son páginas sueltas: son módulos de una misma estructura.</p>
      </div>
      <div class="home-system-grid reveal">
        ${systems.map(([name,desc,href,cta,metric,icon],i)=>`
          <a href="${href}" class="home-system-card" style="--i:${i}">
            <div class="home-system-icon">${icon}</div>
            <div class="home-system-metric">${metric}</div>
            <h3>${name}</h3>
            <p>${desc}</p>
            <span>${cta} →</span>
          </a>`).join('')}
      </div>
    </div>
  </section>

  <section class="section home-top-section">
    <div class="wrap home-top-layout">
      <div class="home-top-copy reveal">
        <div class="eyebrow">Posiciones destacadas</div>
        <h2 class="h2">Alianzas que no pasan desapercibidas.</h2>
        <p class="lede">Las posiciones TOP ahora aparecen desde el inicio para dar más peso a la red diplomática y enseñar rápido que KoTZ no está aislado.</p>
        <a class="btn btn-primary" href="#/alianzas">Abrir centro diplomático</a>
      </div>
      <div class="home-top-grid reveal">
        ${topAllies.map(([rank,name,type,desc,color],i)=>`
          <a class="home-top-card" href="#/alianzas/${name === 'KAOS' ? 'kaos' : name === 'The NATO' ? 'the-nato' : 'fallen-angels'}" style="--ally:${color}; --i:${i}">
            <div class="home-top-rank">${rank}</div>
            <h3>${name}</h3>
            <small>${type}</small>
            <p>${desc}</p>
            <div class="home-top-line"><i></i></div>
          </a>`).join('')}
      </div>
    </div>
  </section>

  <section class="section home-doctrine-section">
    <div class="wrap">
      <div class="section-head reveal">
        <div class="eyebrow">Doctrina de entrada</div>
        <h2 class="h2">Antes de explorar la web, entiende <span class="accent">qué representa KoTZ.</span></h2>
      </div>
      <div class="home-doctrine-grid reveal">
        ${doctrine.map(([num,title,desc],i)=>`
          <article class="home-doctrine-card" style="--i:${i}">
            <span>${num}</span>
            <h3>${title}</h3>
            <p>${desc}</p>
          </article>`).join('')}
      </div>
    </div>
  </section>

  <section class="section home-final-gate">
    <div class="wrap reveal">
      <div class="home-gate-card">
        <div class="home-gate-orb"></div>
        <div class="eyebrow" style="justify-content:center;">Acceso principal</div>
        <h2 class="h2">La corona no se mira desde fuera.<br><span class="accent">Se entra, se representa y se protege.</span></h2>
        <p class="lede" style="margin-inline:auto;">Entra al panel si formas parte de KoTZ, revisa la organización si quieres entender la estructura o explora la identidad para ver por qué la zona tiene nombre propio.</p>
        <div class="home-gate-actions">
          <a href="user.html" class="btn btn-primary">Panel Usuario</a>
          <a href="#/organizacion" class="btn btn-ghost">Organización</a>
          <a href="#/estadisticas" class="btn btn-ghost">Estadísticas</a>
        </div>
      </div>
    </div>
  </section>`;
}

/* ------------------------------------------------------------ NOSOTROS */
function pageAbout(){
  const identityStats = [
    ['Familia', '01', 'La base no es el número: es la confianza.'],
    ['Disciplina', '02', 'Roles claros, decisiones claras y respeto interno.'],
    ['Zona', '03', 'Una identidad propia dentro de PrisonRP.'],
    ['Futuro', '04', 'Crecimiento controlado, alianzas y estructura.']
  ];
  const pillars = [
    ['👑','Corona','La corona no significa mandar por ego: significa cargar responsabilidad y proteger el nombre KoTZ.'],
    ['🐍','Cobra','Paciencia, lectura del entorno y reacción precisa. No se improvisa cuando la situación importa.'],
    ['🤝','Respeto','Dentro y fuera. Un miembro puede ser fuerte, pero si pierde el respeto, pierde la identidad.'],
    ['⚖️','Orden','Rangos, protocolos, cuotas, sanciones y alianzas existen para que la banda no dependa del caos.'],
    ['❤️','Familia','Cada persona tiene nombre, historia y peso. KoTZ no busca llenar una lista, busca crear núcleo.'],
    ['📈','Progreso','Se asciende con actitud, constancia, lealtad y utilidad real para la organización.']
  ];
  const timeline = [
    ['Origen','KoTZ nace con la idea de ser algo más que una banda más del servidor.'],
    ['Identidad','Se define una imagen seria: corona, zona, respeto, disciplina y familia.'],
    ['Estructura','Se crean rangos, Alto Mando, cuotas, sanciones, tienda y panel interno.'],
    ['Diplomacia','Las alianzas pasan a ser parte del sistema, no simples nombres en una lista.'],
    ['Presente','KoTZ opera como comunidad organizada, con visión y control interno.']
  ];
  const protocols = [
    ['Se espera','Actividad, respeto, comunicación y representación correcta del nombre KoTZ.'],
    ['Se valora','Lealtad en momentos incómodos, iniciativa y capacidad de ayudar sin buscar foco.'],
    ['Se corrige','Faltas de respeto, impulsividad, conflicto innecesario o saltarse el conducto interno.'],
    ['Se protege','Información interna, alianzas, miembros nuevos y decisiones del Alto Mando.']
  ];
  return `
  <section class="about-v2-hero">
    <div class="about-v2-grid"></div>
    <div class="about-v2-orb orb-a"></div>
    <div class="about-v2-orb orb-b"></div>
    <div class="wrap about-identity-layout">
      <div class="about-identity-copy reveal">
        <div class="eyebrow">Identidad KoTZ</div>
        <h1 class="h1">No somos relleno.<br>Somos <span class="accent">estructura, familia y zona.</span></h1>
        <p class="lede">KoTZ está pensado para que cada miembro sienta que pertenece a algo con nombre, reglas, historia y futuro. No se trata solo de estar en una banda: se trata de representar una identidad.</p>
        <div class="identity-actions">
          <a class="btn btn-primary" href="#/organizacion">Ver estructura</a>
          <a class="btn btn-ghost" href="#/alianzas">Red diplomática</a>
        </div>
        <div class="identity-scanline">
          <span>FAMILIA</span><i></i><span>HONOR</span><i></i><span>LEALTAD</span><i></i><span>CONTROL</span>
        </div>
      </div>
      <div class="identity-core reveal">
        <div class="core-rings"><span></span><span></span><span></span></div>
        <img src="assets/crest.png" alt="Escudo KoTZ">
        <div class="core-label top">KINGS</div>
        <div class="core-label bottom">OF THE ZONE</div>
        <div class="core-node n1">Honor</div>
        <div class="core-node n2">Zona</div>
        <div class="core-node n3">Respeto</div>
        <div class="core-node n4">Familia</div>
      </div>
    </div>
  </section>

  <section class="section identity-stats-section">
    <div class="wrap">
      <div class="identity-stat-grid reveal">
        ${identityStats.map(([title,num,desc],i) => `
          <div class="identity-stat-card" style="--delay:${i*.12}s">
            <span>${num}</span>
            <b>${title}</b>
            <small>${desc}</small>
          </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section about-doctrine-section">
    <div class="wrap doctrine-layout">
      <div class="doctrine-copy reveal">
        <div class="eyebrow">Doctrina interna</div>
        <h2 class="h2">La fuerza real está en <span class="accent">cómo actuamos cuando nadie mira.</span></h2>
        <p class="lede">La diferencia entre una banda cualquiera y KoTZ es la forma de responder: con cabeza, con respeto, con estructura y con gente que entiende que el nombre está por encima del ego.</p>
      </div>
      <div class="doctrine-terminal reveal" id="aboutConsole">
        ${['Inicializando identidad KoTZ...','Verificando núcleo de confianza...','Cargando protocolos de respeto...','Sincronizando corona, zona y familia...','Estado: comunidad operativa.'].map((line,i)=>`
          <div class="about-terminal-line" style="--i:${i}"><span>[0${i+1}]</span> ${line}</div>`).join('')}
      </div>
    </div>
    <div class="wrap">
      <div class="values-v2-grid reveal">
        ${pillars.map(([icon,name,desc],i) => `
          <article class="value-v2-card" style="--i:${i}">
            <div class="value-v2-icon">${icon}</div>
            <h3>${name}</h3>
            <p>${desc}</p>
          </article>`).join('')}
      </div>
    </div>
  </section>

  <section class="section origin-section">
    <div class="wrap">
      <div class="section-head center reveal">
        <div class="eyebrow" style="justify-content:center;">Historia viva</div>
        <h2 class="h2">De idea a <span class="accent">organización.</span></h2>
        <p class="lede" style="margin-inline:auto;">KoTZ no se construyó de golpe. Se fue formando por capas: identidad, miembros, control, diplomacia y sistemas internos.</p>
      </div>
      <div class="origin-timeline reveal">
        ${timeline.map(([title,desc],i)=>`
          <div class="origin-step" style="--i:${i}">
            <span>${String(i+1).padStart(2,'0')}</span>
            <h3>${title}</h3>
            <p>${desc}</p>
          </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section culture-section">
    <div class="wrap culture-layout">
      <div class="culture-card-main reveal">
        <div class="dossier-tag">Código KoTZ · Uso interno</div>
        <h2>Representar KoTZ es llevar el nombre incluso cuando no hay nadie del Alto Mando mirando.</h2>
        <p>Por eso la comunidad se basa en conducta, no solo en estética. Una banda puede tener logo. KoTZ tiene forma de actuar.</p>
      </div>
      <div class="culture-protocols reveal">
        ${protocols.map(([title,desc],i)=>`
          <div class="culture-protocol" style="--i:${i}">
            <span>0${i+1}</span>
            <b>${title}</b>
            <small>${desc}</small>
          </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section philosophy philosophy-v2">
    <div class="wrap reveal">
      <div class="eyebrow" style="justify-content:center;">Manifiesto</div>
      <blockquote>La corona no se presume. <span class="accent">Se defiende.</span><br>La zona no se ocupa. <span class="accent">Se construye.</span><br>La familia no se promete. <span class="accent">Se demuestra.</span></blockquote>
      <cite>— Doctrina KoTZ</cite>
    </div>
  </section>`;
}

function initAboutConsole(){
  const lines = document.querySelectorAll('#aboutConsole .about-terminal-line');
  if (!lines.length) return;
  lines.forEach((line,i) => setTimeout(() => line.classList.add('in'), i * 140));
}

/* --------------------------------------------------------- ORGANIZACION */
function pageOrg(){
  const command = [
    { level:'01', role:'Owner', name:'Roger', tag:'Dirección total', icon:'👑', color:'#fff600', desc:'Marca la visión, toma decisiones finales y protege la identidad de KoTZ.', power:'100' },
    { level:'02', role:'Co-Owner', name:'Ian Grimstone', tag:'Segundo mando', icon:'♛', color:'#00ff6a', desc:'Sostiene la operación diaria, reemplaza al Owner y coordina decisiones críticas.', power:'94' },
    { level:'03', role:'Capitanes', name:'Kyle · Tyler · Gigi · Eva', tag:'Alto Mando', icon:'◆', color:'#ff0000', desc:'Dirigen áreas, supervisan rangos y convierten órdenes en movimiento real.', power:'88' },
    { level:'04', role:'Líderes de área', name:'Comunicación · Reclutamiento · Administración · Venta', tag:'Especialistas', icon:'▣', color:'#f3b280', desc:'Controlan departamentos concretos y mantienen el ritmo interno de la organización.', power:'82' }
  ];

  const ranks = [
    ['01','Owner','Mando absoluto','Visión, decisiones finales, alianzas mayores y dirección general.','Acceso total','👑','#fff600'],
    ['02','Co-Owner','Dirección ejecutiva','Coordina Alto Mando, cubre al Owner y valida cambios importantes.','Acceso total','#','#00ff6a'],
    ['03','Capitanes','Mando operativo','Supervisan miembros, revisan problemas, activan protocolos y lideran áreas.','Alto Mando','◆','#ff0000'],
    ['04','Líderes de área','Especialización','Responsables de comunicación, reclutamiento, administración o venta RP.','Área asignada','▣','#f3b280'],
    ['05','Tenientes','Coordinación','Ejecutan órdenes, organizan grupos pequeños y reportan al Alto Mando.','Operativo','▲','#e1680d'],
    ['06','Sargentos','Control de escuadra','Mantienen disciplina, acompañan miembros nuevos y detectan problemas.','Escuadra','●','#206694'],
    ['07','Soldados','Fuerza principal','Participan, aportan cuotas, respetan protocolos y representan la imagen KoTZ.','Miembro completo','■','#6b8e23'],
    ['08','Asociados','Vinculación','Personas cercanas a KoTZ en observación o colaboración limitada.','Limitado','◇','#938247'],
    ['09','Reclutas','Prueba inicial','Nuevos ingresos bajo verificación, aprendizaje y seguimiento.','Básico','○','#b9bbbe']
  ];

  const areaLeaders = [
    {
      name:'Comunicación',
      icon:'🟠',
      color:'#f3b280',
      leaders:'@Kyle Crimson y @Eva Grimblade',
      mission:'Responsable de la comunicación entre KoTZ, aliados y otras bandas.',
      functions:['Preparar anuncios y mensajes oficiales.', 'Mantener comunicación clara entre miembros y liderazgo.', 'Coordinar mensajes con aliados u otras bandas cuando Alto Mando lo autorice.', 'Evitar malentendidos públicos y ordenar la información importante.']
    },
    {
      name:'Reclutamiento',
      icon:'🟢',
      color:'#448f7c',
      leaders:'@Ian Grimstone y @Gigi',
      mission:'Encargado de buscar y reclutar a otros miembros y de la gestión de los nuevos miembros.',
      functions:['Buscar perfiles útiles para KoTZ.', 'Filtrar entradas, observar actitud y detectar problemas.', 'Guiar a reclutas durante sus primeros pasos.', 'Reportar al Alto Mando quién merece quedarse y quién no.']
    },
    {
      name:'Venta de Armas',
      icon:'⚫',
      color:'#2a2525',
      leaders:'@Tyler price',
      mission:'Responsable de coordinar el comercio y la distribución de armamento dentro de la organización.',
      functions:['Controlar solicitudes de compra en la tienda RP.', 'Coordinar precios, stock y entregas.', 'Evitar ventas sin autorización o acuerdos mal cerrados.', 'Mantener la economía RP bajo control interno.']
    },
    {
      name:'Administración',
      icon:'🔴',
      color:'#4e0a1a',
      leaders:'@Roger',
      mission:'Encargado de la organización interna, gestión de recursos y supervisión administrativa de la banda.',
      functions:['Gestionar miembros, rangos, cuotas y sanciones.', 'Supervisar recursos, registros y paneles internos.', 'Revisar que los sistemas funcionen correctamente.', 'Mantener la estructura de KoTZ ordenada y actualizada.']
    }
  ];

  const departments = [
    ['Comunicación','Control de anuncios, coordinación pública, mensajes oficiales y relación entre miembros.','📢','Canal directo','Alto impacto','#f3b280'],
    ['Reclutamiento','Entrada de nuevos miembros, filtros, entrevistas y seguimiento de reclutas.','🧲','Verificación','Crecimiento','#448f7c'],
    ['Administración','Registro de miembros, cuotas, sanciones, estructura interna y paneles de control.','📋','Orden interno','Crítico','#4e0a1a'],
    ['Venta RP','Gestión de tienda, precios, ofertas, stock y solicitudes comerciales dentro del rol.','▰','Economía RP','Controlado','#2a2525'],
    ['Diplomacia','Alianzas, pactos, no agresión, comunicación con líderes aliados y protocolos externos.','🤝','Red KoTZ','Estratégico','#9fe8ff'],
    ['Seguridad','Permisos, roles, detección de infiltrados, acceso a información y normas internas.','🛡️','Protección','Prioritario','#ff4fb8']
  ];

  const promotion = [
    ['Recluta','Aprender normas y demostrar respeto'],
    ['Asociado','Ganar confianza y participar sin causar problemas'],
    ['Soldado','Cumplir cuotas, actividad y disciplina'],
    ['Sargento','Ayudar a controlar escuadras y nuevos miembros'],
    ['Teniente','Coordinar acciones y reportar con criterio'],
    ['Capitán','Liderar áreas y tomar decisiones con Alto Mando']
  ];

  return `
  <section class="page-head org-v2-hero">
    <div class="org-holo-grid"></div>
    <div class="wrap org-hero-layout">
      <div class="org-hero-copy reveal">
        <div class="eyebrow">Centro de mando KoTZ</div>
        <h1 class="h1">Una organización no se improvisa.<br><span class="accent">Se construye, se protege y se lidera.</span></h1>
        <p class="lede">KoTZ funciona con una cadena de mando clara, departamentos definidos, protocolos de seguridad y un sistema de crecimiento interno. No somos solo miembros conectados: somos una estructura.</p>
        <div class="org-hero-actions">
          <a href="#/alianzas" class="btn btn-primary">Ver red diplomática</a>
          <a href="#/cuotas" class="btn btn-ghost">Panel de cuotas</a>
        </div>
      </div>
      <div class="org-command-core reveal">
        <div class="org-core-rings"><span></span><span></span><span></span></div>
        <div class="org-core-badge">
          <img class="crest-img" src="assets/crest.png" alt="KoTZ">
          <b>KoTZ</b>
          <small>Command System</small>
        </div>
        ${command.map((c,i) => `<div class="org-orbit-node node-${i+1}" style="--node:${c.color}"><b>${c.role}</b><span>${c.level}</span></div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section org-overview-section">
    <div class="wrap">
      <div class="org-kpi-grid reveal">
        <div class="org-kpi-card"><span>9</span><b>Niveles</b><small>De Recluta a Owner</small></div>
        <div class="org-kpi-card"><span>4</span><b>Áreas líderes</b><small>Comunicación, reclutamiento, venta y administración</small></div>
        <div class="org-kpi-card"><span>24/7</span><b>Control</b><small>Roles y permisos activos</small></div>
        <div class="org-kpi-card"><span>1</span><b>Familia</b><small>Una visión común</small></div>
      </div>

      <div class="section-head reveal" style="margin-top:64px;">
        <div class="eyebrow">Alto Mando</div>
        <h2 class="h2">El núcleo que mueve <span class="accent">la Zona.</span></h2>
        <p class="lede">La parte superior de KoTZ no solo manda: define prioridades, protege información, resuelve conflictos y mantiene el rumbo.</p>
      </div>

      <div class="command-cards reveal">
        ${command.map(c => `
          <article class="command-role-card" style="--role:${c.color}">
            <div class="command-card-top"><span>${c.icon}</span><small>NIVEL ${c.level}</small></div>
            <h3>${c.role}</h3>
            <b>${c.name}</b>
            <p>${c.desc}</p>
            <div class="command-signal"><i style="width:${c.power}%"></i></div>
            <div class="mini-sub">${c.tag} · Señal ${c.power}%</div>
          </article>`).join('')}
      </div>

      <details class="area-leaders-drawer reveal">
        <summary>
          <span>▣</span>
          <div>
            <b>Abrir mapa de líderes de área</b>
            <small>Responsables, funciones y colores oficiales de cada departamento</small>
          </div>
          <i>+</i>
        </summary>
        <div class="area-leader-grid">
          ${areaLeaders.map(area => `
            <article class="area-leader-card" style="--area:${area.color}">
              <div class="area-leader-top"><span>${area.icon}</span><b>${area.name}</b></div>
              <p>${area.mission}</p>
              <div class="area-leader-members">Integrantes: <strong>${area.leaders}</strong></div>
              <ul>${area.functions.map(f => `<li>${f}</li>`).join('')}</ul>
            </article>`).join('')}
        </div>
      </details>
    </div>
  </section>

  <section class="section org-matrix-section">
    <div class="wrap">
      <div class="section-head center reveal">
        <div class="eyebrow" style="justify-content:center;">Jerarquía interna</div>
        <h2 class="h2">Cada rango tiene <span class="accent">peso, acceso y responsabilidad.</span></h2>
      </div>
      <div class="rank-matrix reveal">
        ${ranks.map(([level,role,tag,desc,access,icon,color]) => `
          <article class="rank-card-v2" style="--rank:${color}">
            <div class="rank-card-index">${level}</div>
            <div class="rank-card-icon">${icon}</div>
            <div class="rank-card-body">
              <div class="eyebrow" style="color:var(--rank);">${tag}</div>
              <h3>${role}</h3>
              <p>${desc}</p>
              <span class="rank-access">${access}</span>
            </div>
          </article>`).join('')}
      </div>
    </div>
  </section>

  <section class="section org-departments-section">
    <div class="wrap">
      <div class="section-head reveal">
        <div class="eyebrow">Departamentos</div>
        <h2 class="h2">La organización se divide en <span class="accent">áreas reales.</span></h2>
        <p class="lede">Cada área existe para que KoTZ no dependa de una sola persona. Comunicación, economía, diplomacia y seguridad tienen responsables y protocolos.</p>
      </div>
      <div class="department-grid reveal">
        ${departments.map(([name,desc,icon,mode,priority,color],i) => `
          <article class="department-card dep-${i+1}" style="--dep:${color}">
            <div class="department-icon">${icon}</div>
            <div>
              <h3>${name}</h3>
              <p>${desc}</p>
              <div class="department-tags"><span>${mode}</span><span>${priority}</span></div>
            </div>
          </article>`).join('')}
      </div>
    </div>
  </section>

  <section class="section org-promotion-section">
    <div class="wrap">
      <div class="section-head center reveal">
        <div class="eyebrow" style="justify-content:center;">Ascenso interno</div>
        <h2 class="h2">Aquí nadie sube por hablar mucho.<br><span class="accent">Se sube por demostrar.</span></h2>
      </div>
      <div class="promotion-timeline reveal">
        ${promotion.map(([role,desc],i) => `
          <div class="promotion-step" style="--step:${i+1}">
            <span>${String(i+1).padStart(2,'0')}</span>
            <b>${role}</b>
            <small>${desc}</small>
          </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section security org-security-v2">
    <div class="wrap">
      <div class="section-head reveal">
        <div class="eyebrow">Seguridad interna</div>
        <h2 class="h2">La información de KoTZ <span class="accent">se protege por niveles.</span></h2>
        <p class="lede">Después de detectar intentos de infiltración, la organización reforzó permisos, roles, verificación y control de acceso. La confianza existe, pero se gana.</p>
      </div>
      <div class="security-grid-v2 reveal">
        <div class="security-main-card">
          <div class="dossier-tag">Clasificado · Uso interno</div>
          <h3>Protocolo de acceso</h3>
          <p>Todo nuevo ingreso pasa por una fase de observación. El acceso a canales, paneles y datos internos depende del rango, actividad y confianza demostrada.</p>
          <div class="security-levels">
            <div><span>01</span><b>Público</b><small>Información visible de la web</small></div>
            <div><span>02</span><b>Miembro</b><small>Cuotas, tienda y alianzas internas</small></div>
            <div><span>03</span><b>Alto Mando</b><small>Gestión, sanciones y control</small></div>
          </div>
        </div>
        <div class="log security-log-v2" id="securityLog">
          ${['Verificación previa antes de acceder al servidor','Rol de Pendiente para nuevos ingresos','Canales privados según nivel de confianza','Alianzas protegidas solo para miembros','Panel Alto Mando limitado por roles Discord','Investigación interna ante cualquier sospecha','Registro de sanciones y cuotas persistente','Protección activa de información sensible']
            .map((t,i) => `<div class="log-line"><span class="tag">[0${i+1}]</span> ${t}</div>`).join('')}
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


function normalizeText(value){
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/* ------------------------------------------------------------ ALIANZAS */

function allianceTags(alliance){
  const text = normalizeText(`${alliance.type || ''} ${alliance.desc || ''} ${(alliance.pillars || []).join(' ')} ${(alliance.agreements || []).join(' ')}`);
  const tags = [];
  if (text.includes('econom') || text.includes('comercial')) tags.push('Economía');
  if (text.includes('militar') || text.includes('defensa') || text.includes('apoyo')) tags.push('Defensa');
  if (text.includes('informacion') || text.includes('estrateg')) tags.push('Estrategia');
  if (text.includes('comunicacion') || text.includes('lider')) tags.push('Comunicación');
  if (text.includes('comunidad') || text.includes('familia')) tags.push('Comunidad');
  if (text.includes('internacional')) tags.push('Internacional');
  if (text.includes('no agresion')) tags.push('No agresión');
  if (!tags.length) tags.push('Respeto', 'Cooperación');
  return [...new Set(tags)].slice(0, 6);
}

function alliancePriority(alliance){
  const level = normalizeText(alliance.level || '');
  const type = normalizeText(alliance.type || '');
  if (level.includes('prioritaria') || type.includes('internacional')) return 'Alta';
  if (level.includes('alta') || type.includes('estrateg')) return 'Alta';
  if (type.includes('econom') || type.includes('comercial')) return 'Media';
  return 'Estable';
}

function allianceRisk(alliance){
  const type = normalizeText(`${alliance.type || ''} ${(alliance.protocol || []).join(' ')}`);
  if (type.includes('econom') || type.includes('comercial')) return 'Controlado';
  if (type.includes('estrateg') || type.includes('internacional')) return 'Bajo';
  return 'Bajo';
}

function allianceCommunication(alliance){
  const text = normalizeText(`${(alliance.pillars || []).join(' ')} ${(alliance.agreements || []).join(' ')}`);
  return text.includes('lider') || text.includes('directa') ? 'Directa' : 'Coordinada';
}

function allianceDossierStats(alliance){
  return [
    ['Pilares', (alliance.pillars || []).length, 'Base del pacto'],
    ['Acuerdos', (alliance.agreements || []).length, 'Reglas activas'],
    ['Beneficios', (alliance.benefits || []).length, 'Valor para KoTZ'],
    ['Protocolo', (alliance.protocol || []).length, 'Conducta obligatoria']
  ];
}


function allianceTrustScore(alliance){
  const map = {
    'rose-spines': 93,
    'lacrew': 100,
    'kaos': 87,
    'underworld': 100,
    'cult-of-rose': 100,
    'fallen-angels': 100,
    'the-nato': 100,
    'crows-of-olympus': 100,
    'neta': 100
  };
  if (alliance?.slug && map[alliance.slug] != null) return map[alliance.slug];
  if (Number.isFinite(Number(alliance?.trustScore))) return Number(alliance.trustScore);
  const level = normalizeText(alliance?.level || '');
  const type = normalizeText(alliance?.type || '');
  let score = 72;
  if (level.includes('prioritaria')) score = 96;
  else if (level.includes('alta')) score = 91;
  else if (level.includes('tactica') || level.includes('estrateg')) score = 86;
  else if (level.includes('operativa') || type.includes('pacto')) score = 80;
  else if (type.includes('econom') || type.includes('comercial')) score = 78;
  return Math.min(100, Math.max(65, score));
}

function allianceFocusIcon(alliance){
  const tags = allianceTags(alliance).join(' ').toLowerCase();
  if (tags.includes('econom')) return '💰';
  if (tags.includes('internacional')) return '🌐';
  if (tags.includes('estrategia')) return '♟️';
  if (tags.includes('defensa')) return '🛡️';
  if (tags.includes('comunidad')) return '🌹';
  return alliance.emoji || '🤝';
}

function allianceMotto(alliance){
  const map = {
    'rose-spines':'Respeto limpio. Apoyo real. Crecimiento conjunto.',
    'lacrew':'Pacto firme, comunicación directa y calle controlada.',
    'kaos':'Caos controlado, información útil y estrategia fría.',
    'underworld':'Economía discreta, acuerdos claros y beneficio mutuo.',
    'cult-of-rose':'Comunidad, defensa y futuro compartido.',
    'fallen-angels':'Unidad estratégica, imagen fuerte y proyectos conjuntos.',
    'the-nato':'Red internacional, protocolo, lealtad y coordinación.',
    'crows-of-olympus':'Respeto, comercio, protección y cero agresión bajo tratado.',
    'neta':'Respeto, cooperación, información y futuro bajo acuerdo oficial.'
  };
  return map[alliance.slug] || 'Confianza, respeto y cooperación bajo la corona.';
}

function allianceTimeline(alliance){
  const type = normalizeText(alliance.type || '');
  const extra = type.includes('econom') ? 'Ruta comercial activa' : type.includes('internacional') ? 'Canal internacional activo' : type.includes('estrateg') ? 'Canal estratégico activo' : 'Coordinación activa';
  return [
    ['Reunión inicial', 'Se valida compatibilidad entre liderazgos.'],
    ['Acuerdo oficial', `Alianza reconocida desde ${alliance.since || 'Jun 2026'}.`],
    [extra, 'La comunicación queda reservada a responsables autorizados.'],
    ['Revisión constante', 'El pacto se mantiene mientras haya respeto y utilidad mutua.']
  ];
}

function allianceHeatClass(alliance){
  const score = allianceTrustScore(alliance);
  if (score >= 92) return 'max';
  if (score >= 84) return 'high';
  return 'stable';
}


function allianceTopRank(alliance){
  const map = {
    'kaos': 8,
    'the-nato': 9,
    'fallen-angels': 17
  };
  return map[alliance?.slug] || null;
}

function allianceTopTier(alliance){
  const rank = allianceTopRank(alliance);
  if (!rank) return 'Red estable';
  if (rank <= 10) return 'Top 10 · Prioridad máxima';
  if (rank <= 20) return 'Top 20 · Presencia fuerte';
  return `Top #${rank}`;
}

function allianceTopPulse(alliance){
  const rank = allianceTopRank(alliance);
  if (!rank) return '';
  return rank <= 10 ? 'elite' : 'ranked';
}

function pageAlliances(){
  if (!alliancesLoaded) return pageAllianceGate('checking');
  if (alliancesError) return pageAllianceGate(alliancesError.type || 'denied', alliancesError.message);

  const alliances = secureAlliances;
  const priorityCount = alliances.filter(a => alliancePriority(a) === 'Alta').length;
  const economicCount = alliances.filter(a => normalizeText(`${a.type || ''} ${(a.pillars || []).join(' ')}`).includes('econom')).length;
  const strategicCount = alliances.filter(a => allianceTags(a).includes('Estrategia') || allianceTags(a).includes('Internacional')).length;
  const colors = alliances.map(a => a.colors?.primary || '#ff7a18');
  const featured = alliances.find(a => a.slug === 'the-nato') || alliances[0];
  const topAlliances = alliances.filter(a => allianceTopRank(a)).sort((a,b) => allianceTopRank(a) - allianceTopRank(b));

  return `
  <section class="page-head diplomacy-v3-head">
    <div class="diplomacy-v3-ambient">
      ${colors.slice(0,9).map((c,i) => `<i style="--orb:${c}; --x:${8 + (i*14)%84}%; --y:${12 + (i*19)%70}%; --s:${180 + (i%4)*72}px; --delay:${i * -1.7}s;"></i>`).join('')}
    </div>
    <div class="diplomacy-scanlines"></div>
    <div class="diplomacy-data-rain">
      ${Array.from({length:18}).map((_,i)=>`<span style="--i:${i}; --delay:${i * -.42}s; --left:${(i*7)%100}%">${i%3===0?'ALLY':'KOTZ'}</span>`).join('')}
    </div>
    <div class="wrap diplomacy-v3-layout">
      <div class="diplomacy-v3-copy reveal">
        <div class="eyebrow">Centro diplomático KoTZ · Acceso clasificado</div>
        <h1 class="h1 diplomacy-v3-title">Red de alianzas<br><span class="accent">vivas.</span></h1>
        <p class="lede diplomacy-v3-lede">No son tarjetas. Son pactos activos, canales de confianza y líneas de apoyo que sostienen la posición de KoTZ dentro de la Zona.</p>
        <div class="diplomacy-v3-actions">
          <a class="btn btn-primary" href="#/estado">Estado diplomático</a>
          <a class="btn btn-ghost" href="#/alianzas/${featured?.slug || ''}">Expediente prioritario</a>
        </div>
      </div>

      <div class="diplomacy-command reveal">
        <div class="command-header">
          <div>
            <span class="mini-sub">KoTZ Diplomatic Core</span>
            <b>NETWORK ONLINE</b>
          </div>
          <span class="command-pulse"></span>
        </div>
        <div class="command-map">
          <svg viewBox="0 0 520 520" class="network-lines" aria-hidden="true">
            ${alliances.map((a,i) => {
              const angle = (i / Math.max(1, alliances.length)) * Math.PI * 2 - Math.PI / 2;
              const r = i % 2 ? 190 : 150;
              const x = 260 + Math.cos(angle) * r;
              const y = 260 + Math.sin(angle) * r;
              const c = a.colors?.primary || '#ff7a18';
              return `<line x1="260" y1="260" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" style="--line:${c}" />`;
            }).join('')}
          </svg>
          <div class="network-particles">
            ${alliances.map((a,i)=>`<i style="--ally:${a.colors?.primary || '#ff7a18'}; --delay:${i * -.7}s; --orbit:${24 + (i%3)*10}%;"></i>`).join('')}
          </div>
          <a class="network-core" href="#/organizacion">
            <img class="crest-img" src="assets/crest.png" alt="KoTZ">
            <span>KoTZ</span>
          </a>
          ${alliances.map((a,i) => {
            const angle = (i / Math.max(1, alliances.length)) * Math.PI * 2 - Math.PI / 2;
            const r = i % 2 ? 41 : 32;
            const x = 50 + Math.cos(angle) * r;
            const y = 50 + Math.sin(angle) * r;
            const c = a.colors?.primary || '#ff7a18';
            const rank = allianceTopRank(a);
            return `<a href="#/alianzas/${a.slug}" class="network-node ${allianceHeatClass(a)} ${rank ? 'top-node ' + allianceTopPulse(a) : ''}" style="--x:${x.toFixed(1)}%; --y:${y.toFixed(1)}%; --ally:${c}; --ally2:${a.colors?.secondary || '#fff'};" title="${escapeAttr(a.name)}"><span>${a.emoji || '🤝'}</span><small>${escapeHtml(a.code || a.name)}</small>${rank ? `<em>#${rank}</em>` : ''}</a>`;
          }).join('')}
        </div>
        <div class="command-footer">
          <span>${alliances.length} pactos activos</span>
          <span>${priorityCount} prioridad alta</span>
          <span>${strategicCount} estratégicos</span>
        </div>
      </div>
    </div>
  </section>

  <section class="section diplomacy-v3-section" style="padding-top:0;">
    <div class="wrap">
      <div class="diplomacy-v3-strip reveal">
        ${[
          ['Alianzas activas', alliances.length, 'Red verificada'],
          ['Ranking KoTZ', '#15', 'Posición operativa'],
          ['Prioridad alta', priorityCount, 'Respuesta rápida'],
          ['Económicas', economicCount, 'Beneficio mutuo'],
          ['Confianza media', Math.round(alliances.reduce((acc,a)=>acc+allianceTrustScore(a),0)/Math.max(1,alliances.length)) + '%', 'Pactos estables']
        ].map(([label,value,sub]) => `
          <div class="diplomacy-v3-kpi">
            <small>${label}</small>
            <b>${value}</b>
            <span>${sub}</span>
          </div>`).join('')}
      </div>

      <div class="diplomacy-directive reveal">
        <div class="directive-mark">!</div>
        <div>
          <div class="eyebrow">Directiva interna</div>
          <p class="lede">Las alianzas son ventaja estratégica. No se comparten capturas, nombres, acuerdos ni protocolos con nadie ajeno a KoTZ.</p>
        </div>
        <div class="directive-code">CLASSIFIED</div>
      </div>

      ${topAlliances.length ? `
      <div class="top-rank-board reveal">
        <div class="top-rank-head">
          <div>
            <div class="eyebrow">Alianzas en el TOP</div>
            <h2 class="h3">Presencia confirmada en posiciones clave</h2>
          </div>
          <span>Ranking operativo</span>
        </div>
        <div class="top-rank-grid">
          ${topAlliances.map((a,idx)=>`<a href="#/alianzas/${a.slug}" class="top-rank-card ${allianceTopPulse(a)}" style="--ally:${a.colors?.primary || '#ff7a18'}; --ally2:${a.colors?.secondary || '#fff'}; --delay:${idx * .12}s;">
            <div class="rank-num">#${allianceTopRank(a)}</div>
            <div><b>${escapeHtml(a.name)}</b><small>${escapeHtml(allianceTopTier(a))}</small></div>
            <i>${a.emoji || '🤝'}</i>
          </a>`).join('')}
        </div>
      </div>` : ''}

      <div class="section-head reveal diplomacy-list-head">
        <div>
          <div class="eyebrow">Expedientes diplomáticos</div>
          <h2 class="h2">Cada aliado tiene <span class="accent">su identidad.</span></h2>
        </div>
        <p class="lede">Color, prioridad, confianza, protocolo y valor estratégico en una sola red.</p>
      </div>

      <div class="alliance-grid diplomacy-v3-grid reveal">
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
    <section class="page-head diplomacy-v3-head">
      <div class="wrap">
        <div class="eyebrow">Expediente no encontrado</div>
        <h1 class="h1">Alianza no <span class="accent">registrada.</span></h1>
        <p class="lede">No existe un expediente interno para esa alianza o el identificador no coincide con el registro diplomático actual.</p>
        <a class="btn btn-primary" href="#/alianzas">Volver a alianzas</a>
      </div>
    </section>`;
  }

  const c1 = alliance.colors?.primary || '#ff7a18';
  const c2 = alliance.colors?.secondary || '#ff2ea6';
  const dark = alliance.colors?.dark || '#09090d';
  const tags = allianceTags(alliance);
  const score = allianceTrustScore(alliance);
  const dossierStats = allianceDossierStats(alliance);
  const other = secureAlliances.filter(a => a.slug !== alliance.slug);
  const timeline = allianceTimeline(alliance);
  const topRank = allianceTopRank(alliance);

  return `
  <section class="page-head alliance-v3-hero" style="--ally:${c1}; --ally2:${c2}; --allyDark:${dark};">
    <div class="alliance-v3-bg-grid"></div>
    <div class="alliance-v3-glass-orb orb-a"></div>
    <div class="alliance-v3-glass-orb orb-b"></div>
    <div class="wrap alliance-v3-hero-layout">
      <div class="alliance-v3-main reveal">
        <a href="#/alianzas" class="mini-sub back-link">← Volver a red diplomática</a>
        <div class="alliance-v3-classification">
          <span>Expediente activo</span><span>${escapeHtml(alliance.code || alliance.slug)}</span><span>${escapeHtml(alliance.type || 'Alianza oficial')}</span>${topRank ? `<span class="top-classified">TOP #${topRank}</span>` : ''}
        </div>
        <h1 class="h1 alliance-v3-title">${alliance.name}</h1>
        <p class="alliance-v3-motto">${escapeHtml(allianceMotto(alliance))}</p>
        <p class="lede alliance-v3-lede">${escapeHtml(alliance.full || alliance.desc)}</p>
        <div class="detail-chip-row diplomacy-chip-row">
          <span class="pill pill-green">${escapeHtml(alliance.status)}</span>
          ${topRank ? `<span class="pill top-pill">TOP #${topRank}</span>` : ''}
          <span class="pill" style="border-color:${c1}88; color:${c1};">Desde ${escapeHtml(alliance.since)}</span>
          <span class="pill" style="border-color:${c2}88; color:${c2};">${escapeHtml(alliance.level || 'Confianza estable')}</span>
          <span class="pill">Canal ${escapeHtml(allianceCommunication(alliance))}</span>
        </div>
      </div>

      <aside class="alliance-v3-id reveal">
        <div class="id-orbit">
          <span class="id-ring r1"></span><span class="id-ring r2"></span>
          <div class="id-icon">${alliance.emoji || '🤝'}</div>
        </div>
        <div class="mini-sub">Trust Index</div>
        <div class="trust-number">${score}%</div>
        <div class="trust-bar"><span style="width:${score}%"></span></div>
        ${topRank ? `<div class="top-position-badge ${allianceTopPulse(alliance)}"><span>Posición TOP</span><b>#${topRank}</b><small>${escapeHtml(allianceTopTier(alliance))}</small></div>` : ''}
        <div class="id-grid">
          ${topRank ? `<div><small>Ranking</small><b>#${topRank}</b></div>` : ''}
          <div><small>Prioridad</small><b>${alliancePriority(alliance)}</b></div>
          <div><small>Riesgo</small><b>${allianceRisk(alliance)}</b></div>
          <div><small>Comunicación</small><b>${allianceCommunication(alliance)}</b></div>
          <div><small>Revisión</small><b>Jul 2026</b></div>
        </div>
      </aside>
    </div>
  </section>

  <section class="section alliance-v3-body" style="padding-top:0; --ally:${c1}; --ally2:${c2}; --allyDark:${dark};">
    <div class="wrap alliance-v3-layout">
      <aside class="alliance-v3-sidebar reveal">
        <div class="sidebar-block">
          <div class="eyebrow">Firma visual</div>
          <div class="identity-swatch v3"><span></span><span></span></div>
          <div class="rail-tags v3-tags">${tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>
        </div>
        <div class="sidebar-block mini-diplomap">
          <div class="mini-core">KoTZ</div>
          <div class="mini-link"></div>
          <div class="mini-ally" style="border-color:${c1}; color:${c1};">${escapeHtml(alliance.code || alliance.slug)}</div>
          <div class="signal-stack"><span></span><span></span><span></span><span></span></div>
        </div>
        <a class="btn btn-ghost btn-sm" href="#/estado" style="width:100%; justify-content:center;">Estado diplomático</a>
      </aside>

      <div class="alliance-v3-content">
        <div class="dossier-metrics v3-metrics reveal">
          ${dossierStats.map(([label,value,sub]) => `
            <div class="dossier-metric">
              <span>${label}</span><b>${value}</b><small>${sub}</small>
            </div>`).join('')}
        </div>

        <div class="dossier-card-grid v3-dossier-grid reveal">
          ${renderDossierSection('🛡️ Pilares de la alianza', alliance.pillars, c1, 'Base de confianza')}
          ${renderDossierSection('📜 Acuerdos principales', alliance.agreements, c2, 'Reglas activas')}
          ${renderDossierSection('👑 Beneficios para KoTZ', alliance.benefits, c1, 'Valor estratégico')}
          ${renderDossierSection('⚠️ Protocolo obligatorio', alliance.protocol, c2, 'Conducta interna')}
        </div>

        <div class="alliance-v3-timeline reveal">
          <div class="eyebrow">Línea diplomática</div>
          <div class="timeline-grid">
            ${timeline.map(([t,d],i) => `<div class="timeline-step"><span>${String(i+1).padStart(2,'0')}</span><b>${escapeHtml(t)}</b><p>${escapeHtml(d)}</p></div>`).join('')}
          </div>
        </div>

        <div class="alliance-note-v3 reveal">
          <div>
            <div class="eyebrow">Nota interna</div>
            <p>${escapeHtml(alliance.note || 'Mantener respeto, discreción y comunicación con Alto Mando.')}</p>
          </div>
          <div class="note-seal-v3">${alliance.emoji || '🤝'}</div>
        </div>

        <div class="conduct-panel v3-conduct reveal">
          <div class="eyebrow">Conducta esperada de miembros KoTZ</div>
          <div class="conduct-grid">
            ${[
              ['Respeto visible', 'Trata a cualquier aliado como extensión diplomática de KoTZ.'],
              ['Cero filtraciones', 'Los acuerdos y conversaciones internas no salen del círculo autorizado.'],
              ['Sin fuego amigo', 'No provocar, atacar, estafar ni crear drama con aliados.'],
              ['Escalar a líderes', 'Si hay tensión, se informa a Alto Mando antes de actuar.']
            ].map(([t,d]) => `<div><b>${escapeHtml(t)}</b><span>${escapeHtml(d)}</span></div>`).join('')}
          </div>
        </div>

        <div class="other-alliances v3-other reveal">
          <div class="eyebrow">Cambiar expediente</div>
          <div class="other-alliance-row">
            ${other.map(a => `<a href="#/alianzas/${a.slug}" style="--ally:${a.colors?.primary || '#ff7a18'}; --ally2:${a.colors?.secondary || '#ff2ea6'};"><span>${a.emoji || '🤝'}</span>${escapeHtml(a.name)}</a>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function renderAllianceLinkCard(a){
  const c1 = a.colors?.primary || '#ff7a18';
  const c2 = a.colors?.secondary || '#ff2ea6';
  const tags = allianceTags(a).slice(0, 5);
  const score = allianceTrustScore(a);
  const rank = allianceTopRank(a);
  return `
    <a href="#/alianzas/${a.slug}" class="alliance-card diplomacy-v3-card" style="--ally:${c1}; --ally2:${c2}; --allyDark:${a.colors?.dark || '#09090d'}; text-decoration:none; color:inherit;">
      <div class="v3-card-aura"></div>
      ${rank ? `<div class="card-rank-watermark">#${rank}</div>` : ''}
      <div class="v3-card-scan"></div>
      <div class="v3-card-top">
        <div class="alliance-logo v3-logo">${a.emoji || '🤝'}</div>
        ${rank ? `<div class="v3-top-chip ${allianceTopPulse(a)}">TOP #${rank}</div>` : ''}
        <div class="v3-card-state"><span></span>${escapeHtml(a.status)}</div>
      </div>
      <div class="eyebrow" style="color:${c1};">${escapeHtml(a.type || 'Alianza oficial')}</div>
      <h3 class="h3">${escapeHtml(a.name)}</h3>
      <p class="lede">${escapeHtml(a.desc)}</p>
      <div class="v3-trust-mini"><span>Confianza</span><b>${score}%</b><i><em style="width:${score}%"></em></i></div>
      <div class="diplomacy-card-tags v3-card-tags">${tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>
      <div class="alliance-meta diplomacy-meta"><span>Desde ${escapeHtml(a.since)}</span><span>${escapeHtml(a.level || 'Confianza estable')}</span></div>
      <div class="open-dossier v3-open">Abrir expediente <span>→</span></div>
    </a>`;
}

function renderDossierSection(title, items = [], color = '#ff7a18', subtitle = ''){
  return `
    <article class="dossier-section-v2 v3-section-card" style="--section:${color};">
      <div class="dossier-section-head">
        <div><div class="eyebrow" style="color:${color};">${escapeHtml(subtitle)}</div><h3>${title}</h3></div>
        <span>${(items || []).length}</span>
      </div>
      <ul class="rule-list dossier-rule-list">
        ${(items || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </article>`;
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
  const conflicts = (KotzStore.getConflicts ? KotzStore.getConflicts() : []).filter(w => String(w?.status || '').toLowerCase() !== 'estable');
  return `
  <section class="page-head diplomacy-head">
    <div class="wrap">
      <div class="eyebrow">Estado diplomático interno</div>
      <h1 class="h1">Aliados, conflictos y <span class="accent">órdenes activas.</span></h1>
      <p class="lede">Resumen operativo para miembros: a quién respetar, con quién coordinar y qué conducta mantener dentro de la red diplomática.</p>
      <div class="detail-chip-row diplomacy-chip-row">
        <span class="pill pill-green">${alliances.length} alianzas activas</span>
        <span class="pill ${conflicts.length ? 'pill-red' : 'pill-green'}">${conflicts.length} conflictos</span>
        <span class="pill">Protocolo interno activo</span>
      </div>
    </div>
  </section>
  <section class="section diplomacy-section" style="padding-top:0;">
    <div class="wrap">
      <div class="section-head reveal diplomacy-list-head">
        <div>
          <div class="eyebrow">Alianzas activas</div>
          <h2 class="h2">Red de confianza</h2>
        </div>
        <p class="lede">Cada tarjeta abre el expediente completo de esa alianza.</p>
      </div>
      <div class="alliance-grid diplomacy-grid reveal" style="margin-bottom:48px;">
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
              <span class="pill pill-red">${w.status}</span>
            </div>
            <h3 class="h3">${w.name}</h3>
            <p class="lede" style="font-size:.9rem;">${w.desc}</p>
            <div class="mini-sub" style="margin-top:14px;">Desde: ${w.since}</div>
            <ul class="rule-list">
              ${(w.rules||[]).map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>`).join('') || `<div class="war-card zero-conflict-card"><div class="alliance-top"><div class="alliance-logo">🕊️</div><span class="pill pill-green">0 conflictos</span></div><h3 class="h3">Sin conflictos activos</h3><p class="lede" style="font-size:.9rem;">KoTZ no tiene conflictos oficiales registrados ahora mismo. Se mantiene el respeto a aliados, la comunicación por liderazgo y el protocolo interno activo.</p><div class="mini-sub" style="margin-top:14px;">Estado: estable</div></div>`}
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
  if (!serverGalleryLoaded) {
    return `
    <section class="page-head">
      <div class="wrap">
        <div class="eyebrow">Galería</div>
        <h1 class="h1">Momentos que <span class="accent">construyen historia.</span></h1>
        <p class="lede">Cargando fotos oficiales desde Google Drive...</p>
      </div>
    </section>`;
  }

  const items = KotzStore.getGallery().filter(g => galleryImageOf(g));
  const cats = ['Todos', ...new Set(items.map(i => i.category || 'Fotos oficiales'))];
  return `
  <section class="page-head">
    <div class="wrap">
      <div class="eyebrow">Galería</div>
      <h1 class="h1">Momentos que <span class="accent">construyen historia.</span></h1>
      ${serverGalleryError ? `<p class="lede">${escapeHtml(serverGalleryError)}</p>` : ''}
    </div>
  </section>
  <section class="section" style="padding-top:0;">
    <div class="wrap">
      ${items.length ? `
      <div class="filter-row reveal">
        ${cats.map((c,i) => `<button class="chip ${i===0?'active':''}" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`).join('')}
      </div>
      <div class="gallery-grid reveal" id="galleryGrid">
        ${items.map(g => `
          <div class="gallery-tile tone-${Number(g.tone || 1)}" data-cat="${escapeAttr(g.category || 'Fotos oficiales')}" data-check-src="${escapeAttr(galleryImageOf(g))}" ${galleryTileStyle(g)}>
            <span class="gallery-cat">${escapeHtml(g.category || 'Fotos oficiales')}</span>
            <span class="gallery-title">${escapeHtml(g.title || 'Foto')}</span>
          </div>`).join('')}
      </div>` : `<div class="card" style="padding:32px;"><p class="lede" style="margin:0;">Todavía no hay fotos disponibles en la galería.</p></div>`}
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

/**
 * Comprueba en segundo plano que cada foto de la galería carga de verdad.
 * Si una URL de Drive falla (permisos, archivo borrado manualmente, etc.),
 * la tarjeta se retira sola en vez de quedarse como un hueco roto para
 * siempre. No vuelve a pedir nada al backend, solo verifica lo ya pintado.
 */
function verifyGalleryImages(){
  document.querySelectorAll('.gallery-tile[data-check-src]').forEach(tile => {
    const src = tile.dataset.checkSrc;
    if (!src) return;
    const probe = new Image();
    probe.onload = () => { /* imagen válida, no hacemos nada */ };
    probe.onerror = () => {
      tile.style.transition = 'opacity .4s ease';
      tile.style.opacity = '0';
      setTimeout(() => tile.remove(), 400);
    };
    probe.src = src;
  });
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
function galleryImageOf(g){ return g?.image || g?.imageUrl || g?.driveFileUrl || ''; }
function cssUrl(value){ return encodeURI(String(value || '')).replace(/[\"'()]/g, ch => encodeURIComponent(ch)); }
function galleryTileStyle(g){
  const image = galleryImageOf(g);
  return image ? `style="background-image:linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.78)), url(${cssUrl(image)})"` : '';
}

/* --------------------------------------------------------- ESTADISTICAS */
function pageStats(){
  const s = {
    totalMembers: 46,
    activeMembers: 46,
    alliances: 9,
    eventsHeld: 1,
    recruitsAccepted: 46,
    weeklyDuesPct: 95,
    activityPct: 78,
    recruitmentPct: 92,
    diplomacyPct: 99
  };
  const growth = [
    { month:'Ene', total:0 }, { month:'Feb', total:0 }, { month:'Mar', total:0 },
    { month:'Abr', total:0 }, { month:'May', total:0 }, { month:'Jun', total:17 }, { month:'Jul', total:29 }
  ];
  const maxGrowth = Math.max(1, ...growth.map(g => Number(g.total) || 0));
  const cards = [
    [s.totalMembers,'Miembros registrados','Núcleo total dentro de la base KoTZ','👥'],
    [s.activeMembers,'Miembros activos','Presencia útil y movimiento real','⚡'],
    [s.alliances,'Alianzas activas','Red diplomática reconocida','🤝'],
    [s.eventsHeld,'Evento realizado','Actividad generada por la comunidad','📍'],
    [s.recruitsAccepted,'Reclutas aceptados','Ingresos que pasaron filtro y forman parte de KoTZ','✅'],
    [s.weeklyDuesPct + '%','Cuotas a la semana','Control económico semanal interno','💰']
  ];
  const gauges = [
    ['Actividad', s.activityPct, 'Presencia de miembros activos', '#ff9a1a'],
    ['Cuotas', s.weeklyDuesPct, 'Cumplimiento económico semanal', '#ff4fb5'],
    ['Diplomacia', s.diplomacyPct, 'Fuerza de alianzas', '#9fe8ff'],
    ['Reclutamiento', s.recruitmentPct, '46 miembros sobre 50 plazas máximas', '#8cffb5']
  ];
  const ops = [
    ['Red interna','Operativa','46 miembros registrados · 46 activos.'],
    ['Diplomacia','Estable','9 alianzas activas · 0 conflictos registrados.'],
    ['Economía','En control','95% de cuotas semanales al día.'],
    ['Crecimiento','Selectivo','46 de 50 plazas ocupadas: reclutamiento al 92%.']
  ];
  return `
  <section class="stats-v2-hero">
    <div class="stats-grid-bg"></div>
    <div class="stats-radar-bg"><span></span><span></span><span></span></div>
    <div class="wrap stats-hero-layout">
      <div class="stats-hero-copy reveal">
        <div class="eyebrow">Inteligencia de la Zona</div>
        <h1 class="h1">Estadísticas con <span class="accent">pulso real.</span></h1>
        <p class="lede">No son solo números. Son señales de actividad, disciplina, crecimiento, economía y fuerza diplomática dentro de KoTZ.</p>
        <div class="stats-live-strip">
          <span></span> Sistema de datos interno activo · lectura pública resumida
        </div>
      </div>
      <div class="stats-command-panel reveal" id="statsConsole">
        <div class="stats-panel-top"><b>KOTZ DATA CORE</b><span>LIVE</span></div>
        ${['Recopilando miembros...','Calculando actividad...','Leyendo cuotas semanales...','Sincronizando alianzas...','Generando informe visual...'].map((line,i)=>`
          <div class="stats-console-line" style="--i:${i}"><span>${String(i+1).padStart(2,'0')}</span>${line}</div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section stats-overview-section">
    <div class="wrap">
      <div class="stats-v2-grid reveal">
        ${cards.map(([val,label,desc,icon],i) => `
          <article class="stat-v2-card" style="--i:${i}">
            <div class="stat-v2-icon">${icon}</div>
            <div class="stat-num stat-v2-number" data-count="${String(val).replace('%','')}">0${String(val).includes('%')?'%':''}</div>
            <h3>${label}</h3>
            <p>${desc}</p>
          </article>`).join('')}
      </div>
    </div>
  </section>

  <section class="section stats-gauge-section">
    <div class="wrap">
      <div class="section-head reveal">
        <div class="eyebrow">Lectura rápida</div>
        <h2 class="h2">Panel de <span class="accent">rendimiento interno.</span></h2>
        <p class="lede">Cada medidor resume un área clave de la organización. La idea no es aparentar actividad: es poder leerla rápido.</p>
      </div>
      <div class="gauge-grid reveal">
        ${gauges.map(([label,pct,desc,color],i)=>`
          <div class="gauge-card" style="--pct:${pct}; --gauge:${color}; --i:${i}">
            <div class="gauge-ring"><span>${pct}%</span></div>
            <h3>${label}</h3>
            <p>${desc}</p>
          </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section growth-section-v2">
    <div class="wrap growth-layout-v2">
      <div class="growth-copy reveal">
        <div class="eyebrow">Crecimiento</div>
        <h2 class="h2">Subir sí, pero <span class="accent">con control.</span></h2>
        <p class="lede">Junio añadió 17 miembros y julio otros 29. El crecimiento sirve para medir si KoTZ aumenta su base sin perder el filtro interno.</p>
      </div>
      <div class="growth-chart-v2 reveal">
        <div class="chart-card-head"><b>Altas mensuales</b><span>${growth.length} lecturas</span></div>
        <div class="bars-v2">
          ${growth.map((g,i) => {
            const h = Math.max(8, ((Number(g.total)||0) / maxGrowth * 100));
            return `
            <div class="bar-col-v2" style="--h:${h.toFixed(0)}%; --i:${i}">
              <div class="bar-value">${g.total}</div>
              <div class="bar-v2"></div>
              <span>${g.month}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </section>

  <section class="section ops-section">
    <div class="wrap">
      <div class="section-head center reveal">
        <div class="eyebrow" style="justify-content:center;">Estado operativo</div>
        <h2 class="h2">Qué dicen los datos de <span class="accent">KoTZ ahora mismo.</span></h2>
      </div>
      <div class="ops-grid reveal">
        ${ops.map(([title,state,desc],i)=>`
          <div class="ops-card" style="--i:${i}">
            <div class="ops-status"><span></span>${state}</div>
            <h3>${title}</h3>
            <p>${desc}</p>
          </div>`).join('')}
      </div>
    </div>
  </section>`;
}

function initStatsConsole(){
  const lines = document.querySelectorAll('#statsConsole .stats-console-line');
  if (!lines.length) return;
  lines.forEach((line,i) => setTimeout(() => line.classList.add('in'), i * 120));
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
  // IMPORTANTE: aunque el usuario entre directamente a una ruta como
  // #/galeria en la primera carga, `router()` (más abajo) ya habrá
  // renderizado esa página ANTES de que estas peticiones respondan.
  // rerender=true es lo que hace que, en cuanto llegan los datos reales,
  // se vuelva a pintar la vista si seguimos en esa misma ruta. Con
  // rerender=false (como estaba antes) la primera carga se quedaba con
  // el estado "cargando..." para siempre si no visitabas antes otra
  // página que le diera tiempo a la petición de terminar en segundo plano.
  loadDiscordSession().then(() => {
    syncCurrentMemberFromServer(true);
    syncAlliancesFromServer(true);
  });
  syncDuesFromServer(true);
  syncGalleryFromServer(true);
  setupSiteLogout();
  router();
  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 40), { passive:true });
  const burger = document.getElementById('burger');
  const panel = document.getElementById('mobilePanel');
  burger.addEventListener('click', () => { panel.classList.toggle('open'); burger.classList.toggle('open'); });
});
