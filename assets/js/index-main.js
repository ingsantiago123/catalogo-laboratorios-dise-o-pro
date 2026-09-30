// index-main.js — visor/index.html (Pantalla 1: intro de marca + elegir colección)
//
// CERO fetch(). Lee window.name, que index.html (la raíz del sitio) dejó
// cargado con el contenido COMPLETO de Datos/General-labs.json antes de
// navegar hasta acá (ver assets/js/index-main.js de la raíz). No se vuelve
// a tocar la red en ningún momento de acá en adelante: window.name
// persiste tal cual a través de esta navegación y de la siguiente (hacia
// programa.html), así que esa pantalla lee EL MISMO valor sin que nadie
// tenga que volver a dejarlo.
//
// Cada laboratorio del array trae (o no) un campo 'tipo': 'externo' | 'vivo'
// | 'propio'. Los datos históricos (Datos/General-labs.json) no tienen ese
// campo — se tratan como 'externo' por compatibilidad, nunca se descartan.
// Vivos se activa solo si el array trae al menos un ítem con tipo 'vivo';
// Propios sigue sin fuente de datos, así que se muestra como "Próximamente"
// — no hay ningún dato que derivar para ella (distinto de inventar un texto
// pretendiendo que sí lo hay, que es lo que se evita acá).
//
// Presentación: la pantalla abre con el escenario del logo (intro animada,
// assets/js/logo-intro.js) y, al deslizar hacia abajo, el logo se disuelve y
// sube la hoja con las colecciones. La intro es solo presentación: los
// datos, el window.name y la navegación no dependen de ella. Si
// logo-intro.js no cargara, la pantalla muestra solo el selector.

// Capa visual compartida (assets/js/visor-ui.js): íconos, ilustraciones y
// animaciones. Si no cargara, la pantalla funciona igual, solo sin adornos.
const UI = window.VisorUI || null;
const icono = (nombre, clase) => (UI ? UI.icono(nombre, clase) : '');

// Intro del logo (assets/js/logo-intro.js + logo-intro-svg.js). Opcional.
const INTRO = (window.VisorLogoIntro && window.VISOR_LOGO) ? window.VisorLogoIntro : null;

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Clave de sessionStorage: un eco LOCAL de esta pestaña, no una fuente de
// datos nueva. window.name sigue siendo el único origen real — esto es
// solo para no perderlo cuando una pantalla más adelante en la cadena lo
// sobreescribe con su propio payload (ver "Volver" en visor/README.md).
const CLAVE_RESPALDO = 'labExternosDatos';

// Lee el array crudo de laboratorios. Primero intenta window.name (canal
// principal); si no tiene la forma esperada (por ejemplo, al volver desde
// programa.html o catalogo.html, que ya lo sobreescribieron con SU propio
// payload), recurre al respaldo en sessionStorage de esta misma pestaña —
// nunca a una red ni a un archivo nuevo. null si ninguno de los dos sirve.
function leerEntrada() {
  try {
    if (window.name) {
      const data = JSON.parse(window.name);
      if (Array.isArray(data)) {
        try { sessionStorage.setItem(CLAVE_RESPALDO, window.name); } catch (e) { /* sin storage disponible, no pasa nada */ }
        return data;
      }
    }
  } catch (e) { /* window.name corrupto: seguimos al respaldo */ }

  try {
    const respaldo = sessionStorage.getItem(CLAVE_RESPALDO);
    if (respaldo) {
      const data = JSON.parse(respaldo);
      if (Array.isArray(data)) {
        window.name = respaldo; // lo dejamos consistente para la próxima lectura
        return data;
      }
    }
  } catch (e) { /* tampoco había respaldo usable */ }

  return null;
}

// El payload (los 132 laboratorios completos) pesa varios cientos de KB, así
// que en vez de resignarse apenas se pinta la página, reintenta un ratito
// antes de mostrar el estado "sin datos" — detecta el momento en que
// window.name queda configurado, en vez de mirarlo una sola vez.
function esperarDatos(leer, alListo, alFallar) {
  const INTERVALO_MS = 100;
  const MAX_ESPERA_MS = 1200;
  const inicio = Date.now();

  (function intentar() {
    const datos = leer();
    if (datos) {
      alListo(datos);
      return;
    }
    if (Date.now() - inicio >= MAX_ESPERA_MS) {
      alFallar();
      return;
    }
    setTimeout(intentar, INTERVALO_MS);
  })();
}

