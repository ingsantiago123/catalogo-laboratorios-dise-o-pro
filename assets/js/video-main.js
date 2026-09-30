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
function toEmbedUrlDrive(url) {
  if (!url) return '';
  const m = String(url).match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  return url;
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
      <div class="video-player">
        ${embedUrl
          ? `${UI ? UI.cargando('Cargando video…', 'loader--on-dark') : ''}<iframe src="${escapeHtml(embedUrl)}" allow="autoplay; fullscreen" allowfullscreen loading="lazy" title="${escapeHtml(item.nombre)}"></iframe>`
          : `<div class="video-player__empty">${icono('film')}<p>Video no disponible</p></div>`}
      </div>

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

  // El cargador vive detrás del <iframe>: se retira cuando el video carga.
  const iframe = document.querySelector('.video-player iframe');
  const cargador = document.querySelector('.video-player .loader');
  if (iframe && cargador) iframe.addEventListener('load', () => cargador.remove(), { once: true });

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

document.addEventListener('DOMContentLoaded', () => {
  const item = leerEntrada();
  if (item) {
    renderVideo(item);
  } else {
    renderSinDatos();
  }
});
