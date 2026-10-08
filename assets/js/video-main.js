// video-main.js — visor/video.html (página individual de un laboratorio vivo)
//
// CERO fetch(). Recibe UN solo laboratorio 'vivo' por window.name: lo arma
// catalogo.html (assets/js/main.js, irAVideoVivo()) al hacer clic en una
// tarjeta de video, respaldando antes su propio payload en sessionStorage
// para que "Volver al catálogo" lo pueda restaurar sin perderlo (mismo
// patrón que index.html/programa.html — ver "Volver sin perder los datos"
// en README.md).

const CLAVE_RESPALDO_CATALOGO = 'visorCatalogoRespaldo';

// Capa visual compartida (assets/js/visor-ui.js): íconos y cargador. Si no
// cargara, la pantalla funciona igual, solo sin adornos.
const UI = window.VisorUI || null;
const icono = (nombre, clase) => (UI ? UI.icono(nombre, clase) : '');

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Google Drive entrega links "para compartir" (.../view?usp=drivesdk o
// .../view); para incrustarlos en un <iframe> hay que pedir la variante
// "/preview" del mismo archivo. Si la URL no matchea el patrón esperado,
// se devuelve tal cual (mejor un link roto visible que ocultar el dato).
// Mismas reglas que utils::normalizar_url_embebible() del plugin y toEmbedUrl()
// de los visores de curso (GUIA_NUEVO_VISOR_OPTIMIZADO.md §2.3): tambien
// /file/u/0/d/ID (selector de cuenta), open?id= y uc?id=.
function toEmbedUrlDrive(url) {
  if (!url) return '';
  const texto = String(url);
  const m = texto.match(/drive\.google\.com\/file\/(?:u\/\d+\/)?d\/([\w-]+)/)
    || texto.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  return url;
}

// ---------------------------------------------------------------------------
// Reproductor de Drive en celular
//
// El reproductor /preview de Drive NO es responsive por debajo de ~300 px de
// alto: dibuja su propia interfaz (barra superior, boton de play, barra de
// controles) con tamanos minimos. En un marco 16:9 de celular (297-343 px de
// ancho = 167-193 px de alto) el play queda abajo y cortado, el poster se ve
// ampliado y los controles inferiores quedan fuera del marco. Por eso, en
// pantallas angostas el video NO se incrusta en la pagina: se muestra una
// fachada (poster + play) y el reproductor se abre en una capa que ocupa toda
// la pantalla, donde Drive si tiene espacio. En pantallas anchas (marco de
// >= 300 px de alto) sigue incrustado como siempre. Los demas origenes
// (no Drive) se incrustan siempre.
// ---------------------------------------------------------------------------
const MQ_ANGOSTO = '(max-width: 599.98px)';
const ALLOW_REPRODUCTOR = 'autoplay; fullscreen; picture-in-picture; encrypted-media';

function esDrive(embedUrl) {
  return /^https:\/\/drive\.google\.com\/file\/d\//.test(embedUrl || '');
}

function posterDrive(embedUrl) {
  const m = String(embedUrl || '').match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800` : '';
}

// A diferencia de catalogo.html (que espera { items: [...] }), acá el
// anfitrión manda UN solo ítem suelto — cualquier otra forma se trata como
// "no hay datos", nunca como un error.
function leerEntrada() {
  try {
    if (!window.name) return null;
    const data = JSON.parse(window.name);
    if (!data || typeof data !== 'object' || Array.isArray(data) || Array.isArray(data.items)) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function renderPie() {
  return `
`;
}

function renderSinDatos() {
  document.getElementById('app').innerHTML = `
<section class="hero hero--compact">
  <div class="container">
    <div class="topbar">
      <a class="btn btn--secondary" href="catalogo.html">${icono('arrow-left', 'icon--arrow-left')}<span>Volver al catálogo</span></a>
    </div>
    <div class="hero__inner"></div>
  </div>
</section>
<section class="content">
  <div class="container">
    ${UI
      ? UI.estadoVacio({ icono: 'film', nivel: 1, titulo: 'No hay ningún video cargado.', texto: 'Vuelve al catálogo para elegir uno.' })
      : '<h1 class="empty-state">No hay ningún video cargado. Vuelve al catálogo para elegir uno.</h1>'}
  </div>
</section>
${renderPie()}`;
}

function renderVideo(item) {
  document.title = item.nombre || 'Laboratorio Vivo';

  const embedUrl = toEmbedUrlDrive(item.videoUrl);
  const esTransversal = item.transversalidad === 'Transversal';
  const itemTexto = item.item != null && item.item !== '' ? String(item.item) : '';

  document.getElementById('app').innerHTML = `
<section class="hero hero--compact">
  <div class="container">
    <div class="topbar">
      <a class="btn btn--secondary" href="${escapeHtml(item.volver_url || 'catalogo.html')}" id="volverLink">${icono('arrow-left', 'icon--arrow-left')}<span>Volver al catálogo</span></a>
      ${itemTexto ? `<span class="status-chip"><span class="status-chip__led" aria-hidden="true"></span><span>Práctica ${escapeHtml(itemTexto)}</span></span>` : ''}
    </div>
    <div class="hero__inner">
      <div class="hero__text">
        <div class="hero__badges">
          <span class="modal-badge modal-badge--solid">${escapeHtml(item.materia || 'Sin materia')}</span>
          <span class="modal-badge modal-badge--outline">${escapeHtml(item.programa || 'Sin programa')}</span>
          <span class="modal-badge ${esTransversal ? 'modal-badge--solid' : 'modal-badge--outline'}">${escapeHtml(item.transversalidad || '—')}</span>
        </div>
        <h1 class="hero__title">${escapeHtml(item.nombre || 'Laboratorio en vivo sin nombre')}</h1>
      </div>
    </div>
  </div>
</section>

<section class="content">
  <div class="container video-layout">
    <div class="video-main">
      <div class="video-player" id="videoPlayer">
        ${embedUrl ? '' : `<div class="video-player__empty">${icono('film')}<p>Video no disponible</p></div>`}
      </div>
      ${embedUrl ? `
      <div class="video-actions">
        <a class="btn btn--secondary" href="${escapeHtml(item.videoUrl || embedUrl)}" target="_blank" rel="noopener noreferrer">Abrir en Google Drive${icono('external')}</a>
        <p class="video-nota">${icono('info')}<span>Si el video no carga o Google pide acceso, usa Abrir en Google Drive.</span></p>
      </div>` : ''}

      <section class="video-section">
        <h2 class="section-title">${icono('info')}Descripción</h2>
        <p>${escapeHtml(item.descripcion || 'Descripción no disponible.')}</p>
      </section>
    </div>

    <aside class="video-aside">
      <div class="card video-facts">
        <h2 class="section-title">${icono('flask')}Datos de la práctica</h2>
        <dl class="detail-list">
          <div><dt>${icono('hash')}Ítem</dt><dd class="font-mono">${itemTexto ? `#${escapeHtml(itemTexto)}` : '—'}</dd></div>
          <div><dt>${icono('user')}Docente / Fuente</dt><dd>${escapeHtml(item.docenteFuente || '—')}</dd></div>
          <div><dt>${icono('layers')}Transversalidad</dt><dd>${escapeHtml(item.transversalidad || '—')}</dd></div>
        </dl>
        ${item.videoUrl ? `<a class="btn btn--primary btn--block" href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noopener noreferrer">Abrir en Google Drive${icono('external')}</a>` : ''}
      </div>
    </aside>
  </div>
</section>
${renderPie()}`;

  if (embedUrl) iniciarReproductor(embedUrl, item);

  const volverLink = document.getElementById('volverLink');
  if (volverLink) {
    // Restaura el catálogo respaldado ANTES de que el <a href> navegue
    // (evento sincrónico: no hace falta preventDefault ni esperar nada).
    volverLink.addEventListener('click', () => {
      try {
        const respaldo = sessionStorage.getItem(CLAVE_RESPALDO_CATALOGO);
        if (respaldo) window.name = respaldo;
      } catch (e) { /* sin storage disponible: catalogo.html cae a su estado "sin datos" */ }
    });
  }
}

// Elige entre incrustado (pantalla ancha u origen que no es Drive) y fachada
// con capa grande (Drive en pantalla angosta), y lo reevalua si la pantalla
// cambia de lado (por ejemplo al girar el celular).
function iniciarReproductor(embedUrl, item) {
  const player = document.getElementById('videoPlayer');
  if (!player) return;
  const nombre = item.nombre || 'Laboratorio en vivo';
  const mq = window.matchMedia ? window.matchMedia(MQ_ANGOSTO) : null;
  let modo = null;

  function incrustar() {
    player.innerHTML = `${UI ? UI.cargando('Cargando video…', 'loader--on-dark') : ''}<iframe src="${escapeHtml(embedUrl)}" allow="${ALLOW_REPRODUCTOR}" allowfullscreen loading="lazy" title="${escapeHtml(nombre)}"></iframe>`;
    const iframe = player.querySelector('iframe');
    const cargador = player.querySelector('.loader');
    // El cargador vive detrás del <iframe>: se retira cuando el video carga.
    if (iframe && cargador) iframe.addEventListener('load', () => cargador.remove(), { once: true });
  }

  function fachada() {
    const poster = posterDrive(embedUrl);
    player.innerHTML = `
<button type="button" class="video-fachada" aria-label="Reproducir video: ${escapeHtml(nombre)}" aria-haspopup="dialog">
  ${poster ? `<img class="video-fachada__img" src="${escapeHtml(poster)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}
  <span class="video-fachada__play" aria-hidden="true">${icono('play')}</span>
  <span class="video-fachada__hint">Toca para verlo en pantalla grande</span>
</button>`;
    const img = player.querySelector('.video-fachada__img');
    // Un archivo no publico no tiene miniatura: queda el fondo de color.
    if (img) img.addEventListener('error', () => img.remove(), { once: true });
    player.querySelector('.video-fachada').addEventListener('click', ev => abrirCapa(embedUrl, item, ev.currentTarget));
  }

  function actualizar() {
    const deseado = esDrive(embedUrl) && mq && mq.matches ? 'fachada' : 'incrustado';
    if (deseado === modo) return;
    cerrarCapa();
    modo = deseado;
    if (modo === 'fachada') fachada(); else incrustar();
  }

  actualizar();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', actualizar);
    else if (mq.addListener) mq.addListener(actualizar);
  }
}

