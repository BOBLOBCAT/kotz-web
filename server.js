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
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ dues: [], sanctions: [], shopItems: [], shopOrders: [], shopOffers: [] }, null, 2));
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return { dues: [], sanctions: [], shopItems: [], shopOrders: [], shopOffers: [] }; }
}
function writeDb(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }
function envList(name){ return String(process.env[name] || '').split(',').map(v => v.trim()).filter(Boolean); }



const KOTZ_ALLIANCES = [
  {
    slug: 'rose-spines',
    name: 'Rose Spines',
    code: 'SPINES',
    emoji: '⚔️',
    status: 'Activa',
    since: 'Jun 2026',
    type: 'Alianza de apoyo mutuo',
    level: 'Confianza estable',
    trustScore: 93,
    colors: { primary: '#9FE8FF', secondary: '#FFFFFF', dark: '#06121A' },
    desc: 'Alianza basada en apoyo mutuo, respeto y crecimiento conjunto entre comunidades hispanohablantes.',
    full: 'Rose Spines representa una conexión directa entre comunidades que entienden el valor de la confianza. Esta alianza nace para reforzar la defensa mutua, mantener comunicación constante entre liderazgos y construir una relación estable a largo plazo, sin dramas innecesarios ni acciones improvisadas.',
    pillars: ['Defensa y apoyo mutuo', 'Comunicación directa entre líderes', 'Respeto de acuerdos', 'Crecimiento conjunto'],
    agreements: ['KoTZ y Rose Spines se reconocen como comunidades aliadas.', 'Ambas partes priorizan la coordinación antes de cualquier movimiento sensible.', 'Los conflictos deberán tratarse por vía interna entre líderes, evitando exposición pública.'],
    benefits: ['Apoyo en situaciones de presión externa.', 'Canal de comunicación directa para coordinación rápida.', 'Imagen común de respeto, estabilidad y crecimiento.'],
    protocol: ['No atacar, provocar ni estafar a miembros aliados.', 'No captar miembros de la comunidad aliada.', 'Informar a Alto Mando antes de actuar en nombre de la alianza.'],
    note: 'Una alianza pensada para crecer con calma: respeto primero, fuerza después.'
  },
  {
    slug: 'lacrew',
    name: 'LaCREW',
    code: 'LACREW',
    emoji: '🛡️',
    status: 'Activa',
    since: 'Jun 2026',
    type: 'Pacto de no agresión y cooperación',
    level: 'Confianza operativa',
    trustScore: 100,
    colors: { primary: '#7B4DFF', secondary: '#09050F', dark: '#07040D' },
    desc: 'Pacto de no agresión, apoyo económico cuando sea necesario y cooperación entre bandas.',
    full: 'LaCREW mantiene con KoTZ una alianza práctica, directa y orientada a la cooperación. El acuerdo se centra en evitar conflictos innecesarios, compartir apoyo cuando sea conveniente y mantener una relación útil para ambas bandas.',
    pillars: ['Pacto de no agresión', 'Apoyo económico puntual', 'Cooperación entre bandas', 'Confianza entre líderes'],
    agreements: ['No agresión entre miembros de ambas organizaciones.', 'Apoyo económico o logístico cuando sea viable y aprobado por liderazgo.', 'Contacto directo entre responsables para resolver dudas o tensiones.'],
    benefits: ['Reduce riesgos de conflictos internos entre bandas.', 'Permite acuerdos económicos cuando ambas partes ganan.', 'Refuerza presencia y estabilidad diplomática de KoTZ.'],
    protocol: ['Cualquier problema se eleva a líderes antes de escalar.', 'No se realizan acuerdos económicos sin autorización.', 'Se mantiene respeto público y privado hacia miembros aliados.'],
    note: 'Una alianza útil, discreta y orientada al beneficio mutuo.'
  },
  {
    slug: 'kaos',
    name: '𝐾𝐴𝑂𝑠 ム',
    code: 'KAOS',
    emoji: 'ム',
    status: 'Activa',
    since: 'Jun 2026',
    type: 'Alianza estratégica',
    level: 'Confianza táctica',
    trustScore: 87,
    colors: { primary: '#D8C84A', secondary: '#050505', dark: '#080807' },
    desc: 'Alianza estratégica de apoyo mutuo, información compartida y cooperación entre líderes.',
    full: 'KAOs y KoTZ sostienen una alianza enfocada en estrategia, información y coordinación rápida. Su valor está en la capacidad de actuar con cabeza, compartir información relevante y mantener una línea clara de respeto mutuo.',
    pillars: ['Apoyo mutuo', 'Intercambio de información', 'Coordinación rápida', 'Respeto y no agresión'],
    agreements: ['Ambas partes se comprometen a no agredirse ni provocar conflictos.', 'La información relevante se comparte únicamente por canales de confianza.', 'Los líderes coordinan cualquier situación que pueda afectar a la alianza.'],
    benefits: ['Mejor lectura del entorno diplomático.', 'Respuesta más rápida ante situaciones delicadas.', 'Refuerzo estratégico para ambas comunidades.'],
    protocol: ['No filtrar información aliada.', 'No actuar usando el nombre de KAOs o KoTZ sin permiso.', 'Cualquier tensión se informa al Alto Mando.'],
    note: 'Estrategia, respeto y comunicación: esa es la base del acuerdo.'
  },
  {
    slug: 'underworld',
    name: 'Underworld',
    code: 'UNDERWORLD',
    emoji: '⚖️',
    status: 'Activa',
    since: 'Jun 2026',
    type: 'Alianza económica y comercial',
    level: 'Confianza comercial',
    trustScore: 100,
    colors: { primary: '#FFC4E1', secondary: '#9AD7FF', dark: '#120814' },
    desc: 'Acuerdo económico y comercial para beneficio mutuo y fortalecimiento entre bandas.',
    full: 'Underworld es una alianza centrada en cooperación económica, comercio y beneficio mutuo. No se trata solo de apoyo simbólico: el acuerdo busca abrir oportunidades prácticas para que ambas comunidades se fortalezcan con acuerdos útiles y bien coordinados.',
    pillars: ['Cooperación económica', 'Colaboración comercial', 'Comunicación directa', 'Beneficio mutuo'],
    agreements: ['Los acuerdos comerciales se harán con claridad y autorización.', 'El respeto y el cumplimiento de pactos son obligatorios.', 'La relación se mantendrá por vía diplomática y profesional.'],
    benefits: ['Posibilidad de acuerdos económicos favorables.', 'Refuerzo de relaciones comerciales.', 'Mayor estabilidad en operaciones de beneficio conjunto.'],
    protocol: ['No estafar ni manipular acuerdos con aliados.', 'No prometer recursos sin autorización.', 'Registrar o comunicar acuerdos relevantes al Alto Mando.'],
    note: 'Una alianza para crecer con cabeza: economía, respeto y palabra.'
  },
  {
    slug: 'cult-of-rose',
    name: 'Cult of Rose',
    code: 'CULT-OF-ROSE',
    emoji: '🌹',
    status: 'Activa',
    since: 'Jun 2026',
    type: 'Alianza de comunidad y defensa',
    level: 'Confianza en crecimiento',
    trustScore: 100,
    colors: { primary: '#FFC8EA', secondary: '#FFFFFF', dark: '#160911' },
    desc: 'Alianza enfocada en comunidad, futuro, apoyo militar y crecimiento conjunto.',
    full: 'Cult of Rose y KoTZ comparten una visión de comunidad fuerte, futuro estable y apoyo mutuo. Esta alianza busca preparar el camino para una relación duradera, donde ambas bandas puedan ayudarse en momentos importantes y crecer sin perder su identidad.',
    pillars: ['Comunidad sólida', 'Apoyo militar', 'Cooperación constante', 'Futuro compartido'],
    agreements: ['Ambas comunidades se apoyarán cuando la situación lo requiera.', 'Se mantendrá comunicación constante entre líderes.', 'La alianza se cuidará como una relación a largo plazo, no como un acuerdo temporal.'],
    benefits: ['Apoyo en momentos clave.', 'Crecimiento conjunto de imagen y presencia.', 'Base diplomática para proyectos futuros.'],
    protocol: ['Respetar a miembros de Cult of Rose como aliados oficiales.', 'Evitar conflictos públicos y dramas innecesarios.', 'Coordinar cualquier apoyo militar con Alto Mando.'],
    note: 'Una alianza con visión de futuro: comunidad, lealtad y crecimiento.'
  },
  {
    slug: 'fallen-angels',
    name: 'Fallen Angels',
    code: 'FALLEN-ANGELS',
    emoji: '🪽',
    status: 'Activa',
    since: 'Jun 2026',
    type: 'Alianza estratégica de crecimiento',
    level: 'Confianza alta',
    trustScore: 100,
    colors: { primary: '#B88CFF', secondary: '#9FE8FF', dark: '#0C0714' },
    desc: 'Alianza estratégica para crecer unidos, colaborar y mostrar una imagen fuerte entre comunidades.',
    full: 'Fallen Angels es una alianza estratégica pensada para construir algo más grande que una simple relación diplomática. El objetivo es colaborar, organizar proyectos, crecer como comunidades y demostrar una imagen sólida entre bandas.',
    pillars: ['Crecimiento conjunto', 'Colaboración constante', 'Apoyo mutuo', 'Eventos y proyectos'],
    agreements: ['KoTZ y Fallen Angels mantienen comunicación directa entre liderazgos.', 'Se priorizarán proyectos y eventos que beneficien a ambas comunidades.', 'La alianza se basa en confianza, cooperación y respeto mutuo.'],
    benefits: ['Mayor impacto público entre comunidades.', 'Opciones para eventos y colaboraciones conjuntas.', 'Apoyo ante necesidades estratégicas.'],
    protocol: ['Representar correctamente a KoTZ ante Fallen Angels.', 'No provocar ni generar conflictos con aliados.', 'Coordinar proyectos conjuntos con responsables autorizados.'],
    note: 'Una alianza para verse fuerte, actuar unidos y crecer con estabilidad.'
  },
  {
    slug: 'the-nato',
    name: 'The NATO',
    code: 'THE-NATO',
    emoji: '💎',
    status: 'Activa',
    since: 'Jun 2026',
    type: 'Alianza internacional',
    level: 'Confianza prioritaria',
    trustScore: 100,
    colors: { primary: '#9FE8FF', secondary: '#FFFFFF', dark: '#06121A' },
    desc: 'Alianza internacional fuerte basada en valores compartidos, apoyo, respeto y lealtad.',
    full: 'The NATO representa una alianza internacional importante para KoTZ. El acuerdo nace de una reunión formal entre liderazgos y establece una relación basada en cooperación, apoyo estratégico, respeto mutuo y comunicación directa.',
    pillars: ['Cooperación internacional', 'Apoyo estratégico', 'Respeto mutuo', 'Comunicación entre liderazgos'],
    agreements: ['Ambas bandas se reconocen como aliadas oficiales.', 'Los líderes permanecerán conectados para facilitar coordinación.', 'Los acuerdos, intercambios y eventos pactados deberán cumplirse.'],
    benefits: ['Refuerzo internacional para la red de KoTZ.', 'Mayor capacidad de coordinación y apoyo.', 'Relación diplomática fuerte basada en confianza.'],
    protocol: ['Respeto obligatorio hacia miembros aliados.', 'Prohibido fuego amigo, traición o filtración de información.', 'Prohibido captar miembros de bandas aliadas.', 'Los desacuerdos se resuelven entre líderes, nunca en público.', 'La alianza puede revocarse por incumplimientos graves o reiterados.'],
    note: 'Un paso importante para KoTZ: una red internacional basada en lealtad, respeto y cooperación.'
  },
  {
    slug: 'crows-of-olympus',
    name: 'Crows Of Olympus',
    code: 'OLYMPUS-CROWS',
    emoji: '⚜️',
    status: 'Activa',
    since: 'Jul 2026',
    type: 'Pacto de respeto, no agresión, comercio y protección',
    level: 'Confianza reciente',
    trustScore: 100,
    colors: { primary: '#FF7A18', secondary: '#050505', dark: '#080604' },
    desc: 'Nueva alianza oficial con Crows Of Olympus basada en respeto mutuo, convivencia, comercio y protección entre organizaciones.',
    full: 'Crows Of Olympus entra en la red diplomática de KoTZ como una alianza de respeto, cooperación y convivencia. El tratado busca evitar conflictos innecesarios, mantener una relación estable y definir normas claras para que ambas organizaciones puedan colaborar sin romper la paz interna.',
    pillars: ['Respeto mutuo', 'Pacto de no agresión', 'Cooperación entre organizaciones', 'Comercio y protección mutua'],
    agreements: ['KoTZ y Crows Of Olympus se reconocen como organizaciones aliadas.', 'Ninguna parte iniciará ataques, emboscadas, secuestros ni actos hostiles contra miembros aliados.', 'La cooperación podrá incluir apoyo en conflictos, intercambio de información, comercio y protección mutua.'],
    benefits: ['Nuevo canal diplomático con una organización activa.', 'Apoyo y protección mutua en situaciones importantes.', 'Más fuerza comercial y presencia dentro de la red de KoTZ.'],
    protocol: ['Mantener respeto hacia miembros de Crows Of Olympus.', 'No provocar, atacar ni generar conflictos sin autorización.', 'Cualquier incumplimiento o tensión se eleva directamente a liderazgo.'],
    note: 'Tratado firmado el 07/07/2026 a las 07:17. Crows Of Olympus queda integrado como aliado oficial de KoTZ.',
    leader: 'Suki_Toast'

  },
  {
    slug: 'neta',
    name: 'Ñeta',
    code: 'NETA',
    emoji: '🩸',
    status: 'Activa',
    since: 'Jul 2026',
    type: 'Alianza de respeto, cooperación y futuro',
    level: 'Confianza alta',
    trustScore: 100,
    colors: { primary: '#FF1E1E', secondary: '#050505', dark: '#090202' },
    desc: 'Nueva alianza oficial con Ñeta basada en respeto mutuo, pacto de no agresión, cooperación, información y apoyo estratégico.',
    full: 'Ñeta entra en la red diplomática de KoTZ como una alianza seria, estable y con visión de futuro. El acuerdo no busca ser algo momentáneo, sino sentar las bases de una relación duradera entre ambas organizaciones, basada en respeto, comunicación, cooperación y apoyo estratégico cuando la situación lo requiera.',
    pillars: ['Respeto mutuo', 'Pacto de no agresión', 'Cooperación en situaciones importantes', 'Visión de futuro compartida'],
    agreements: ['KoTZ y Ñeta se reconocen como organizaciones aliadas.', 'Ambas partes mantendrán respeto mutuo y evitarán provocaciones o conflictos innecesarios.', 'Se podrá compartir información cuando sea necesario y aprobado por liderazgo.', 'El apoyo estratégico se dará cuando la situación lo requiera y exista coordinación entre responsables.'],
    benefits: ['Nueva base diplomática para una alianza duradera.', 'Cooperación estable en situaciones importantes.', 'Apoyo estratégico y comunicación entre liderazgos.'],
    protocol: ['No atacar, provocar ni faltar al respeto a miembros de Ñeta.', 'No actuar en nombre de la alianza sin autorización.', 'Cualquier problema o malentendido se trata directamente con responsables, evitando dramas públicos.'],
    note: 'Respeto, palabra y futuro. Ñeta queda registrada como alianza oficial de KoTZ.',
    leader: 'Liderazgo Ñeta'
  },
  {
    slug: 'onyxis',
    name: 'Onyxis',
    code: 'ONYXIS',
    emoji: '🦉',
    status: 'Activa',
    since: 'Jul 2026',
    type: 'Alianza de guerra, eventos y apoyo mutuo',
    level: 'Confianza reciente',
    trustScore: 100,
    colors: { primary: '#8B2CFF', secondary: '#050505', dark: '#07030D' },
    desc: 'Nueva alianza con Onyxis enfocada en guerras, eventos, respaldo y apoyo mutuo ante presión de bandas grandes.',
    full: 'Onyxis entra en la red diplomática de KoTZ como una banda nueva que busca apoyo, presencia y coordinación. La alianza se centra en guerras, eventos y apoyo mutuo, especialmente cuando otras bandas grandes ejerzan presión o la situación requiera respaldo organizado.',
    pillars: ['Apoyo mutuo en conflictos', 'Eventos entre bandas', 'Respaldo ante presión externa', 'Coordinación directa'],
    agreements: ['KoTZ y Onyxis se reconocen como organizaciones aliadas.', 'Ambas partes podrán coordinar apoyo en guerras o situaciones de presión cuando sea necesario.', 'Los eventos conjuntos deberán organizarse con responsables autorizados para evitar desorden.', 'Cualquier movimiento sensible se comunicará antes entre liderazgos.'],
    benefits: ['Refuerza la presencia de KoTZ en nuevas relaciones diplomáticas.', 'Permite apoyo y coordinación en guerras o eventos.', 'Abre una vía de crecimiento conjunto con una banda nueva en expansión.'],
    protocol: ['No provocar ni atacar a miembros de Onyxis.', 'No prometer apoyo militar sin autorización de liderazgo.', 'Cualquier petición de respaldo se eleva primero a responsables de KoTZ.', 'Mantener respeto y comunicación clara durante eventos o conflictos.'],
    note: 'Onyxis queda registrada como alianza de apoyo mutuo, eventos y respaldo estratégico.',
    leader: 'Tomm Tominator'
  },
  {
    slug: 'redut',
    name: 'Redut',
    code: 'REDUT',
    emoji: '🦾',
    status: 'Activa',
    since: 'Jul 2026',
    type: 'Alianza de respeto, eventos y protección mutua',
    level: 'Confianza reciente',
    trustScore: 100,
    colors: { primary: '#FF1E1E', secondary: '#050505', dark: '#090202' },
    desc: 'Nueva alianza con Redut basada en respeto entre bandas, eventos conjuntos y protección mutua cuando haga falta.',
    full: 'Redut entra en la red diplomática de KoTZ con una propuesta clara: mantener respeto entre ambas bandas, organizar eventos conjuntos y ofrecer protección mutua cuando la situación lo requiera. La alianza busca estabilidad, comunicación y presencia conjunta sin generar conflictos innecesarios.',
    pillars: ['Respeto entre bandas', 'Eventos conjuntos', 'Protección mutua', 'Comunicación entre liderazgos'],
    agreements: ['KoTZ y Redut se reconocen como organizaciones aliadas.', 'Ambas partes mantendrán respeto y evitarán provocaciones innecesarias.', 'Se podrán organizar eventos conjuntos cuando exista coordinación previa.', 'La protección mutua se activará solo cuando la situación lo requiera y haya acuerdo entre responsables.'],
    benefits: ['Más actividad conjunta mediante eventos.', 'Refuerzo de protección entre comunidades aliadas.', 'Nueva relación estable dentro de la red diplomática de KoTZ.'],
    protocol: ['No faltar al respeto ni provocar miembros de Redut.', 'No actuar en nombre de la alianza sin autorización.', 'Todo evento o apoyo se coordina con liderazgo.', 'Cualquier problema se trata de forma privada entre responsables.'],
    note: 'Redut queda registrada como alianza de respeto, eventos y protección mutua.',
    leader: 'Tomás Reis',
    subleader: 'Tomás'
  },
  {
    slug: 'wagner',
    name: 'Wagner',
    code: 'WAGNER',
    emoji: '☣️',
    status: 'Activa',
    since: 'Jul 2026',
    type: 'Alianza de eventos, apoyo y protección',
    level: 'Confianza reciente',
    trustScore: 100,
    colors: { primary: '#D01010', secondary: '#050505', dark: '#050000' },
    desc: 'Nueva alianza con Wagner orientada a eventos entre bandas, apoyo y protección cuando sea necesario.',
    full: 'Wagner entra en la red diplomática de KoTZ como una alianza centrada en organizar eventos entre ambas bandas y mantener apoyo o protección cuando haga falta. El acuerdo busca cooperación práctica, respeto y comunicación directa para evitar malentendidos.',
    pillars: ['Eventos entre bandas', 'Apoyo mutuo', 'Protección cuando sea necesaria', 'Respeto y coordinación'],
    agreements: ['KoTZ y Wagner se reconocen como organizaciones aliadas.', 'Ambas partes podrán organizar eventos conjuntos con coordinación previa.', 'El apoyo y la protección deberán solicitarse por canales de liderazgo.', 'Se evitarán provocaciones, ataques o decisiones impulsivas entre miembros aliados.'],
    benefits: ['Aumenta la actividad mediante eventos entre bandas.', 'Refuerza la red de apoyo y protección de KoTZ.', 'Abre una relación práctica para cooperación futura.'],
    protocol: ['No provocar ni atacar a miembros de Wagner.', 'No iniciar acciones en nombre de la alianza sin permiso.', 'Las solicitudes de apoyo pasan por liderazgo.', 'Los conflictos se resuelven en privado y con calma.'],
    note: 'Wagner queda registrada como alianza de eventos, apoyo y protección.',
    leader: 'Huesos Litvin',
    subleader: 'Henry Young'
  },
  {
    slug: 'fenix',
    name: 'Fenix ESP',
    code: 'FENIX',
    emoji: '🐦‍🔥',
    status: 'Activa',
    since: 'Jul 2026',
    type: 'Alianza de eventos, protección y ayuda mutua',
    level: 'Confianza reciente',
    trustScore: 100,
    colors: { primary: '#FF3B1F', secondary: '#FFB000', dark: '#120302' },
    desc: 'Nueva alianza con Fenix ESP basada en eventos conjuntos, protección y ayuda entre ambas bandas.',
    full: 'Fenix ESP entra en la red diplomática de KoTZ como una alianza orientada a actividad, protección y apoyo entre bandas. El acuerdo busca organizar eventos conjuntos, mantener una relación útil y activar ayuda mutua cuando la situación lo requiera, siempre con coordinación entre responsables.',
    pillars: ['Eventos conjuntos', 'Protección mutua', 'Ayuda entre bandas', 'Coordinación directa'],
    agreements: ['KoTZ y Fenix ESP se reconocen como organizaciones aliadas.', 'Ambas partes podrán organizar eventos conjuntos cuando exista coordinación previa.', 'La protección y ayuda mutua se activará cuando la situación lo requiera y sea aprobada por liderazgo.', 'Cualquier tensión se tratará directamente entre responsables para evitar malentendidos públicos.'],
    benefits: ['Más actividad mediante eventos entre bandas.', 'Refuerzo de protección y apoyo cuando sea necesario.', 'Nueva relación diplomática con una banda posicionada en el TOP.'],
    protocol: ['No provocar ni atacar a miembros de Fenix ESP.', 'No prometer apoyo o protección sin autorización.', 'Coordinar eventos y ayudas con liderazgo.', 'Resolver cualquier problema por vía privada entre responsables.'],
    note: 'Fenix ESP queda registrada como alianza oficial de KoTZ para eventos, protección y ayuda mutua.',
    leader: 'Liderazgo Fenix'
  }
];

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
function pickShopPrice(item, mode = 'member'){
  if (mode === 'ally') return Number(item.allyPrice || item.memberPrice || item.basePrice || 0);
  if (mode === 'base') return Number(item.basePrice || item.memberPrice || item.allyPrice || 0);
  return Number(item.memberPrice || item.basePrice || item.allyPrice || 0);
}
function isActiveShopItem(item){ return String(item?.status || 'Activo').toLowerCase() === 'activo'; }
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


