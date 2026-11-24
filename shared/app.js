// Gedeelde hulpjes: opslag, klikbare woorden met pop-up, de ❗-knop voor Engels.
// Nodig: woorden.js, srs.js en audio.js staan vóór dit bestand in de pagina.
window.App = (() => {
  const W = window.WOORDEN || { lijst: [], vormen: {} };
  const TOKEN = /[A-Za-zÀ-ÿ]+(?:['’-][A-Za-zÀ-ÿ]+)*/g;

  const WORTEL = new URL('../', document.currentScript.src).href; // de hoofdmap van de site
  const EXAMENS = ['lezen', 'luisteren', 'schrijven', 'spreken', 'knm'];
  const ruw = (k, d) => { try { const v = JSON.parse(localStorage.getItem('dutch-exam:' + k)); return v == null ? d : v; } catch (e) { return d; } };
  // Instellingen gelden voor alle examens (pagina instellingen.html). "open" = alle lessen zonder slot.
  // "door" = na een goed antwoord gaat de pagina vanzelf naar de volgende vraag.
  const instellingen = () => Object.assign({ open: false, door: true }, ruw('instellingen', {}));
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

  // ---------- tekens (lijn-iconen, 24 x 24) voor de knoppen in de kop ----------
  const TEKENS = {
    terug: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    zon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    maan: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    instel: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/>',
  };
  function teken(naam) { // vaste tekst uit TEKENS, geen invoer van buiten
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'icoon'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = TEKENS[naam];
    return s;
  }

  // ---------- thema: 'auto' (zoals het apparaat), 'licht' of 'donker'. shared/thema.js zet het bij het laden. ----------
  const thema = () => ruw('thema', 'auto');
  const isDonker = () => { const t = thema(); return t === 'donker' || (t !== 'licht' && window.matchMedia('(prefers-color-scheme: dark)').matches); };
  function zetThema(t) {
    schrijf('thema', t);
    const r = document.documentElement;
    if (t === 'donker') r.dataset.theme = 'dark'; else if (t === 'licht') r.dataset.theme = 'light'; else delete r.dataset.theme;
    document.dispatchEvent(new CustomEvent('thema'));
  }
  function themaKnop() {
    const k = el('button', { class: 'rond', onclick: () => zetThema(isDonker() ? 'licht' : 'donker') });
    const zet = () => { k.textContent = ''; k.append(teken(isDonker() ? 'zon' : 'maan')); k.title = isDonker() ? 'licht thema' : 'donker thema'; k.setAttribute('aria-label', k.title); };
    document.addEventListener('thema', zet);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', zet);
    zet();
    return k;
  }

  // ---------- melding "Goed antwoord!" ----------
  let toastEl = null, toastTik = 0;
  function toast(tekst, en) {
    if (!toastEl) { toastEl = el('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(toastEl); }
    toastEl.textContent = tekst;
    if (en) toastEl.dataset.en = en; else delete toastEl.dataset.en;
    toastEl.classList.add('aan');
    clearTimeout(toastTik);
    toastTik = setTimeout(() => toastEl.classList.remove('aan'), 1400);
  }
  // Na een goed antwoord: groene melding, en de knop "Verder" wordt na een korte tijd vanzelf ingedrukt
  // (instelling "door"; staat de knop niet meer op de pagina, dan gebeurt er niets). Fout antwoord: niets, de leerling leest eerst.
  function goed(knop) {
    toast('✔ Goed antwoord!', 'correct answer');
    if (knop && instellingen().door) setTimeout(() => { if (knop.isConnected && !knop.disabled) knop.click(); }, 1100);
  }

  // ---------- de balk met stappen boven een les ----------
  // o = { n, nu, max, min, ga(i) }  max = verste stap waar de leerling al was. Klik op een stap t/m max, of Vorige / Volgende.
  function balk(o) {
    const doel = document.getElementById('stappen');
    if (!doel) return;
    const min = o.min || 0, nu = Math.min(o.nu, o.n - 1), max = Math.min(Math.max(o.max == null ? nu : o.max, nu), o.n - 1);
    doel.textContent = '';
    const rij = el('div', { class: 'stappen-rij' });
    for (let i = 0; i < o.n; i++) {
      const kan = !!o.ga && i >= min && i <= max && i !== nu;
      rij.append(el('button', { type: 'button', class: 'stap' + (i === nu ? ' nu' : i < nu ? ' aan' : i <= max ? ' geweest' : ''), disabled: !kan,
        title: `stap ${i + 1}`, 'aria-label': `stap ${i + 1} van ${o.n}`, 'aria-current': i === nu ? 'step' : null, onclick: () => o.ga(i) }));
    }
    doel.append(rij);
    if (o.ga && o.n > 1) doel.append(el('div', { class: 'stappen-nav' },
      el('button', { type: 'button', class: 'knop licht klein', en: 'previous', disabled: nu <= min, onclick: () => o.ga(nu - 1) }, '← Vorige'),
      el('span', { class: 'zacht klein' }, `${nu + 1} / ${o.n}`),
      el('button', { type: 'button', class: 'knop licht klein', en: 'next', disabled: nu >= max, onclick: () => o.ga(nu + 1) }, 'Volgende →')));
  }
  // knoppen 1 2 3 voor de vragen bij één tekst. staat(i) = 'goed' | 'fout' | null (nog niet gedaan). Klik: terugkijken.
  function vraagKnoppen(n, nu, staat, ga) {
    let eerste = 0;
    while (eerste < n && staat(eerste)) eerste++;
    return el('div', { class: 'vraagnav' }, el('span', { class: 'zacht klein', en: 'question' }, 'Vraag'),
      el('div', { class: 'raster' }, Array.from({ length: n }, (_, i) => el('button', { type: 'button', class: ((staat(i) || '') + (i === nu ? ' nu' : '')).trim(),
        disabled: !(staat(i) || i === eerste), 'aria-current': i === nu ? 'step' : null, onclick: () => ga(i) }, String(i + 1)))));
  }

  // ---------- venster "Weet u het zeker?"  o = { titel, tekst, en, ja } -> Promise<boolean> ----------
  function bevestig(o) {
    return new Promise((af) => {
      if (!window.HTMLDialogElement) return af(window.confirm(o.titel + '\n\n' + o.tekst));
      const d = el('dialog', { class: 'vraagvenster' }, el('h3', {}, o.titel), el('p', { en: o.en || '' }, o.tekst),
        el('div', { class: 'knoppen' },
          el('button', { type: 'button', class: 'knop licht', en: 'cancel', onclick: () => d.close('nee') }, 'Annuleer'),
          el('button', { type: 'button', class: 'knop rood', onclick: () => d.close('ja') }, o.ja || 'Ja')));
      d.addEventListener('close', () => { d.remove(); af(d.returnValue === 'ja'); });
      document.body.append(d);
      d.showModal();
    });
  }

  // ---------- opnieuw beginnen ----------
  // wis('lezen') = alles van één examen · wis('herhalen') = de woordkaarten · wis() = alle voortgang.
  // De instellingen (thema, Engels, slot) blijven altijd; uw eigen gegevens voor het formulier blijven bij wis('schrijven').
  const BLIJFT = ['instellingen', 'en', 'thema'];
  function wis(wat) {
    const VOOR = 'dutch-exam:';
    try {
      const weg = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k.startsWith(VOOR)) continue;
        const n = k.slice(VOOR.length);
        if (wat === 'herhalen' ? n === 'srs' : wat ? (n === wat || (n.startsWith(wat + '-') && n !== 'schrijven-gegevens')) : !BLIJFT.includes(n)) weg.push(k);
      }
      weg.forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* geen opslag */ }
  }

  // kop met terug-pijl en de ❗-knop (Engels bij de knoppen van de pagina)
  function kop(titel, terug) {
    const h = el('header', { class: 'kop' },
      terug ? el('a', { class: 'terug', href: terug, title: 'terug', 'aria-label': 'terug' }, teken('terug')) : null,
      el('h1', {}, titel),
      themaKnop(),
      el('a', { class: 'rond instel', href: WORTEL + 'instellingen.html', title: 'instellingen', 'aria-label': 'instellingen' }, teken('instel')),
      el('button', { class: 'rond taal', title: 'Engels aan / uit', 'aria-label': 'Engels aan / uit', onclick: () => { document.body.classList.toggle('en'); schrijf('en', document.body.classList.contains('en')); } }, 'EN'));
    // de kop krijgt een schaduw zodra de pagina rolt
    const rol = () => document.body.classList.toggle('gerold', window.scrollY > 4);
    window.addEventListener('scroll', rol, { passive: true }); rol();
    document.body.prepend(h);
    // voet: wie de site maakte. Niet in een toets: daar staat onderaan de vaste balk met de knoppen.
    if (!location.pathname.includes('/toets/')) document.body.append(el('footer', { class: 'maker' },
      el('span', { en: 'made by Ario' }, 'Gemaakt door Ario'),
      el('a', { href: 'https://github.com/coditori', target: '_blank', rel: 'noopener' }, 'GitHub'),
      el('a', { href: 'https://www.linkedin.com/in/coditori/', target: '_blank', rel: 'noopener' }, 'LinkedIn')));
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

  return { W, lees, schrijf, kaal, el, zoek, lemmaNr, woorden, kop, tredeStand, schud, sluitPop, instellingen, WORTEL, EXAMENS,
    thema, zetThema, isDonker, toast, goed, balk, vraagKnoppen, bevestig, wis };
})();
