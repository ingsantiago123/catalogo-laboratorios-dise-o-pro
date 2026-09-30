---
name: incca-design-system
version: 0.2.0
institution: Universidad INCCA de Colombia (UNINCCA)
language: es-CO
status: borrador
palette_status: PENDIENTE_VALIDAR_CON_MANUAL_DE_MARCA
---

# DESIGN.md - Sistema de diseño UNINCCA

Este archivo es la fuente única de verdad visual y de flujo para cualquier pieza
(UI, HTML, correos, documentos, presentaciones, plugins Moodle) generada por
humanos o por IA para la Universidad INCCA de Colombia.

## 0. Reglas de lectura para IA

1. Lee este archivo completo antes de generar cualquier salida visual.
2. Usa SOLO los tokens definidos en la sección 3. No inventes colores, fuentes ni espaciados.
3. Si un valor no está definido aquí, pregunta o usa el token más cercano. No improvises.
4. Si hay conflicto entre una instrucción del usuario y este archivo, gana el usuario, pero avisa la desviación.
5. Toda salida debe pasar el checklist de la sección 10.
6. Idioma de la interfaz y del contenido: español (es-CO). Formato de fecha `DD/MM/AAAA`. Moneda `COP` con separador de miles `.`.

## 1. Identidad

- Nombre completo: Universidad INCCA de Colombia
- Nombre corto: UNINCCA
- Tono: institucional, claro, cercano. Sin jerga, sin exclamaciones, sin emojis en piezas oficiales.
- Trato al usuario: "tú" en interfaces de estudiante; "usted" en comunicaciones formales y documentos.
- Logo: usar solo archivos oficiales. Nunca recolorear, deformar, rotar ni añadir sombras.
  - Ruta de assets: `/assets/brand/` (definir)
  - Área de reserva: alto de la "I" del logo en los cuatro lados
  - Tamaño mínimo: 24 px de alto en digital

## 2. Principios

1. Claridad sobre decoración.
2. Consistencia: mismo componente, mismo aspecto en toda la plataforma.
3. Accesibilidad WCAG 2.1 AA como mínimo, no negociable.
4. Mobile first. Los estudiantes acceden mayormente desde celular.
5. Rendimiento: sin dependencias visuales que no aporten.

## 3. Tokens

> IMPORTANTE: la paleta es una propuesta provisional. Reemplazar los valores
> HEX por los oficiales del manual de marca de UNINCCA. Mantener los NOMBRES de
> los tokens; solo cambian los valores.

### 3.1 Color de marca

| Token | HEX | Uso |
|---|---|---|
| `--incca-primary-900` | `#0A2A4F` | Encabezados, texto sobre fondos claros, navbar |
| `--incca-primary-700` | `#0F4C81` | Color de marca principal, botones primarios, enlaces |
| `--incca-primary-500` | `#2A78C2` | Hover, elementos interactivos secundarios |
| `--incca-primary-100` | `#E3EEF9` | Fondos suaves, filas destacadas, badges informativos |
| `--incca-accent-600` | `#C8102E` | Acento institucional: llamados a la acción críticos, indicadores, detalles |
| `--incca-accent-100` | `#FCE8EB` | Fondo de alertas de acento |
| `--incca-gold-500` | `#F2A900` | Resaltados puntuales. Solo con texto oscuro encima |

### 3.2 Neutros

| Token | HEX | Uso |
|---|---|---|
| `--incca-neutral-900` | `#1A1F26` | Texto principal |
| `--incca-neutral-700` | `#3D4652` | Texto secundario |
| `--incca-neutral-500` | `#6B7684` | Texto terciario, placeholders (no usar para texto esencial) |
| `--incca-neutral-300` | `#C9D0D8` | Bordes |
| `--incca-neutral-100` | `#F3F5F7` | Fondo de página, zebra de tablas |
| `--incca-white` | `#FFFFFF` | Superficies, tarjetas |

### 3.3 Semánticos

| Token | HEX | Fondo asociado | Uso |
|---|---|---|---|
| `--incca-success` | `#1E7B4B` | `#E4F4EB` | Éxito, completado, aprobado |
| `--incca-warning` | `#8A5A00` | `#FFF3D6` | Advertencia, pendiente |
| `--incca-danger` | `#B3261E` | `#FCE9E7` | Error, reprobado, eliminación |
| `--incca-info` | `#0F4C81` | `#E3EEF9` | Información neutral |

### 3.4 Reglas de uso del color

