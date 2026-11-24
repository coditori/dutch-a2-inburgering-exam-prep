// Gedeeld door alle pagina's van lezen: voortgang, een tekst tonen, een vraag tonen.
window.Lezen = (() => {
  const { el } = App;
  const LETTERS = 'ABCD';

  // ---------- voortgang ----------
  const P = Object.assign({ lessen: {}, toets: {}, trainers: {}, open: false }, App.lees('lezen', {}));
  const bewaar = () => App.schrijf('lezen', P);
  const gehaald = (id) => { const r = P.lessen[id]; return !!r && r.beste / r.totaal >= 0.8; };
  // les i is open als de les ervoor 80% heeft
  const isOpen = (lijst, i) => P.open || i === 0 || gehaald(lijst[i - 1].id);
  const naLes = (id) => P.open || !id || gehaald(id);

  async function json(pad) {
    const r = await fetch(pad, { cache: 'no-cache' });
    if (!r.ok) throw new Error(pad + ' niet gevonden');
    return r.json();
  }

  // ---------- tekst ----------
  // t = { intro, kop, soort, tekst: [regels] }
  // regel: "# kopje" | "- punt" | "cel | cel" (tabel) | "" (witregel) | gewone zin(nen)
  function tekst(doel, t, opties) {
    const o = opties || {};
    doel.textContent = '';
    if (t.intro) doel.append(el('p', { class: 'intro' }, App.woorden(t.intro, o.nieuw)));
    if (o.leesEerst) doel.append(el('p', { class: 'lees-eerst' }, 'Lees eerst de vraag.', el('br'), 'Lees daarna de tekst.'));
    const vak = el('div', { class: 'tekstvak soort-' + (t.soort || 'tekst') });
    if (t.kop) vak.append(el('h3', {}, App.woorden(t.kop, o.nieuw)));
    let tabel = null, lijst = null;
    const zin = (tag, ruw, inhoud) => { const z = el(tag, { class: 'zin' }, inhoud); z.dataset.ruw = ruw; return z; };
    (t.tekst || []).forEach((regel) => {
      if (regel.includes(' | ')) {
        if (!tabel) { tabel = el('table'); vak.append(tabel); }
        tabel.append(zin('tr', regel, regel.split(' | ').map((c) => el('td', {}, App.woorden(c, o.nieuw)))));
        lijst = null;
        return;
      }
      tabel = null;
      if (regel.startsWith('- ')) {
        if (!lijst) { lijst = el('ul'); vak.append(lijst); }
        lijst.append(el('li', {}, zin('span', regel, App.woorden(regel.slice(2), o.nieuw))));
        return;
      }
      lijst = null;
      if (regel === '') { vak.append(el('div', { class: 'wit' })); return; }
      if (regel.startsWith('# ')) { vak.append(el('h4', {}, zin('span', regel, App.woorden(regel.slice(2), o.nieuw)))); return; }
      const p = el('p');
      regel.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9'‘"])/).forEach((s, i) => { if (i) p.append(' '); p.append(zin('span', s, App.woorden(s, o.nieuw))); });
      p.dataset.regel = regel;
      vak.append(p);
    });
    doel.append(vak);
    return vak;
  }

  // de zin met het antwoord laten oplichten
  function markeer(doel, bewijs) {
    doel.querySelectorAll('.zin.hl').forEach((z) => z.classList.remove('hl'));
    if (!bewijs) return;
    let raak = [...doel.querySelectorAll('.zin')].filter((z) => z.dataset.ruw.includes(bewijs));
    if (!raak.length) { // bewijs loopt over twee zinnen: de hele regel
      const p = [...doel.querySelectorAll('p[data-regel]')].find((x) => x.dataset.regel.includes(bewijs));
      if (p) raak = [...p.querySelectorAll('.zin')];
    }
    raak.forEach((z) => z.classList.add('hl'));
    if (raak[0]) raak[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ---------- vraag ----------
  // v = { sit, v, o: [antwoorden; het EERSTE is goed], b: bewijs }. De volgorde op het scherm wordt geschud.
  // opties: { volgorde, gekozen, toonGoed, op(keuze) }  keuze = nummer in v.o (0 = goed)
  function vraag(doel, v, opties) {
    const o = opties || {};
    const volgorde = o.volgorde || App.schud(v.o.map((_, i) => i));
    const plaatjes = v.o.every((x) => !/[A-Za-z]/.test(x.replace(/\[\[[a-z-]+\]\]/g, ''))); // [[kamer]] is een eigen tekening (App.el), geen tekst
    doel.textContent = '';
    const blok = el('div', { class: 'vraag' });
    if (v.sit) blok.append(el('p', { class: 'sit' }, App.woorden(v.sit, o.nieuw)));
    blok.append(v.v ? el('p', { class: 'v' }, App.woorden(v.v, o.nieuw)) : el('p', { class: 'v', en: 'Choose the picture.' }, 'Kies het plaatje.'));
    const rij = el('div', { class: 'opties' + (plaatjes ? ' beelden' : '') });
    const knoppen = volgorde.map((nr, plek) => {
      const k = el('button', { class: 'optie' + (plaatjes ? ' beeld' : ''), type: 'button' },
        plaatjes ? v.o[nr] : [el('span', { class: 'l' }, LETTERS[plek]), el('span', {}, v.o[nr])]);
      k.addEventListener('click', () => kies(nr));
      rij.append(k);
      return k;
    });
    blok.append(rij);
    doel.append(blok);

    function teken(gekozen, toonGoed) {
      knoppen.forEach((k, plek) => {
        const nr = volgorde[plek];
        k.classList.toggle('gekozen', !toonGoed && gekozen === nr);
        k.classList.toggle('goed', !!toonGoed && nr === 0);
        k.classList.toggle('fout', !!toonGoed && gekozen === nr && nr !== 0);
        k.disabled = !!toonGoed;
      });
    }
    function kies(nr) { if (o.op) o.op(nr); }
    teken(o.gekozen, o.toonGoed);
    return { volgorde, teken };
  }


  // ---------- trainers: een ronde van n vragen ----------
  // opties: { id, titel, na, items, n, teken(doel, item, klaar(goed)) }
  function ronde(o) {
    const { el } = App;
    App.kop(o.titel, '../index.html');
    const doel = document.getElementById('pagina');
    if (!naLes(o.na)) { doel.append(el('p', { class: 'kaart' }, `Deze trainer gaat open na les ${o.na}.`)); return; }
    let rij, goed, nr;
    const begin = () => { rij = App.schud(o.items).slice(0, o.n); goed = 0; nr = 0; volgende(); };
    function volgende() {
      doel.textContent = '';
      if (nr >= rij.length) {
        const oud = P.trainers[o.id] || { beste: 0, keer: 0 };
        P.trainers[o.id] = { beste: Math.max(oud.beste, goed), totaal: rij.length, keer: oud.keer + 1, datum: new Date().toISOString().slice(0, 10) };
        bewaar();
        doel.append(el('div', { class: 'kaart midden' }, el('div', { class: 'groot' }, `${goed} / ${rij.length}`),
          el('p', { class: 'zacht' }, `Beste score: ${P.trainers[o.id].beste} / ${rij.length}`),
          el('div', { class: 'knoppen', style: 'justify-content:center' },
            el('button', { class: 'knop', en: 'again', onclick: begin }, 'Nog een keer'), el('a', { class: 'knop licht', href: '../index.html' }, 'Naar de lessen'))));
        return;
      }
      doel.append(el('p', { class: 'zacht klein' }, `${nr + 1} / ${rij.length}`));
      const vak = el('div');
      doel.append(vak);
      o.teken(vak, rij[nr], (ok, uitleg) => {
        if (ok) goed++;
        nr++;
        const knop = el('button', { class: 'knop', en: 'next', onclick: volgende }, 'Verder');
        vak.append(el('p', { class: 'uitslag ' + (ok ? 'goed' : 'fout') }, ok ? '✔ Goed!' : '✘ Niet goed.'), uitleg || '', el('div', { class: 'knoppen' }, knop));
        if (ok) App.goed(knop);
      });
    }
    doel.append(el('div', { class: 'kaart' }, el('p', { en: o.uitlegEn }, o.uitleg),
      el('div', { class: 'knoppen' }, el('button', { class: 'knop', onclick: begin }, 'Start'))));
  }

  return { P, bewaar, gehaald, isOpen, naLes, json, tekst, markeer, vraag, ronde, LETTERS };
})();