app.get('/api/members', requireAdmin, async (req, res) => {
  try {
    if (!googleStorage.configured()) return res.json({ members: [], storage:'disabled' });
    const members = await googleStorage.listMembers();
    return res.json({ ok:true, members, storage:'google' });
  } catch(err){
    console.error('[KoTZ] Error leyendo miembros:', '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.friendlyGoogleError(err), storage:'google' });
  }
});

app.get('/api/members/me', requireUserOrAdmin, async (req, res) => {
  try {
    if (!googleStorage.configured()) return res.json({ ok:true, member:null, storage:'disabled' });
    const member = await googleStorage.getMemberForDiscordUser(req.session.user);
    return res.json({ ok:true, member, storage:'google' });
  } catch(err){
    console.error('[KoTZ] Error buscando miembro por Discord:', req.session.user?.username, '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.friendlyGoogleError(err), storage:'google' });
  }
});

app.patch('/api/members/:id', requireAdmin, async (req, res) => {
  try {
    if (!googleStorage.configured()) return res.status(501).json({ ok:false, error:'Google Storage no está configurado.' });
    const allowed = ['rpName','name','discordUsername','discord','discordId','rank','joinDate','joined','status','profileUrl','notes'];
    const patch = {};
    for (const key of allowed){
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) patch[key] = req.body[key];
    }
    const member = await googleStorage.updateMember(req.params.id, patch, req.session.user);
    return res.json({ ok:true, member, storage:'google' });
  } catch(err){
    console.error('[KoTZ] Error actualizando miembro:', req.params.id, '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.friendlyGoogleError(err), storage:'google' });
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

app.get('/api/sanctions', requireAdmin, async (req, res) => {
  try {
    if (googleStorage.configured()) return res.json({ ok:true, sanctions: await googleStorage.listSanctions(), storage:'google' });
    return res.json({ ok:true, sanctions: readDb().sanctions || [], storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error leyendo sanciones:', '\n', err?.stack || err?.message || err);
    const friendly = googleStorage.configured() ? googleStorage.friendlyGoogleError(err) : 'No se pudieron leer las sanciones.';
    return res.status(502).json({ ok:false, error: friendly, storage: googleStorage.configured() ? 'google' : 'json' });
  }
});

app.post('/api/sanctions', requireAdmin, async (req, res) => {
  const { memberId, memberName, severity, date, responsible, reason } = req.body || {};

  if (!memberId || !memberName || !date || !reason) {
    return res.status(400).json({ ok:false, error:'Faltan campos obligatorios (memberId, memberName, date o reason).' });
  }

  if (googleStorage.configured()){
    try {
      const sanction = await googleStorage.appendSanction({ memberId, memberName, severity, date, responsible, reason }, req.session.user);
      return res.json({ ok:true, sanction, storage:'google' });
    } catch(err){
      console.error('[KoTZ] Error guardando sanción en Google:', { memberId, memberName, severity, date, responsible }, '\n', err?.stack || err?.message || err);
      return res.status(502).json({ ok:false, error: googleStorage.friendlyGoogleError(err), storage:'google' });
    }
  }

  try {
    const db = readDb();
    const sanction = {
      id: 'sanction_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex'),
      createdAt: new Date().toISOString(),
      memberId: String(memberId),
      memberName: String(memberName),
      severity: String(severity || 'Leve'),
      date: String(date),
      responsible: String(responsible || ''),
      reason: String(reason),
      createdByDiscordId: req.session.user?.id || '',
      createdByUsername: req.session.user?.username || '',
      createdByDisplayName: req.session.user?.displayName || req.session.user?.globalName || req.session.user?.username || '',
      source: 'server'
    };
    db.sanctions = db.sanctions || [];
    db.sanctions.unshift(sanction);
    writeDb(db);
    return res.json({ ok:true, sanction, storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error guardando sanción en server-data.json:', '\n', err?.stack || err?.message || err);
    return res.status(500).json({ ok:false, error:'No se pudo guardar la sanción en el servidor.' });
  }
});


/* ------------------------------------------------------------ SHOP / TIENDA RP */

app.get('/api/shop/items', requireUserOrAdmin, async (req, res) => {
  try {
    if (googleStorage.configured()) {
      const items = await googleStorage.listShopItems();
      const visible = req.session.accessLevel === 'alto-mando' ? items : items.filter(isActiveShopItem);
      return res.json({ ok:true, items: visible, storage:'google' });
    }
    const items = readDb().shopItems || [];
    return res.json({ ok:true, items: req.session.accessLevel === 'alto-mando' ? items : items.filter(isActiveShopItem), storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error leyendo tienda:', '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.configured() ? googleStorage.friendlyGoogleError(err) : 'No se pudo leer la tienda.' });
  }
});

app.post('/api/shop/items', requireAdmin, async (req, res) => {
  try {
    const item = req.body || {};
    if (!item.name) return res.status(400).json({ ok:false, error:'Falta el nombre del producto.' });
    if (googleStorage.configured()) return res.json({ ok:true, item: await googleStorage.appendShopItem(item, req.session.user), storage:'google' });
    const db = readDb();
    const entry = { id:'shop_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex'), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), ...item };
    db.shopItems = db.shopItems || []; db.shopItems.unshift(entry); writeDb(db);
    return res.json({ ok:true, item:entry, storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error creando producto:', '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.configured() ? googleStorage.friendlyGoogleError(err) : 'No se pudo crear el producto.' });
  }
});

app.patch('/api/shop/items/:id', requireAdmin, async (req, res) => {
  try {
    if (googleStorage.configured()) return res.json({ ok:true, item: await googleStorage.updateShopItem(req.params.id, req.body || {}, req.session.user), storage:'google' });
    const db = readDb();
    const item = (db.shopItems || []).find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ ok:false, error:'Producto no encontrado.' });
    Object.assign(item, req.body || {}, { updatedAt:new Date().toISOString() }); writeDb(db);
    return res.json({ ok:true, item, storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error actualizando producto:', req.params.id, '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.configured() ? googleStorage.friendlyGoogleError(err) : 'No se pudo actualizar el producto.' });
  }
});

app.get('/api/shop/orders', requireUserOrAdmin, async (req, res) => {
  try {
    const all = googleStorage.configured() ? await googleStorage.listShopOrders() : (readDb().shopOrders || []);
    const orders = req.session.accessLevel === 'alto-mando' ? all : all.filter(o => String(o.buyerDiscordId || '') === String(req.session.user?.id || ''));
    return res.json({ ok:true, orders, storage: googleStorage.configured() ? 'google' : 'json' });
  } catch(err){
    console.error('[KoTZ] Error leyendo pedidos:', '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.configured() ? googleStorage.friendlyGoogleError(err) : 'No se pudieron leer los pedidos.' });
  }
});

app.post('/api/shop/orders', requireUserOrAdmin, async (req, res) => {
  try {
    const { itemId, quantity = 1, message = '', priceMode = 'member' } = req.body || {};
    if (!itemId) return res.status(400).json({ ok:false, error:'Falta itemId.' });
    const items = googleStorage.configured() ? await googleStorage.listShopItems() : (readDb().shopItems || []);
    const item = items.find(i => String(i.id) === String(itemId));
    if (!item || !isActiveShopItem(item)) return res.status(404).json({ ok:false, error:'Producto no disponible.' });
    const qty = Math.max(1, Number(quantity || 1));
    if (Number(item.stock || 0) < qty) return res.status(400).json({ ok:false, error:'No hay stock suficiente.' });
    const member = googleStorage.configured() ? await googleStorage.getMemberForDiscordUser(req.session.user) : null;
    const orderInput = { itemId:item.id, itemName:item.name, price: pickShopPrice(item, priceMode), quantity:qty, status:'pending', message:String(message || '') };
    if (googleStorage.configured()) return res.json({ ok:true, order: await googleStorage.appendShopOrder(orderInput, req.session.user, member), storage:'google' });
    const db = readDb();
    const order = { id:'order_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex'), createdAt:new Date().toISOString(), buyerDiscordId:req.session.user?.id || '', buyerUsername:req.session.user?.username || '', buyerDisplayName:req.session.user?.displayName || req.session.user?.globalName || req.session.user?.username || '', buyerMemberId:member?.id || '', buyerName:member?.name || req.session.user?.displayName || req.session.user?.username || '', ...orderInput };
    db.shopOrders = db.shopOrders || []; db.shopOrders.unshift(order); writeDb(db);
    return res.json({ ok:true, order, storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error creando pedido:', '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.configured() ? googleStorage.friendlyGoogleError(err) : 'No se pudo crear el pedido.' });
  }
});

app.patch('/api/shop/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['pending','approved','rejected','delivered','cancelled'].includes(status)) return res.status(400).json({ ok:false, error:'Estado inválido.' });

    if (googleStorage.configured()) {
      const before = (await googleStorage.listShopOrders()).find(o => String(o.id) === String(req.params.id));
      const order = await googleStorage.updateShopOrderStatus(req.params.id, status, req.session.user);
      if (status === 'approved' && before && before.status !== 'approved') {
        const item = (await googleStorage.listShopItems()).find(i => String(i.id) === String(order.itemId));
        if (item) await googleStorage.updateShopItem(item.id, { stock: Math.max(0, Number(item.stock || 0) - Number(order.quantity || 1)) }, req.session.user);
      }
      return res.json({ ok:true, order, storage:'google' });
    }

    const db = readDb();
    const order = (db.shopOrders || []).find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ ok:false, error:'Pedido no encontrado.' });
    order.status = status; order.reviewedBy = req.session.user?.displayName || req.session.user?.username || ''; order.reviewedAt = new Date().toISOString(); writeDb(db);
    return res.json({ ok:true, order, storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error actualizando pedido:', req.params.id, '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.configured() ? googleStorage.friendlyGoogleError(err) : 'No se pudo actualizar el pedido.' });
  }
});

