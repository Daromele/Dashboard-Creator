// Runs before first paint: apply the saved theme so the page never flashes the wrong colours.
// (The source of truth for settings is IndexedDB; this is only a fast mirror in localStorage.)
(function () {
  var colors = { mono: '#ffffff', sage: '#f4f7f3', blush: '#fdf6f6', cream: '#fbf6ea', blue: '#f4f7fa' };
  try {
    var t = localStorage.getItem('rls_theme');
    if (t && colors[t]) {
      document.documentElement.setAttribute('data-theme', t);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', colors[t]);
    }
  } catch (e) { /* storage blocked: default theme (Mono) stays */ }
})();
