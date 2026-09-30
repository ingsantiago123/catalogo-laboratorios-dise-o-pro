# Visor

# catalogo-laboratorios-dise-o-pro

Área de laboratorios del sitio, organizada en 3 pantallas — **las 3 viven
acá adentro, en `visor/`**, y **ninguna de las 3 hace `fetch()`**. Hay un
único punto de carga de datos en TODO el sitio: el `index.html` de la raíz
del proyecto. Desde ahí en adelante, todo viaja por `window.name` — el
mismo mecanismo que `prueba.html` demuestra con un `<iframe name='{...}'>`,
aplicado a la navegación real.

`visor/` vive en la **raíz del proyecto**, como hermana de `lab-externos/`,
`lab-propios/` y `lab-vivos/`. Esas tres carpetas de módulo **no participan
de la navegación**: son código viejo, previo a este visor, sin ningún link
activo apuntándoles.

## Un solo fetch, en la raíz del sitio

```
index.html (raíz del proyecto)
   │ clic en "Ver Recursos Externos"
   │ (ÚNICO fetch de todo el sitio: Datos/General-labs.json completo)
   │ window.name = JSON.stringify(laboratorios)  -- el array CRUDO, completo
   ▼
visor/index.html      → elegir colección (Externos / Vivos / Propios)
   │  (CERO fetch — lee window.name, cuenta laboratorios.length para "Externos")
   │  clic en "Externos" (link normal — window.name no se toca, sigue igual)
   ▼
visor/programa.html   → elegir programa/carrera
   │  (CERO fetch — lee el MISMO window.name; deriva los 14 programas
   │   recorriendo el campo "Programa(s)" de cada laboratorio, sin
   │   necesitar Datos/Programas.json)
   │  clic en "Ingresar" en un programa
   │  (acá SÍ se reescribe window.name: se reemplaza el array crudo por
   │   el contrato ya filtrado que necesita catalogo.html)
   ▼
visor/catalogo.html   → catálogo + ficha de ESE programa
      (CERO fetch — el "visor puro": SOLO lee window.name)
```

`window.name` se fija **una sola vez**, en la raíz del sitio, con el
contenido íntegro de `Datos/General-labs.json`. Ese mismo valor sobrevive
sin tocarlo a través de dos navegaciones (`index.html` → `programa.html`
del visor) porque nada lo reescribe en el camino — recién al elegir un
programa se lo reemplaza por el payload ya filtrado para `catalogo.html`.
No existe ningún otro archivo JSON en la cadena: ni `Datos/Programas.json`
ni `Datos/Colecciones.json` se usan — todo (conteos, lista de programas,
orígenes, catálogo) se deriva del mismo array completo.

Si alguien entra directo a cualquier pantalla de `visor/` sin pasar por el
`index.html` de la raíz (escribiendo la URL a mano, por ejemplo),
`window.name` viene vacío: cada pantalla lo maneja con un estado "no hay
datos" y un link para volver un paso atrás — nunca una pantalla en blanco
ni un error de JS.

### "Volver" sin perder los datos: respaldo en `sessionStorage`

`window.name` es un único casillero por pestaña — cuando `programa.html`
navega para adelante a `catalogo.html`, tiene que reemplazarlo por el
payload de ESE programa (`catalogo.html` no sabe leer otra cosa). Sin nada
más, volver atrás dejaría a `programa.html` con la forma equivocada de dato
y ningún programa para mostrar.

Por eso `index.html` y `programa.html` guardan, además, un **eco local** de
su propio `window.name` en `sessionStorage` de esa misma pestaña (no es una
fuente de datos nueva, ni red, ni otro archivo — es lo mismo que ya había en
`window.name`, solo que no se pierde cuando una pantalla más adelante lo
sobreescribe). Si `window.name` no tiene la forma que la pantalla necesita
al cargar, recurre a ese respaldo antes de rendirse, y lo vuelve a dejar en
`window.name` para que la próxima lectura quede consistente. Con esto,
"Volver" desde `catalogo.html` hasta `programa.html`, o desde ahí hasta
`index.html`, muestra de nuevo los datos reales — no el estado "sin datos".