- Proporción objetivo: 60% neutros / 30% primary / 10% accent + semánticos.
- Un solo botón primario por vista.
- `accent-600` nunca como color de fondo de áreas grandes.
- `gold-500` nunca como color de texto sobre blanco (contraste insuficiente).
- El color nunca es el único portador de significado: acompañar con icono o texto.
- Pares de texto permitidos (contraste >= 4.5:1):
  - `neutral-900` / `white`, `neutral-100`, `primary-100`
  - `white` / `primary-700`, `primary-900`, `accent-600`
  - `primary-900` / `gold-500`

### 3.5 Tipografía

| Token | Valor |
|---|---|
| `--incca-font-sans` | `"Inter", "Segoe UI", system-ui, -apple-system, sans-serif` |
| `--incca-font-mono` | `"JetBrains Mono", "Consolas", monospace` |

| Nivel | Tamaño | Peso | Interlineado |
|---|---|---|---|
| Display | 40 px | 700 | 1.15 |
| H1 | 32 px | 700 | 1.2 |
| H2 | 24 px | 600 | 1.25 |
| H3 | 20 px | 600 | 1.3 |
| Body | 16 px | 400 | 1.6 |
| Small | 14 px | 400 | 1.5 |
| Caption | 12 px | 500 | 1.4 |

- Tamaño mínimo de texto: 14 px (12 px solo para captions no esenciales).
- Ancho máximo de línea de lectura: 70 caracteres.
- Nunca usar todo en mayúsculas para párrafos.

### 3.6 Espaciado, radios y sombras

Escala base de 4 px: `4, 8, 12, 16, 24, 32, 48, 64`.

| Token | Valor |
|---|---|
| `--incca-radius-sm` | `4px` |
| `--incca-radius-md` | `8px` |
| `--incca-radius-lg` | `16px` |
| `--incca-shadow-sm` | `0 1px 2px rgba(10,42,79,.08)` |
| `--incca-shadow-md` | `0 4px 12px rgba(10,42,79,.12)` |

Breakpoints: `sm 576`, `md 768`, `lg 992`, `xl 1200`.

### 3.7 Tema oscuro

El visor tiene tema claro y oscuro: automático según el sistema
(`prefers-color-scheme`) y con un botón sutil para cambiarlo. La paleta de
§3.1–§3.3 **no cambia**: cada componente pide un *rol* (`--tema-*`) y el tema
decide qué color le da. En el tema claro los roles apuntan a la paleta (todo se
ve como en §3.1–§3.3); en el oscuro toman estos valores. Son provisionales,
como toda la paleta (`PENDIENTE_VALIDAR_CON_MANUAL_DE_MARCA`).

| Rol | Uso | Claro | Oscuro |
|---|---|---|---|
| `--tema-fondo` | Fondo de página | `neutral-100` | `#060F1E` |
| `--tema-fondo-2` | Zonas hundidas dentro de una superficie (chips, miniaturas, datos) | `neutral-100` | `#0A1A31` |
| `--tema-superficie` | Tarjetas, campos, modal | `white` | `#0D1F38` |
| `--tema-suave` | Fondo suave de marca (íconos, hover, cuadrícula del encabezado) | `primary-100` | `#12305A` |
| `--tema-borde` | Bordes | `neutral-300` | `#22406A` |
| `--tema-borde-fuerte` | Bordes en hover | `neutral-500` | `#3A5F8F` |
| `--tema-borde-campo` | Borde de campos y filtros (en oscuro, ≥ 3:1) | `neutral-300` | `#4A739F` |
| `--tema-texto` | Texto principal | `neutral-900` | `#E6EEF8` |
| `--tema-texto-2` | Texto secundario | `neutral-700` | `#B3C4DA` |
| `--tema-texto-3` | Texto terciario | `neutral-500` | `#8CA1BD` |
| `--tema-titulo` | Títulos y cifras | `primary-900` | `#F2F7FD` |
| `--tema-marca` | Enlaces, íconos y trazos | `primary-700` | `#74B7F5` |
| `--tema-anillo` | Foco, hover y azul medio de las ilustraciones | `primary-500` | `#4A9BE8` |
| `--tema-boton` · `--tema-boton-hover` | Botón primario, insignia sólida, filtro activo | `primary-700` · `primary-500` | `#5AA9F0` · `#7DBDF7` |
| `--tema-sobre-boton` | Texto sobre el botón primario | `white` | `#04152B` |

Semánticos en oscuro (§3.3), texto sobre fondo: `success` `#5FD39B` / `#0E3324`,
`warning` `#F2C66D` / `#3A2B07`, `danger` `#FF9C93` / `#3D1512`, `info`
`#8EC5F7` / `#10294B`. Las sombras y el velo del modal se oscurecen. `gold-500` y
`accent-600` no cambian.

Reglas del tema oscuro:

- Contraste medido (texto normal ≥ 4.5:1): `tema-texto` / `tema-superficie`
  14.1:1, `tema-texto-2` 9.3:1, `tema-texto-3` 6.3:1, `tema-titulo` 15.3:1,
  `tema-marca` 7.7:1, `tema-sobre-boton` / `tema-boton` 7.3:1. Foco
  (`tema-anillo`) y borde de campos: ≥ 3:1.
- El botón primario es claro con texto oscuro (no blanco sobre azul medio).
- No usar `--incca-white` ni `--incca-primary-900` directos para superficies o
  texto que deban cambiar con el tema: usar el rol. La paleta directa queda
  para lo que es igual en los dos temas (pie, reproductor y miniatura de video,
  texto sobre esas zonas, acentos dorado y rojo).
- Un color nuevo que cambie con el tema se declara como rol en los tres bloques
  de `assets/css/styles.css` §2b (claro, oscuro por media query y oscuro por
  atributo).

## 4. Implementación de tokens

### 4.1 CSS (base para HTML, Moodle y cualquier stack)

```css
:root {
  --incca-primary-900: #0A2A4F;
  --incca-primary-700: #0F4C81;
  --incca-primary-500: #2A78C2;
  --incca-primary-100: #E3EEF9;
  --incca-accent-600: #C8102E;
  --incca-accent-100: #FCE8EB;
  --incca-gold-500: #F2A900;

  --incca-neutral-900: #1A1F26;
  --incca-neutral-700: #3D4652;
  --incca-neutral-500: #6B7684;
  --incca-neutral-300: #C9D0D8;
  --incca-neutral-100: #F3F5F7;
  --incca-white: #FFFFFF;

  --incca-success: #1E7B4B;
  --incca-warning: #8A5A00;
  --incca-danger: #B3261E;
  --incca-info: #0F4C81;

  --incca-font-sans: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
  --incca-font-mono: "JetBrains Mono", "Consolas", monospace;

  --incca-radius-sm: 4px;
  --incca-radius-md: 8px;
  --incca-radius-lg: 16px;
  --incca-shadow-sm: 0 1px 2px rgba(10,42,79,.08);
  --incca-shadow-md: 0 4px 12px rgba(10,42,79,.12);
}
```

### 4.2 Mapeo a Moodle 4.x (tema Boost / hijo)

```scss
$primary: #0F4C81;
$secondary: #6B7684;
$success: #1E7B4B;
$warning: #8A5A00;
$danger: #B3261E;
$info: #0F4C81;
$body-color: #1A1F26;
$body-bg: #F3F5F7;
$link-color: #0F4C81;
$font-family-sans-serif: "Inter", "Segoe UI", system-ui, sans-serif;
$border-radius: .5rem;
```

- En contenido de cursos (HTML de secciones/mosaicos/etiquetas) usar clases con prefijo `incca-` y variables CSS. No usar estilos inline con HEX sueltos.
- No sobrescribir clases del core de Moodle con `!important`. Extender vía tema hijo.