// ---------------------------------------------------------------------------
// Intro: cada vez que se abre la pantalla arranca en el logo y la animación se
// ve completa — primera visita, recargar (F5), abrir la dirección o embeberla
// en un iframe. La única excepción es VOLVER desde otra pantalla del visor
// (enlace "Volver" de programa/catálogo/video o el botón atrás): ahí el logo
// queda armado de una vez y la pantalla aterriza directo en las colecciones,
// para no obligar a repetir la animación cada vez que se cambia de colección.
// El logo sigue arriba: al subir el scroll se reconstruye. Sin estado
// guardado: sale del tipo de navegación y del referrer, no de sessionStorage.
// Poner SALTAR_INTRO_AL_VOLVER en false para ver la intro SIEMPRE.
// ---------------------------------------------------------------------------
const SALTAR_INTRO_AL_VOLVER = true;

function tipoDeNavegacion() {
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav && nav.type) return nav.type;                       // navigate | reload | back_forward | prerender
  } catch (e) { /* sin Navigation Timing */ }
  return 'navigate';
}

function vieneDeOtraPantallaDelVisor() {
  try {
    if (!document.referrer) return false;
    const origen = new URL(document.referrer);
    return origen.origin === location.origin && /\/(programa|catalogo|video)\.html$/.test(origen.pathname);
  } catch (e) { return false; }
}

function debeSaltarIntro() {
  if (!SALTAR_INTRO_AL_VOLVER) return false;
  const tipo = tipoDeNavegacion();
  if (tipo === 'reload') return false;                          // recargar siempre vuelve al logo con la animación
  return tipo === 'back_forward' || vieneDeOtraPantallaDelVisor();
}

const SALTAR_INTRO = debeSaltarIntro();
let intro = null;

// El scroll lo manejamos nosotros (arranca arriba, en el logo). Va acá, antes de
// DOMContentLoaded, para que el navegador no restaure la posición al recargar.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function renderEscenario() {
  return `
<section class="intro" id="intro" aria-label="Presentación de INCConnection Lab">
  <div class="intro__stage">
    <div class="intro__bg" aria-hidden="true"><span class="intro__scan"></span></div>
    <div class="intro__flash" aria-hidden="true"></div>
    <div class="container intro__top">
      <p class="intro__brand"><span class="intro__brand-dot" aria-hidden="true"></span>Universidad INCCA de Colombia</p>
    </div>
    <div class="intro__main">
      <h1 class="visually-hidden">INCConnection Lab · Laboratorios</h1>
      <div class="intro__tilt"><div class="intro__logo"></div></div>
      <p class="intro__status" aria-hidden="true"><span class="intro__led"></span><span class="intro__status-text">&nbsp;</span></p>
    </div>
    <a class="intro__cue" href="#colecciones">
      <span class="intro__cue-in">
        <span class="intro__cue-text">Desliza hacia abajo</span>
        <span class="intro__cue-mouse" aria-hidden="true"><i></i></span>
        <span class="intro__cue-chevs" aria-hidden="true"><span class="intro__cue-chev"></span><span class="intro__cue-chev"></span></span>
      </span>
      <span class="visually-hidden"> para elegir un tipo de laboratorio</span>
    </a>
  </div>
</section>`;
}

// Encabezado de la hoja de colecciones. Con intro, el <h1> es el del escenario
// y este es un <h2>; sin intro, este pasa a ser el <h1> de la página.
function renderCabecera(conIntro) {
  const nivel = conIntro ? 'h2' : 'h1';
  return `
<header class="selector__head reveal">
  <p class="status-chip"><span class="status-chip__led" aria-hidden="true"></span><span>Selección de colección</span></p>
  <${nivel} class="hero__title selector__title" id="selectorTitulo" tabindex="-1">Elige tu tipo de <span class="hero__highlight">laboratorio</span></${nivel}>
  <p class="hero__lead">Cada colección tiene sus propios programas y su propio catálogo: elige una para ver sus laboratorios.</p>
  <div class="selector__trace" aria-hidden="true"><i></i></div>
</header>`;
}

