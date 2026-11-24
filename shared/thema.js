// DE NAAM VAN DE SITE. Dit is de enige plek: alle pagina's, de kop, de titels in het tabblad en tools/deelkaart.py lezen hem hier.
window.SITE_NAAM = 'Taal Klim';

// Zet het thema (licht / donker) vóór de pagina getekend wordt: geen witte flits in het donker.
// Staat in de <head> van elke pagina. Keuze: instellingen.html of de knop ☀ / 🌙 in de kop.
// 'auto' (of niets) = het thema van het apparaat; dat regelt shared/app.css zelf.
(() => {
  let t = 'auto';
  try { t = JSON.parse(localStorage.getItem('dutch-exam:thema')) || 'auto'; } catch (e) { /* geen opslag */ }
  if (t === 'donker') document.documentElement.dataset.theme = 'dark';
  else if (t === 'licht') document.documentElement.dataset.theme = 'light';
})();

// De grootte van de tekst (instellingen.html): klein, gewoon, groot of extra groot. Ook vóór het tekenen, zodat de pagina niet verspringt.
// shared/app.css rekent alle letters, plaatjes en tekens om met --schaal.
window.TEKST_SCHAAL = { klein: 0.9, gewoon: 1, groot: 1.15, extra: 1.3 };
(() => {
  let t = 'gewoon';
  try { t = JSON.parse(localStorage.getItem('dutch-exam:tekst')) || 'gewoon'; } catch (e) { /* geen opslag */ }
  const s = window.TEKST_SCHAAL[t];
  if (s && s !== 1) document.documentElement.style.setProperty('--schaal', s);
})();

// Het teken van de site in het tabblad (en op het beginscherm van een iPhone). Hier, omdat dit bestand in de <head> van elke pagina staat.
(() => {
  const map = new URL('.', document.currentScript.src).href; // de map shared/
  const zet = (rel, bestand, type) => { const l = document.createElement('link'); l.rel = rel; l.href = map + bestand; if (type) l.type = type; document.head.append(l); };
  zet('icon', 'icoon.svg', 'image/svg+xml');
  zet('apple-touch-icon', 'icoon-180.png');
})();

// De titel in het tabblad eindigt altijd op de naam van de site: "Lezen: les | Taal Klim".
// Ook als een pagina de titel later zelf zet (document.title = ...): daarom kijken we mee.
(() => {
  const naam = window.SITE_NAAM;
  const zet = () => { if (document.title && !document.title.includes(naam)) document.title = document.title + ' | ' + naam; };
  zet();
  const t = document.querySelector('title');
  if (t) new MutationObserver(zet).observe(t, { childList: true, characterData: true, subtree: true });
})();