// Capa a pantalla completa con el reproductor. Cubre el viewport del visor
// (en Moodle, el del iframe de catalogo.php). El fondo queda inerte, el foco
// entra al boton de cerrar y vuelve a la fachada al cerrar; Escape cierra.
let capaAbierta = null;

function abrirCapa(embedUrl, item, disparador) {
  if (capaAbierta) return;
  const nombre = item.nombre || 'Laboratorio en vivo';
  const capa = document.createElement('div');
  capa.className = 'video-capa';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-label', nombre);
  capa.innerHTML = `
<div class="video-capa__barra">
  <p class="video-capa__titulo">${escapeHtml(nombre)}</p>
  <a class="btn btn--secondary video-capa__drive" href="${escapeHtml(item.videoUrl || embedUrl)}" target="_blank" rel="noopener noreferrer">Abrir en Drive${icono('external')}</a>
  <button type="button" class="video-capa__cerrar" aria-label="Cerrar video">${icono('x')}</button>
</div>
<div class="video-capa__marco">
  ${UI ? UI.cargando('Cargando video…', 'loader--on-dark') : ''}
  <iframe src="${escapeHtml(embedUrl)}" allow="${ALLOW_REPRODUCTOR}" allowfullscreen title="${escapeHtml(nombre)}"></iframe>
</div>`;

  const fondo = [document.querySelector('.site-header'), document.querySelector('.tema-dock'), document.getElementById('app')].filter(Boolean);
  fondo.forEach(el => el.setAttribute('inert', ''));
  document.body.appendChild(capa);
  document.documentElement.classList.add('video-capa-abierta');

  const iframe = capa.querySelector('iframe');
  const cargador = capa.querySelector('.loader');
  if (cargador) iframe.addEventListener('load', () => cargador.remove(), { once: true });

  const alTeclado = ev => { if (ev.key === 'Escape') cerrarCapa(); };
  document.addEventListener('keydown', alTeclado);
  capa.querySelector('.video-capa__cerrar').addEventListener('click', cerrarCapa);

  capaAbierta = { capa, fondo, alTeclado, disparador };
  capa.querySelector('.video-capa__cerrar').focus({ preventScroll: true });
}

function cerrarCapa() {
  if (!capaAbierta) return;
  const { capa, fondo, alTeclado, disparador } = capaAbierta;
  capaAbierta = null;
  document.removeEventListener('keydown', alTeclado);
  capa.remove();                                  // destruye el iframe: el video deja de sonar
  fondo.forEach(el => el.removeAttribute('inert'));
  document.documentElement.classList.remove('video-capa-abierta');
  if (disparador && document.contains(disparador) && disparador.focus) disparador.focus({ preventScroll: true });
}

document.addEventListener('DOMContentLoaded', () => {
  const item = leerEntrada();
  if (item) {
    renderVideo(item);
  } else {
    renderSinDatos();
  }
});
