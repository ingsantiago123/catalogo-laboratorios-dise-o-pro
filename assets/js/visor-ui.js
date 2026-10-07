// visor-ui.js — Capa de presentación compartida por las 4 pantallas del visor
// (index.html, programa.html, catalogo.html y video.html).
//
// SOLO presentación: este archivo no lee window.name, no toca
// sessionStorage y no navega. La lógica de datos de cada pantalla sigue
// viviendo en su propio script (index-main.js, programa-main.js, main.js,
// video-main.js) y no depende de nada de acá para funcionar.
//
// Lo que ofrece:
//   - Un set de íconos SVG propio (reemplaza a Material Symbols y Font
//     Awesome: cero CDN, cero fuentes de íconos — ver diseño/DESIGN.md §9).
//     Trazos basados en Lucide (lucide.dev, licencia ISC).
//   - La barra institucional superior (se inserta sola al cargar).
//   - Piezas visuales de temática de laboratorio: ilustración del hero,
//     cargador (matraz que se llena), estados vacíos y arte de colecciones.
//   - La aparición escalonada de tarjetas al hacer scroll.
//
// Si este archivo no llegara a cargar, cada pantalla usa un respaldo (sin
// íconos ni animaciones): nunca una pantalla en blanco ni un error de JS.
(function () {
  'use strict';

  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // -------------------------------------------------------------------------
  // Íconos (viewBox 24x24, trazo; el grosor y el color salen de .icon en CSS)
  // -------------------------------------------------------------------------
  const ICONOS = {
    // Interfaz
    'arrow-left': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'arrow-up': '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'external': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    'eye': '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    'play': '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
    'play-circle': '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z"/>',
    'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    'alert': '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    'book': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'clock': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    'shield': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    'sliders': '<path d="M21 4h-7"/><path d="M10 4H3"/><path d="M21 12h-9"/><path d="M8 12H3"/><path d="M21 20h-5"/><path d="M12 20H3"/><path d="M14 2v4"/><path d="M8 10v4"/><path d="M16 18v4"/>',
    'grid': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    'layers': '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m2 12 9.17 4.17a2 2 0 0 0 1.66 0L22 12"/><path d="m2 17 9.17 4.17a2 2 0 0 0 1.66 0L22 17"/>',
    'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'hash': '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="m16 3-2 18"/>',
    'monitor': '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
    'tag': '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    'film': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
    'video': '<path d="m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.87a.5.5 0 0 0-.75-.43L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    'globe': '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    'network': '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
    // Laboratorio / categorías
    'flask': '<path d="M10 2v7.53a2 2 0 0 1-.21.9L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.07-10.12a2 2 0 0 1-.21-.9V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
    'microscope': '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
    'atom': '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5z"/>',
    'molecule': '<circle cx="12" cy="5" r="2.5"/><circle cx="5.5" cy="17" r="2.5"/><circle cx="18.5" cy="17" r="2.5"/><path d="M10.8 7.2 6.7 14.8"/><path d="m13.2 7.2 4.1 7.6"/><path d="M8 17h8"/>',
    'dna': '<path d="M8 3c0 4.5 8 4.5 8 9s-8 4.5-8 9"/><path d="M16 3c0 4.5-8 4.5-8 9s8 4.5 8 9"/><path d="M9.5 5.7h5"/><path d="M9.5 9.3h5"/><path d="M9.5 14.7h5"/><path d="M9.5 18.3h5"/>',
    'orbit': '<path d="M20.34 6.48A10 10 0 0 1 10.27 21.85"/><path d="M3.66 17.52A10 10 0 0 1 13.74 2.15"/><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/>',
    'calculator': '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M16 14v4"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
    'chart': '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
    'gauge': '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    'zap': '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    'factory': '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>',
    'thermometer': '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/>',
    'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    'code': '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    'wave': '<path d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2"/>',
    'battery': '<path d="M15 7h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><path d="M6 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1"/><path d="m11 7-3 5h4l-3 5"/><path d="M22 11v2"/>',
    'music': '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    // Programas
    'briefcase': '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect x="2" y="6" width="20" height="14" rx="2"/>',
    'receipt': '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    'activity': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    'scale': '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    'sprout': '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    'leaf': '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    'recycle': '<path d="M7 19H4.82a1.83 1.83 0 0 1-1.57-.88 1.79 1.79 0 0 1 0-1.78L7.2 9.5"/><path d="M11 19h8.2a1.83 1.83 0 0 0 1.56-.89 1.78 1.78 0 0 0 0-1.78l-1.23-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.29 13.6 7.2 9.5 3.1 10.6"/><path d="m9.34 5.81 1.1-1.89A1.83 1.83 0 0 1 11.98 3a1.78 1.78 0 0 1 1.55.89l3.94 6.84"/><path d="m13.38 9.63 4.1 1.1 1.1-4.1"/>',
    'utensils': '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
    'cpu': '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
    'cog': '<path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="m17 20.66-1-1.73"/><path d="M11 10.27 7 3.34"/><path d="m20.66 17-1.73-1"/><path d="m3.34 7 1.73 1"/><path d="M14 12h8"/><path d="M2 12h2"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m17 3.34-1 1.73"/><path d="m11 13.73-4 6.93"/>'
  };

  function icono(nombre, clase) {
    const id = ICONOS[nombre] ? nombre : 'flask';
    return `<svg class="icon${clase ? ' ' + clase : ''}" aria-hidden="true" focusable="false"><use href="#i-${id}"></use></svg>`;
  }

  function insertarSprite() {
    if (document.getElementById('visorIconos')) return;
    const simbolos = Object.keys(ICONOS)
      .map(id => `<symbol id="i-${id}" viewBox="0 0 24 24">${ICONOS[id]}</symbol>`)
      .join('');
    document.body.insertAdjacentHTML('afterbegin',
      `<svg class="icon-sprite" id="visorIconos" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${simbolos}</svg>`);
  }

  // -------------------------------------------------------------------------
  // Barra institucional (DESIGN.md §5 Navegación: fondo primary-900, texto
  // blanco, acento gold-500). Sin logo: el manual de marca todavía no define
  // los archivos oficiales (§11), así que va solo el nombre en texto.
  // -------------------------------------------------------------------------
  function insertarBarraInstitucional() {
    if (document.querySelector('.site-header')) return;
    document.body.insertAdjacentHTML('afterbegin', `
<header class="site-header">

</header>`);
  }

  // -------------------------------------------------------------------------
  // Ilustración del hero: mesa de laboratorio con matraz burbujeante,
  // gradilla de tubos, vaso con varilla, átomo y molécula. Decorativa
  // (aria-hidden), colores 100% tokens vía clases CSS.
  // -------------------------------------------------------------------------
  let contadorIds = 0;
  const MATRAZ = 'M154 70V128L106 229Q100 248 120 248H236Q256 248 250 229L202 128V70Z';
  const OLA = 'q15 -9 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0V260H40Z';

  function ilustracionLaboratorio() {
    const clip = `visorMatraz${++contadorIds}`;
    return `
<svg class="lab-art" viewBox="0 0 360 280" aria-hidden="true" focusable="false">
  <defs><clipPath id="${clip}"><path d="${MATRAZ}"/></clipPath></defs>
  <circle class="lab-art__disc" cx="182" cy="150" r="116"/>
  <circle class="lab-art__ring" cx="182" cy="150" r="130"/>
  <path class="lab-art__spark" d="M236 18v12M230 24h12"/>
  <path class="lab-art__spark lab-art__spark--2" d="M26 128v10M21 133h10"/>
  <path class="lab-art__spark lab-art__spark--3" d="M344 172v10M339 177h10"/>
  <g class="lab-art__molecule">
    <path class="lab-art__bond" d="M58 78 86 62 114 78V106M86 62V38"/>
    <circle class="lab-art__node" cx="58" cy="78" r="8"/>
    <circle class="lab-art__node lab-art__node--gold" cx="86" cy="62" r="9"/>
    <circle class="lab-art__node" cx="114" cy="78" r="8"/>
    <circle class="lab-art__node" cx="114" cy="106" r="7"/>
    <circle class="lab-art__node" cx="86" cy="38" r="5.5"/>
  </g>
  <g class="lab-art__atom">
    <circle cx="292" cy="76" r="51" fill="none"/>
    <ellipse class="lab-art__orbit" cx="292" cy="76" rx="46" ry="16"/>
    <ellipse class="lab-art__orbit" cx="292" cy="76" rx="46" ry="16" transform="rotate(60 292 76)"/>
    <ellipse class="lab-art__orbit" cx="292" cy="76" rx="46" ry="16" transform="rotate(120 292 76)"/>
    <circle class="lab-art__electron" cx="338" cy="76" r="4"/>
    <circle class="lab-art__electron" cx="269" cy="36.2" r="4"/>
    <circle class="lab-art__electron" cx="269" cy="115.8" r="4"/>
  </g>
  <circle class="lab-art__nucleus" cx="292" cy="76" r="7"/>
  <path class="lab-art__bench" d="M14 250H346"/>
  <g class="lab-art__rack">
    <path class="lab-art__glass" d="M36 150V234a7 7 0 0 0 14 0V150ZM56 150V234a7 7 0 0 0 14 0V150ZM76 150V234a7 7 0 0 0 14 0V150Z"/>
    <path class="lab-art__liquid lab-art__liquid--dark" d="M36 204V234a7 7 0 0 0 14 0V204Z"/>
    <path class="lab-art__liquid lab-art__liquid--gold" d="M56 182V234a7 7 0 0 0 14 0V182Z"/>
    <path class="lab-art__liquid" d="M76 214V234a7 7 0 0 0 14 0V214Z"/>
    <circle class="lab-art__bubble lab-art__bubble--tube" cx="63" cy="228" r="2.5"/>
    <path class="lab-art__line" d="M36 150V234a7 7 0 0 0 14 0V150M56 150V234a7 7 0 0 0 14 0V150M76 150V234a7 7 0 0 0 14 0V150"/>
    <path class="lab-art__line lab-art__line--thin" d="M34 150h18M54 150h18M74 150h18"/>
    <path class="lab-art__line" d="M24 196H102M24 244H102M28 188V250M98 188V250"/>
  </g>
  <g class="lab-art__beaker">
    <path class="lab-art__glass" d="M262 168V240a8 8 0 0 0 8 8H318a8 8 0 0 0 8-8V168Z"/>
    <path class="lab-art__liquid lab-art__liquid--light" d="M262 206H326V240a8 8 0 0 1-8 8H270a8 8 0 0 1-8-8Z"/>
    <path class="lab-art__rod" d="M314 142 284 238"/>
    <path class="lab-art__mark" d="M268 188h10M268 206h14M268 224h10"/>
    <path class="lab-art__line" d="M256 164 262 168V240a8 8 0 0 0 8 8H318a8 8 0 0 0 8-8V168L332 164"/>
  </g>
  <g class="lab-art__flask">
    <path class="lab-art__glass" d="${MATRAZ}"/>
    <g clip-path="url(#${clip})">
      <path class="lab-art__wave lab-art__wave--back" d="M40 178${OLA}"/>
      <path class="lab-art__wave" d="M40 186${OLA.replace('q15 -9', 'q15 9')}"/>
      <circle class="lab-art__bubble" cx="150" cy="238" r="5"/>
      <circle class="lab-art__bubble" cx="176" cy="242" r="3.5"/>
      <circle class="lab-art__bubble" cx="198" cy="236" r="4.5"/>
      <circle class="lab-art__bubble" cx="166" cy="228" r="2.5"/>
      <circle class="lab-art__bubble" cx="214" cy="240" r="3"/>
    </g>
    <path class="lab-art__shine" d="M166 84V118M197 145 211 175"/>
    <path class="lab-art__mark" d="M145 160h12M131 190h14M116 220h14"/>
    <path class="lab-art__line lab-art__line--bold" d="M154 70V128L106 229Q100 248 120 248H236Q256 248 250 229L202 128V70"/>
    <path class="lab-art__line" d="M146 70H210"/>
    <circle class="lab-art__vapor" cx="172" cy="56" r="4"/>
    <circle class="lab-art__vapor lab-art__vapor--2" cx="186" cy="50" r="3"/>
    <circle class="lab-art__vapor lab-art__vapor--3" cx="178" cy="44" r="2.5"/>
  </g>
</svg>`;
  }

  // Arte animado de cada colección (pantalla 1). Decorativo.
  function arteColeccion(tipo) {
    if (tipo === 'externos') {
      return `
<svg class="collection-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <circle class="collection-art__base" cx="32" cy="32" r="30"/>
  <circle class="collection-art__track" cx="32" cy="32" r="23"/>
  <g class="collection-art__stroke">
    <circle cx="32" cy="32" r="13"/>
    <path d="M32 19a19 19 0 0 0 0 26a19 19 0 0 0 0-26"/>
    <path d="M19 32h26"/>
  </g>
  <g class="collection-art__orbit">
    <circle cx="32" cy="32" r="27" fill="none"/>
    <circle class="collection-art__satellite" cx="55" cy="32" r="3.5"/>
  </g>
</svg>`;
    }
    if (tipo === 'vivos') {
      return `
<svg class="collection-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <circle class="collection-art__base" cx="32" cy="32" r="30"/>
  <path class="collection-art__stroke" d="M32 47H50"/>
  <g class="collection-art__reel">
    <circle class="collection-art__reel-body" cx="32" cy="32" r="15"/>
    <circle class="collection-art__hole" cx="32" cy="24" r="3"/>
    <circle class="collection-art__hole" cx="40" cy="32" r="3"/>
    <circle class="collection-art__hole" cx="32" cy="40" r="3"/>
    <circle class="collection-art__hole" cx="24" cy="32" r="3"/>
    <circle class="collection-art__hub" cx="32" cy="32" r="2"/>
  </g>
</svg>`;
    }
    return `
<svg class="collection-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <circle class="collection-art__base" cx="32" cy="32" r="30"/>
  <path class="collection-art__liquid" d="M22.4 37H41.6L45 43Q46.5 47.5 42 47.5H22Q17.5 47.5 19 43Z"/>
  <circle class="collection-art__bubble" cx="28" cy="44" r="1.8"/>
  <circle class="collection-art__bubble" cx="34" cy="45" r="1.4"/>
  <circle class="collection-art__bubble" cx="31" cy="41" r="1.2"/>
  <path class="collection-art__stroke" d="M28 16V27L19 43Q17.5 47.5 22 47.5H42Q46.5 47.5 45 43L36 27V16M25.5 16H38.5"/>
</svg>`;
  }

  // Cargador: un matraz que se llena y burbujea. role="status" para que los
  // lectores de pantalla anuncien el texto.
  function cargando(texto, claseExtra) {
    const clip = `visorCargador${++contadorIds}`;
    const forma = 'M26 8V24L12 50Q9 57 17 57H47Q55 57 52 50L38 24V8Z';
    return `
<div class="loader${claseExtra ? ' ' + claseExtra : ''}" role="status">
  <svg class="loader__art" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <defs><clipPath id="${clip}"><path d="${forma}"/></clipPath></defs>
    <path class="loader__glass" d="${forma}"/>
    <g clip-path="url(#${clip})">
      <rect class="loader__liquid" x="4" y="18" width="56" height="42"/>
      <circle class="loader__bubble" cx="27" cy="52" r="2.2"/>
      <circle class="loader__bubble" cx="34" cy="54" r="1.6"/>
      <circle class="loader__bubble" cx="39" cy="51" r="1.9"/>
    </g>
    <path class="loader__line" d="M26 8V24L12 50Q9 57 17 57H47Q55 57 52 50L38 24V8M23 8H41"/>
  </svg>
  <p class="loader__text">${texto}</p>
</div>`;
  }

  // Estado vacío / sin datos. titulo y texto son HTML armado por la
  // pantalla (que ya escapa lo que venga de datos).
  function estadoVacio(opciones) {
    const o = opciones || {};
    const etiqueta = o.nivel === 1 ? 'h1' : 'p';
    return `
<div class="empty-state" role="status">
  <span class="empty-state__icon" aria-hidden="true">${icono(o.icono || 'flask')}</span>
  <${etiqueta} class="empty-state__title">${o.titulo || ''}</${etiqueta}>
  ${o.texto ? `<p class="empty-state__text">${o.texto}</p>` : ''}
  ${o.accion || ''}
</div>`;
  }

  // -------------------------------------------------------------------------
  // Aparición escalonada al hacer scroll. Solo oculta un elemento mientras lo
  // está observando: si algo falla, el contenido queda visible.
  // -------------------------------------------------------------------------
  function revelar(root) {
    pausarFueraDeVista(root);
    if (reduceMotion || !root || !('IntersectionObserver' in window)) return;
    const pendientes = root.querySelectorAll('.reveal:not(.reveal--visible):not(.reveal--pending)');
    if (!pendientes.length) return;
    const observador = new IntersectionObserver(entradas => {
      let orden = 0;
      entradas.forEach(entrada => {
        if (!entrada.isIntersecting) return;
        const el = entrada.target;
        el.style.setProperty('--reveal-delay', `${Math.min(orden++, 8) * 45}ms`);
        el.classList.remove('reveal--pending');
        el.classList.add('reveal--visible');
        observador.unobserve(el);
      });
    }, { rootMargin: '0px 0px -32px 0px', threshold: 0.01 });
    pendientes.forEach(el => {
      el.classList.add('reveal--pending');
      observador.observe(el);
    });
  }

  // -------------------------------------------------------------------------
  // Animaciones ambientales en pausa cuando no se ven. Las ilustraciones y
  // el arte de las tarjetas animan partes de un SVG, y Chrome recalcula
  // estilos, layout y pintado en cada cuadro mientras corran, aunque esten
  // fuera de pantalla (medido: 0,4 s de CPU cada 8 s solo por el arte de la
  // hoja de colecciones, todavia sin mostrar). Al volver a verse siguen desde
  // donde quedaron.
  // -------------------------------------------------------------------------
  const AMBIENTALES = '.lab-art, .collection-art, .selector__trace, .status-chip, .lab-card__specimen, .empty-state__icon';
  const observadas = new WeakSet();
  let vigiaAmbiental = null;

  function pausarFueraDeVista(root) {
    if (!root || !('IntersectionObserver' in window)) return;
    if (!vigiaAmbiental) {
      vigiaAmbiental = new IntersectionObserver(entradas => {
        entradas.forEach(e => e.target.classList.toggle('anim-pausa', !e.isIntersecting));
      }, { rootMargin: '64px 0px' });
    }
    const lista = root.querySelectorAll ? root.querySelectorAll(AMBIENTALES) : [];
    lista.forEach(el => {
      if (observadas.has(el)) return;
      observadas.add(el);
      vigiaAmbiental.observe(el);
    });
  }

  // Ilustraciones pedidas desde HTML estático (programa.html).
  function pintarArteEstatico() {
    document.querySelectorAll('[data-visor-arte="laboratorio"]').forEach(el => {
      if (!el.firstElementChild) el.innerHTML = ilustracionLaboratorio();
      pausarFueraDeVista(el);
    });
  }

  // -------------------------------------------------------------------------
  // Tema claro / oscuro (estilos: assets/css/styles.css §2b). Sin preferencia
  // guardada manda el sistema (prefers-color-scheme); el botón solo guarda una
  // preferencia si el tema elegido difiere del del sistema — si coincide,
  // vuelve al modo automático. La preferencia vive en localStorage (clave
  // visorTema) y la aplica assets/js/tema-init.js antes de pintar. Si el
  // storage no está disponible (iframe de otro sitio, modo privado) el botón
  // funciona igual, solo que no recuerda la elección.
  // -------------------------------------------------------------------------
  const CLAVE_TEMA = 'visorTema';
  const consultaOscuro = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const COLOR_BARRA = { claro: '#0A2A4F', oscuro: '#060F1E' };

  function temaSistema() {
    return consultaOscuro && consultaOscuro.matches ? 'oscuro' : 'claro';
  }

  function temaActual() {
    const forzado = document.documentElement.getAttribute('data-tema');
    return forzado === 'claro' || forzado === 'oscuro' ? forzado : temaSistema();
  }

  function guardarTema(tema) {
    try {
      if (tema) localStorage.setItem(CLAVE_TEMA, tema);
      else localStorage.removeItem(CLAVE_TEMA);
    } catch (e) { /* sin storage disponible: la elección vale solo para esta carga */ }
  }

  // Refleja el tema efectivo en los botones, en el color de la barra del
  // navegador móvil y avisa a quien quiera enterarse (evento visor:tema).
  function sincronizarTema() {
    const tema = temaActual();
    const aOscuro = tema === 'claro';
    document.querySelectorAll('[data-visor-tema]').forEach(boton => {
      boton.setAttribute('data-modo', tema);
      const etiqueta = aOscuro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
      boton.setAttribute('aria-label', etiqueta);
      boton.setAttribute('title', etiqueta);
    });
    const forzado = document.documentElement.hasAttribute('data-tema');
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
      if (!meta.hasAttribute('data-original')) meta.setAttribute('data-original', meta.getAttribute('content'));
      meta.setAttribute('content', forzado ? COLOR_BARRA[tema] : meta.getAttribute('data-original'));
    });
    document.dispatchEvent(new CustomEvent('visor:tema', { detail: { tema } }));
  }

  function alternarTema() {
    const nuevo = temaActual() === 'oscuro' ? 'claro' : 'oscuro';
    if (nuevo === temaSistema()) {
      document.documentElement.removeAttribute('data-tema');
      guardarTema(null);
    } else {
      document.documentElement.setAttribute('data-tema', nuevo);
      guardarTema(nuevo);
    }
    sincronizarTema();
  }

  // Botón fijo arriba a la derecha, alineado con el contenedor. Es el primer
  // elemento del <body>: llega pronto con el teclado sin estorbar al lector.
  function insertarBotonTema() {
    if (document.querySelector('.tema-dock')) return;
    document.body.insertAdjacentHTML('afterbegin', `
<div class="tema-dock">
  <div class="container tema-dock__inner">
    <button type="button" class="tema-toggle" data-visor-tema>
      <span class="tema-toggle__disc" aria-hidden="true">${icono('moon', 'tema-toggle__luna')}${icono('sun', 'tema-toggle__sol')}</span>
    </button>
  </div>
</div>`);
    document.addEventListener('click', ev => {
      if (ev.target.closest && ev.target.closest('[data-visor-tema]')) alternarTema();
    });
    // El sistema cambió de tema (p. ej. modo nocturno automático del SO)
    if (consultaOscuro) consultaOscuro.addEventListener('change', sincronizarTema);
    // Se esconde al bajar (para no tapar el contenido) y vuelve al subir o al
    // llegar arriba. Con el foco del teclado dentro siempre se ve.
    const dock = document.querySelector('.tema-dock');
    let yAnterior = window.pageYOffset || 0, esperando = false;
    window.addEventListener('scroll', () => {
      if (esperando) return;
      esperando = true;
      requestAnimationFrame(() => {
        esperando = false;
        const y = window.pageYOffset || 0;
        // en el primer segundo no se esconde: es el scroll que una pantalla hace al cargar (p. ej. aterrizar en colecciones)
        if (y < 80 || y < yAnterior - 4 || performance.now() < 1000) dock.classList.remove('is-oculto');
        else if (y > yAnterior + 4) dock.classList.add('is-oculto');
        yAnterior = y;
      });
    }, { passive: true });

    // Otra pestaña (u otra pantalla del visor) cambió la preferencia
    window.addEventListener('storage', ev => {
      if (ev.key !== CLAVE_TEMA) return;
      if (ev.newValue === 'claro' || ev.newValue === 'oscuro') document.documentElement.setAttribute('data-tema', ev.newValue);
      else document.documentElement.removeAttribute('data-tema');
      sincronizarTema();
    });
    sincronizarTema();
  }

  insertarSprite();
  insertarBarraInstitucional();
  pintarArteEstatico();
  insertarBotonTema();

  window.VisorUI = {
    icono,
    ilustracionLaboratorio,
    arteColeccion,
    cargando,
    estadoVacio,
    revelar,
    pausarFueraDeVista,
    reduceMotion,
    tema: { actual: temaActual, alternar: alternarTema }
  };
})();