**Vivos** ya tiene datos reales: cada laboratorio del array puede traer un
campo `tipo` (`"externo"` | `"vivo"` | `"propio"`; sin `tipo` se trata como
`"externo"`, retrocompatible con los 132 laboratorios históricos). Si hay al
menos un ítem `tipo: "vivo"`, la tarjeta "Laboratorios Vivos" de la pantalla
1 se activa sola — mismo `programa.html` (parametrizado por
`?coleccion=vivo`), mismo `catalogo.html`, más una cuarta pantalla propia,
`video.html`, para ver cada video individual (ver §"video.html" más abajo).

**Propios** sigue siendo tarjeta "Próximamente" fija: el flag `tipo:
"propio"` ya se reconoce en los datos, pero todavía no tiene ninguna
pantalla que lo consuma.

```
laboratorio-lading/
├── index.html                 — ÚNICO fetch de todo el sitio (assets/js/index-main.js)
├── Datos/
│   └── General-labs.json      — única fuente de datos real de toda la cadena
├── lab-externos/               (código viejo, sin ningún link activo)
├── lab-propios/
├── lab-vivos/
└── visor/
    ├── index.html               — PANTALLA 1: intro del logo + elegir colección (solo window.name)
    ├── programa.html             — PANTALLA 2: elegir programa (solo window.name)
    ├── catalogo.html             — PANTALLA 3: el visor puro (solo window.name)
    ├── video.html                — PANTALLA 4: un video 'vivo' individual (solo window.name)
    ├── assets/
    │   ├── css/
    │   │   ├── styles.css          — CSS a mano con los tokens de diseño/DESIGN.md (tema claro y oscuro), compartido por las 4 pantallas
    │   │   ├── index-styles.css    — estilos propios de index.html (hoja de colecciones que sube sobre el logo)
    │   │   ├── logo-intro.css      — escenario de la intro del logo (pantalla 1)
    │   │   └── programa-styles.css — estilos propios de programa.html (grilla de programas), sin Tailwind
    │   ├── fonts/                  — Inter y JetBrains Mono autohospedadas (licencia OFL, sin CDN)
    │   └── js/
    │       ├── tema-init.js        — aplica el tema guardado antes de pintar (va en el <head> de las 4 pantallas)
    │       ├── visor-ui.js         — SOLO presentación: íconos SVG, barra institucional, botón de tema, ilustraciones, animaciones
    │       ├── logo-intro-svg.js   — geometría vectorial del logo INCConnection Lab (pantalla 1)
    │       ├── logo-intro.js       — animación del logo: intro, reposo y disolución entre rayos con el scroll (pantalla 1)
    │       ├── index-main.js       — lógica de la pantalla 1
    │       ├── programa-main.js    — lógica de la pantalla 2 (Externos y Vivos, por ?coleccion=)
    │       ├── main.js             — lógica de la pantalla 3: leerEntrada → merge → dispatch → render → hidratar
    │       └── video-main.js       — lógica de la pantalla 4: un solo ítem 'vivo', embed de Drive
    ├── prueba.html                — banco de pruebas de LA CADENA COMPLETA: <iframe> a index.html
    │                                con los 132 laboratorios reales + ejemplos 'vivo' en su name
    │                                (no se versiona — ver .gitignore)
    └── README.md                  — este archivo
```

## Diseño (front)

Las 4 pantallas siguen el sistema de diseño de
[`diseño/DESIGN.md`](./diseño/DESIGN.md): solo tokens `--incca-*` (declarados
en `assets/css/styles.css`), mobile first, contraste AA, foco visible y
`prefers-reduced-motion`. Es un cambio **solo de presentación**: el paso de
datos por `window.name`, el respaldo en `sessionStorage`, los payloads y la
navegación entre pantallas son los mismos de antes.

- **Tema claro y oscuro** y **intro del logo** en la pantalla 1: ver las dos
  secciones siguientes.
- **Sin dependencias externas**: se quitaron Tailwind (CDN), Font Awesome,
  Material Symbols y Google Fonts. Las fuentes están en `assets/fonts/` y los
  íconos son un set SVG propio en `assets/js/visor-ui.js`.
