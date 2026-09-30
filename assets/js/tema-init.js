// tema-init.js — aplica el tema guardado ANTES de pintar la página.
//
// Va en el <head>, sin defer, para que no haya parpadeo entre tema claro y
// oscuro. Sin preferencia guardada no hace nada: manda el sistema
// (prefers-color-scheme, ver assets/css/styles.css §2b). La preferencia la
// guarda el botón de tema de assets/js/visor-ui.js.
(function () {
  try {
    var tema = localStorage.getItem('visorTema');
    if (tema === 'claro' || tema === 'oscuro') document.documentElement.setAttribute('data-tema', tema);
  } catch (e) { /* sin storage disponible: queda el tema del sistema */ }
})();
