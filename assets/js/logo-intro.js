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
// Rendimiento: el bucle de animación se detiene cuando el escenario sale de
// pantalla o la pestaña se oculta; los brillos se dibujan con trazos
// apilados (los filtros SVG solo se usan en grupos chicos: botón "on" y rayos).
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

  // --- Guion de la intro (segundos) --------------------------------------
  // Circuitos: [retraso, velocidad en unidades/s]
  const TRAZAS = { 'il-t1': [0.25, 140], 'il-t2': [0.35, 140], 'il-t3': [0.45, 140], 'il-t4': [1.0, 320], 'il-t5': [1.55, 170] };
  const PALABRA = ['C1', 'C2', 'accent', 'o', 'n1', 'n2', 'e', 'c', 't', 'i', 'idot'];
  const DEMORA_LAB = { L: 2.2, a: 2.3, b: 2.4, flask: 2.55 };
  const NEON = { on_o: [2.05, .9], on_n: [2.15, .9], stick: [2.4, .55] };
  const T_LISTO = 3.75;     // el logo está completo: "en línea" + aparece la indicación de scroll
  const T_REPOSO = 4.2;     // empiezan los efectos de reposo
  const T_ORBITAS = 3.5;    // los electrones arrancan

  // --- Disolución por scroll ----------------------------------------------
  const BANDA = 60;         // ancho (unidades del logo) por delante del frente donde una pieza empieza a cargarse
  const MUERTA = .02;       // fracción de la pista (una pantalla) sin efecto: un roce no dispara nada
  const FIN_PISTA = .36;    // fracción de la pista en la que el logo ya se disolvió del todo
  const MAX_RAYOS = 12;

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
    const $ = s => svg.querySelector(s);
    const $$ = s => [...svg.querySelectorAll(s)];
    const pulsosG = $('#il-pulses');
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
    const trazas = $$('.il-trace').map(el => {
      const [inicio, vel] = TRAZAS[el.id];
      const L = el.getTotalLength();
      const muestras = [];
      for (let s = 0; s <= L; s += 1) muestras.push([s, el.getPointAtLength(s)]);
      const t = { el, id: el.id, d: el.getAttribute('d'), L, inicio, vel, dur: L / vel, muestras, paradas: [], fin: el.getPointAtLength(L) };
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

    // los electrones recorren su órbita por longitud de arco
    const DIR = [1, -1, 1], PERIODO = [6.2, 4.9, 4.3];
    const electrones = [0, 1, 2].map(i => {
      const path = $('#il-o' + i), el = $('#il-e' + i), cola = $('#il-tail' + i);
      const L = path.getTotalLength(), x0 = +el.getAttribute('cx'), y0 = +el.getAttribute('cy');
      let mejor = 1e9, s0 = 0;
      for (let s = 0; s < L; s += .5) {
        const p = path.getPointAtLength(s);
        const d = Math.hypot(p.x - x0, p.y - y0);
        if (d < mejor) { mejor = d; s0 = s; }
      }
      const tl = L * .22;
      cola.style.strokeDasharray = tl + ' ' + (L - tl);
      fijar(el, 3.25 + i * .1);
      return { path, el, cola, L, s0, s: s0, v: DIR[i] * L / PERIODO[i], r0: +el.dataset.r, x0, y0, tl, vis: 1, off: null, orb: DATOS.orbitas[i] };
    });

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
    let tokAcento = '#63D6FF', tokFlash = 0, tokShine = .6;
    function leerTokens() {
      const cs = getComputedStyle(root);
      tokAcento = cs.getPropertyValue('--il-accent').trim() || tokAcento;
      tokFlash = parseFloat(cs.getPropertyValue('--il-flash')) || 0;
      tokShine = parseFloat(cs.getPropertyValue('--il-shine')) || .6;
    }
    leerTokens();
    const acento = () => tokAcento;

    function onda(x, y, r, grande) {
      const c = mk('circle', { cx: x, cy: y, r, class: 'il-ping' });
      pulsosG.appendChild(c);
      c.animate([{ transform: 'scale(1)', opacity: .95 }, { transform: 'scale(' + (grande || 3.2) + ')', opacity: 0 }],
        { duration: 900, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => c.remove();
    }

    function brillar(n) {
      const a = acento();
      const k = n.classList.contains('il-ring') ? { stroke: a } : { fill: a };
      n.animate([{ transform: 'none' }, Object.assign({ transform: 'scale(1.4)', offset: .3 }, k), { transform: 'none' }], { duration: 520, easing: 'ease-out' });
    }

    // Temporizadores pendientes (se cancelan al saltar la intro); los ya disparados se olvidan
    const timers = new Set();
    const limpiarTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
    const prog = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
    const en = (s, fn) => prog(fn, s * 1000);

    function pulso(t, dur, retraso) {
      const T = 18, Tc = 5, L = t.L;
      const capas = [['il-pulse il-pulse--halo', T], ['il-pulse il-pulse--mid', T * .6], ['il-pulse il-pulse--core', Tc]].map(([cls, largo]) => {
        const p = mk('path', { d: t.d, class: cls });
        p.style.strokeDasharray = largo + ' ' + (L + T + 20);
        p.style.strokeDashoffset = largo;
        pulsosG.appendChild(p);
        return [p, largo];
      });
      const o = { duration: dur * 1000, delay: (retraso || 0) * 1000, easing: 'linear', fill: 'both' };
      capas.forEach(([p, largo], i) => {
        const a = p.animate([{ strokeDashoffset: largo }, { strokeDashoffset: -L - T + largo }], o);
        if (i === capas.length - 1) a.onfinish = () => capas.forEach(([q]) => q.remove());
      });
      const v = (L + T) / dur;                          // velocidad de la cabeza del pulso
      for (const st of t.paradas) prog(() => brillar(st.n), ((retraso || 0) + st.s / v) * 1000);
      prog(() => {
        onda(t.fin.x, t.fin.y, 2.4);
        if (t.id === 'il-t4' && punto) brillar(punto);
      }, ((retraso || 0) + L / v) * 1000);
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
    function colocar(e, vNorm) {
      const s = ((e.s % e.L) + e.L) % e.L;
      const p = e.path.getPointAtLength(s);
      if (!e.off) e.off = { x: e.x0 - p.x, y: e.y0 - p.y };            // en el arte el núcleo queda apenas fuera de su órbita
      const w = Math.max(0, 1 - vNorm);
      const x = p.x + e.off.x * w, y = p.y + e.off.y * w;
      const k = e.orb, th = k[4] * Math.PI / 180;
      const prof = (-(x - k[0]) * Math.sin(th) + (y - k[1]) * Math.cos(th)) / k[3];      // -1 (atrás) .. 1 (adelante)
      e.el.setAttribute('cx', x.toFixed(2));
      e.el.setAttribute('cy', y.toFixed(2));
      e.el.setAttribute('r', (e.r0 * (1 + .16 * prof) * (.25 + .75 * e.vis)).toFixed(2));
      e.el.style.opacity = ((.82 + .18 * prof) * e.vis).toFixed(2);
      e.cola.style.strokeDashoffset = e.v > 0 ? (e.tl - s) : -s;
      e.cola.style.opacity = (Math.min(1, vNorm) * .9 * e.vis).toFixed(2);
    }

    // ---------- brillo periódico ----------
    let brilloT = -1;
    const brillo = () => { brilloT = performance.now(); };

    // ---------- línea de tiempo ----------
    let idle = false, listo = false, moverDesde = Infinity, proxPulso = 0, proxOnda = 0, proxBrillo = 0, impulsoHasta = 0;

    function marcarListo() {
      if (listo) return;
      listo = true;
      raiz.classList.add('is-listo');
    }

    function reposo() {
      idle = true;
      raiz.classList.add('is-idle');
      const n = performance.now();
      proxPulso = n + 300; proxOnda = n + 1500; proxBrillo = n + 8000;
    }

    function reproducir() {
      limpiarTimers();
      pulsosG.replaceChildren();
      rayosG.replaceChildren();
      rayosActivos = 0;
      raiz.classList.remove('il-play', 'il-saltar', 'is-listo', 'is-idle');
      void svg.getBoundingClientRect();
      idle = false; listo = false;
      for (const e of electrones) { e.s = e.s0; e.vis = 1; colocar(e, 0); e.cola.style.opacity = 0; }
      if (reduceMotion) { estatico(); return; }
      raiz.classList.add('il-play');
      moverDesde = performance.now() + T_ORBITAS * 1000;
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
      clearInterval(tipeo);
      estadoEl.classList.add('is-online');
      estadoTexto.innerHTML = '<b>INCConnection Lab</b> en línea';
      marcarListo();
      raiz.classList.add('is-idle');
      for (const e of electrones) colocar(e, 1);
    }

    // Ráfaga de energía: pulsos por todos los circuitos, ondas en los anillos y electrones acelerados
    function rafaga(rapida) {
      trazas.forEach((t, i) => pulso(t, Math.max(rapida ? .45 : .6, t.L / (rapida ? 420 : 260)), i * (rapida ? .04 : .06)));
      anillos.forEach((r, i) => { const c = centro(r); prog(() => onda(c.x, c.y, c.s, 2.6), i * (rapida ? 50 : 60)); });
      impulsoHasta = performance.now() + (rapida ? 1400 : 1600);
    }

    function descarga() {
      if (reduceMotion || ps > .02) return;
      rafaga(false);
      brillo();
      svg.classList.remove('il-surge'); void svg.getBoundingClientRect(); svg.classList.add('il-surge');
      prog(() => svg.classList.remove('il-surge'), 850);
    }

    // ---------- scroll: progreso de la disolución ----------
    let corre = 0, arriba = 0, ps = 0, pt = 0, actividad = 0, primero = true, presupuesto = 0, temblor = 0;
    // Modo ligero: si los cuadros tardan demasiado mientras se disuelve (equipos lentos) se quitan los
    // brillos con filtro y se reducen rayos y chispas.
    let ligero = false, dtMedia = 0, disolviendo = false;

    let hojaArriba = Infinity;                                    // dónde (en el documento) empieza la hoja que cubre el escenario
    function medir() {
      corre = raiz.offsetHeight - escenario.offsetHeight;
      arriba = raiz.getBoundingClientRect().top + (window.pageYOffset || root.scrollTop);
      if (destino) hojaArriba = destino.getBoundingClientRect().top + (window.pageYOffset || root.scrollTop);
    }
    // Con la hoja de colecciones ocupando toda la pantalla el escenario no se ve: no hay nada que animar
    const cubierto = () => (window.pageYOffset || root.scrollTop) >= hojaArriba - 1;
    function progresoScroll() {
      if (corre < 60) return 0;
      const y = (window.pageYOffset || root.scrollTop) - arriba;
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
    }

    // ---------- bucle ----------
    let visible = true, raf = 0, ultimo = 0, estabaCubierto = false;
    const puedeCorrer = () => visible && !document.hidden && !cubierto();
    function alScroll() {
      const c = cubierto();
      if (c !== estabaCubierto) { estabaCubierto = c; raiz.classList.toggle('is-oculto', !visible || c); }
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

      // electrones
      if (!reduceMotion && ahora > moverDesde) {
        const rampa = Math.min(1, (ahora - moverDesde) / 1400);
        const impulso = ahora < impulsoHasta ? 3.2 : 1;
        for (const e of electrones) { e.s += e.v * dt * rampa * rampa * impulso; colocar(e, rampa); }
      }

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
      if (hayDisolucion) {
        disolver(ps, dt, ahora, sinEfectos);
        if (!ligero && actividad > .01) {
          dtMedia += (dtReal - dtMedia) * .1;
          if (dtMedia > .036) { ligero = true; raiz.classList.add('is-ligero'); }
        }
      }

      // reposo
      if (idle && ps < .01) {
        if (ahora > proxPulso) {
          const t = trazas[Math.random() < .35 ? 3 : Math.floor(Math.random() * trazas.length)];
          pulso(t, t.L / rand(95, 150));
          proxPulso = ahora + rand(450, 1150);
        }
        if (ahora > proxOnda) { const r = anillos[Math.floor(Math.random() * anillos.length)]; const c = centro(r); onda(c.x, c.y, c.s, 2.4); proxOnda = ahora + rand(1600, 3200); }
        if (ahora > proxBrillo) { brillo(); proxBrillo = ahora + 8000; }
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

      raf = requestAnimationFrame(cuadro);
    }

    // ---------- interacción ----------
    const escuchas = [];
    const escuchar = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); escuchas.push(() => t.removeEventListener(ev, fn, o)); };

    escuchar(document, 'visor:tema', leerTokens);
    if (window.matchMedia) escuchar(window.matchMedia('(prefers-color-scheme: dark)'), 'change', leerTokens);
    escuchar(window, 'scroll', alScroll, { passive: true });
    escuchar(window, 'resize', () => { medir(); arrancar(); });
    escuchar(document, 'visibilitychange', arrancar);
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => medir());
      ro.observe(escenario); ro.observe(raiz);
      escuchas.push(() => ro.disconnect());
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entradas => {
        visible = entradas[entradas.length - 1].isIntersecting;
        raiz.classList.toggle('is-oculto', !visible || cubierto());
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
    medir();
    if (opc.saltar) { if (reduceMotion) estatico(); else saltar(); }
    else reproducir();
    arrancar();

    return {
      reproducir,
      saltar,
      medir,
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
