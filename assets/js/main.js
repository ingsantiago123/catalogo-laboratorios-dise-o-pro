// main.js — Visor genérico por window.name (patrón de visor-instrucciones.md)
//
// Este archivo NO SABE quién lo embebe ni dónde vive ese anfitrión en disco.
// El visor es una función pura de su entrada: NUNCA hace fetch(), nunca
// conoce Datos/*.json, ni ninguna ruta ni nombre de ningún módulo del
// proyecto. Todo — título, texto, ítems, y hasta el link de "volver" —
// llega en el JSON que el anfitrión deja en window.name antes de navegar
// hasta acá. Sin ese dato, el visor cae en placeholders genéricos: nunca
// asume con quién está hablando. Ver README.md para el contrato.
(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Contrato de datos: 'laboratorio' (Externos/Propios) y 'vivo' (Vivos).
  // Agregar un tipo nuevo = sumarlo acá + a DEFAULTS_POR_TIPO + a RENDERERS.
  // ---------------------------------------------------------------------
  const TIPOS_VALIDOS = ['laboratorio', 'vivo'];

  const SIN_DATOS = {
    titulo: 'Visor',
    subtitulo: '',
    descripcion: '',
    volver_url: '', // sin anfitrión conocido: no se asume ninguna ruta ajena
    pie: 'Universidad INCCA de Colombia',
    items: []
  };

  const DEFAULTS_POR_TIPO = {
    laboratorio: {
      nombre: 'Laboratorio sin nombre',
      categoria: 'General',
      origen: 'Fuente no especificada',
      aplicaA: '',
      descripcion: 'Descripción no disponible.',
      materias: '',
      modalidad: '—',
      costo: '—',
      link: '',
      imagen: ''
    },
    vivo: {
      item: null,
      nombre: 'Laboratorio en vivo sin nombre',
      programa: '',
      materia: '',
      transversalidad: '',
      descripcion: 'Descripción no disponible.',
      videoUrl: '',
      docenteFuente: 'Fuente no especificada'
    }
  };

  // Ícono SVG (set de assets/js/visor-ui.js) por categoría — fallback
  // genérico si no hay match
  const ICONOS_CATEGORIA = {
    'Conceptos de Matemáticas': 'calculator',
    'Aplicaciones de Matemáticas': 'chart',
    'Movimiento': 'gauge',
    'Electricidad, Imanes y Circuitos': 'zap',
    'Química General': 'flask',
    'Ingeniería Química': 'factory',
    'Química Cuántica': 'molecule',
    'Calor y Termoeléctrica': 'thermometer',
    'Luz y Radiación': 'sun',
    'Programación y Algoritmos': 'code',
    'Sonido y Ondas': 'wave',
    'Trabajo, Energía y Potencia': 'battery',
    'Biología': 'microscope',
    'Fenómenos Cuánticos': 'atom',
    'Tierra y Espacio': 'orbit',
    'Música': 'music'
  };
  const ICONO_DEFAULT = 'flask';

  // Capa visual compartida (assets/js/visor-ui.js): íconos, ilustración y
  // animaciones. Si no cargara, el visor funciona igual, solo sin adornos.
  const UI = window.VisorUI || null;
  function icono(nombre, clase) {
    return UI ? UI.icono(nombre, clase) : '';
  }

  // ---------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function slugify(str) {
    return String(str || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Texto sin tildes y en minúsculas, para que el buscador encuentre
  // "quimica" en "Química".
  function normalizar(str) {
    return String(str || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }

  // ---------------------------------------------------------------------
  // §4.4 — Lectura de window.name (nunca rompe, aunque esté vacío o corrupto)
  // ---------------------------------------------------------------------
  function leerEntrada() {
    try {
      if (!window.name) return null;
      const data = JSON.parse(window.name);
      if (!data || typeof data !== 'object') return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  // ---------------------------------------------------------------------
  // §6 — Pipeline de merge campo a campo contra defaults (tolerancia total)
  // ---------------------------------------------------------------------
  function mergeItem(raw, idx) {
    const r = (raw && typeof raw === 'object') ? raw : {};
    const tipo = TIPOS_VALIDOS.includes(r.tipo) ? r.tipo : null;
    if (!tipo) return null; // tipo desconocido -> descarte silencioso

    const def = DEFAULTS_POR_TIPO[tipo];
    const base = {
      id: (r.id && String(r.id)) || `item-${idx + 1}`,
      tipo,
      visible: r.visible !== false, // default true
      orden: Number.isFinite(r.orden) ? r.orden : idx
    };

    const cuerpo = {};
    Object.keys(def).forEach(campo => {
      const valor = r[campo];
      cuerpo[campo] = (valor || valor === 0) ? valor : def[campo];
    });

    if (tipo === 'vivo') {
      cuerpo.item = Number.isFinite(r.item) ? r.item : idx + 1;
      // 'vivo' no tiene 'categoria' propia (usa 'materia'): se alía acá para
      // que la barra de filtros y el conteo por categoría (genéricos, sin
      // conocer tipos) sigan funcionando igual para cualquier tipo de ítem.
      cuerpo.categoria = cuerpo.materia || 'General';
    }

    return Object.assign(base, cuerpo);
  }

  function obtenerDatos() {
    const recibido = leerEntrada() || {};
    return {
      titulo: recibido.titulo || SIN_DATOS.titulo,
      subtitulo: recibido.subtitulo || SIN_DATOS.subtitulo,
      descripcion: recibido.descripcion || SIN_DATOS.descripcion,
      volver_url: recibido.volver_url || SIN_DATOS.volver_url,
      pie: recibido.pie || SIN_DATOS.pie,
      items: (Array.isArray(recibido.items) ? recibido.items : SIN_DATOS.items)
        .map(mergeItem)
        .filter(Boolean)
        .filter(it => it.visible)
        .sort((a, b) => a.orden - b.orden)
    };
  }

  // ---------------------------------------------------------------------
  // Esquema visual: imagen real (solo laboratorios de PhET) o esquema de
  // categoría (portaobjetos con el ícono). Si la imagen falla al cargar,
  // cae al esquema.
  // ---------------------------------------------------------------------
  function construirPlaceholder(iconoCategoria, categoria) {
    return `<div class="lab-card__placeholder">
        <span class="lab-card__specimen">${icono(iconoCategoria)}</span>
        <span class="lab-card__placeholder-label">${escapeHtml(categoria)}</span>
      </div>`;
  }

  function construirEsquema(imagen, iconoCategoria, categoria, textoAlt) {
    if (!imagen) return construirPlaceholder(iconoCategoria, categoria);
    return `<img src="${escapeHtml(imagen)}" alt="${escapeHtml(textoAlt || '')}" loading="lazy" decoding="async" data-fallback-icon="${escapeHtml(iconoCategoria)}" data-fallback-cat="${escapeHtml(categoria)}">`;
  }

  function activarFallbackImagenes(root) {
    root.querySelectorAll('img[data-fallback-icon]').forEach(img => {
      img.addEventListener('error', function () {
        const tmp = document.createElement('div');
        tmp.innerHTML = construirPlaceholder(img.dataset.fallbackIcon, img.dataset.fallbackCat);
        img.replaceWith(tmp.firstElementChild);
      }, { once: true });
    });
  }

  // ---------------------------------------------------------------------
  // §7 — Despacho por plantillas: 'laboratorio' y 'vivo'
  // ---------------------------------------------------------------------
  function renderLaboratorioCard(item) {
    const catKey = slugify(item.categoria);
    const iconoCategoria = ICONOS_CATEGORIA[item.categoria] || ICONO_DEFAULT;
    return `
<article class="lab-card reveal" data-item="${escapeHtml(item.id)}" data-category="${catKey}" tabindex="0" role="button" aria-haspopup="dialog" aria-label="${escapeHtml(item.nombre)}. Ver ficha del laboratorio">
  <div class="lab-card__thumb">
    ${construirEsquema(item.imagen, iconoCategoria, item.categoria, '')}
    <span class="lab-card__origin">${escapeHtml(item.origen)}</span>
    <span class="lab-card__view" aria-hidden="true">${icono('eye')}Ver ficha</span>
  </div>
  <div class="lab-card__body">
    <div class="lab-card__meta">
      <span class="chip chip--category">${icono(iconoCategoria)}${escapeHtml(item.categoria)}</span>
    </div>
    <h2 class="lab-card__title">${escapeHtml(item.nombre)}</h2>
    <p class="lab-card__desc">${escapeHtml(item.descripcion)}</p>
  </div>
  <div class="lab-card__footer">
    <span class="lab-card__note">${item.aplicaA ? `${icono('layers')}<span>${escapeHtml(item.aplicaA)}</span>` : ''}</span>
    <span class="lab-card__cta">Explorar${icono('arrow-right')}</span>
  </div>
</article>`;
  }

  // 'vivo' no abre modal: al hacer clic navega a video.html, su propia
  // página (ver abrirFicha/irAVideoVivo) — por eso, a diferencia de la
  // tarjeta 'laboratorio', no lleva aria-haspopup="dialog".
  function renderVivoCard(item) {
    const catKey = slugify(item.categoria);
    const esTransversal = item.transversalidad === 'Transversal';
    return `
<article class="lab-card reveal" data-item="${escapeHtml(item.id)}" data-category="${catKey}" tabindex="0" role="link" aria-label="${escapeHtml(item.nombre)}. Ver video de la práctica">
  <div class="lab-card__thumb">
    <div class="lab-card__video">
      <span class="lab-card__play">${icono('play')}</span>
      <span class="lab-card__video-label">Práctica ${escapeHtml(String(item.item))}</span>
    </div>
    <span class="lab-card__origin">${esTransversal ? 'Transversal' : 'Específico'}</span>
    <span class="lab-card__view" aria-hidden="true">${icono('play-circle')}Ver video</span>
  </div>
  <div class="lab-card__body">
    <div class="lab-card__meta">
      ${item.materia ? `<span class="chip chip--category">${icono('book')}${escapeHtml(item.materia)}</span>` : ''}
      ${item.programa ? `<span class="lab-card__program">${escapeHtml(item.programa)}</span>` : ''}
    </div>
    <h2 class="lab-card__title">${escapeHtml(item.nombre)}</h2>
    <p class="lab-card__desc">${escapeHtml(item.descripcion)}</p>
  </div>
  <div class="lab-card__footer">
    <span class="lab-card__note">${icono('user')}<span>${escapeHtml(item.docenteFuente)}</span></span>
    <span class="lab-card__cta">Ver video${icono('arrow-right')}</span>
  </div>
</article>`;
  }

  const RENDERERS = {
    laboratorio: renderLaboratorioCard,
    vivo: renderVivoCard
  };

  function construirBarraCategorias(items) {
    const conteo = new Map();
    items.forEach(it => {
      const cat = it.categoria || '';
      if (!cat) return;
      conteo.set(cat, (conteo.get(cat) || 0) + 1);
    });
    const ordenadas = [...conteo.entries()].sort((a, b) => b[1] - a[1]);

    let html = `<button type="button" class="filter-btn is-active" data-filter="all" aria-pressed="true">${icono('grid')}<span>Todos</span><span class="filter-btn__count">${items.length}</span></button>`;
    ordenadas.forEach(([cat, count]) => {
      const key = slugify(cat);
      html += `<button type="button" class="filter-btn" data-filter="${key}" aria-pressed="false">${icono(ICONOS_CATEGORIA[cat] || ICONO_DEFAULT)}<span>${escapeHtml(cat)}</span><span class="filter-btn__count">${count}</span></button>`;
    });
    return html;
  }

  // Si el anfitrión no mandó descripción, la calculamos de los orígenes
  // reales de los items recibidos (mismo criterio que usaba el catálogo).
  function construirTextoDescripcion(datos) {
    if (datos.descripcion && datos.descripcion.trim()) return datos.descripcion;
    if (!datos.items.length) return 'Todavía no hay laboratorios cargados para este contenido.';

    // 'origen' es propio de 'laboratorio' (Externos/Propios); otros tipos
    // (como 'vivo') no lo tienen. Sin 'origen' que listar, una frase neutra
    // por cantidad de ítems — nunca la de "no hay nada" habiendo contenido.
    const origenes = [];
    datos.items.forEach(it => {
      if (it.origen && !origenes.includes(it.origen)) origenes.push(it.origen);
    });
    if (!origenes.length) {
      return `Explora los ${datos.items.length} ítem${datos.items.length === 1 ? '' : 's'} disponibles en esta sección. Selecciona cualquiera para ver su ficha completa.`;
    }
    const lista = origenes.length > 1
      ? origenes.slice(0, -1).join(', ') + ' y ' + origenes[origenes.length - 1]
      : origenes[0];
    return `Explora los laboratorios externos de este programa, operados por aliados académicos como ${lista}. Selecciona cualquiera para ver su ficha completa.`;
  }

  // Cabecera 100% dirigida por datos: sin volver_url no hay link de vuelta,
  // sin subtitulo no hay badge — el visor no inventa a qué sistema pertenece.
  function renderCabecera(datos) {
    const volverHtml = datos.volver_url
      ? `<a class="btn btn--secondary" href="${escapeHtml(datos.volver_url)}" id="volverLink">${icono('arrow-left', 'icon--arrow-left')}<span>Volver</span></a>`
      : '<span class="topbar__spacer"></span>';
    const badgeHtml = datos.subtitulo
      ? `<span class="status-chip"><span class="status-chip__led" aria-hidden="true"></span><span>${escapeHtml(datos.subtitulo)}</span></span>`
      : '';
    return `
<section class="hero">
  <div class="container">
    <div class="topbar">
      ${volverHtml}
      ${badgeHtml}
    </div>
    <div class="hero__inner">
      <div class="hero__text">
        <h1 class="hero__title">${escapeHtml(datos.titulo)}</h1>
        <p class="hero__lead">${escapeHtml(construirTextoDescripcion(datos))}</p>
      </div>
      <div class="hero__art">${UI ? UI.ilustracionLaboratorio() : ''}</div>
    </div>
  </div>
</section>`;
  }

  // Buscador + filtros por categoría. Sin ítems no hay nada que filtrar.
  function renderControles(datos) {
    if (!datos.items.length) return '';
    const soloVivos = datos.items.every(it => it.tipo === 'vivo');
    return `
<div class="catalog-controls">
  <div class="search-field">
    <label class="field-label" for="buscadorCatalogo">${icono('search')}Buscar en el catálogo</label>
    <div class="search-field__box">
      ${icono('search', 'search-field__icon')}
      <input class="search-field__input" id="buscadorCatalogo" type="search" autocomplete="off" spellcheck="false"
        placeholder="${soloVivos ? 'Nombre, materia o docente' : 'Nombre, categoría o plataforma'}" aria-describedby="resultCount">
      <button type="button" class="search-field__clear" id="buscadorLimpiar" aria-label="Limpiar búsqueda" hidden>${icono('x')}</button>
    </div>
  </div>
  <div class="filters-group">
    <p class="field-label" id="filtrosTitulo">${icono('sliders')}Categorías</p>
    <div class="filters" id="filterBar" role="group" aria-labelledby="filtrosTitulo">${construirBarraCategorias(datos.items)}</div>
  </div>
</div>
<div class="results-bar">
  <p id="resultCount" aria-live="polite">${textoResultados(datos.items.length, datos.items.length)}</p>
</div>`;
  }

  function textoResultados(visibles, total) {
    const unidad = `laboratorio${total === 1 ? '' : 's'}`;
    return visibles === total
      ? `<strong>${total}</strong> ${unidad}`
      : `Mostrando <strong>${visibles}</strong> de ${total} ${unidad}`;
  }

  // Texto donde busca el buscador: todos los campos visibles del ítem.
  function textoBuscable(item) {
    return normalizar([
      item.nombre, item.categoria, item.origen, item.materias, item.materia,
      item.programa, item.docenteFuente, item.aplicaA, item.transversalidad, item.descripcion
    ].filter(Boolean).join(' '));
  }

  function renderModalShell() {
    return `
<div class="modal-overlay is-hidden" id="labModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="modalTitle">
  <div class="modal-card" id="modalCard">
    <button type="button" class="modal-close" id="modalCloseBtn" aria-label="Cerrar ficha">${icono('x')}</button>
    <div class="modal-scroll">
      <div class="modal-visual" id="modalWireframeBox"></div>
      <div class="modal-header">
        <div class="modal-header__badges">
          <span class="modal-badge modal-badge--solid" id="modalCategoryBadge"></span>
          <span class="modal-badge modal-badge--outline" id="modalLocationText"></span>
        </div>
        <h2 class="modal-title" id="modalTitle"></h2>
      </div>
      <div class="modal-body">
        <section class="modal-section">
          <h3 class="section-title">${icono('info')}Descripción</h3>
          <p id="modalDescription"></p>
        </section>
        <section class="modal-section">
          <h3 class="section-title">${icono('book')}Materias</h3>
          <div class="chip-list" id="modalMateriasList"></div>
        </section>
        <dl class="fact-grid">
          <div class="fact"><dt class="fact__label">${icono('monitor')}Modalidad</dt><dd class="fact__value" id="modalModalidad">—</dd></div>
          <div class="fact"><dt class="fact__label">${icono('tag')}Costo</dt><dd class="fact__value" id="modalCosto">—</dd></div>
          <div class="fact"><dt class="fact__label">${icono('layers')}Transversal</dt><dd class="fact__value" id="modalTransversal">—</dd></div>
        </dl>
      </div>
    </div>
    <div class="modal-footer" id="modalFooter">
      <a class="btn btn--primary" href="#" id="modalResourceLink" target="_blank" rel="noopener noreferrer">
        Abrir recurso original${icono('external')}
      </a>
    </div>
  </div>
</div>`;
  }

  // ---------------------------------------------------------------------
  // Render principal: inyecta todo de una vez (insertAdjacentHTML) y luego
  // hidrata (engancha listeners sobre el DOM ya montado).
  // ---------------------------------------------------------------------
  function render(datos) {
    document.title = datos.titulo; // el título de la pestaña también sale del dato, no de un texto fijo

    const app = document.getElementById('app');
    app.innerHTML = '';

    app.insertAdjacentHTML('beforeend', renderCabecera(datos));

    const gridHtml = datos.items.length
      ? datos.items.map(it => (RENDERERS[it.tipo] || renderLaboratorioCard)(it)).join('')
      : (UI
        ? UI.estadoVacio({ icono: 'flask', titulo: 'Todavía no hay laboratorios para mostrar.' })
        : '<p class="empty-state">Todavía no hay laboratorios para mostrar.</p>');
    const sinResultadosHtml = UI
      ? UI.estadoVacio({
        icono: 'search',
        titulo: 'No hay laboratorios que coincidan con tu búsqueda.',
        texto: 'Prueba con otras palabras o muestra todas las categorías.',
        accion: `<button type="button" class="btn btn--secondary" id="limpiarFiltros">${icono('x')}<span>Limpiar búsqueda y filtros</span></button>`
      })
      : '<button type="button" class="btn btn--secondary" id="limpiarFiltros">Limpiar búsqueda y filtros</button>';

    app.insertAdjacentHTML('beforeend', `
<section class="content">
  <div class="container" id="appShell">
    ${renderControles(datos)}
    <div class="labs-grid" id="labsGrid">${gridHtml}</div>
    <div class="no-results" id="sinResultados" hidden>${sinResultadosHtml}</div>
  </div>
</section>
`);

    app.insertAdjacentHTML('beforeend', renderModalShell());

    activarFallbackImagenes(app);
    hidratar(app, datos);
    if (UI) UI.revelar(app);
  }

  // ---------------------------------------------------------------------
  // Hidratación: listeners sobre el árbol ya montado (§6.1)
  // ---------------------------------------------------------------------
  function hidratar(app, datos) {
    const filterBar = document.getElementById('filterBar');
    const buscador = document.getElementById('buscadorCatalogo');
    const limpiarBusqueda = document.getElementById('buscadorLimpiar');
    const sinResultados = document.getElementById('sinResultados');
    const contador = document.getElementById('resultCount');
    const textos = new Map(datos.items.map(it => [it.id, textoBuscable(it)]));
    let filtro = 'all';

    // Misma regla de siempre para la categoría (filtro === 'all' o igual a
    // data-category), combinada con el texto del buscador.
    function aplicarFiltros() {
      const consulta = normalizar(buscador ? buscador.value.trim() : '');
      let visibles = 0;
      app.querySelectorAll('.lab-card').forEach(card => {
        const cat = card.getAttribute('data-category');
        const coincideCategoria = (filtro === 'all' || filtro === cat);
        const coincideTexto = !consulta || (textos.get(card.getAttribute('data-item')) || '').includes(consulta);
        const mostrar = coincideCategoria && coincideTexto;
        card.style.display = mostrar ? '' : 'none';
        if (mostrar) {
          card.style.setProperty('--reveal-delay', `${Math.min(visibles, 8) * 40}ms`);
          visibles++;
        }
      });
      if (contador) contador.innerHTML = textoResultados(visibles, datos.items.length);
      if (sinResultados) sinResultados.hidden = !(datos.items.length && visibles === 0);
    }

    function vaciarBuscador() {
      if (!buscador) return;
      buscador.value = '';
      if (limpiarBusqueda) limpiarBusqueda.hidden = true;
    }

    if (filterBar) {
      filterBar.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.filter-btn');
        if (!btn) return;
        filterBar.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        filtro = btn.getAttribute('data-filter');
        aplicarFiltros();
      });
    }

    if (buscador) {
      buscador.addEventListener('input', () => {
        if (limpiarBusqueda) limpiarBusqueda.hidden = !buscador.value;
        aplicarFiltros();
      });
      buscador.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && buscador.value) {
          vaciarBuscador();
          aplicarFiltros();
        }
      });
    }

    if (limpiarBusqueda) {
      limpiarBusqueda.addEventListener('click', () => {
        vaciarBuscador();
        aplicarFiltros();
        buscador.focus();
      });
    }

    const limpiarFiltros = document.getElementById('limpiarFiltros');
    if (limpiarFiltros) {
      limpiarFiltros.addEventListener('click', () => {
        vaciarBuscador();
        const todos = filterBar && filterBar.querySelector('[data-filter="all"]');
        if (todos) todos.click(); else aplicarFiltros();
        if (buscador) buscador.focus();
      });
    }

    const grid = document.getElementById('labsGrid');
    if (grid) {
      grid.addEventListener('click', (ev) => {
        const card = ev.target.closest('[data-item]');
        if (!card) return;
        abrirFicha(card.getAttribute('data-item'), datos);
      });
      grid.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        const card = ev.target.closest('[data-item]');
        if (!card) return;
        ev.preventDefault();
        abrirFicha(card.getAttribute('data-item'), datos);
      });
    }

    const modal = document.getElementById('labModal');
    const closeBtn = document.getElementById('modalCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', cerrarFicha);
    if (modal) {
      modal.addEventListener('click', (ev) => {
        if (ev.target === modal) cerrarFicha();
      });
    }
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') cerrarFicha();
    });

    const volverLink = document.getElementById('volverLink');
    if (volverLink) {
      volverLink.addEventListener('click', (ev) => {
        ev.preventDefault();
        volver(datos.volver_url);
      });
    }
  }

  // Respaldo del payload de ESTE catálogo (en sessionStorage de esta misma
  // pestaña) antes de reemplazar window.name para ir a video.html — mismo
  // patrón que usan index.html/programa.html para que "Volver" no pierda
  // los datos (ver "Volver sin perder los datos" en README.md).
  const CLAVE_RESPALDO_CATALOGO = 'visorCatalogoRespaldo';

  function abrirFicha(id, datos) {
    const item = datos.items.find(it => it.id === id);
    if (!item) return;
    if (item.tipo === 'vivo') {
      irAVideoVivo(item);
      return;
    }
    openLabModal(item);
  }

  function irAVideoVivo(item) {
    try { sessionStorage.setItem(CLAVE_RESPALDO_CATALOGO, window.name); } catch (e) { /* sin storage disponible, no pasa nada */ }
    window.name = JSON.stringify({
      item: item.item,
      nombre: item.nombre,
      programa: item.programa,
      materia: item.materia,
      transversalidad: item.transversalidad,
      descripcion: item.descripcion,
      videoUrl: item.videoUrl,
      docenteFuente: item.docenteFuente,
      volver_url: 'catalogo.html'
    });
    window.location.href = 'video.html';
  }

  function llenarChips(container, valores, textoVacio) {
    container.innerHTML = '';
    const limpios = valores.filter(Boolean);
    if (!limpios.length) {
      container.innerHTML = `<span class="chip">${escapeHtml(textoVacio)}</span>`;
      return;
    }
    limpios.forEach(v => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = v;
      container.appendChild(chip);
    });
  }

  function openLabModal(item) {
    document.getElementById('modalTitle').textContent = item.nombre;
    document.getElementById('modalCategoryBadge').textContent = item.categoria;
    document.getElementById('modalLocationText').textContent = item.origen;
    document.getElementById('modalDescription').textContent = item.descripcion;

    const materias = item.materias ? item.materias.split(';').map(m => m.trim()) : [];
    llenarChips(document.getElementById('modalMateriasList'), materias, 'Sin materias registradas');

    document.getElementById('modalModalidad').textContent = item.modalidad || '—';
    document.getElementById('modalCosto').textContent = item.costo || '—';
    document.getElementById('modalTransversal').textContent =
      item.aplicaA === 'Transversal' ? 'Sí' : (item.aplicaA ? 'No' : '—');

    const iconoCategoria = ICONOS_CATEGORIA[item.categoria] || ICONO_DEFAULT;
    const wireframeBox = document.getElementById('modalWireframeBox');
    const leyenda = [item.origen, item.aplicaA].filter(Boolean).map(escapeHtml).join(' • ');
    if (item.imagen) {
      wireframeBox.className = 'modal-visual modal-visual--image';
      wireframeBox.innerHTML = `<div class="modal-visual__frame">${construirEsquema(item.imagen, iconoCategoria, item.categoria, `Vista previa de ${item.nombre}`)}</div><div class="modal-visual__caption">${leyenda}</div>`;
    } else {
      wireframeBox.className = 'modal-visual modal-visual--schema';
      wireframeBox.innerHTML = `<div class="modal-visual__frame">${construirPlaceholder(iconoCategoria, `Esquema: ${item.categoria || ''}`)}</div><div class="modal-visual__caption">${leyenda}</div>`;
    }
    activarFallbackImagenes(wireframeBox);

    const resourceLink = document.getElementById('modalResourceLink');
    if (item.link) {
      resourceLink.href = item.link;
      resourceLink.style.display = '';
    } else {
      resourceLink.removeAttribute('href');
      resourceLink.style.display = 'none';
    }
    // Sin link, el pie del modal quedaría como una franja vacía
    const modalFooter = document.getElementById('modalFooter');
    if (modalFooter) modalFooter.hidden = !item.link;

    ultimoDisparador = document.activeElement;
    const modal = document.getElementById('labModal');
    modal.classList.remove('is-hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Accesibilidad (visor-instrucciones.md §10.4): el fondo queda inerte,
    // la ficha arranca desde arriba y el foco entra al diálogo.
    fondoInerte(true);
    const scroll = modal.querySelector('.modal-scroll');
    if (scroll) scroll.scrollTop = 0;
    const closeBtn = document.getElementById('modalCloseBtn');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function cerrarFicha() {
    const modal = document.getElementById('labModal');
    if (!modal) return;
    const estabaAbierta = !modal.classList.contains('is-hidden');
    modal.classList.add('is-hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (estabaAbierta) {
      fondoInerte(false);
      // Devolver el foco a la tarjeta que abrió la ficha
      if (ultimoDisparador && document.contains(ultimoDisparador) && ultimoDisparador.focus) {
        ultimoDisparador.focus({ preventScroll: true });
      }
      ultimoDisparador = null;
    }
  }

  // Elemento que abrió la ficha, para devolverle el foco al cerrarla.
  let ultimoDisparador = null;

  // Mientras la ficha está abierta, todo lo demás queda fuera del foco y de
  // los lectores de pantalla (inert).
  function fondoInerte(activo) {
    const modal = document.getElementById('labModal');
    const fondo = [document.querySelector('.site-header'), document.querySelector('.tema-dock')];
    const app = document.getElementById('app');
    if (app) fondo.push(...Array.from(app.children).filter(el => el !== modal));
    fondo.forEach(el => {
      if (!el) return;
      if (activo) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }

  // ---------------------------------------------------------------------
  // §9 — Puente con el anfitrión: best-effort con fallback garantizado.
  // En el flujo real (navegación directa, sin iframe) window.parent ===
  // window, así que esto navega derecho a volver_url. Queda implementado
  // completo porque prueba.html SÍ embebe el visor en un <iframe>.
  // ---------------------------------------------------------------------
  function volver(volverUrl) {
    const embebido = window.parent && window.parent !== window;

    if (!embebido || !volverUrl) {
      if (volverUrl) window.location.href = volverUrl;
      return;
    }

    let resuelto = false;
    const onRespuesta = (ev) => {
      if (!ev.data || ev.data.source !== 'anfitrion' || ev.data.type !== 'ok-volver') return;
      resuelto = true;
      window.removeEventListener('message', onRespuesta);
    };
    window.addEventListener('message', onRespuesta);
    window.parent.postMessage({ source: 'visor', type: 'volver' }, '*');

    setTimeout(() => {
      if (!resuelto) {
        window.removeEventListener('message', onRespuesta);
        window.location.href = volverUrl;
      }
    }, 400);
  }

  document.addEventListener('DOMContentLoaded', () => {
    render(obtenerDatos());
  });
})();