- **`visor-ui.js`** no lee `window.name` ni navega: solo aporta íconos, la
  barra institucional, la ilustración de laboratorio, el cargador y la
  aparición de tarjetas al hacer scroll. Si no cargara, cada pantalla sigue
  funcionando sin adornos (nunca en blanco).
- **Temática de laboratorio**: papel milimetrado en los encabezados; matraz
  con oleaje y burbujas, átomo y molécula en la ilustración; cargador con un
  matraz que se llena; tarjetas sin imagen como portaobjetos.
- **Mejoras de UX en el catálogo**: buscador sin tildes que se combina con
  el filtro de categoría, contador de resultados, estado "sin resultados",
  filtros deslizables en móvil y ficha como hoja inferior en móvil. La ficha
  mueve el foco al abrirse, deja el fondo inerte y devuelve el foco al cerrar.
- **Desviación declarada de DESIGN.md §6/§9**: las animaciones de
  interacción duran ≤ 200 ms, pero la ilustración, el cargador y los estados
  vacíos tienen animaciones ambientales en bucle (más lentas y sutiles,
  pedidas para la temática). Todas animan solo `opacity`/`transform` y se
  apagan con `prefers-reduced-motion`. El escenario del logo (pantalla 1)
  suma una desviación más, declarada abajo.

### Tema claro y oscuro

Las 4 pantallas siguen el tema del sistema (`prefers-color-scheme`) y tienen un
botón sutil (luna/sol, arriba a la derecha) para cambiarlo cuando se quiera.

- **Cómo funciona**: `styles.css` §2b separa la *paleta* (`--incca-*`, los
  valores fijos de DESIGN.md §3) de los *roles de tema* (`--tema-fondo`,
  `--tema-superficie`, `--tema-texto`, …). Los componentes solo usan roles: en
  el tema claro apuntan a la paleta (el visor se ve exactamente como antes) y
  en el oscuro toman los valores de DESIGN.md §3.7. Las zonas que son oscuras
  en los dos temas (pie, reproductor y miniatura de video) usan la paleta
  directa.
- **Preferencia**: sin preferencia guardada manda el sistema. El botón guarda
  la elección en `localStorage` (`visorTema`) solo si difiere del sistema; si
  coincide, vuelve al modo automático. `assets/js/tema-init.js` la aplica en el
  `<head>`, antes del CSS, para que no haya parpadeo. Sin storage (iframe de
  otro sitio, modo privado) el botón funciona igual pero no recuerda la
  elección.
- El botón lo inserta `visor-ui.js` en todas las pantallas y se esconde al
  bajar por la página (vuelve al subir). Con el teclado es el primer elemento
  al que se llega.
- **Un color nuevo que cambie con el tema** se declara como rol en los tres
  bloques de §2b (claro, oscuro por media query y oscuro por atributo). El
  bloque oscuro está duplicado a propósito — CSS no deja compartirlo entre una
  media query y un atributo —: mantener ambos iguales.

### Intro del logo (pantalla 1)

`index.html` abre con el logo INCConnection Lab, vectorizado y animado, y una
indicación «Desliza hacia abajo». Al deslizar, un frente de energía recorre el
logo de izquierda a derecha y lo disuelve pieza por pieza entre rayos mientras
sube la hoja con las colecciones. Es solo presentación: los datos, `window.name`
y la navegación no dependen de ella.

- **Archivos**: `assets/js/logo-intro-svg.js` (geometría del logo),
  `assets/js/logo-intro.js` (animación), `assets/css/logo-intro.css`
  (escenario y tokens `--il-*` de tema claro/oscuro) y
  `assets/css/index-styles.css` (la hoja de colecciones). Es opcional: si los
  dos scripts del logo no cargan, `index-main.js` muestra solo el selector, con
  su propio `<h1>`.
- **Secuencia**: ~4 s de construcción (engranaje, circuitos con una chispa en la
  punta, letras, botón «on» de la «o», átomo) → reposo (pulsos por los
  circuitos, ondas en los anillos, electrones en órbita) → indicación de
  scroll. Con el scroll la disolución es reversible: al subir, el logo se
  reconstruye. Clic o toque sobre el logo = descarga de energía por todos los
  circuitos.
