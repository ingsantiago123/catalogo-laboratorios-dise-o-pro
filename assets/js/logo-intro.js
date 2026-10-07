// logo-intro.js — Intro animada del logo INCConnection Lab (pantalla 1 del visor)
//
// SOLO presentación: no lee window.name, no toca sessionStorage y no navega.
// La lógica de datos de index.html sigue en index-main.js; este archivo solo
// anima el escenario que ese script le entrega (ver montar()). Si no cargara
// (o faltara assets/js/logo-intro-svg.js), index-main.js muestra solo el
// selector de colecciones: nunca una pantalla en blanco.
//
// Qué hace:
//   1. Intro (~4 s): el engranaje gira hasta su sitio, los circuitos se dibujan
//      con una chispa en la punta, las letras se trazan y se rellenan, el
//      botón de encendido de la "o" se prende y los electrones del átomo
//      empiezan a orbitar.
//   2. Reposo: pulsos de energía por los circuitos, ondas en los anillos,
//      brillo periódico y electrones en órbita con efecto de profundidad.
//   3. Scroll: al deslizar hacia abajo un frente de energía recorre el logo de
//      izquierda a derecha y lo disuelve entre rayos, pieza por pieza. Está
//      atado a la posición de scroll (se puede retroceder y el logo se
//      reconstruye), sin secuestrar el scroll nativo.
//   4. Clic sobre el logo: descarga (pulsos por todos los circuitos).
//
// Rendimiento (2.0): mismo dibujo y mismas animaciones, en tres capas
// apiladas con el mismo encuadre:
//   1. el SVG del logo, quieto (formas, mascaras, halo): en reposo no se
//      vuelve a pintar;
//   2. un <canvas> con lo que se mueve todo el tiempo (electrones y sus colas,
//      pulsos por los circuitos, ondas y destellos de nodos). Medido en
//      Chrome: una sola animacion de un elemento SVG obliga a recalcular
//      estilos, layout y pintado de toda la pagina en cada cuadro (~6 % de un
//      nucleo por electron); dibujar todo esto en un canvas cuesta ~4 veces
//      menos que hacerlo con SVG;
//   3. un SVG encima con lo que solo aparece a ratos (boton "on", frente de
//      energia, rayos y brillo), en el mismo orden de pintado que antes.
// Ademas: las orbitas son elipses y su recorrido por longitud de arco sale de
// una tabla (getPointAtLength sobre un arco costaba ~0,12 ms por llamada:
// 158 ms al montar y 3 llamadas por cuadro), y el escenario pausa todo cuando
// no se ve (tapado por la hoja, fuera de pantalla o pestana oculta).
// Accesibilidad: con prefers-reduced-motion no hay intro, rayos ni disolución.
(function () {
  'use strict';

  const DATOS = window.VISOR_LOGO;
  if (!DATOS || !DATOS.svg) return;

  const NS = 'http://www.w3.org/2000/svg';
  const mq = q => !!(window.matchMedia && window.matchMedia(q).matches);
  const reduceMotion = mq('(prefers-reduced-motion: reduce)');

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v));
  const suave = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mk = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };

  // Curva de tiempo cubic-bezier(x1, y1, x2, y2), igual que en CSS/WAAPI.
  function curva(x1, y1, x2, y2) {
    const bx = t => ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t;
    const by = t => ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t;
    const dx = t => 3 * (1 - 3 * x2 + 3 * x1) * t * t + 2 * (3 * x2 - 6 * x1) * t + 3 * x1;
    return p => {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      let t = p;
      for (let i = 0; i < 6; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (bx(t) - p) / d; }
      if (t < 0 || t > 1 || Math.abs(bx(t) - p) > 1e-4) {             // respaldo: biseccion
        let a = 0, b = 1; t = p;
        for (let i = 0; i < 30; i++) { const x = bx(t); if (Math.abs(x - p) < 1e-5) break; if (x < p) a = t; else b = t; t = (a + b) / 2; }
      }
      return by(t);
    };
  }
  const EASE_ONDA = curva(.2, .7, .3, 1);      // onda (ping): mismo easing que antes con WAAPI
  const EASE_OUT = curva(0, 0, .58, 1);        // 'ease-out' del destello de nodo
  const EASE_BROTAR = curva(.3, 1.7, .5, 1);   // aparicion de los electrones (il-brotar)

  // --- Guion de la intro (segundos) --------------------------------------
  // Circuitos: [retraso, velocidad en unidades/s]
  const TRAZAS = { 'il-t1': [0.25, 140], 'il-t2': [0.35, 140], 'il-t3': [0.45, 140], 'il-t4': [1.0, 320], 'il-t5': [1.55, 170] };
  const PALABRA = ['C1', 'C2', 'accent', 'o', 'n1', 'n2', 'e', 'c', 't', 'i', 'idot'];
  const DEMORA_LAB = { L: 2.2, a: 2.3, b: 2.4, flask: 2.55 };
  const NEON = { on_o: [2.05, .9], on_n: [2.15, .9], stick: [2.4, .55] };
  const T_LISTO = 3.75;     // el logo está completo: "en línea" + aparece la indicación de scroll
  const T_REPOSO = 4.2;     // empiezan los efectos de reposo
  const T_ORBITAS = 3.5;    // los electrones arrancan
  const RAMPA_MS = 1400;    // los electrones aceleran hasta su velocidad de crucero

  // --- Disolución por scroll ----------------------------------------------
  const BANDA = 60;         // ancho (unidades del logo) por delante del frente donde una pieza empieza a cargarse
  const MUERTA = .02;       // fracción de la pista (una pantalla) sin efecto: un roce no dispara nada
  const FIN_PISTA = .36;    // fracción de la pista en la que el logo ya se disolvió del todo
  const MAX_RAYOS = 12;

  // --- Orbitas: recorrido por longitud de arco -------------------------------
  // Cada orbita del arte es una elipse ([cx, cy, a, b, angulo] en
  // VISOR_LOGO.orbitas) dibujada como un <path> de dos arcos que arranca en su
  // "M" y gira segun el sweep-flag del primer arco. Se integra la elipse a
  // mano y se arma una tabla de MUESTRAS puntos equiespaciados por longitud
  // de arco. Si la elipse no coincide con el path (otro arte), se cae al
  // metodo lento de siempre.
  const MUESTRAS = 512;
  const NUM = '(-?(?:\\d+\\.?\\d*|\\.\\d+)(?:e-?\\d+)?)';
  const RE_INICIO = new RegExp('^\\s*M\\s*' + NUM + '[\\s,]*' + NUM, 'i');
  const RE_ARCO = new RegExp('a\\s*' + NUM + '[\\s,]*' + NUM + '[\\s,]*' + NUM + '[\\s,]+([01])[\\s,]*([01])', 'i');

  function tablaOrbita(path, orb) {
    const Lreal = path.getTotalLength();
    const d = path.getAttribute('d') || '';
    const ini = RE_INICIO.exec(d), arco = RE_ARCO.exec(d);
    if (orb && ini && arco) {
      const [cx, cy, a, b, ang] = orb;
      const th = ang * Math.PI / 180, co = Math.cos(th), si = Math.sin(th);
      const P = t => { const u = a * Math.cos(t), v = b * Math.sin(t); return [cx + u * co - v * si, cy + u * si + v * co]; };
      const x0 = +ini[1], y0 = +ini[2], dx = x0 - cx, dy = y0 - cy;
      const t0 = Math.atan2((-dx * si + dy * co) / b, (dx * co + dy * si) / a);
      const dir = arco[5] === '1' ? 1 : -1;
      const K = 4096, ts = new Float64Array(K + 1), acum = new Float64Array(K + 1);
      let [px, py] = P(t0);
      const inicioOk = Math.hypot(px - x0, py - y0) < .6;
      for (let k = 1; k <= K; k++) {
        const t = t0 + dir * 2 * Math.PI * k / K, [x, y] = P(t);
        ts[k] = t; acum[k] = acum[k - 1] + Math.hypot(x - px, y - py);
        px = x; py = y;
      }
      ts[0] = t0;
      const L = acum[K];
      // Chrome mide los arcos del <path> con una aproximacion (en este arte da
      // hasta 0,5 % mas largo); la tabla se arma por fraccion de vuelta y se
      // devuelve el largo del navegador: asi la cola (un guion sobre el mismo
      // path) y el electron siguen alineados. Diferencia medida contra
      // getPointAtLength: <= 0,25 unidades (menos de medio pixel).
      if (inicioOk && Math.abs(L - Lreal) / Lreal < .015) {
        const xs = new Float32Array(MUESTRAS), ys = new Float32Array(MUESTRAS);
        for (let j = 0, k = 0; j < MUESTRAS; j++) {
          const s = j * L / MUESTRAS;
          while (k < K - 1 && acum[k + 1] < s) k++;
          const f = (s - acum[k]) / ((acum[k + 1] - acum[k]) || 1);
          const [x, y] = P(ts[k] + (ts[k + 1] - ts[k]) * f);
          xs[j] = x; ys[j] = y;
        }
        return { L: Lreal, xs, ys };
      }
    }
    // Respaldo: muestrear el path (lento en arcos, pero solo una vez)
    const n = 256, xs = new Float32Array(n), ys = new Float32Array(n);
    for (let j = 0; j < n; j++) { const p = path.getPointAtLength(j * Lreal / n); xs[j] = p.x; ys[j] = p.y; }
    return { L: Lreal, xs, ys };
  }

  function puntoTabla(tab, s) {
    const n = tab.xs.length;
    const q = ((s % tab.L) + tab.L) % tab.L / tab.L * n;
    const i = Math.floor(q) % n, j = (i + 1) % n, f = q - Math.floor(q);
    return { x: tab.xs[i] + (tab.xs[j] - tab.xs[i]) * f, y: tab.ys[i] + (tab.ys[j] - tab.ys[i]) * f };
  }

  // Color CSS -> [r, g, b] (para mezclar colores en el canvas como lo hacia WAAPI)
  const lienzoColor = document.createElement('canvas').getContext('2d');
  function rgb(color) {
    lienzoColor.fillStyle = '#000';
    lienzoColor.fillStyle = color;
    const c = lienzoColor.fillStyle;
    if (c[0] === '#') return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const m = c.match(/[\d.]+/g) || [0, 0, 0];
    return [+m[0], +m[1], +m[2]];
  }
  const mezclar = (a, b, f) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',') + ')';

  function montar(opc) {
    const raiz = opc.raiz;
    const escenario = raiz.querySelector('.intro__stage');
    const host = raiz.querySelector('.intro__logo');
    const estadoEl = raiz.querySelector('.intro__status');
    const estadoTexto = raiz.querySelector('.intro__status-text');
    const cue = raiz.querySelector('.intro__cue');
    const marca = raiz.querySelector('.intro__brand');
    const flashEl = raiz.querySelector('.intro__flash');
    const inclinar = raiz.querySelector('.intro__tilt');
    const destino = opc.destino || null;           // a dónde desliza la indicación "Desliza hacia abajo"
    const foco = opc.foco || destino;              // y qué recibe el foco después (para teclado y lectores)
    const root = document.documentElement;

    host.innerHTML = DATOS.svg;
    const svg = host.firstElementChild;
    const vb = (svg.getAttribute('viewBox') || '0 0 793 152').split(/[\s,]+/).map(Number);
    const VB_W = vb[2], VB_H = vb[3];

    // ---------- capas ----------
    // Lo que aparece a ratos va a un SVG con el mismo viewBox, encima: boton
    // "on" (que respira), frente de energia, rayos y brillo. Estaban al final
    // del SVG original, en este mismo orden, asi que el orden de pintado no
    // cambia. Entre los dos SVG va el canvas de efectos (colas, electrones,
    // pulsos y ondas, que en el original estaban entre el "on" y el frente; el
    // "on", en x 525-565, no se cruza con las orbitas ni sus colas, x > 650).
    const capa = mk('svg', {
      class: 'il-svg il-capa', viewBox: svg.getAttribute('viewBox'),
      'aria-hidden': 'true', focusable: 'false'
    });
    for (const sel of ['.il-on-glow', '#il-front', '#il-bolts', '#il-shine']) capa.appendChild(svg.querySelector(sel));
    const lienzo = document.createElement('canvas');
    lienzo.className = 'il-efectos';
    lienzo.setAttribute('aria-hidden', 'true');
    host.append(lienzo, capa);
    const capas = [svg, lienzo, capa];
    const g2d = lienzo.getContext('2d');

    const $ = s => host.querySelector(s);
    const $$ = s => [...host.querySelectorAll(s)];
    const rayosG = $('#il-bolts');
    rayosG.setAttribute('class', 'il-bolts');
    const frenteEl = $('#il-front');
    const shineGrad = $('#il-sg');
    const shineUse = $('#il-shine');

    const fijar = (el, d, t) => {
      el.style.setProperty('--d', d.toFixed(2) + 's');
      if (t != null) el.style.setProperty('--t', t.toFixed(2) + 's');
    };

    // ---------- geometría: circuitos y nodos ----------
    // (los circuitos son lineas y curvas: getPointAtLength es barato ahi)
    const trazas = $$('.il-trace').map(el => {
      const [inicio, vel] = TRAZAS[el.id];
      const L = el.getTotalLength();
      const muestras = [];
      for (let s = 0; s <= L; s += 1) muestras.push([s, el.getPointAtLength(s)]);
      const d = el.getAttribute('d');
      const t = { el, id: el.id, d, ruta: new Path2D(d), L, inicio, vel, dur: L / vel, muestras, paradas: [], fin: el.getPointAtLength(L) };
      fijar(el, inicio, t.dur);
      return t;
    });

    const centro = n => n.tagName === 'rect'
      ? { x: +n.getAttribute('x') + n.getAttribute('width') / 2, y: +n.getAttribute('y') + n.getAttribute('height') / 2, s: Math.max(+n.getAttribute('width'), +n.getAttribute('height')) / 2, rect: true }
      : { x: +n.getAttribute('cx'), y: +n.getAttribute('cy'), s: +n.getAttribute('r'), rect: false };

    const nodos = $$('.il-node');
    const anillos = $$('.il-ring');
    const punto = $('.il-period');
    let burbuja = 0;
    for (const n of nodos) {
      const c = centro(n);
      if (n.classList.contains('il-period')) { fijar(n, 2.45); continue; }
      if (n.classList.contains('il-bubble')) { fijar(n, 2.95 + 0.06 * burbuja++); continue; }
      let mejor = null;
      for (const t of trazas) {
        let d0 = 1e9, s0 = 0;
        for (const [s, p] of t.muestras) {
          const d = Math.hypot(p.x - c.x, p.y - c.y);
          if (d < d0) { d0 = d; s0 = s; }
        }
        if (d0 < c.s + 1.2) t.paradas.push({ s: s0, n });                       // el pulso lo hace brillar al pasar
        if (d0 <= (c.rect ? c.s + 1.5 : 1.5) && (!mejor || d0 < mejor.d)) mejor = { d: d0, t: t.inicio + s0 / t.vel };
      }
      // aparece cuando la chispa del circuito llega; los nodos sueltos, en barrido de izquierda a derecha
      fijar(n, mejor ? mejor.t : 0.9 + (c.x / 793) * 1.9);
    }
    for (const t of trazas) t.muestras = null;                                  // ya no hacen falta

    // ---------- geometría: formas, botón "on" y átomo ----------
    const formas = $$('.il-shape');
    for (const el of formas) {
      const k = el.dataset.k;
      if (k === 'gear') fijar(el, .15, 1.5);
      else if (PALABRA.includes(k)) fijar(el, .85 + PALABRA.indexOf(k) * .075);
      else fijar(el, DEMORA_LAB[k] || 0);
    }
    const neones = $$('.il-neon');
    for (const el of neones) fijar(el, NEON[el.dataset.k][0], NEON[el.dataset.k][1]);
    const orbitasEl = $$('.il-orbit');
    orbitasEl.forEach((el, i) => fijar(el, 2.45 + i * .1));
    const glowOn = $('.il-on-glow');
    const engranaje = $('.il-gear');

    // Los electrones y sus colas se dibujan en el canvas: del SVG solo se leen
    // su posicion y tamano en el arte, y despues se quitan.
    const DIR = [1, -1, 1], PERIODO = [6.2, 4.9, 4.3];
    const electrones = [0, 1, 2].map(i => {
      const path = $('#il-o' + i), el = $('#il-e' + i);
      const orb = DATOS.orbitas[i];
      const tab = tablaOrbita(path, orb);
      const L = tab.L, x0 = +el.getAttribute('cx'), y0 = +el.getAttribute('cy');
      let mejor = 1e9, s0 = 0;
      for (let j = 0; j < tab.xs.length; j++) {
        const d = Math.hypot(tab.xs[j] - x0, tab.ys[j] - y0);
        if (d < mejor) { mejor = d; s0 = j * L / tab.xs.length; }
      }
      const p0 = puntoTabla(tab, s0);
      return {
        ruta: new Path2D(path.getAttribute('d')), tab, L, s0, s: s0, v: DIR[i] * L / PERIODO[i],
        r0: +el.dataset.r, x0, y0, tl: L * .22, vis: 1, brotar: 3.25 + i * .1,
        off: { x: x0 - p0.x, y: y0 - p0.y },                                     // en el arte el núcleo queda apenas fuera de su órbita
        orb, th: orb[4] * Math.PI / 180,
        x: x0, y: y0, k: 1, op: 1, colaOp: 0
      };
    });
    for (const sel of ['.il-tails', '.il-electrons']) { const g = svg.querySelector(sel); if (g) g.remove(); }

    // ---------- piezas que se disuelven con el scroll ----------
    const piezas = [];
    function agregar(el, tipo, extra) {
      const bb = el.getBBox();
      piezas.push(Object.assign({
        el, tipo, ini: bb.x - BANDA, fin: bb.x + bb.width + BANDA * .3, cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2,
        u: 0, flick: 1, prox: 0, forzar: false, dx: rand(-1, 1), dy: rand(-1, 1)
      }, extra));
    }
    formas.forEach(el => agregar(el, el.dataset.k === 'gear' ? 'engranaje' : 'forma'));
    trazas.forEach(t => agregar(t.el, 'traza'));
    neones.forEach(el => agregar(el, 'neon', { k: el.dataset.k }));
    orbitasEl.forEach((el, i) => agregar(el, 'orbita', { e: electrones[i] }));
    nodos.forEach(el => agregar(el, 'nodo'));

    const APLICAR = {
      forma(p, u) {
        const s = p.el.style;
        s.fillOpacity = (1 - suave(.05, .55, u)) * p.flick;
        s.strokeOpacity = suave(0, .25, u) * (1 - suave(.78, 1, u));
        s.strokeDashoffset = -suave(.4, 1, u);
        s.transform = u ? 'translate(' + (p.dx * u * 4).toFixed(2) + 'px,' + (-2 - p.dy * u * 5).toFixed(2) + 'px)' : '';
        if (!u) { s.fillOpacity = s.strokeOpacity = s.strokeDashoffset = ''; }
      },
      engranaje(p, u) {
        APLICAR.forma(p, u);
        engranaje.style.transform = u ? 'rotate(' + (u * 70).toFixed(1) + 'deg) scale(' + (1 - u * .08).toFixed(3) + ')' : '';
      },
      traza(p, u) {
        p.el.style.strokeDashoffset = u ? -u : '';
        p.el.style.opacity = u ? p.flick : '';
      },
      neon(p, u) {
        p.el.style.strokeDashoffset = u ? -u : '';
        p.el.style.opacity = u ? p.flick : '';
        if (p.k === 'on_o') glowOn.style.opacity = u ? 1 - suave(0, .6, u) : '';
      },
      orbita(p, u) {
        p.el.style.strokeDashoffset = u ? -u : '';
        p.el.style.opacity = u ? p.flick : '';
        p.e.vis = 1 - suave(.1, .85, u);
      },
      nodo(p, u) {
        const s = p.el.style;
        s.transform = u ? 'scale(' + Math.max(0, 1 - suave(0, .55, u)).toFixed(3) + ')' : '';
        s.opacity = u ? (1 - suave(.25, 1, u)) * p.flick : '';
      }
    };

    // ---------- efectos: ondas, pulsos, chispas y rayos ----------
    // Valores de tema que vienen de CSS. Se guardan: pedirlos con getComputedStyle en cada
    // cuadro fuerza a recalcular estilos. Se releen si cambia el tema.
    let tokAcento = '#63D6FF', tokFlash = 0, tokShine = .6, tokLogo = '#1772B9', tokHot = '#0A9CF5';
    let rgbAcento = rgb(tokAcento), rgbLogo = rgb(tokLogo);
    function leerTokens() {
      const cs = getComputedStyle(root);
      tokAcento = cs.getPropertyValue('--il-accent').trim() || tokAcento;
      tokFlash = parseFloat(cs.getPropertyValue('--il-flash')) || 0;
      tokShine = parseFloat(cs.getPropertyValue('--il-shine')) || .6;
      tokLogo = cs.getPropertyValue('--il-logo').trim() || tokLogo;
      tokHot = cs.getPropertyValue('--il-hot').trim() || tokHot;
      rgbAcento = rgb(tokAcento); rgbLogo = rgb(tokLogo);
      repintar();
    }

    // --- canvas de efectos --------------------------------------------------
    // Cubre el encuadre del logo mas un margen (las ondas y las colas pueden
    // salirse un poco del viewBox). Mismo ajuste que el SVG (preserveAspectRatio
    // xMidYMid meet): si el alto maximo recorta, el dibujo queda centrado.
    const MARGEN = 32;                                   // unidades del logo
    let escala = 1, dpr = 1;
    function medirLienzo() {
      const W = host.clientWidth, H = host.clientHeight;
      if (!W || !H) return;
      escala = Math.min(W / VB_W, H / VB_H);
      const ox = (W - VB_W * escala) / 2, oy = (H - VB_H * escala) / 2, m = MARGEN * escala;
      const cw = VB_W * escala + 2 * m, ch = VB_H * escala + 2 * m;
      Object.assign(lienzo.style, { left: (ox - m) + 'px', top: (oy - m) + 'px', width: cw + 'px', height: ch + 'px' });
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
      if (lienzo.width !== pw || lienzo.height !== ph) { lienzo.width = pw; lienzo.height = ph; }
      repintar();
    }

    // Efectos vivos, en el orden en que se crearon (pulsos y ondas), y los
    // destellos de nodos (que van debajo de todo: reemplazan al nodo).
    let efectos = [], chispazos = [];

    function dibujar(ahora) {
      g2d.setTransform(1, 0, 0, 1, 0, 0);
      g2d.globalAlpha = 1;
      g2d.clearRect(0, 0, lienzo.width, lienzo.height);
      const k = escala * dpr;
      g2d.setTransform(k, 0, 0, k, MARGEN * k, MARGEN * k);
      g2d.lineCap = 'round';
      g2d.lineJoin = 'round';
      if (chispazos.length) chispazos = chispazos.filter(ch => ch(ahora));
      for (const e of electrones) dibujarCola(e);
      for (const e of electrones) dibujarElectron(e, ahora);
      if (efectos.length) efectos = efectos.filter(fx => fx(ahora));
      g2d.setLineDash([]);
      g2d.globalAlpha = 1;
    }
    // Un solo dibujo fuera del bucle (cambio de tamano o de tema, movimiento reducido)
    function repintar() { if (!raf) dibujar(performance.now()); }

    // Onda (ping): circulo que crece y se apaga; trazo de 1 px de pantalla
    // (antes vector-effect: non-scaling-stroke).
    function onda(x, y, r, grande) {
      const inicio = performance.now(), crece = (grande || 3.2) - 1;
      efectos.push(ahora => {
        const p = clamp((ahora - inicio) / 900), e = EASE_ONDA(p);
        g2d.setLineDash([]);
        g2d.globalAlpha = .95 * (1 - e);
        g2d.strokeStyle = tokAcento;
        g2d.lineWidth = 1 / escala;
        g2d.beginPath();
        g2d.arc(x, y, r * (1 + crece * e), 0, Math.PI * 2);
        g2d.stroke();
        return p < 1;
      });
      arrancar();
    }

    // Destello de un nodo cuando lo cruza un pulso: el nodo crece a 1,4 y
    // toma el color de acento (a los 0,3 del tiempo) y vuelve. Se dibuja en
    // el canvas, exactamente encima del nodo del logo, que no se toca.
    const geoNodo = new Map();
    function brillar(n) {
      let op = 1;
      if (!listo) {                                   // en la intro el nodo puede no haber aparecido todavia
        op = parseFloat(getComputedStyle(n).opacity);
        if (!(op > .05)) return;
      }
      let g = geoNodo.get(n);
      if (!g) {
        const c = centro(n);
        g = { c, rect: c.rect, anillo: n.classList.contains('il-ring'), w: +n.getAttribute('width') || 0, h: +n.getAttribute('height') || 0, sw: +n.getAttribute('stroke-width') || 1 };
        geoNodo.set(n, g);
      }
      const inicio = performance.now();
      chispazos.push(ahora => {
        const p = clamp((ahora - inicio) / 520), e = EASE_OUT(p);
        let esc, f;
        if (e < .3) { f = e / .3; esc = 1 + .4 * f; } else { f = 1 - (e - .3) / .7; esc = 1.4 - .4 * (1 - f); }
        const color = mezclar(rgbLogo, rgbAcento, f);
        g2d.globalAlpha = op;
        g2d.beginPath();
        if (g.rect) g2d.rect(g.c.x - g.w * esc / 2, g.c.y - g.h * esc / 2, g.w * esc, g.h * esc);
        else g2d.arc(g.c.x, g.c.y, g.c.s * esc, 0, Math.PI * 2);
        if (g.anillo) { g2d.setLineDash([]); g2d.strokeStyle = color; g2d.lineWidth = g.sw * esc; g2d.stroke(); }
        else { g2d.fillStyle = color; g2d.fill(); }
        return p < 1;
      });
      arrancar();
    }

    // Temporizadores pendientes (se cancelan al saltar la intro); los ya disparados se olvidan
    const timers = new Set();
    const limpiarTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
    const prog = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
    const en = (s, fn) => prog(fn, s * 1000);

    // Pulso: tres guiones (halo, medio y nucleo) que recorren el circuito.
    // Mismo calculo de antes (dash + offset lineal en el tiempo, visible desde
    // el primer instante como con fill: both).
    const CAPAS_PULSO = [[18, 4.4, .13, 'acento'], [18 * .6, 2.6, .3, 'acento'], [5, 1.2, 1, 'hot']];
    function pulso(t, dur, retraso) {
      const T = 18, L = t.L;
      const inicio = performance.now() + (retraso || 0) * 1000, D = dur * 1000;
      efectos.push(ahora => {
        const p = clamp((ahora - inicio) / D);
        for (const [largo, ancho, alfa, tono] of CAPAS_PULSO) {
          g2d.setLineDash([largo, L + T + 20]);
          g2d.lineDashOffset = largo - p * (L + T);
          g2d.globalAlpha = alfa;
          g2d.strokeStyle = tono === 'hot' ? tokHot : tokAcento;
          g2d.lineWidth = ancho;
          g2d.stroke(t.ruta);
        }
        return p < 1;
      });
      const v = (L + T) / dur;                          // velocidad de la cabeza del pulso
      for (const st of t.paradas) prog(() => brillar(st.n), ((retraso || 0) + st.s / v) * 1000);
      prog(() => {
        onda(t.fin.x, t.fin.y, 2.4);
        if (t.id === 'il-t4' && punto) brillar(punto);
      }, ((retraso || 0) + L / v) * 1000);
      arrancar();
    }

    function chispas(x, y, n, alcance) {
      for (let i = 0; i < (ligero ? Math.min(n, 1) : n); i++) {
        const c = mk('circle', { cx: x, cy: y, r: rand(.5, 1.2), class: 'il-spark' });
        rayosG.appendChild(c);
        const a = rand(0, Math.PI * 2), d = rand(6, alcance || 26);
        c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * d).toFixed(1) + 'px,' + (Math.sin(a) * d - 6).toFixed(1) + 'px)', opacity: 0 }],
          { duration: rand(380, 720), easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => c.remove();
      }
    }

    // Rayo: polilínea quebrada por desplazamiento del punto medio + ramal opcional
    function quebrada(x1, y1, x2, y2, agitacion) {
      let pts = [[x1, y1], [x2, y2]];
      for (let i = 0, amp = agitacion; i < 4; i++, amp *= .55) {
        const nuevo = [pts[0]];
        for (let j = 1; j < pts.length; j++) {
          const [ax, ay] = pts[j - 1], [bx, by] = pts[j];
          const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
          const d = rand(-amp, amp);
          nuevo.push([mx - dy / l * d, my + dx / l * d], pts[j]);
        }
        pts = nuevo;
      }
      return pts;
    }
    const aPath = pts => 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');

    let rayosActivos = 0;
    function rayo(x1, y1, x2, y2, vida) {
      if (rayosActivos >= (ligero ? 5 : MAX_RAYOS)) return;
      const largo = Math.hypot(x2 - x1, y2 - y1);
      const pts = quebrada(x1, y1, x2, y2, Math.min(largo * .22, 16) + 2);
      let d = aPath(pts);
      if (Math.random() < .5 && pts.length > 6) {                       // ramal
        const k = 2 + Math.floor(Math.random() * (pts.length - 4));
        const o = pts[k], ang = Math.atan2(y2 - y1, x2 - x1) + rand(-1.1, 1.1), l = rand(largo * .18, largo * .4);
        d += aPath(quebrada(o[0], o[1], o[0] + Math.cos(ang) * l, o[1] + Math.sin(ang) * l, 6));
      }
      const g = mk('g', { class: 'il-bolt' });
      g.append(mk('path', { d, class: 'il-bolt__p il-bolt__p--glow' }), mk('path', { d, class: 'il-bolt__p il-bolt__p--core' }));
      rayosG.append(g);
      rayosActivos++;
      g.animate([{ opacity: 1 }, { opacity: .25 }, { opacity: 1 }, { opacity: .5 }, { opacity: 0 }],
        { duration: vida || rand(90, 190), easing: 'linear' }).onfinish = () => { g.remove(); rayosActivos--; };
      destello = Math.min(.5, destello + .16);
    }

    // ---------- pelea por el brillo de pantalla ----------
    let destello = 0;

    // ---------- estado tipo consola ----------
    let tipeo;
    function decir(txt, enLinea) {
      clearInterval(tipeo);
      estadoEl.classList.toggle('is-online', !!enLinea);
      let i = 0;
      const final = txt.replace('INCConnection Lab', '<b>INCConnection Lab</b>');
      estadoTexto.innerHTML = '<span class="intro__caret"></span>';
      tipeo = setInterval(() => {
        i++;
        estadoTexto.innerHTML = (i >= txt.length ? final : txt.slice(0, i)) + (i >= txt.length && enLinea ? '' : '<span class="intro__caret"></span>');
        if (i >= txt.length) clearInterval(tipeo);
      }, 22);
    }

    // ---------- electrones ----------
    // Posicion, tamano y opacidad en la posicion s de la orbita; misma formula
    // de antes (profundidad, mezcla con la posicion del arte al arrancar y
    // disolucion via vis).
    function colocar(e, vNorm) {
      const s = ((e.s % e.L) + e.L) % e.L;
      const p = puntoTabla(e.tab, s);
      const w = Math.max(0, 1 - vNorm);
      const x = p.x + e.off.x * w, y = p.y + e.off.y * w;
      const k = e.orb;
      const prof = (-(x - k[0]) * Math.sin(e.th) + (y - k[1]) * Math.cos(e.th)) / k[3];      // -1 (atrás) .. 1 (adelante)
      e.x = x; e.y = y;
      e.k = (1 + .16 * prof) * (.25 + .75 * e.vis);
      e.op = (.82 + .18 * prof) * e.vis;
      e.sDash = s;
      e.colaOp = Math.min(1, vNorm) * .9 * e.vis;
    }

    function dibujarCola(e) {
      if (e.colaOp <= 0) return;
      g2d.setLineDash([e.tl, e.L - e.tl]);
      g2d.lineDashOffset = e.v > 0 ? (e.tl - e.sDash) : -e.sDash;
      g2d.globalAlpha = e.colaOp;
      g2d.strokeStyle = tokAcento;
      g2d.lineWidth = 1.1;
      g2d.stroke(e.ruta);
    }

    // Aparicion en la intro (antes la animacion CSS il-brotar: escala de 0 a 1
    // con rebote; mientras dura, la opacidad sigue a la aparicion).
    function dibujarElectron(e, ahora) {
      let esc = 1, op = e.op;
      if (introAnimada) {
        const t = (ahora - introInicio) / 1000 - e.brotar;
        if (t < 0) return;
        if (t < .5) { esc = EASE_BROTAR(t / .5); op = clamp(esc); }
      }
      const r = e.r0 * e.k * esc;
      if (r <= 0 || op <= 0) return;
      g2d.globalAlpha = op;
      g2d.fillStyle = tokLogo;
      g2d.beginPath();
      g2d.arc(e.x, e.y, r, 0, Math.PI * 2);
      g2d.fill();
    }

    // ---------- brillo periódico ----------
    let brilloT = -1;
    const brillo = () => { brilloT = performance.now(); arrancar(); };

    // ---------- línea de tiempo ----------
    let idle = false, listo = false, moverDesde = Infinity, impulsoHasta = 0;
    let introAnimada = false, introInicio = 0;

    function marcarListo() {
      if (listo) return;
      listo = true;
      raiz.classList.add('is-listo');
    }

    // Efectos de reposo: cada uno se reprograma solo, con los mismos
    // intervalos al azar que antes se chequeaban en cada cuadro. Si el
    // escenario no se ve (o el logo esta disuelto) se saltea el efecto.
    const enReposo = () => idle && ps < .01 && puedeCorrer();
    function cicloPulso() {
      if (enReposo()) {
        const t = trazas[Math.random() < .35 ? 3 : Math.floor(Math.random() * trazas.length)];
        pulso(t, t.L / rand(95, 150));
      }
      prog(cicloPulso, rand(450, 1150));
    }
    function cicloOnda() {
      if (enReposo()) { const r = anillos[Math.floor(Math.random() * anillos.length)]; const c = centro(r); onda(c.x, c.y, c.s, 2.4); }
      prog(cicloOnda, rand(1600, 3200));
    }
    function cicloBrillo() {
      if (enReposo()) brillo();
      prog(cicloBrillo, 8000);
    }

    function reposo() {
      idle = true;
      raiz.classList.add('is-idle');
      prog(cicloPulso, 300); prog(cicloOnda, 1500); prog(cicloBrillo, 8000);
      arrancar();
    }

    function reproducir() {
      limpiarTimers();
      efectos = []; chispazos = [];
      rayosG.replaceChildren();
      rayosActivos = 0;
      raiz.classList.remove('il-play', 'il-saltar', 'is-listo', 'is-idle');
      void svg.getBoundingClientRect();
      idle = false; listo = false;
      for (const e of electrones) { e.s = e.s0; e.vis = 1; colocar(e, 0); }
      if (reduceMotion) { estatico(); return; }
      raiz.classList.add('il-play');
      introAnimada = true;
      introInicio = performance.now();
      moverDesde = introInicio + T_ORBITAS * 1000;
      decir('iniciando secuencia');
      en(.45, () => decir('sincronizando engranaje'));
      en(1.05, () => decir('enlazando circuitos'));
      en(2.0, () => decir('energizando módulo on'));
      en(2.5, () => decir('cargando laboratorio'));
      // una chispa corre por delante de cada circuito mientras se dibuja
      for (const t of trazas) pulso(t, t.dur * (t.L + 18) / t.L, t.inicio);
      en(2.95, () => { onda(544.65, 75, 6, 4); onda(544.65, 75, 10, 3.2); });
      en(3.3, () => electrones.forEach(e => onda(e.x0, e.y0, e.r0, 2.2)));
      en(T_LISTO, () => { brillo(); decir('INCConnection Lab en línea', true); marcarListo(); });
      en(T_REPOSO, reposo);
      arrancar();
    }

    // Logo completo al instante (volver a la pantalla, mover el scroll antes de que termine la intro)
    function saltar() {
      limpiarTimers();
      raiz.classList.add('il-play', 'il-saltar');
      introAnimada = false;
      moverDesde = performance.now();
      clearInterval(tipeo);
      estadoEl.classList.add('is-online');
      estadoTexto.innerHTML = '<b>INCConnection Lab</b> en línea';
      marcarListo();
      reposo();
      arrancar();
    }

    function estatico() {
      raiz.classList.add('intro--estatico');
      introAnimada = false;
      clearInterval(tipeo);
      estadoEl.classList.add('is-online');
      estadoTexto.innerHTML = '<b>INCConnection Lab</b> en línea';
      marcarListo();
      raiz.classList.add('is-idle');
      for (const e of electrones) colocar(e, 1);
      repintar();
    }

    // Ráfaga de energía: pulsos por todos los circuitos, ondas en los anillos y electrones acelerados
    function rafaga(rapida) {
      trazas.forEach((t, i) => pulso(t, Math.max(rapida ? .45 : .6, t.L / (rapida ? 420 : 260)), i * (rapida ? .04 : .06)));
      anillos.forEach((r, i) => { const c = centro(r); prog(() => onda(c.x, c.y, c.s, 2.6), i * (rapida ? 50 : 60)); });
      impulsoHasta = performance.now() + (rapida ? 1400 : 1600);
      arrancar();
    }

    function descarga() {
      if (reduceMotion || ps > .02) return;
      rafaga(false);
      brillo();
      for (const s of capas) { s.classList.remove('il-surge'); void s.getBoundingClientRect(); s.classList.add('il-surge'); }
      prog(() => capas.forEach(s => s.classList.remove('il-surge')), 850);
    }

    // ---------- scroll: progreso de la disolución ----------
    let corre = 0, arriba = 0, ps = 0, pt = 0, actividad = 0, primero = true, presupuesto = 0, temblor = 0;
    // Modo ligero: si los cuadros tardan demasiado mientras se disuelve (equipos lentos) se quitan los
    // brillos con filtro y se reducen rayos y chispas.
    let ligero = false, dtMedia = 0, disolviendo = false;

    let hojaArriba = Infinity;                                    // dónde (en el documento) empieza la hoja que cubre el escenario
    // Posicion de scroll guardada: leer pageYOffset con estilos pendientes
    // fuerza un layout de toda la pagina, y cubierto() se consulta cada vez
    // que nace un efecto (medido: ~90 ms de layouts forzados en la intro).
    // Se actualiza en cada evento de scroll, al medir y en cada cuadro.
    let yScroll = window.pageYOffset || root.scrollTop;
    const leerScroll = () => (yScroll = window.pageYOffset || root.scrollTop);
    function medir() {
      leerScroll();
      corre = raiz.offsetHeight - escenario.offsetHeight;
      arriba = raiz.getBoundingClientRect().top + yScroll;
      if (destino) hojaArriba = destino.getBoundingClientRect().top + yScroll;
    }
    // Con la hoja de colecciones ocupando toda la pantalla el escenario no se ve: no hay nada que animar
    const cubierto = () => yScroll >= hojaArriba - 1;
    function progresoScroll() {
      if (corre < 60) return 0;
      const y = leerScroll() - arriba;
      return clamp((y - corre * MUERTA) / (corre * FIN_PISTA - corre * MUERTA));
    }

    function piezaCerca(x) {
      let mejor = null, d0 = 1e9;
      for (let i = 0; i < 6; i++) {
        const p = piezas[Math.floor(Math.random() * piezas.length)];
        const d = Math.abs(p.cx - x);
        if (d < d0) { d0 = d; mejor = p; }
      }
      return mejor;
    }

    function disolver(p, dt, ahora, sinEfectos) {
      const a = suave(0, 1, p);
      const f = -80 + a * 960;                                 // posición del frente (unidades del logo)
      const activo = p > .003 && p < .997;
      for (const pz of piezas) {
        const u = clamp((f - pz.ini) / (pz.fin - pz.ini));
        const enVentana = u > 0 && u < 1;
        if (enVentana && ahora >= pz.prox) {
          pz.flick = Math.random() < .22 ? rand(.2, .6) : 1;
          pz.prox = ahora + rand(40, 110);
          pz.forzar = true;
        } else if (!enVentana && pz.flick !== 1) {
          pz.flick = 1; pz.forzar = true;
        }
        if (u !== pz.u || pz.forzar) {
          if (!sinEfectos && ((pz.u === 0 && u > 0) || (pz.u === 1 && u < 1))) {           // la pieza empieza a irse (o a volver)
            if (pz.tipo === 'forma' || pz.tipo === 'engranaje') {
              chispas(pz.cx, pz.cy, 5, 30);
              rayo(f, pz.cy + rand(-30, 30), pz.cx, pz.cy, rand(110, 200));
            } else if (pz.tipo === 'nodo') chispas(pz.cx, pz.cy, 2, 14);
          }
          pz.u = u; pz.forzar = false;
          APLICAR[pz.tipo](pz, u);
        }
      }

      // frente de energía
      const brilloFrente = activo ? clamp(actividad * 7 + .22, 0, 1) : 0;
      frenteEl.setAttribute('cx', f.toFixed(1));
      frenteEl.style.opacity = brilloFrente.toFixed(2);

      // rayos: más con movimiento, un crepitar suave cuando se queda quieto a medias
      if (activo && !sinEfectos) {
        presupuesto += (5 + 45 * clamp(actividad * 6, 0, 1)) * dt;
        while (presupuesto >= 1) {
          presupuesto -= 1;
          const x1 = f + rand(-18, 18), y1 = rand(2, 150), r = Math.random();
          let x2, y2;
          if (r < .5) { x2 = x1 + rand(-100, 100); y2 = rand(0, 152); }
          else if (r < .86) { const z = piezaCerca(x1); x2 = z.cx; y2 = z.cy; }
          else { x2 = x1 + rand(-50, 50); y2 = Math.random() < .5 ? rand(-45, -8) : rand(160, 205); }
          rayo(x1, y1, x2, y2);
        }
        temblor = clamp(actividad * 5, 0, 1) * 1.6;
        host.style.transform = temblor > .02 ? 'translate(' + rand(-temblor, temblor).toFixed(2) + 'px,' + rand(-temblor, temblor).toFixed(2) + 'px)' : '';
      } else if (temblor) {
        temblor = 0; host.style.transform = '';
      }

      // textos y fondo
      estadoEl.style.opacity = p ? (1 - clamp(p * 7)).toFixed(3) : '';
      if (cue) cue.style.opacity = p ? (1 - clamp(p * 9)).toFixed(3) : '';
      if (marca) marca.style.opacity = p ? (1 - clamp(p * 2.4)).toFixed(3) : '';
      return activo;
    }

    // ---------- pausa de todo lo que anima cuando no se ve ----------
    // Tapado por la hoja, fuera de pantalla o pestana oculta: se pausan las
    // animaciones CSS y WAAPI del escenario que estaban corriendo (y solo
    // esas: reanudar una animacion ya terminada la repetiria) y el bucle del
    // canvas se detiene (puedeCorrer). Si la hoja lo cubre por completo,
    // ademas deja de pintarse (.is-cubierto en logo-intro.css).
    let pausado = false;
    const pausadas = new Set();
    function pausar(si) {
      if (si === pausado || !raiz.getAnimations) return;
      pausado = si;
      if (si) {
        for (const a of raiz.getAnimations({ subtree: true })) {
          if (a.playState === 'running') { a.pause(); pausadas.add(a); }
        }
      } else {
        for (const a of pausadas) if (a.playState === 'paused') a.play();
        pausadas.clear();
      }
    }

    // ---------- bucle ----------
    let visible = true, raf = 0, ultimo = 0, estabaCubierto = false;
    const puedeCorrer = () => visible && !document.hidden && !cubierto();
    function actualizarVisibilidad() {
      const c = cubierto();
      if (c !== estabaCubierto) { estabaCubierto = c; raiz.classList.toggle('is-cubierto', c); }
      raiz.classList.toggle('is-oculto', !visible || c);
      pausar(!puedeCorrer());
    }
    function alScroll() {
      leerScroll();
      if (cubierto() !== estabaCubierto) actualizarVisibilidad();
      arrancar();
    }
    function arrancar() {
      if (raf || reduceMotion || !puedeCorrer()) return;
      ultimo = performance.now();
      raf = requestAnimationFrame(cuadro);
    }

    function cuadro(ahora) {
      raf = 0;
      if (!puedeCorrer()) return;
      const dtReal = (ahora - ultimo) / 1000;
      const dt = Math.min(.05, dtReal);
      ultimo = ahora;

      // progreso de scroll suavizado: así un gesto rápido igual recorre la disolución
      pt = progresoScroll();
      const ps0 = ps;
      let sinEfectos = false;
      if (primero) { ps = pt; primero = false; sinEfectos = pt > .02; }     // al aterrizar ya disuelto: estado final sin ráfaga de chispas
      else ps += (pt - ps) * (1 - Math.exp(-dt / .085));
      if (Math.abs(pt - ps) < .0006) ps = pt;
      const vel = dt > 0 ? Math.abs(ps - ps0) / dt : 0;
      actividad += (vel - actividad) * (1 - Math.exp(-dt / .14));
      if (actividad < .002) actividad = 0;

      if (ps > .004 && !listo) saltar();                      // se movió el scroll antes de que terminara la intro

      const hayDisolucion = !reduceMotion && (ps > 0 || piezas.some(p => p.u !== 0));
      if (hayDisolucion !== disolviendo) {
        disolviendo = hayDisolucion;
        raiz.classList.toggle('is-disolviendo', disolviendo);
        if (disolviendo && idle && !ligero && ps < .15) rafaga(true);   // al empezar a irse, la energía corre por los circuitos
      }
      let frenteActivo = false;
      if (hayDisolucion) {
        frenteActivo = disolver(ps, dt, ahora, sinEfectos);
        if (!ligero && actividad > .01) {
          dtMedia += (dtReal - dtMedia) * .1;
          if (dtMedia > .036) { ligero = true; raiz.classList.add('is-ligero'); }
        }
      }

      // electrones (con las tres orbitas disueltas del todo no se ven: quedan quietos)
      let electronesVivos = false;
      if (!reduceMotion && ahora > moverDesde && electrones.some(e => e.vis > 0)) {
        const rampa = Math.min(1, (ahora - moverDesde) / RAMPA_MS);
        const impulso = ahora < impulsoHasta ? 3.2 : 1;
        for (const e of electrones) { e.s += e.v * dt * rampa * rampa * impulso; colocar(e, rampa); }
        electronesVivos = true;
      }

      // brillo que recorre el logo
      if (brilloT > 0) {
        const k = (ahora - brilloT) / 1500;
        if (k >= 1) { brilloT = -1; shineUse.style.opacity = 0; }
        else {
          const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          shineGrad.setAttribute('gradientTransform', 'translate(' + (-160 + e * 1100).toFixed(1) + ' 0)');
          shineUse.style.opacity = tokShine;
        }
      }

      // destello de pantalla con cada rayo
      if (destello > .004 || flashEl.style.opacity) {
        destello *= Math.exp(-dt / .12);
        flashEl.style.opacity = destello > .004 ? (destello * tokFlash).toFixed(3) : '';
      }

      dibujar(ahora);

      // ¿Hace falta otro cuadro? (en reposo los electrones nunca paran, salvo
      // con el logo disuelto o el escenario fuera de vista)
      const brotando = introAnimada && ahora < introInicio + (T_ORBITAS + .8) * 1000;
      const seguir = electronesVivos || brotando || efectos.length > 0 || chispazos.length > 0 ||
        brilloT > 0 || destello > .004 || !!flashEl.style.opacity || !!temblor ||
        ps !== pt || actividad > 0 || frenteActivo || (hayDisolucion && piezas.some(p => p.flick !== 1));
      if (seguir) raf = requestAnimationFrame(cuadro);
    }

    // ---------- interacción ----------
    const escuchas = [];
    const escuchar = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); escuchas.push(() => t.removeEventListener(ev, fn, o)); };

    escuchar(document, 'visor:tema', leerTokens);
    if (window.matchMedia) escuchar(window.matchMedia('(prefers-color-scheme: dark)'), 'change', leerTokens);
    escuchar(window, 'scroll', alScroll, { passive: true });
    escuchar(window, 'resize', () => { medir(); medirLienzo(); actualizarVisibilidad(); arrancar(); });
    escuchar(document, 'visibilitychange', () => { actualizarVisibilidad(); arrancar(); });
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => { medir(); medirLienzo(); });
      ro.observe(escenario); ro.observe(raiz); ro.observe(host);
      escuchas.push(() => ro.disconnect());
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entradas => {
        visible = entradas[entradas.length - 1].isIntersecting;
        actualizarVisibilidad();
        if (visible) arrancar();
      });
      io.observe(escenario);
      escuchas.push(() => io.disconnect());
    }

    if (!reduceMotion && mq('(pointer: fine)') && inclinar) {
      escuchar(escenario, 'pointermove', ev => {
        const r = escenario.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5;
        inclinar.style.setProperty('--ry', (x * 8).toFixed(2) + 'deg');
        inclinar.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
      });
      escuchar(escenario, 'pointerleave', () => { inclinar.style.setProperty('--ry', '0deg'); inclinar.style.setProperty('--rx', '0deg'); });
    }
    if (inclinar) escuchar(inclinar, 'click', descarga);

    // Deslizamiento propio (más lento al arrancar que el nativo) para que, al usar
    // la indicación, la disolución alcance a verse. Cualquier gesto del usuario lo corta.
    let cancelarDeslizar = null;
    function deslizarA(y) {
      if (cancelarDeslizar) cancelarDeslizar();
      const y0 = window.pageYOffset || root.scrollTop, dist = y - y0;
      if (reduceMotion || Math.abs(dist) < 4) { window.scrollTo(0, y); return; }
      const dur = clamp(Math.abs(dist) * 1.3, 700, 1700), t0 = performance.now();
      let activo = true;
      const eventos = ['wheel', 'touchstart', 'keydown', 'mousedown'];
      const parar = () => { activo = false; eventos.forEach(ev => window.removeEventListener(ev, parar)); cancelarDeslizar = null; };
      cancelarDeslizar = parar;
      eventos.forEach(ev => window.addEventListener(ev, parar, { passive: true }));
      (function paso(ahora) {
        if (!activo) return;
        const k = Math.min(1, (ahora - t0) / dur);
        window.scrollTo(0, y0 + dist * (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2));
        if (k < 1) requestAnimationFrame(paso); else parar();
      })(t0);
    }

    if (cue && destino) {
      escuchar(cue, 'click', ev => {
        ev.preventDefault();
        deslizarA(destino.getBoundingClientRect().top + (window.pageYOffset || root.scrollTop));
        if (foco) setTimeout(() => foco.focus({ preventScroll: true }), reduceMotion ? 0 : 1700);
      });
    }

    // ---------- arranque ----------
    leerTokens();
    medir();
    medirLienzo();
    if (opc.saltar) { if (reduceMotion) estatico(); else saltar(); }
    else reproducir();
    arrancar();

    return {
      reproducir,
      saltar,
      medir: () => { medir(); medirLienzo(); actualizarVisibilidad(); },
      get progreso() { return ps; },
      destruir() {
        limpiarTimers();
        clearInterval(tipeo);
        if (raf) cancelAnimationFrame(raf);
        escuchas.forEach(f => f());
      }
    };
  }

  window.VisorLogoIntro = { montar };
})();