app.get('/api/shop/offers', requireUserOrAdmin, async (req, res) => {
  try {
    const all = googleStorage.configured() ? await googleStorage.listShopOffers() : (readDb().shopOffers || []);
    const offers = req.session.accessLevel === 'alto-mando' ? all : all.filter(o => String(o.buyerDiscordId || '') === String(req.session.user?.id || ''));
    return res.json({ ok:true, offers, storage: googleStorage.configured() ? 'google' : 'json' });
  } catch(err){
    console.error('[KoTZ] Error leyendo ofertas:', '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.configured() ? googleStorage.friendlyGoogleError(err) : 'No se pudieron leer las ofertas.' });
  }
});

app.post('/api/shop/offers', requireUserOrAdmin, async (req, res) => {
  try {
    const { itemId, offeredPrice, message = '', priceMode = 'member' } = req.body || {};
    if (!itemId || !offeredPrice) return res.status(400).json({ ok:false, error:'Falta itemId u offeredPrice.' });
    const items = googleStorage.configured() ? await googleStorage.listShopItems() : (readDb().shopItems || []);
    const item = items.find(i => String(i.id) === String(itemId));
    if (!item || !isActiveShopItem(item)) return res.status(404).json({ ok:false, error:'Producto no disponible.' });
    const member = googleStorage.configured() ? await googleStorage.getMemberForDiscordUser(req.session.user) : null;
    const offerInput = { itemId:item.id, itemName:item.name, originalPrice: pickShopPrice(item, priceMode), offeredPrice:Number(offeredPrice), message:String(message || ''), status:'pending' };
    if (googleStorage.configured()) return res.json({ ok:true, offer: await googleStorage.appendShopOffer(offerInput, req.session.user, member), storage:'google' });
    const db = readDb();
    const offer = { id:'offer_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex'), createdAt:new Date().toISOString(), buyerDiscordId:req.session.user?.id || '', buyerUsername:req.session.user?.username || '', buyerDisplayName:req.session.user?.displayName || req.session.user?.globalName || req.session.user?.username || '', buyerMemberId:member?.id || '', buyerName:member?.name || req.session.user?.displayName || req.session.user?.username || '', ...offerInput };
    db.shopOffers = db.shopOffers || []; db.shopOffers.unshift(offer); writeDb(db);
    return res.json({ ok:true, offer, storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error creando oferta:', '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.configured() ? googleStorage.friendlyGoogleError(err) : 'No se pudo crear la oferta.' });
  }
});