- **Cuándo se ve**: cada vez que se abre la pantalla — primera visita,
  recargar (F5 o recarga automática de Live Server), abrir la dirección o
  embeberla en un iframe — y siempre arranca arriba, en el logo. Única
  excepción: volver desde otra pantalla del visor (enlace «Volver» o botón
  atrás) aterriza directo en las colecciones, con el logo ya armado arriba
  (se reconstruye al subir). Se decide con el tipo de navegación y el
  `referrer`, sin guardar nada. Para ver la intro SIEMPRE, poner
  `SALTAR_INTRO_AL_VOLVER = false` en `index-main.js`.
- **Accesibilidad**: con `prefers-reduced-motion` no hay intro, rayos ni
  disolución (escenario estático, el logo completo y la indicación de scroll).
  El `<h1>` es un texto oculto visualmente, el logo lleva `<title>` y la
  indicación es un enlace con foco visible.
- **Rendimiento**: el bucle de animación se detiene cuando el escenario sale de
  pantalla o la pestaña se oculta; los brillos se dibujan con trazos apilados
  (solo el botón «on» y los rayos usan filtro SVG) y en equipos lentos pasa
  solo a un modo ligero sin filtros.
- **Geometría**: `logo-intro-svg.js` se vectorizó del PNG de
  `logo-incconection-lab/` (engranaje y órbitas del átomo exactos, el resto
  trazado con potrace). Cada pieza tiene su clase `il-*` y se puede editar a
  mano; los colores salen de los tokens `--il-*`.
- **Desviación declarada de DESIGN.md §1/§9** (pedido explícito del proyecto):
  este escenario anima, inclina y disuelve el logo, le suma brillo neón y usa un
  fondo con degradado radial. No se usa así en ninguna otra pantalla.

## `catalogo.html` — el visor puro (pantalla 3)

Este archivo **no hace ningún `fetch()`**, no conoce ninguna carpeta del
proyecto y no asume quién lo usa: es una función pura de lo que reciba en
`window.name`. Ningún archivo de `assets/js/main.js` contiene rutas, nombres
ni textos fijos de ningún módulo — **hoy** lo alimenta `programa.html` (acá
mismo, en `visor/`), pero `catalogo.html` mismo no lo sabe: todo lo que
muestra (título, textos, ítems, badge, y hasta el link de "volver") llega en
el JSON del anfitrión. Sin ese dato, cae en placeholders genéricos
(`"Visor"`, sin link de volver, etc.), nunca en una suposición sobre quién lo
está usando.

### Cómo le llegan los datos (ejemplo actual: `programa.html`)

Hoy, el anfitrión de `catalogo.html` es [`programa.html`](./programa.html)
(la pantalla 2, selector de programa, alimentada por
[`assets/js/programa-main.js`](./assets/js/programa-main.js)). Al hacer
click en "Ingresar", arma el JSON de abajo con los laboratorios de ese
programa — incluido su propio `volver_url` apuntando de vuelta a sí mismo —
hace `window.name = JSON.stringify(datos)` **en la misma pestaña**, y deja
que el link navegue a `catalogo.html`. Como `window.name` persiste a través
de la navegación dentro del mismo frame, `catalogo.html` lo encuentra ahí
apenas carga — sin query string, sin una segunda llamada de red.

Esto es una decisión de `programa.html`, no de `catalogo.html`: mañana otra
colección (Vivos, Propios) podría alimentar exactamente el mismo
`catalogo.html` con su propio `volver_url`, su propio `titulo`, sus propios
ítems — el código de `catalogo.html` no cambiaría en absoluto.

Si abrís `catalogo.html` directo (sin pasar por ningún anfitrión),
`window.name` viene vacío: es el comportamiento esperado, no un error — ver
"Estado sin datos" más abajo.

### Contrato de datos

