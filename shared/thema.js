// Zet het thema (licht / donker) vóór de pagina getekend wordt: geen witte flits in het donker.
// Staat in de <head> van elke pagina. Keuze: instellingen.html of de knop ☀ / 🌙 in de kop.
// 'auto' (of niets) = het thema van het apparaat; dat regelt shared/app.css zelf.
(() => {
  let t = 'auto';
  try { t = JSON.parse(localStorage.getItem('dutch-exam:thema')) || 'auto'; } catch (e) { /* geen opslag */ }
  if (t === 'donker') document.documentElement.dataset.theme = 'dark';
  else if (t === 'licht') document.documentElement.dataset.theme = 'light';
})();
