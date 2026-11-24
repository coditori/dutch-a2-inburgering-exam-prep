// Gedeelde hulpjes: opslag, klikbare woorden met pop-up, de ❗-knop voor Engels.
// Nodig: woorden.js, srs.js en audio.js staan vóór dit bestand in de pagina.
window.App = (() => {
  // De versie van de site (onder aan elke pagina). Niet met de hand veranderen: de CI verhoogt haar bij elke pull request (tools/versie.py).
  const VERSIE = '1.6.1';
  const W = window.WOORDEN || { lijst: [], vormen: {} };
  const TOKEN = /[A-Za-zÀ-ÿ]+(?:['’-][A-Za-zÀ-ÿ]+)*/g;

  const WORTEL = new URL('../', document.currentScript.src).href; // de hoofdmap van de site
  const EXAMENS = ['lezen', 'luisteren', 'schrijven', 'spreken', 'knm'];
  const ruw = (k, d) => { try { const v = JSON.parse(localStorage.getItem('dutch-exam:' + k)); return v == null ? d : v; } catch (e) { return d; } };
  // Instellingen gelden voor alle examens (pagina instellingen.html). "open" = alle lessen zonder slot.
  // "door" = na een goed antwoord gaat de pagina vanzelf naar de volgende vraag.
  // Een gedeelde link (knop Delen) heeft ?deel=1: dan is die les of toets open, ook als de ontvanger de lessen ervoor niet deed. Dit wordt niet bewaard.
  const GEDEELD = new URLSearchParams(location.search).has('deel');
  const instellingen = () => { const i = Object.assign({ open: false, door: true }, ruw('instellingen', {})); if (GEDEELD) i.open = true; return i; };
  const lees = (k, d) => {
    const v = ruw(k, d);
    if (EXAMENS.includes(k) && v && typeof v === 'object') v.open = instellingen().open;
    return v;
  };
  const schrijf = (k, v) => { try { localStorage.setItem('dutch-exam:' + k, JSON.stringify(v)); } catch (e) { /* geen opslag */ } };
  // Hulptaal: 'en' (Engels) of 'fa' (Perzisch). De hulp staat bij knoppen en uitleg (knop EN / FA in de kop) en achter ❗ bij een woord.
  // De lessen hebben alleen Engels; shared/fa.js heeft bij elke Engelse tekst de Perzische. Geen Perzisch gevonden? Dan blijft het Engels staan.
  const hulptaal = () => (ruw('hulptaal', 'en') === 'fa' ? 'fa' : 'en');
  if (hulptaal() === 'fa') document.write('<script src="' + WORTEL + 'shared/fa.js"><\/script>'); // geladen vóór de scripts van de pagina
  const fa = (en) => (hulptaal() === 'fa' && window.FA && typeof en === 'string' && window.FA[en]) || '';
  const hulp = (en) => fa(en) || en || '';
  const zetHulp = (e, en) => { if (en) e.dataset.en = en; else delete e.dataset.en; const f = fa(en); if (f) e.dataset.fa = f; else delete e.dataset.fa; };
  const zetTekstHulp = (e) => { const f = fa(e.dataset.hulp); e.textContent = f || e.dataset.hulp; e.dir = f ? 'rtl' : 'ltr'; }; // richting vast: rtl bij Perzisch
  const kaal = (s) => s.toLowerCase().replace(/’/g, "'").normalize('NFD').replace(/[̀-ͯ]/g, '');

  function el(tag, props, ...kinderen) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') e.className = v;
      else if (k === 'en') zetHulp(e, v);
      else if (k === 'hulp') { e.dataset.hulp = v || ''; zetTekstHulp(e); } // de vertaling als tekst (achter ❗)
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
      const en = el('div', { class: 'en', hidden: true, hulp: r.en });
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
    deel: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    // de balk met examens en de startpagina
    huis: '<path d="m3 10.5 9-7.5 9 7.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-6h4v6"/>',
    lezen: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    luisteren: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    schrijven: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    spreken: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    knm: '<path d="M3 21h18"/><path d="M5 21V10M9.5 21V10M14.5 21V10M19 21V10"/><path d="M12 3 2.5 8.5V10h19V8.5z"/>',
    pijl: '<path d="m9 18 6-6-6-6"/>',
    mens: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
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
    const k = el('button', { class: 'rond themaknop', onclick: () => zetThema(isDonker() ? 'licht' : 'donker') });
    const zet = () => { k.textContent = ''; k.append(teken(isDonker() ? 'zon' : 'maan')); k.title = isDonker() ? 'licht thema' : 'donker thema'; k.setAttribute('aria-label', k.title); };
    document.addEventListener('thema', zet);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', zet);
    zet();
    return k;
  }

  // ---------- delen: de link van deze les of toets naar iemand sturen ----------
  // Op een telefoon opent het deelvenster van het toestel (WhatsApp, Telegram, e-mail ...). Anders gaat de link naar het klembord.
  function deelLink() {
    const u = new URL(location.href);
    u.searchParams.set('deel', '1');
    u.hash = '';
    return u.href;
  }
  function deel(eigenUrl, tekst) { // zonder eigenUrl: de link van deze pagina
    const url = typeof eigenUrl === 'string' ? eigenUrl : deelLink();
    if (navigator.share) return navigator.share(Object.assign({ title: document.title, url }, tekst ? { text: tekst } : {})).catch(() => { /* de gebruiker sloot het venster */ });
    const klaar = () => toast('✔ Link gekopieerd', 'link copied');
    const metVeld = () => { // oude browser of geen toestemming voor het klembord
      const v = el('input', { value: url, readonly: true, style: 'position:fixed;opacity:0' });
      document.body.append(v); v.select();
      try { document.execCommand('copy'); klaar(); } catch (e) { window.prompt('Kopieer deze link:', url); }
      v.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(url).then(klaar, metVeld);
    return metVeld();
  }

  // ---------- de hulp kiezen: uit, Engels of Perzisch. Knop EN / FA in de kop, en de pagina Instellingen. ----------
  let taalKnopEl = null, taalMenu = null;
  const hulpAan = () => !!lees('en', false);
  // zet de pagina zoals de keuze is: klassen op body, de hulp bij elk element, de tekst op de knop
  function ververs() {
    const b = document.body.classList;
    b.toggle('en', hulpAan()); b.toggle('fa', hulptaal() === 'fa');
    document.querySelectorAll('[data-en]').forEach((e) => zetHulp(e, e.dataset.en));
    document.querySelectorAll('[data-hulp]').forEach(zetTekstHulp);
    if (taalKnopEl) taalKnopEl.textContent = hulptaal() === 'fa' ? 'FA' : 'EN';
    document.dispatchEvent(new CustomEvent('hulptaal'));
  }
  // k = 'uit' | 'en' | 'fa'. Perzisch laadt eerst shared/fa.js (als dat nog niet gebeurd is).
  function kiesHulp(k) {
    if (k === 'uit') schrijf('en', false); else { schrijf('en', true); schrijf('hulptaal', k); }
    if (k !== 'fa' || window.FA) return Promise.resolve(ververs());
    return new Promise((af) => {
      const s = el('script', { src: WORTEL + 'shared/fa.js' });
      s.onload = s.onerror = () => { ververs(); af(); };
      document.head.append(s);
    });
  }
  const sluitTaalMenu = () => { if (taalMenu) { taalMenu.remove(); taalMenu = null; } };
  function taalKnop() {
    taalKnopEl = el('button', { class: 'rond taal', title: 'taal van de hulp', 'aria-label': 'taal van de hulp: uit, Engels of Perzisch', 'aria-haspopup': 'menu', onclick: (e) => {
      e.stopPropagation();
      if (taalMenu) return sluitTaalMenu();
      const nu = !hulpAan() ? 'uit' : hulptaal();
      taalMenu = el('div', { class: 'taalmenu', role: 'menu' }, [['uit', 'Geen hulp'], ['en', 'English'], ['fa', 'فارسی']].map(([k, naam]) =>
        el('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(k === nu), class: k === nu ? 'nu' : '', onclick: () => { sluitTaalMenu(); kiesHulp(k); } }, naam)));
      taalKnopEl.parentNode.append(taalMenu);
    } }, hulptaal() === 'fa' ? 'FA' : 'EN');
    document.addEventListener('click', sluitTaalMenu);
    return taalKnopEl;
  }

  // ---------- melding "Goed antwoord!" ----------
  let toastEl = null, toastTik = 0;
  function toast(tekst, en) {
    if (!toastEl) { toastEl = el('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(toastEl); }
    toastEl.textContent = tekst;
    zetHulp(toastEl, en);
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
  const BLIJFT = ['instellingen', 'en', 'thema', 'hulptaal', 'profiel'];
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
    document.dispatchEvent(new CustomEvent('gewist')); // ingelogd? Dan gaat het ook weg bij het account (shared/account.js)
  }

  // ---------- de balk met examens: op de startpagina en op de vijf overzichten (niet in een les of toets) ----------
  // Breed scherm: in de kop. Telefoon: vast onder aan het scherm (shared/app.css, .nav).
  const NAV = [['', 'Start', 'home', 'huis'], ['lezen/', 'Lezen', 'reading', 'lezen'], ['luisteren/', 'Luisteren', 'listening', 'luisteren'],
    ['schrijven/', 'Schrijven', 'writing', 'schrijven'], ['spreken/', 'Spreken', 'speaking', 'spreken'], ['knm/', 'KNM', 'Dutch society', 'knm']];
  function nav() {
    const hier = location.href.split(/[?#]/)[0];
    if (!hier.startsWith(WORTEL)) return null;
    const pad = hier.slice(WORTEL.length).replace(/index\.html$/, '');
    if (!NAV.some(([p]) => p === pad)) return null;
    document.body.classList.add('met-nav');
    return el('nav', { class: 'nav', 'aria-label': 'de examens' }, NAV.map(([p, naam, en, t]) =>
      el('a', { href: WORTEL + p + 'index.html', class: p === pad ? 'nu' : '', 'aria-current': p === pad ? 'page' : null, title: en }, teken(t), el('span', {}, naam))));
  }

  // kop met terug-pijl en de ❗-knop (Engels bij de knoppen van de pagina)
  function kop(titel, terug) {
    const h = el('header', { class: 'kop' },
      terug ? el('a', { class: 'terug', href: terug, title: 'terug', 'aria-label': 'terug' }, teken('terug')) : el('span', { class: 'merk', 'aria-hidden': 'true' }, 'A2'),
      el('h1', {}, titel),
      nav(),
      el('button', { class: 'rond deel', title: 'deel deze pagina', 'aria-label': 'deel deze pagina', onclick: () => deel() }, teken('deel')),
      themaKnop(),
      el('a', { class: 'rond profielknop', href: WORTEL + 'profiel.html', title: 'profiel', 'aria-label': 'uw profiel' }, teken('mens')),
      el('a', { class: 'rond instel', href: WORTEL + 'instellingen.html', title: 'instellingen', 'aria-label': 'instellingen' }, teken('instel')),
      taalKnop());
    // de kop krijgt een schaduw zodra de pagina rolt
    const rol = () => document.body.classList.toggle('gerold', window.scrollY > 4);
    window.addEventListener('scroll', rol, { passive: true }); rol();
    document.body.prepend(h);
    // voet: wie de site maakte. Niet in een toets: daar staat onderaan de vaste balk met de knoppen.
    if (!location.pathname.includes('/toets/')) document.body.append(el('footer', { class: 'maker' },
      el('span', { en: 'made by Ario' }, 'Gemaakt door Ario'),
      el('a', { href: 'https://github.com/coditori', target: '_blank', rel: 'noopener' }, 'GitHub'),
      el('a', { href: 'https://www.linkedin.com/in/coditori/', target: '_blank', rel: 'noopener' }, 'LinkedIn'),
      el('span', { class: 'versie', title: 'versie van de site' }, 'v' + VERSIE)));
    ververs();
    // inloggen met Google (als de site dat heeft): laadt na de pagina, en zet de eerste letter van de naam op de knop Profiel
    document.addEventListener('account', () => {
      const g = window.Account && window.Account.staat.gebruiker, k = h.querySelector('.profielknop');
      if (!k) return;
      k.classList.toggle('in', !!g); k.textContent = '';
      k.append(g ? ((ruw('profiel', {}) || {}).naam || g.naam || g.email || '?').trim().slice(0, 1).toUpperCase() : teken('mens'));
    });
    document.head.append(el('script', { src: WORTEL + 'shared/account.js' }));
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

  // cijfer tot 10 met één cijfer achter de komma: 30 van de 40 goed = 7,5
  // ---------- het profiel: de kaart die de leerling deelt (profiel.html), en die bij het account bewaard wordt (account.js) ----------
  // Als rij is de kaart kort genoeg voor een link: [1, naam, dag, woorden gekend, woorden totaal, [per examen: [gehaald, totaal, [[toets, cijfer × 10], ...]]]]
  const MAX_NAAM = 30;
  const schoneNaam = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, MAX_NAAM);
  const heel = (x, max) => Math.max(0, Math.min(max, Math.round(Number(x)) || 0));
  async function profielNu() {
    const stand = tredeStand();
    return { naam: schoneNaam((ruw('profiel', {}) || {}).naam), dag: window.SRS.vandaag(),
      woorden: stand.reduce((s, t) => s + t.bekend, 0), woordenTotaal: stand.reduce((s, t) => s + t.totaal, 0),
      examens: (await overzicht()).map((x) => ({ n: x.n, gedaan: x.gedaan, cijfers: x.toetsen.filter((t) => t.beste != null).map((t) => [t.id, Math.round(t.beste * 100)]) })) };
  }
  const profielRij = (p) => [1, p.naam, p.dag, p.woorden, p.woordenTotaal, p.examens.map((x) => [x.gedaan, x.n, x.cijfers])];
  // Een rij van buiten (uit een link of van het account van iemand anders): streng controleren. null = niet goed.
  function profielUit(d) {
    if (!Array.isArray(d) || d[0] !== 1 || !Array.isArray(d[5]) || d[5].length !== EXAMENS.length) return null;
    const woordenTotaal = heel(d[4], 99999);
    return { naam: schoneNaam(d[1]), dag: heel(d[2], 99999), woordenTotaal, woorden: heel(d[3], woordenTotaal),
      examens: d[5].map((x) => {
        const n = heel(x && x[1], 999);
        return { n, gedaan: heel(x && x[0], n),
          cijfers: (Array.isArray(x && x[2]) ? x[2] : []).slice(0, 8).filter((c) => Array.isArray(c) && /^[A-Z]$/.test(c[0])).map((c) => [c[0], heel(c[1], 100)]) };
      }) };
  }

  const cijfer = (goed, totaal) => (totaal ? Math.round((goed / totaal) * 100) / 10 : 0).toFixed(1).replace('.', ',');
  // de uitslag van een toets: groot het cijfer, klein eronder hoeveel goed. wat = 'vragen goed' of 'punten'
  // Eronder de knop naar het profiel: daar deelt de leerling het cijfer met vrienden.
  const cijferBlok = (goed, totaal, wat) => [
    el('div', { class: 'groot midden' }, cijfer(goed, totaal), el('span', { class: 'cijfer-van' }, ' / 10')),
    el('p', { class: 'midden zacht' }, `${goed} van de ${totaal} ${wat || 'vragen goed'}`),
    el('p', { class: 'midden' }, el('a', { class: 'knop licht klein', href: WORTEL + 'profiel.html', en: 'share your mark with friends' }, teken('deel'), 'Deel uw cijfer'))];

  // ---------- overzicht van de vijf examens: lessen, toetsen en wat de leerling al deed (startpagina en profiel) ----------
  const NAMEN = { lezen: 'Lezen', luisteren: 'Luisteren', schrijven: 'Schrijven', spreken: 'Spreken', knm: 'KNM' };
  const haal = (pad) => fetch(WORTEL + pad, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  function overzicht() {
    return Promise.all(EXAMENS.map(async (map) => {
      // lessen staan in lessons/ ; bij KNM in themes/ (elk thema = 4 stappen: woorden, weetjes, situaties, meer weetjes)
      // een examen is klaar als de map een index.html heeft
      const [klaar, lessen, themas, toetsen] = await Promise.all([
        fetch(`${WORTEL}${map}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false),
        haal(`${map}/lessons/index.json`), haal(`${map}/themes/index.json`), haal(`${map}/toets/index.json`)]);
      const P = lees(map, {});
      const n = lessen.length || 4 * themas.length;
      const gedaan = Math.min(n, Object.values(P.lessen || {}).filter((r) => r && r.beste / r.totaal >= 0.8).length);
      // per toets het beste resultaat als deel van 1 (0,75 = cijfer 7,5); null = nog niet gedaan
      const beste = (t) => { const r = (P.toets || {})[t.id] || []; return r.length ? Math.max(...r.map((y) => y.score / (y.totaal || t.vragen || 1))) : null; };
      return { naam: NAMEN[map], map, href: `${map}/index.html`, klaar, n, gedaan, lessen, toetsen: toetsen.map((t) => Object.assign({ beste: beste(t) }, t)) };
    }));
  }

  const schud = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  return { VERSIE, W, lees, schrijf, kaal, el, teken, hulp, hulptaal, hulpAan, kiesHulp, zoek, lemmaNr, woorden, kop, tredeStand, schud, sluitPop, instellingen, WORTEL, EXAMENS,
    cijfer, cijferBlok, overzicht, profielNu, profielRij, profielUit, schoneNaam, deel, deelLink, thema, zetThema, isDonker, toast, goed, balk, vraagKnoppen, bevestig, wis };
})();