Objeto raíz + `items[]`, cada ítem con `tipo: "laboratorio"` o `tipo:
"vivo"` (únicos dos tipos soportados hoy; cualquier otro se descarta en
silencio). Debajo, el ejemplo con `"laboratorio"` — el de `"vivo"` está en
su propia sección más abajo:

```jsonc
{
  "titulo": "Laboratorios de Ingeniería de Sistemas",
  "subtitulo": "Red de Convenios & Plataformas Externas",
  "descripcion": "",
  "volver_url": "programa.html",
  "items": [
    {
      "id": "lab-42",
      "tipo": "laboratorio",
      "visible": true,
      "orden": 0,
      "nombre": "Simulador de Circuitos",
      "categoria": "Electricidad, Imanes y Circuitos",
      "origen": "PhET",
      "aplicaA": "Transversal",
      "descripcion": "...",
      "materias": "Materia A (Programa X); Materia B (Programa Y)",
      "modalidad": "Sí (plataforma web, gratuita)",
      "costo": "Gratuito / $0",
      "link": "https://...",
      "imagen": ""
    }
  ]
}
```

#### Campos del objeto raíz

| Campo | Default si falta | Notas |
|---|---|---|
| `titulo` | `"Visor"` | `<h1>` y también el `<title>` de la pestaña |
| `subtitulo` | `""` → no se muestra ningún badge | Badge chico junto al link de "volver"; si no viene, el visor no inventa ninguno |
| `descripcion` | si viene vacío, el visor arma una frase con los `origen` únicos de los `items` recibidos | |
| `volver_url` | `""` → **no se renderiza ningún link de "volver"** | El visor nunca asume a dónde volver; sin este dato, simplemente no hay botón |
| `items` | `[]` → estado "Todavía no hay laboratorios para mostrar." | |

#### Campos de un ítem `tipo: "laboratorio"`

| Campo | Default si falta | Notas |
|---|---|---|
| `id` | `item-<posición>` | Estable = mejor para deep-links a futuro |
| `visible` | `true` | `false` = no se renderiza ni cuenta |
| `orden` | posición en el array | Determina el orden final de la grilla |
| `nombre` | `"Laboratorio sin nombre"` | Título de la tarjeta y de la ficha |
| `categoria` | `"General"` | Badge + filtro por categoría + ícono |
| `origen` | `"Fuente no especificada"` | Badge de plataforma/origen |
| `aplicaA` | `""` | `"Transversal"` → ficha muestra "Sí"; cualquier otro valor no vacío → "No" |
| `descripcion` | `"Descripción no disponible."` | Texto completo en la ficha |
| `materias` | `""` → "Sin materias registradas" | Se separa por `;` para las chips de la ficha |
| `modalidad` | `"—"` | Ficha, columna "Modalidad" |
| `costo` | `"—"` | Ficha, columna "Costo" |
| `link` | `""` → botón "Abrir Recurso Original" oculto | URL externa, se abre en pestaña nueva |
| `imagen` | `""` → esquema de categoría (ícono + nombre) | Si falla la carga de la imagen, cae automáticamente al esquema |

#### Campos de un ítem `tipo: "vivo"`

No comparte ningún campo de contenido con `"laboratorio"` (representan
cosas distintas — un recurso externo vs. una práctica grabada). Al hacer
clic en una tarjeta `vivo`, `catalogo.html` **no abre el modal**: arma un
payload de un solo ítem, lo deja en `window.name` (respaldando antes el
catálogo actual en `sessionStorage` para poder restaurarlo al volver) y
navega a `video.html`, que lo renderiza en su propia página completa.

| Campo | Default si falta | Notas |
|---|---|---|
| `item` | posición en el array | Se muestra como "Práctica N" / "#N" |
| `nombre` | `"Laboratorio en vivo sin nombre"` | Título de la tarjeta y de `video.html` |
| `programa` | `""` | Un solo programa por ítem (no una lista separada por comas) |
| `materia` | `""` | Se usa también como categoría para la barra de filtros |
| `transversalidad` | `""` | `"Transversal"` activa el badge sólido; cualquier otro valor no vacío se muestra tal cual |
| `descripcion` | `"Descripción no disponible."` | Texto completo en la tarjeta (recortado) y en `video.html` (completo) |
| `videoUrl` | `""` → "Video no disponible" | Link de Drive "para compartir"; se convierte a `.../preview` para el `<iframe>` (ver `toEmbedUrlDrive()` en `main.js`/`video-main.js`) |
| `docenteFuente` | `"Fuente no especificada"` | Crédito de la grabación |

