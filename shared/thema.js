// Zet het thema (licht / donker) vóór de pagina getekend wordt: geen witte flits in het donker.
// Staat in de <head> van elke pagina. Keuze: instellingen.html of de knop ☀ / 🌙 in de kop.
// 'auto' (of niets) = het thema van het apparaat; dat regelt shared/app.css zelf.
(() => {
  let t = 'auto';
  try { t = JSON.parse(localStorage.getItem('dutch-exam:thema')) || 'auto'; } catch (e) { /* geen opslag */ }
  if (t === 'donker') document.documentElement.dataset.theme = 'dark';
  else if (t === 'licht') document.documentElement.dataset.theme = 'light';
})();

// Het teken van de site in het tabblad (en op het beginscherm van een iPhone). Hier, omdat dit bestand in de <head> van elke pagina staat.
(() => {
  const map = new URL('.', document.currentScript.src).href; // de map shared/
  const zet = (rel, bestand, type) => { const l = document.createElement('link'); l.rel = rel; l.href = map + bestand; if (type) l.type = type; document.head.append(l); };
  zet('icon', 'icoon.svg', 'image/svg+xml');
  zet('apple-touch-icon', 'icoon-180.png');
})();
