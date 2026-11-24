// Gedeelde hulpjes: opslag, klikbare woorden met pop-up, de ❗-knop voor Engels.
// Nodig: woorden.js, srs.js en audio.js staan vóór dit bestand in de pagina.
window.App = (() => {
  const W = window.WOORDEN || { lijst: [], vormen: {} };
  const TOKEN = /[A-Za-zÀ-ÿ]+(?:['’-][A-Za-zÀ-ÿ]+)*/g;

  const WORTEL = new URL('../', document.currentScript.src).href; // de hoofdmap van de site
  const EXAMENS = ['lezen', 'luisteren', 'schrijven', 'spreken', 'knm'];
  const ruw = (k, d) => { try { const v = JSON.parse(localStorage.getItem('dutch-exam:' + k)); return v == null ? d : v; } catch (e) { return d; } };
  // Instellingen gelden voor alle examens (pagina instellingen.html). "open" = alle lessen zonder slot.
  const instellingen = () => Object.assign({ open: false }, ruw('instellingen', {}));
  const lees = (k, d) => {
    const v = ruw(k, d);
    if (EXAMENS.includes(k) && v && typeof v === 'object') v.open = instellingen().open;
    return v;
  };
  const schrijf = (k, v) => { try { localStorage.setItem('dutch-exam:' + k, JSON.stringify(v)); } catch (e) { /* geen opslag */ } };
  const kaal = (s) => s.toLowerCase().replace(/’/g, "'").normalize('NFD').replace(/[̀-ͯ]/g, '');

  function el(tag, props, ...kinderen) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') e.className = v;
      else if (k === 'en') e.dataset.en = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kinderen.flat()) if (k != null && k !== false) e.append(k);
    return e;
  }

  // woord -> regels uit de woordenlijst
  function zoek(vorm) {
    const nrs = W.vormen[kaal(vorm).replace(/^'+|'+$/g, '')] || [];
    return nrs.map((i) => ({ nr: i, trede: W.lijst[i][0], nl: W.lijst[i][1], en: W.lijst[i][2], thema: W.lijst[i][3], beeld: W.lijst[i][4], extra: W.lijst[i][5] }));
  }

  // 'de koffie' -> nummer van de regel 'de koffie / de thee'
  let lemmas = null;
  function lemmaNr(nl) {
    if (!lemmas) {
      lemmas = {};
      W.lijst.forEach((r, i) => r[1].split(/\s+\/\s+|,\s+/).forEach((s) => { const k = kaal(s).replace(/[.?!]/g, '').trim(); if (!(k in lemmas)) lemmas[k] = i; }));
    }
    const nr = lemmas[kaal(nl).trim()];
    return nr == null ? -1 : nr;
  }

  // tekst -> stukjes met klikbare woorden. nieuw = Set met regelnummers van de nieuwe woorden van de les
  function woorden(tekst, nieuw) {
    const f = document.createDocumentFragment();
    let vorige = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(tekst))) {
      if (m.index > vorige) f.append(tekst.slice(vorige, m.index));
      const nrs = W.vormen[kaal(m[0])] || [];
      if (nrs.length) {
        const s = el('span', { class: 'w' + (nieuw && nrs.some((n) => nieuw.has(n)) ? ' nieuw' : '') }, m[0]);
        f.append(s);
      } else f.append(m[0]);
      vorige = m.index + m[0].length;
    }
    if (vorige < tekst.length) f.append(tekst.slice(vorige));
    return f;
  }

  // pop-up bij een woord: plaatje + Nederlands eerst, Engels achter ❗
  let pop = null;
  function sluitPop() { if (pop) { pop.remove(); pop = null; } }
  function toonPop(doel) {
    sluitPop();
    const regels = zoek(doel.textContent);
    if (!regels.length) return;
    pop = el('div', { id: 'wpop' }, regels.map((r) => {
      const en = el('div', { class: 'en', hidden: true }, r.en);
      window.SRS.voegToe('w:' + r.nl, { soort: 'w', nl: r.nl });
      return el('div', { class: 'rij' },
        r.beeld ? el('div', { class: 'beeld' }, r.beeld) : null,
        el('b', {}, r.nl), ' ',
        el('button', { class: 'rond', title: 'luister', onclick: () => window.Spraak.zeg(r.nl) }, '🔊'), ' ',
        el('button', { class: 'rond', title: 'Engels', onclick: () => { en.hidden = !en.hidden; } }, '❗'),
        r.extra ? el('div', { class: 'klein zacht' }, r.extra) : null,
        el('div', { class: 'klein zacht' }, r.thema),
        en);
    }));
    document.body.append(pop);
    const b = doel.getBoundingClientRect();
    pop.style.top = (window.scrollY + b.bottom + 6) + 'px';
    pop.style.left = Math.max(8, Math.min(window.scrollX + b.left, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 8)) + 'px';
  }
  document.addEventListener('click', (e) => {
    if (pop && pop.contains(e.target)) return;
    const w = e.target.closest && e.target.closest('.w');
    if (w && !document.body.classList.contains('geen-woorden')) toonPop(w); else sluitPop();
  });

  // kop met terug-pijl en de ❗-knop (Engels bij de knoppen van de pagina)
  function kop(titel, terug) {
    const h = el('header', { class: 'kop' },
      terug ? el('a', { class: 'terug', href: terug, title: 'terug' }, '←') : null,
      el('h1', {}, titel),
      el('a', { class: 'rond instel', href: WORTEL + 'instellingen.html', title: 'instellingen' }, '⚙'),
      el('button', { class: 'rond', title: 'Engels aan / uit', onclick: () => { document.body.classList.toggle('en'); schrijf('en', document.body.classList.contains('en')); } }, '❗'));
    document.body.prepend(h);
    if (lees('en', false)) document.body.classList.add('en');
    return h;
  }

  // per trede: hoeveel woorden van de lijst zitten in de "gekend"-vakken
  function tredeStand() {
    const stand = [0, 1, 2, 3, 4].map(() => ({ totaal: 0, bekend: 0, bezig: 0 }));
    W.lijst.forEach((r) => { if (r[3] !== 'werkwoord' || r[0] <= 2) stand[r[0]].totaal++; });
    const kaarten = window.SRS.alle();
    const gezien = new Set();
    for (const id of Object.keys(kaarten)) {
      const k = kaarten[id];
      if (k.soort !== 'w') continue;
      const nr = lemmaNr(k.nl);
      if (nr < 0 || gezien.has(nr)) continue;
      gezien.add(nr);
      const t = W.lijst[nr][0];
      if (W.lijst[nr][3] === 'werkwoord' && t > 2) continue;
      stand[t].bezig++;
      if (k.box >= window.SRS.BEKEND) stand[t].bekend++;
    }
    return stand;
  }

  const schud = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  return { W, lees, schrijf, kaal, el, zoek, lemmaNr, woorden, kop, tredeStand, schud, sluitPop, instellingen, WORTEL, EXAMENS };
})();