### `video.html` — pantalla 4 (un video individual)

Mismo espíritu que `catalogo.html`: **cero `fetch()`**, función pura de lo
que reciba por `window.name` — pero acá el anfitrión (siempre
`catalogo.html`) manda **un solo ítem suelto**, no `{ items: [...] }`.
Sin datos (o con la forma equivocada) muestra el estado "sin datos", nunca
un error. El link "Volver al catálogo" restaura primero el respaldo de
`sessionStorage` (la clave `visorCatalogoRespaldo`) y recién ahí navega, así
`catalogo.html` recupera su propio catálogo en vez de caer al estado vacío.

### Probarla (sin pasar por el index de la raíz)

`prueba.html` ya no apunta a `catalogo.html` en aislado: apunta a
[`index.html`](./index.html), la **Pantalla 1**, con el JSON **completo y
real** de los 132 laboratorios de `Datos/General-labs.json` embebido directo
en el atributo `name` del `<iframe>` — exactamente lo mismo que deja ahí el
único `fetch()` real del sitio (el de la raíz), solo que acá está escrito a
mano en vez de venir de una llamada de red.

Abrí `prueba.html` con Live Server (o similar) y recorré la cadena completa
con clicks reales: Pantalla 1 (conteo real de 132) → Pantalla 2 (los 14
programas, derivados del mismo array) → elegí cualquier programa →
Pantalla 3, el catálogo real de ese programa, con su ficha y su imagen (si
es de PhET). Ninguna de las 3 pantallas vuelve a tocar la red en ningún
momento de ese recorrido — todo sale del único `window.name` que puso el
`<iframe>` al principio.

Abrir cualquiera de las 3 pantallas sin pasar por `prueba.html` ni por el
`index.html` de la raíz (sin `window.name`) debe mostrar los placeholders
del estado vacío de cada una — nunca un error ni una pantalla en blanco. Es
un caso de prueba esperado, no un bug.

## `index.html` — pantalla 1 (elegir colección)

CERO `fetch()`. Lee `window.name` (el array completo de laboratorios, ya
dejado ahí por el `index.html` de la raíz) y calcula `laboratorios.length`
para el conteo real de la tarjeta de Externos — nunca un número escrito a
mano. No le pasa nada NUEVO por `window.name` a la pantalla 2: el link de
"Ingresar" es un `<a href>` común, y como nadie reescribe `window.name` en
esta pantalla, el mismo array sigue disponible cuando se llega a
`programa.html`.

## `programa.html` — pantalla 2 (elegir programa/carrera)

CERO `fetch()`. Sigue leyendo el mismo `window.name`. La lista de programas
**no sale de `Datos/Programas.json`** (ese archivo no se usa en la cadena
real) — se deriva recorriendo el campo `"Programa(s)"` (laboratorios sin
`tipo`, legacy) o `"programa"` (ítems con `tipo`) de cada laboratorio del
array y sacando los valores únicos (confirmado: da exactamente los mismos
14 programas que tenía `Programas.json` para Externos). Recién al elegir un
programa arma el payload del visor (contrato de arriba) y ahí sí reemplaza
`window.name` antes de navegar a `catalogo.html`.

Esta misma pantalla sirve tanto a Externos como a Vivos: la tarjeta "Vivos"
de la pantalla 1 arma su link `Ingresar` como `programa.html?coleccion=vivo`.
Con ese parámetro, `programa.html` filtra el array por `tipo: "vivo"` en vez
de `tipo: "externo"`, cambia sus textos/branding (título, badges, ícono) y
arma para `catalogo.html` items `tipo: "vivo"` en vez de `tipo:
"laboratorio"`. El código de `catalogo.html` no cambia en absoluto entre uno
y otro caso — es el mismo despacho por tipo de siempre.