app.patch('/api/shop/offers/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, counterOffer = '' } = req.body || {};
    if (!['pending','accepted','rejected','countered','cancelled'].includes(status)) return res.status(400).json({ ok:false, error:'Estado inválido.' });
    if (googleStorage.configured()) return res.json({ ok:true, offer: await googleStorage.updateShopOfferStatus(req.params.id, status, counterOffer, req.session.user), storage:'google' });
    const db = readDb();
    const offer = (db.shopOffers || []).find(o => o.id === req.params.id);
    if (!offer) return res.status(404).json({ ok:false, error:'Oferta no encontrada.' });
    offer.status = status; offer.counterOffer = counterOffer; offer.reviewedBy = req.session.user?.displayName || req.session.user?.username || ''; offer.reviewedAt = new Date().toISOString(); writeDb(db);
    return res.json({ ok:true, offer, storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error actualizando oferta:', req.params.id, '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.configured() ? googleStorage.friendlyGoogleError(err) : 'No se pudo actualizar la oferta.' });
  }
});

app.patch('/api/shop/offers/:id/respond', requireUserOrAdmin, async (req, res) => {
  try {
    const { action, offeredPrice, message = '' } = req.body || {};
    if (!['accept-counter','reject-counter','counter-again'].includes(action)) {
      return res.status(400).json({ ok:false, error:'Respuesta de oferta inválida.' });
    }

    const userId = String(req.session.user?.id || '');

    if (googleStorage.configured()) {
      const offers = await googleStorage.listShopOffers();
      const offer = offers.find(o => String(o.id) === String(req.params.id));
      if (!offer) return res.status(404).json({ ok:false, error:'Oferta no encontrada.' });
      if (req.session.accessLevel !== 'alto-mando' && String(offer.buyerDiscordId || '') !== userId) {
        return res.status(403).json({ ok:false, error:'No puedes responder una oferta que no es tuya.' });
      }
      if (offer.status !== 'countered') {
        return res.status(400).json({ ok:false, error:'Esta oferta no tiene una contraoferta pendiente.' });
      }

      if (action === 'accept-counter') {
        const updated = await googleStorage.updateShopOfferStatus(offer.id, 'accepted', offer.counterOffer || '', req.session.user);
        return res.json({ ok:true, offer: updated, storage:'google' });
      }

      if (action === 'reject-counter') {
        const updated = await googleStorage.updateShopOfferStatus(offer.id, 'cancelled', offer.counterOffer || '', req.session.user);
        return res.json({ ok:true, offer: updated, storage:'google' });
      }

      const nextPrice = Number(offeredPrice || 0);
      if (!nextPrice || nextPrice <= 0) return res.status(400).json({ ok:false, error:'La nueva oferta debe ser mayor que 0.' });

      const member = await googleStorage.getMemberForDiscordUser(req.session.user);
      await googleStorage.updateShopOfferStatus(offer.id, 'cancelled', offer.counterOffer || '', req.session.user);
      const nextOffer = await googleStorage.appendShopOffer({
        itemId: offer.itemId,
        itemName: offer.itemName,
        originalPrice: offer.originalPrice,
        offeredPrice: nextPrice,
        message: String(message || 'Nueva contraoferta del cliente'),
        status: 'pending'
      }, req.session.user, member);
      return res.json({ ok:true, offer: nextOffer, previousOfferId: offer.id, storage:'google' });
    }

    const db = readDb();
    const offer = (db.shopOffers || []).find(o => String(o.id) === String(req.params.id));
    if (!offer) return res.status(404).json({ ok:false, error:'Oferta no encontrada.' });
    if (req.session.accessLevel !== 'alto-mando' && String(offer.buyerDiscordId || '') !== userId) {
      return res.status(403).json({ ok:false, error:'No puedes responder una oferta que no es tuya.' });
    }
    if (offer.status !== 'countered') {
      return res.status(400).json({ ok:false, error:'Esta oferta no tiene una contraoferta pendiente.' });
    }

    const reviewer = req.session.user?.displayName || req.session.user?.globalName || req.session.user?.username || '';

    if (action === 'accept-counter') {
      offer.status = 'accepted';
      offer.reviewedBy = reviewer;
      offer.reviewedAt = new Date().toISOString();
      writeDb(db);
      return res.json({ ok:true, offer, storage:'json' });
    }

    if (action === 'reject-counter') {
      offer.status = 'cancelled';
      offer.reviewedBy = reviewer;
      offer.reviewedAt = new Date().toISOString();
      writeDb(db);
      return res.json({ ok:true, offer, storage:'json' });
    }

    const nextPrice = Number(offeredPrice || 0);
    if (!nextPrice || nextPrice <= 0) return res.status(400).json({ ok:false, error:'La nueva oferta debe ser mayor que 0.' });

    offer.status = 'cancelled';
    offer.reviewedBy = reviewer;
    offer.reviewedAt = new Date().toISOString();
    const nextOffer = {
      id:'offer_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex'),
      createdAt:new Date().toISOString(),
      buyerDiscordId:req.session.user?.id || '',
      buyerUsername:req.session.user?.username || '',
      buyerDisplayName:req.session.user?.displayName || req.session.user?.globalName || req.session.user?.username || '',
      buyerMemberId:offer.buyerMemberId || '',
      buyerName:offer.buyerName || req.session.user?.displayName || req.session.user?.username || '',
      itemId:offer.itemId,
      itemName:offer.itemName,
      originalPrice:Number(offer.originalPrice || 0),
      offeredPrice:nextPrice,
      message:String(message || 'Nueva contraoferta del cliente'),
      status:'pending',
      counterOffer:'',
      reviewedBy:'',
      reviewedAt:''
    };
    db.shopOffers = db.shopOffers || [];
    db.shopOffers.unshift(nextOffer);
    writeDb(db);
    return res.json({ ok:true, offer: nextOffer, previousOfferId: offer.id, storage:'json' });
  } catch(err){
    console.error('[KoTZ] Error respondiendo contraoferta:', req.params.id, '\n', err?.stack || err?.message || err);
    return res.status(502).json({ ok:false, error: googleStorage.configured() ? googleStorage.friendlyGoogleError(err) : 'No se pudo responder la contraoferta.' });
  }
});


app.get('/api/alliances', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ ok:false, error:'Inicia sesión con Discord para ver alianzas internas.' });
  }
  if (!['usuario', 'alto-mando'].includes(req.session.accessLevel)) {
    return res.status(403).json({ ok:false, error:'No tienes permisos de miembro KoTZ para ver alianzas internas.' });
  }
  return res.json({ ok:true, alliances: KOTZ_ALLIANCES });
});

app.get('/api/gallery', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
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