function arte(tipo) {
  return UI ? UI.arteColeccion(tipo) : '';
}

function renderTarjetaExternos(totalLabs) {
  const unidad = `laboratorio${totalLabs === 1 ? '' : 's'} disponible${totalLabs === 1 ? '' : 's'}`;
  return `
<article class="card card--interactive collection-card reveal">
  <div class="collection-card__top">
    ${arte('externos')}
    <span class="badge badge--success">${icono('check')}Activo</span>
  </div>
  <h2 class="collection-card__title">Laboratorios Externos</h2>
  <p class="collection-card__desc">Recursos académicos y tecnológicos de plataformas aliadas disponibles en Internet (PhET, CircuitVerse, GeoGebra y más), organizados por programa.</p>
  <div class="collection-card__footer">
    <p class="collection-card__count collection-card__count--stack"><strong data-conteo="${escapeHtml(totalLabs)}">${escapeHtml(totalLabs)}</strong><span>${escapeHtml(unidad)}</span></p>
    <a class="btn btn--tertiary card-link" href="programa.html">Ingresar<span class="visually-hidden"> a Laboratorios Externos</span>${icono('arrow-right', 'icon--arrow-right')}</a>
  </div>
</article>`;
}

function renderTarjetaVivos(totalVideos) {
  const unidad = `video${totalVideos === 1 ? '' : 's'} disponible${totalVideos === 1 ? '' : 's'}`;
  return `
<article class="card card--interactive collection-card reveal">
  <div class="collection-card__top">
    ${arte('vivos')}
    <span class="badge badge--success">${icono('check')}Activo</span>
  </div>
  <h2 class="collection-card__title">Laboratorios Vivos</h2>
  <p class="collection-card__desc">Prácticas de laboratorio grabadas en la universidad para consulta y estudio asincrónico, organizadas por programa.</p>
  <div class="collection-card__footer">
    <p class="collection-card__count collection-card__count--stack"><strong data-conteo="${escapeHtml(totalVideos)}">${escapeHtml(totalVideos)}</strong><span>${escapeHtml(unidad)}</span></p>
    <a class="btn btn--tertiary card-link" href="programa.html?coleccion=vivo">Ingresar<span class="visually-hidden"> a Laboratorios Vivos</span>${icono('arrow-right', 'icon--arrow-right')}</a>
  </div>
</article>`;
}

function renderTarjetaInactiva(tipoArte, titulo, descripcion) {
  return `
<article class="card collection-card collection-card--inactive reveal">
  <div class="collection-card__top">
    ${arte(tipoArte)}
    <span class="badge badge--warning">${icono('clock')}Próximamente</span>
  </div>
  <h2 class="collection-card__title">${escapeHtml(titulo)}</h2>
  <p class="collection-card__desc">${escapeHtml(descripcion)}</p>
  <div class="collection-card__footer">
    <p class="collection-card__count">${icono('clock')}Sin datos todavía</p>
    <span class="collection-card__disabled">No disponible</span>
  </div>
</article>`;
}

// Cuenta hacia arriba las cifras de las tarjetas la primera vez que se ven.
// Sin IntersectionObserver o con movimiento reducido queda el valor final tal cual.
function animarConteos(root) {
  const cifras = root.querySelectorAll('[data-conteo]:not([data-contado])');
  if (!cifras.length) return;
  cifras.forEach(el => el.setAttribute('data-contado', '0'));
  if ((UI && UI.reduceMotion) || !('IntersectionObserver' in window)) return;

  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => {
      if (!entrada.isIntersecting) return;
      const el = entrada.target;
      observador.unobserve(el);
      const total = Number(el.getAttribute('data-conteo')) || 0;
      const inicio = performance.now();
      (function paso(ahora) {
        const k = Math.min(1, (ahora - inicio) / 900);
        el.textContent = Math.round(total * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(paso);
      })(inicio);
    });
  }, { threshold: .6 });
  cifras.forEach(el => { el.textContent = '0'; observador.observe(el); });
}