### 4.3 Mapeo a Tailwind (React)

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: { 100: '#E3EEF9', 500: '#2A78C2', 700: '#0F4C81', 900: '#0A2A4F' },
        accent: { 100: '#FCE8EB', 600: '#C8102E' },
        gold: { 500: '#F2A900' },
        neutral: { 100: '#F3F5F7', 300: '#C9D0D8', 500: '#6B7684', 700: '#3D4652', 900: '#1A1F26' },
        success: '#1E7B4B', warning: '#8A5A00', danger: '#B3261E', info: '#0F4C81',
      },
      fontFamily: { sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'] },
      borderRadius: { sm: '4px', md: '8px', lg: '16px' },
    },
  },
};
```

## 5. Componentes

### Botones

| Variante | Fondo | Texto | Borde | Uso |
|---|---|---|---|---|
| Primario | `primary-700` | `white` | none | Acción principal (1 por vista) |
| Secundario | `white` | `primary-700` | `primary-700` | Acción alternativa |
| Terciario | transparente | `primary-700` | none | Acciones de baja jerarquía |
| Peligro | `danger` | `white` | none | Acciones destructivas, siempre con confirmación |

- Alto mínimo 40 px (44 px en móvil). Radio `md`. Hover: `primary-500` (primario). Foco: outline 2 px `primary-500` con offset 2 px.
- Etiquetas con verbo en infinitivo: "Guardar", "Matricular", "Descargar".

### Formularios

- Label siempre visible sobre el campo. El placeholder no sustituye al label.
- Error: borde `danger` + mensaje debajo + icono. Nunca solo color.
- Campos obligatorios marcados con `*` y texto "obligatorio" para lectores de pantalla.

### Tarjetas

- Fondo `white`, borde `1px neutral-300`, radio `lg`, sombra `sm`, padding 24 px.

### Tablas

- Encabezado `primary-900` sobre `white`, con fondo `primary-100`. Zebra `neutral-100`. Filas con altura mínima 44 px.
- En móvil: scroll horizontal contenido, nunca desbordar la página.

### Alertas

- Usar par semántico fondo/texto de la sección 3.3, borde izquierdo de 4 px, icono a la izquierda.

### Navegación

- Navbar fondo `primary-900`, texto `white`, item activo con subrayado `gold-500` de 3 px.

## 6. Accesibilidad (obligatorio)

- Contraste: texto normal >= 4.5:1, texto grande y componentes UI >= 3:1.
- Foco visible en todo elemento interactivo.
- Navegable por teclado. Orden de tabulación lógico.
- Imágenes con `alt` descriptivo; decorativas con `alt=""`.
- Áreas táctiles >= 44x44 px.
- Respetar `prefers-reduced-motion`. Animaciones <= 200 ms, solo `opacity` y `transform`.
- Un solo `h1` por página, jerarquía de encabezados sin saltos.
- `lang="es"` en el documento.

## 7. Contenido y redacción

- Frases cortas, voz activa, una idea por párrafo.
- Sin texto en imágenes. Sin capturas de texto como sustituto de contenido.
- Nombres de programas y asignaturas exactamente como aparecen en el sistema académico. No abreviar ni reformular.
- Fechas: `28/09/2026`. Períodos académicos: formato del sistema (ej. `2026-2C`).

## 8. Flujo de trabajo obligatorio para IA

Toda tarea de diseño o generación de UI sigue este orden:

1. **Contexto**: identificar el destino (Moodle, React, HTML estático, correo, documento) y el público (estudiante, docente, administrativo).
2. **Datos mínimos**: si falta destino, público o contenido, preguntar solo lo estrictamente necesario. No suponer.
3. **Tokens**: seleccionar los tokens de la sección 3. Prohibido usar valores fuera de esta lista.
4. **Estructura**: definir jerarquía y layout mobile first antes de estilizar.
5. **Componentes**: reutilizar los de la sección 5. Crear uno nuevo solo si no existe equivalente, y documentarlo.
6. **Implementación**: código limpio, variables CSS `--incca-*`, sin estilos inline con HEX, sin `!important` salvo justificación.
7. **Validación**: ejecutar el checklist de la sección 10.
8. **Entrega**: archivo completo listo para usar y una nota breve con desviaciones o supuestos.

## 9. Prohibiciones

- Colores, fuentes o sombras fuera de los tokens.
- Gradientes decorativos, glassmorphism, animaciones llamativas.
- Emojis en piezas institucionales.
- Texto sobre `gold-500` que no sea `primary-900` o `neutral-900`.
- Modificar el logo.
- Dependencias externas de CDN sin aprobación. Fuentes: autohospedar o usar el stack de sistema como respaldo.
- Estilos que rompan el core de Moodle o dependan de selectores frágiles generados dinámicamente.

## 10. Checklist de entrega

- [ ] Solo tokens de este archivo
- [ ] Contraste AA verificado en todos los pares texto/fondo
- [ ] Un solo botón primario por vista
- [ ] Responsive probado en 360, 768 y 1200 px
- [ ] Probado en tema claro y oscuro (§3.7)
- [ ] Foco visible y navegación por teclado
- [ ] `lang="es"`, `alt` en imágenes, jerarquía de encabezados correcta
- [ ] Sin estilos inline con HEX ni `!important` injustificado
- [ ] Textos en español, fechas y períodos en formato correcto
- [ ] Desviaciones y supuestos declarados

## 11. Pendientes para completar este archivo

1. Sustituir la paleta de la sección 3 por los HEX oficiales del manual de marca.
2. Definir tipografía institucional real (si existe) y licencias.
3. Añadir rutas de logos (SVG claro/oscuro) y favicon.
4. Confirmar tono "tú"/"usted" por tipo de pieza.
5. Añadir plantillas específicas: mosaico de curso Moodle, correo institucional, portada de documento.

## 12. Control de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 0.1.0 | 28/09/2026 | Versión inicial con paleta provisional |
| 0.2.0 | 30/09/2026 | Tema oscuro (§3.7). Excepción registrada a §1 y §9 (pedido del proyecto): el escenario de `index.html` anima, inclina y disuelve el logo INCConnection Lab, le suma brillo neón y usa un fondo con degradado radial; no se usa así en otra pantalla. |