// Arma la estructura una sola vez (escenario del logo + hoja de colecciones)
// y monta la intro. Después, cada cambio de estado (cargando → con datos / sin
// datos) solo reemplaza el contenido de la hoja.
function renderEstructura() {
  const conIntro = !!INTRO;
  document.getElementById('app').innerHTML = `
${conIntro ? renderEscenario() : ''}
<section class="selector${conIntro ? '' : ' selector--solo'}" id="colecciones" aria-labelledby="selectorTitulo">
  <div class="container">
    ${renderCabecera(conIntro)}
    <div id="contenidoPantalla"></div>
    <footer class="selector__pie">
      <p id="pieTexto">Universidad INCCA de Colombia</p>
      ${conIntro ? `<a class="btn btn--tertiary" href="#intro" id="volverArriba">${icono('arrow-up')}<span>Volver al inicio</span></a>` : ''}
    </footer>
  </div>
</section>`;

  if (!conIntro) return;

  const seccion = document.getElementById('colecciones');
  intro = INTRO.montar({
    raiz: document.getElementById('intro'),
    destino: seccion,                                        // hacia dónde desliza la indicación
    foco: document.getElementById('selectorTitulo'),         // y qué recibe el foco al usarla con teclado
    saltar: SALTAR_INTRO                                     // true solo al volver desde otra pantalla del visor
  });

  const arriba = document.getElementById('volverArriba');
  if (arriba) {
    arriba.addEventListener('click', ev => {
      ev.preventDefault();
      window.scrollTo({ top: 0, behavior: (UI && UI.reduceMotion) ? 'auto' : 'smooth' });
    });
  }

  // Al volver desde otra pantalla: aterriza directo en las colecciones (sin animar el
  // desplazamiento). En cualquier otro caso arranca arriba, en el logo.
  const previo = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, SALTAR_INTRO && !(UI && UI.reduceMotion) ? seccion.getBoundingClientRect().top + (window.pageYOffset || 0) : 0);
  document.documentElement.style.scrollBehavior = previo;
}

function renderPantalla(contenidoHtml, pieHtml) {
  if (!document.getElementById('contenidoPantalla')) renderEstructura();
  document.getElementById('contenidoPantalla').innerHTML = contenidoHtml;
  document.getElementById('pieTexto').innerHTML = pieHtml;
  const app = document.getElementById('app');
  if (UI) UI.revelar(app);
  animarConteos(app);
}

function renderCargando() {
  renderPantalla(
    UI ? UI.cargando('Cargando…') : '<p class="loader loader__text">Cargando…</p>',
    'Universidad INCCA de Colombia'
  );
}

function renderSinDatos() {
  // Se entró directo a esta pantalla, sin pasar por ningún anfitrión que
  // deje los datos en window.name. Nunca en blanco — pero tampoco se
  // asume un "inicio" al que volver: un link roto es peor que no mostrar
  // ninguno.
  renderPantalla(
    UI
      ? UI.estadoVacio({ icono: 'alert', titulo: 'No hay datos cargados todavía.', texto: 'Esta pantalla muestra las colecciones cuando recibe los datos de los laboratorios.' })
      : '<p class="empty-state">No hay datos cargados todavía.</p>',
    'Universidad INCCA de Colombia'
  );
}

function renderConDatos(laboratorios) {
  const totalExternos = laboratorios.filter(lab => lab && (lab.tipo === 'externo' || lab.tipo === undefined)).length;
  const totalVivos = laboratorios.filter(lab => lab && lab.tipo === 'vivo').length;

  renderPantalla(`
<div class="collection-grid">
  ${renderTarjetaExternos(totalExternos)}
  ${totalVivos > 0
    ? renderTarjetaVivos(totalVivos)
    : renderTarjetaInactiva('vivos', 'Laboratorios Vivos', 'Prácticas de laboratorio grabadas en la universidad para consulta y estudio asincrónico.')}
  ${renderTarjetaInactiva('propios', 'Laboratorios Propios', 'Aplicativos y espacios desarrollados directamente por la Universidad INCCA para sus estudiantes.')}
</div>`, 'Selecciona una colección para ver sus programas y laboratorios &bull; Universidad INCCA de Colombia');
}

document.addEventListener('DOMContentLoaded', () => {
  renderCargando();
  esperarDatos(leerEntrada, renderConDatos, renderSinDatos);
});
