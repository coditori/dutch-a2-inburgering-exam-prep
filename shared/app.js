// Gedeelde hulpjes: opslag, klikbare woorden met pop-up, de knop voor de vertaling, en de lijst Mijn woorden.
// Nodig: woorden.js, srs.js en audio.js staan vóór dit bestand in de pagina.
window.App = (() => {
  // De versie van de site (onder aan elke pagina). Niet met de hand veranderen: de CI verhoogt haar bij elke pull request (tools/versie.py).
  const NAAM = window.SITE_NAAM || ''; // de naam van de site staat op één plek: shared/thema.js
  const VERSIE = '1.26.0';
  const W = window.WOORDEN || { lijst: [], vormen: {} };
  const TOKEN = /[A-Za-zÀ-ÿ]+(?:['’-][A-Za-zÀ-ÿ]+)*/g;

  const WORTEL = new URL('../', document.currentScript.src).href; // de hoofdmap van de site
  const EXAMENS = ['lezen', 'luisteren', 'schrijven', 'spreken', 'knm'];
  const ruw = (k, d) => { try { const v = JSON.parse(localStorage.getItem('dutch-exam:' + k)); return v == null ? d : v; } catch (e) { return d; } };
  // Instellingen gelden voor alle examens (pagina instellingen.html). "open" = alle lessen zonder slot: dat is nu altijd zo.
  // De leerling kiest zelf: elke les, trainer en toets is open (de volgende les staat wel voorop, met de klasse "nu").
  // "door" = na een goed antwoord gaat de pagina vanzelf naar de volgende vraag.
  const instellingen = () => { const i = Object.assign({ door: true }, ruw('instellingen', {})); i.open = true; return i; };
  const lees = (k, d) => {
    const v = ruw(k, d);
    if (EXAMENS.includes(k) && v && typeof v === 'object') v.open = instellingen().open;
    return v;
  };
  const werk = (v) => JSON.stringify([(v && v.lessen) || {}, (v && v.toets) || {}, (v && v.trainers) || {}]); // wat de leerling deed in een examen
  const schrijf = (k, v) => {
    // een les, een trainer of een oefenexamen erbij? Dan is vandaag een dag waarop u oefende (Dagen, verderop)
    if (EXAMENS.includes(k) && werk(v) !== werk(ruw(k, null))) {
      telDag();
      try { localStorage.setItem('dutch-exam:laatst', JSON.stringify(k)); } catch (e) { /* geen opslag */ } // het examen waar de leerling het laatst aan werkte
    }
    try { localStorage.setItem('dutch-exam:' + k, JSON.stringify(v)); } catch (e) { /* geen opslag */ }
  };
  // Hulptaal: 'en' (Engels) of 'fa' (Perzisch). De hulp staat bij knoppen en uitleg (knop EN / FA in de kop) en achter de knop Vertaling bij een woord.
  // De lessen hebben alleen Engels; shared/fa.js heeft bij elke Engelse tekst de Perzische. Geen Perzisch gevonden? Dan blijft het Engels staan.
  const hulptaal = () => (ruw('hulptaal', 'en') === 'fa' ? 'fa' : 'en');
  if (hulptaal() === 'fa') document.write('<script src="' + WORTEL + 'shared/fa.js?v=' + VERSIE + '"><\/script>'); // geladen vóór de scripts van de pagina
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
      else if (k === 'hulp') { e.dataset.hulp = v || ''; zetTekstHulp(e); } // de vertaling als tekst (achter de knop Vertaling)
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kinderen.flat()) if (k != null && k !== false) e.append(typeof k === 'string' && k.includes('[[') ? metPlaatjes(k) : k);
    return e;
  }
  // Eigen plaatjes. Voor een keuken, een kamer of een tafel bestaat geen emoji; daar staat in de les "[[keuken]]".
  // Dat wordt de tekening shared/plaatjes/keuken.svg, even groot als een emoji ernaast. De rest van de tekst blijft tekst.
  function metPlaatjes(tekst) {
    const f = document.createDocumentFragment();
    tekst.split(/\[\[([a-z-]+)\]\]/).forEach((stuk, i) => {
      if (i % 2) f.append(el('img', { class: 'plaatje', src: WORTEL + 'shared/plaatjes/' + stuk + '.svg', alt: '', draggable: 'false' }));
      else if (stuk) f.append(stuk);
    });
    return f;
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

  // Het nummer van een regel van de woordenlijst. Eerst de hele regel ("duur / goedkoop"), anders een deel ervan ("de koffie").
  let regelNrs = null;
  function lijstNr(nl) {
    if (!regelNrs) { regelNrs = new Map(); W.lijst.forEach((r, i) => { if (!regelNrs.has(r[1])) regelNrs.set(r[1], i); }); }
    return regelNrs.has(nl) ? regelNrs.get(nl) : lemmaNr(nl);
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
        const s = el('span', { class: 'w' + (nieuw && nrs.some((n) => nieuw.has(n)) ? ' nieuw' : '') + (nrs.some((n) => Mijn.heeft(W.lijst[n][1])) ? ' bewaard' : '') }, m[0]);
        f.append(s);
      } else f.append(m[0]);
      vorige = m.index + m[0].length;
    }
    if (vorige < tekst.length) f.append(tekst.slice(vorige));
    return f;
  }

  // ---------- samengestelde woorden: ziekenhuis = zieken + huis ----------
  // W.delen (gemaakt door tools/bouw.py): woord -> de plekken waar een nieuw deel begint. De delen staan er zoals ze in het woord staan,
  // één keer gesplitst: zorgtoeslag = zorg + toeslag. Geen samenstelling: null.
  function delen(woord) {
    const plek = (W.delen || {})[kaal(woord)];
    return plek ? [0, ...plek].map((p, i) => woord.slice(p, plek[i])) : null;
  }
  // De regel "zieken + huis" voor elk samengesteld woord in een tekst ("de huisarts / de tandarts" geeft er twee). Niets te splitsen: null.
  function delenRegel(tekst) {
    const rijen = (String(tekst).match(TOKEN) || []).map(delen).filter(Boolean);
    return rijen.length ? el('div', { class: 'delen', lang: 'nl', en: 'the parts of this word' },
      rijen.map((d) => el('span', { class: 'delen-woord' }, d.flatMap((stuk, i) => [i ? el('i', {}, '+') : null, el('span', {}, stuk)])))) : null;
  }

  // ---------- Mijn woorden: de lijst die de leerling zelf maakt (pagina mijn-woorden.html) ----------
  // Bewaard als { "het huis": { t, sinds, n, weg } }. De sleutel is het woord uit de woordenlijst, dus met de of het erbij.
  //   sinds = wanneer bewaard, n = de notitie van de leerling, t = de laatste verandering, weg = van de lijst gehaald.
  // Een weggehaald woord blijft als regel staan (weg: true): zo komt het niet terug van een ander apparaat (shared/account.js).
  // Ingelogd met Google? Dan gaat de lijst mee naar het account. "Wis alle voortgang" laat de lijst staan: het zijn uw eigen aantekeningen.
  const MAX_NOTITIE = 500;
  const Mijn = (() => {
    let kopie = null; // één keer lezen per pagina; een ander tabblad of het account maakt de kopie leeg
    const alle = () => { if (!kopie) { const v = ruw('mijn-woorden', {}); kopie = v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } return kopie; };
    const bewaar = () => { schrijf('mijn-woorden', kopie); document.dispatchEvent(new CustomEvent('mijn-woorden')); };
    const leeg = () => { kopie = null; };
    window.addEventListener('storage', (e) => { if (!e.key || e.key === 'dutch-exam:mijn-woorden') { leeg(); document.dispatchEvent(new CustomEvent('mijn-woorden-anders')); } });
    document.addEventListener('account-gegevens', leeg);
    document.addEventListener('gewist', leeg);
    const heeft = (nl) => { const r = alle()[nl]; return !!r && !r.weg; };
    return {
      heeft,
      // aan = true: op de lijst (en bij de woordkaarten van Herhalen). aan = false: van de lijst; de notitie blijft bewaard voor "Ongedaan maken".
      zet(nl, aan) {
        const a = alle(), nu = Date.now(), r = a[nl] || {};
        if (aan === heeft(nl)) return;
        a[nl] = aan ? { t: nu, sinds: nu, n: r.n || '' } : { t: nu, sinds: r.sinds || nu, n: r.n || '', weg: true };
        if (aan) window.SRS.voegToe('w:' + nl, { soort: 'w', nl });
        bewaar();
      },
      // na "Ongedaan maken": het woord staat er weer, met de oude datum en notitie
      terug(nl) { const r = alle()[nl]; if (!r || !r.weg) return; delete r.weg; r.t = Date.now(); bewaar(); },
      notitie(nl, tekst) {
        const r = alle()[nl], n = String(tekst || '').slice(0, MAX_NOTITIE);
        if (!r || r.weg || r.n === n) return;
        r.n = n; r.t = Date.now(); bewaar();
      },
      // de lijst, nieuwste eerst: [{ nl, sinds, n, regel }]  regel = de regel uit de woordenlijst (of null: het woord staat er niet meer in)
      lijst() {
        const a = alle();
        return Object.keys(a).filter((nl) => !a[nl].weg).map((nl) => {
          const nr = lijstNr(nl);
          return { nl, sinds: a[nl].sinds || 0, n: a[nl].n || '', regel: nr < 0 || W.lijst[nr][1] !== nl ? null : zoekNr(nr) };
        }).sort((x, y) => y.sinds - x.sinds);
      },
      tel: () => { const a = alle(); return Object.keys(a).filter((nl) => !a[nl].weg).length; },
    };
  })();
  const zoekNr = (i) => ({ nr: i, trede: W.lijst[i][0], nl: W.lijst[i][1], en: W.lijst[i][2], thema: W.lijst[i][3], beeld: W.lijst[i][4], extra: W.lijst[i][5], zin: W.lijst[i][6] });
  // "het huis" -> ['het', 'huis'];  "lopen" -> ['', 'lopen'];  "de koffie / de thee" -> ['de', 'koffie / de thee']
  const lidwoord = (nl) => { const m = /^(de|het)\s+(.+)$/i.exec(nl); return m ? [m[1].toLowerCase(), m[2]] : ['', nl]; };
  // het woord met het lidwoord in een eigen kleur: zo blijft de of het hangen
  const metLidwoord = (nl) => { const [lw, rest] = lidwoord(nl); return lw ? [el('span', { class: 'lw lw-' + lw }, lw), ' ', rest] : [nl]; };
  // zet het streepje onder de bewaarde woorden in de teksten van deze pagina opnieuw
  function streepjes() {
    document.querySelectorAll('.w').forEach((w) => w.classList.toggle('bewaard', (W.vormen[kaal(w.textContent)] || []).some((n) => Mijn.heeft(W.lijst[n][1]))));
  }
  document.addEventListener('mijn-woorden', streepjes);
  document.addEventListener('mijn-woorden-anders', streepjes);

  // ---------- drie knoppen die op veel plekken staan: luister, vertaling, bewaar ----------
  // luisterKnop(doe)        een rondje met een luidspreker. doe = wat er gebeurt bij een klik.
  // vertaalKnop(doel)       laat het element met de vertaling zien, of haalt het weer weg.
  // bewaarKnop(nl, metTekst) zet het woord op de lijst Mijn woorden, of haalt het eraf. null als het woord niet in de woordenlijst staat.
  const stil = (doe) => (e) => { e.stopPropagation(); doe(e); }; // een klik op de knop is geen klik op de kaart eromheen
  const luisterKnop = (doe, naam) => el('button', { type: 'button', class: 'rond', title: 'luister', 'aria-label': naam || 'luister', onclick: stil(doe) }, teken('luid'));
  function vertaalKnop(doel) {
    const k = el('button', { type: 'button', class: 'rond', title: 'vertaling', 'aria-label': 'vertaling', 'aria-pressed': String(!doel.hidden),
      onclick: stil(() => { doel.hidden = !doel.hidden; k.setAttribute('aria-pressed', String(!doel.hidden)); }) }, teken('vertaal'));
    return k;
  }
  function bewaarKnop(woord, metTekst) {
    const nr = lijstNr(woord);
    if (nr < 0) return null; // niet in de woordenlijst: geen vertaling en geen geluid, dus niet te bewaren
    const nl = W.lijst[nr][1];
    const tekst = metTekst ? el('span', {}) : null;
    const k = el('button', { type: 'button', class: metTekst ? 'knop licht klein bewaarknop' : 'rond bewaarknop', onclick: stil(() => {
      const aan = !Mijn.heeft(nl);
      Mijn.zet(nl, aan);
      if (metTekst) return; // de knop zegt zelf "Bewaard"; een melding erbij is te veel
      if (aan) toast('Bewaard in Mijn woorden', 'saved in My words', { naam: 'Bekijk', en: 'view', href: WORTEL + 'mijn-woorden.html' });
      else toast('Van uw lijst gehaald', 'removed from your list', { naam: 'Ongedaan maken', en: 'undo', doe: () => Mijn.terug(nl) });
    }) }, teken('bewaar'), tekst);
    const zet = () => {
      const aan = Mijn.heeft(nl);
      k.classList.toggle('aan', aan); k.setAttribute('aria-pressed', String(aan));
      k.title = aan ? 'haal van mijn woorden' : 'bewaar in mijn woorden'; k.setAttribute('aria-label', k.title);
      if (tekst) { tekst.textContent = aan ? 'Bewaard' : 'Bewaar'; zetHulp(tekst, aan ? 'saved' : 'save'); }
    };
    zet();
    const hoor = () => { if (k.isConnected) zet(); else { document.removeEventListener('mijn-woorden', hoor); document.removeEventListener('mijn-woorden-anders', hoor); } };
    document.addEventListener('mijn-woorden', hoor); document.addEventListener('mijn-woorden-anders', hoor);
    return k;
  }

  // ---------- het kaartje bij een woord in een tekst ----------
  // Het woord met de of het, het plaatje, en drie knoppen: luister, vertaling, bewaar. De vertaling staat er pas na een klik.
  // Een samengesteld woord (ziekenhuis, fietsenwinkel) heeft bovenaan de losse delen: zieken + huis.
  // Breed scherm: het kaartje staat bij het woord (eronder, of erboven als daar geen plek is). Telefoon: een blad onder aan het scherm.
  let pop = null, popDoel = null;
  function sluitPop() { if (pop) { pop.remove(); pop = null; } if (popDoel) { popDoel.classList.remove('open'); popDoel = null; } }
  function toonPop(doel) {
    if (popDoel === doel) return sluitPop(); // nog een klik op hetzelfde woord: weg
    sluitPop();
    const regels = zoek(doel.textContent);
    if (!regels.length) return;
    pop = el('div', { id: 'wpop', role: 'dialog', 'aria-label': 'woord: ' + doel.textContent }, regels.map((r) => {
      const en = el('div', { class: 'en', hidden: true, hulp: r.en });
      window.SRS.voegToe('w:' + r.nl, { soort: 'w', nl: r.nl });
      return el('div', { class: 'rij' },
        el('div', { class: 'wpop-kop' },
          r.beeld ? el('span', { class: 'beeld', 'aria-hidden': 'true' }, r.beeld) : null,
          el('div', { class: 'wpop-woord' }, el('b', {}, metLidwoord(r.nl)), el('span', { class: 'klein zacht' }, [r.extra, r.thema].filter(Boolean).join(', ')))),
        en,
        el('div', { class: 'wpop-knoppen' }, luisterKnop(() => window.Spraak.zeg(r.nl), 'luister naar ' + r.nl), vertaalKnop(en), bewaarKnop(r.nl, true)));
    }));
    const losseDelen = delenRegel(doel.textContent);
    if (losseDelen) pop.prepend(losseDelen);
    // onderaan: de weg naar de lijst, zodra er iets op staat
    const naarLijst = el('a', { class: 'wpop-lijst', href: WORTEL + 'mijn-woorden.html' });
    const zetLijst = () => { const n = Mijn.tel(); naarLijst.hidden = !n; naarLijst.textContent = ''; naarLijst.append(el('span', { en: 'my words' }, `Mijn woorden: ${n}`), teken('pijl')); };
    zetLijst();
    const hoor = () => { if (naarLijst.isConnected) zetLijst(); else document.removeEventListener('mijn-woorden', hoor); };
    document.addEventListener('mijn-woorden', hoor);
    pop.append(naarLijst);
    document.body.append(pop);
    popDoel = doel; doel.classList.add('open');
    if (window.matchMedia('(max-width: 560px)').matches) return; // telefoon: het blad onderaan (shared/app.css)
    const b = doel.getBoundingClientRect(), hoog = pop.offsetHeight;
    const boven = b.bottom + 6 + hoog > window.innerHeight && b.top - 6 - hoog > 0;
    pop.style.top = (window.scrollY + (boven ? b.top - 6 - hoog : b.bottom + 6)) + 'px';
    pop.style.left = Math.max(8, Math.min(window.scrollX + b.left, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 8)) + 'px';
  }
  document.addEventListener('click', (e) => {
    if (pop && pop.contains(e.target)) return;
    if (e.target.closest && e.target.closest('#toast')) return; // "Ongedaan maken" in de melding sluit het kaartje niet
    const w = e.target.closest && e.target.closest('.w');
    if (w && !document.body.classList.contains('geen-woorden')) toonPop(w); else sluitPop();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') sluitPop(); });

  // ---------- tekens (lijn-iconen, 24 x 24) voor de knoppen in de kop ----------
  const TEKENS = {
    terug: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    zon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    maan: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    instel: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/>',
    stem: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
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
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/>',
    // bij een woord of een zin: luister, vertaling, bewaar in Mijn woorden
    luid: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
    vertaal: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
    bewaar: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    zoek: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    kruis: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    // het oefenexamen: de klok en de vlag (een vraag markeren om later terug te komen)
    klok: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/>',
    zacht: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
    vlag: '<path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/>',
    raster: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
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
  // ---------- grootte van de tekst: 'klein', 'gewoon', 'groot' of 'extra'. shared/thema.js zet haar bij het laden. ----------
  const tekst = () => { const t = ruw('tekst', 'gewoon'); return window.TEKST_SCHAAL && window.TEKST_SCHAAL[t] ? t : 'gewoon'; };
  function zetTekst(t) {
    const s = (window.TEKST_SCHAAL || {})[t] || 1;
    schrijf('tekst', s === 1 ? 'gewoon' : t);
    if (s === 1) document.documentElement.style.removeProperty('--schaal'); else document.documentElement.style.setProperty('--schaal', s);
  }
  // ---------- het menu achter de knop Profiel in de kop: profiel, instellingen en het thema ----------
  // Eén knop in plaats van drie: zo staan er in de kop alleen nog Delen (in een les), deze knop en de hulptaal.
  let kopMenu = null;
  const sluitKopMenu = () => { if (kopMenu) { kopMenu.remove(); kopMenu = null; } };
  function profielKnop() {
    const k = el('button', { type: 'button', class: 'rond profielknop', title: 'menu', 'aria-label': 'menu: profiel, instellingen, stem en thema', 'aria-haspopup': 'menu', onclick: (e) => {
      e.stopPropagation();
      if (kopMenu) return sluitKopMenu();
      sluitTaalMenu();
      const A = window.Account, g = A && A.staat.gebruiker, kan = A && A.staat.beschikbaar && !g;
      const regel = (naam, t, en) => [teken(t), el('span', { en }, naam)];
      kopMenu = el('div', { class: 'taalmenu kopmenu', role: 'menu' },
        el('a', { role: 'menuitem', href: WORTEL + 'profiel.html' }, regel(kan ? 'Profiel: log in' : 'Profiel', 'mens', kan ? 'profile: log in with Google' : 'profile')),
        el('a', { role: 'menuitem', href: WORTEL + 'mijn-woorden.html' }, regel('Mijn woorden', 'bewaar', 'my words'), Mijn.tel() ? el('span', { class: 'menu-tel' }, String(Mijn.tel())) : null),
        el('a', { role: 'menuitem', href: WORTEL + 'instellingen.html' }, regel('Instellingen', 'instel', 'settings')),
        el('a', { role: 'menuitem', href: WORTEL + 'instellingen.html#stem' }, regel('Stem kiezen', 'stem', 'choose the voice')),
        el('button', { type: 'button', role: 'menuitem', onclick: () => { sluitKopMenu(); zetThema(isDonker() ? 'licht' : 'donker'); } },
          isDonker() ? regel('Licht thema', 'zon', 'light theme') : regel('Donker thema', 'maan', 'dark theme')));
      k.parentNode.append(kopMenu);
    } }, teken('mens'));
    document.addEventListener('click', sluitKopMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { sluitKopMenu(); sluitTaalMenu(); } });
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
      const s = el('script', { src: WORTEL + 'shared/fa.js?v=' + VERSIE });
      s.onload = s.onerror = () => { ververs(); af(); };
      document.head.append(s);
    });
  }
  const sluitTaalMenu = () => { if (taalMenu) { taalMenu.remove(); taalMenu = null; } };
  function taalKnop() {
    taalKnopEl = el('button', { class: 'rond taal', title: 'taal van de hulp', 'aria-label': 'taal van de hulp: uit, Engels of Perzisch', 'aria-haspopup': 'menu', onclick: (e) => {
      e.stopPropagation();
      if (taalMenu) return sluitTaalMenu();
      sluitKopMenu();
      const nu = !hulpAan() ? 'uit' : hulptaal();
      taalMenu = el('div', { class: 'taalmenu', role: 'menu' }, [['uit', 'Geen hulp'], ['en', 'English'], ['fa', 'فارسی']].map(([k, naam]) =>
        el('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(k === nu), class: k === nu ? 'nu' : '', onclick: () => { sluitTaalMenu(); kiesHulp(k); } }, naam)));
      taalKnopEl.parentNode.append(taalMenu);
    } }, hulptaal() === 'fa' ? 'FA' : 'EN');
    document.addEventListener('click', sluitTaalMenu);
    return taalKnopEl;
  }

  // ---------- melding "Goed antwoord!" ----------
  // actie (mag weg) = { naam, en, doe } of { naam, en, href }: een knop in de melding, zoals "Ongedaan maken". De melding blijft dan langer staan.
  let toastEl = null, toastTik = 0;
  function toast(tekst, en, actie, ms) {
    if (!toastEl) { toastEl = el('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(toastEl); }
    const weg = () => toastEl.classList.remove('aan');
    toastEl.textContent = '';
    const t = el('span', {}, tekst);
    toastEl.append(t);
    // zonder knop staat de hulp op de melding zelf (zoals altijd); met een knop bij de tekst, zodat ze voor de knop komt
    zetHulp(actie ? t : toastEl, en); if (actie) zetHulp(toastEl, '');
    if (actie) toastEl.append(actie.href ? el('a', { class: 'toast-knop', href: actie.href, en: actie.en }, actie.naam)
      : el('button', { type: 'button', class: 'toast-knop', en: actie.en, onclick: () => { weg(); actie.doe(); } }, actie.naam));
    toastEl.classList.toggle('met-knop', !!actie);
    toastEl.classList.remove('pop', 'vuur');
    toastEl.classList.add('aan');
    clearTimeout(toastTik);
    toastTik = setTimeout(weg, ms || (actie ? 5000 : 1400));
  }
  // Na een goed antwoord: groene melding, en de knop "Verder" wordt na een korte tijd vanzelf ingedrukt
  // (instelling "door"; staat de knop niet meer op de pagina, dan gebeurt er niets). Fout antwoord: niets, de leerling leest eerst.
  // Drie of meer goede antwoorden na elkaar: de melding telt mee ("3 goed op rij!") met een vlam. Een fout antwoord begint opnieuw bij nul.
  // Een fout antwoord heeft geen eigen functie: de pagina's zetten de klasse "fout" op het antwoord of op de uitslag. Daar kijken we naar.
  let reeks = 0;
  const FOUT = '.optie.fout, .uitslag.fout, input.fout';
  if (window.MutationObserver) new MutationObserver((lijst) => {
    for (const m of lijst) for (const n of (m.type === 'attributes' ? [m.target] : m.addedNodes)) {
      if (n.nodeType === 1 && (n.matches(FOUT) || (m.type === 'childList' && n.querySelector(FOUT)))) reeks = 0;
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  function goed(knop) {
    reeks++; telDag(); // een goed antwoord: vandaag is een dag waarop u oefende
    if (reeks >= 3) toast(`🔥 ${reeks} goed op rij!`, 'right answers in a row'); else toast('✔ Goed antwoord!', 'correct answer');
    void toastEl.offsetWidth; // de sprong van de melding begint bij elk goed antwoord opnieuw
    toastEl.classList.add('pop'); toastEl.classList.toggle('vuur', reeks >= 3);
    if (knop && instellingen().door) setTimeout(() => { if (knop.isConnected && !knop.disabled) knop.click(); }, 1100);
  }

  // ---------- de balk met stappen boven een les ----------
  // o = { n, nu, max, min, ga(i), staat(i) }  max = verste stap waar de leerling al was. Klik op een stap t/m max, of Vorige / Volgende.
  // staat(i) (mag weg) = 'fout' als de leerling in die stap een vraag fout had: de stap is dan rood en dikker. Een klik brengt de leerling terug.
  // De balk tekent zichzelf opnieuw bij de gebeurtenis 'balk' (document): zo wordt een stap rood of weer blauw meteen na een antwoord.
  function balk(o) {
    const doel = document.getElementById('stappen');
    if (!doel) return;
    const min = o.min || 0, nu = Math.min(o.nu, o.n - 1), max = Math.min(Math.max(o.max == null ? nu : o.max, nu), o.n - 1);
    doel.textContent = '';
    const rij = el('div', { class: 'stappen-rij' });
    for (let i = 0; i < o.n; i++) {
      const kan = !!o.ga && i >= min && i <= max && i !== nu;
      const fout = !!o.staat && i <= max && o.staat(i) === 'fout';
      rij.append(el('button', { type: 'button', class: 'stap' + (i === nu ? ' nu' : i < nu ? ' aan' : i <= max ? ' geweest' : '') + (fout ? ' fout' : ''), disabled: !kan,
        title: fout ? `stap ${i + 1}: fout, probeer opnieuw` : `stap ${i + 1}`, 'aria-label': `stap ${i + 1} van ${o.n}` + (fout ? ': fout, probeer opnieuw' : ''), 'aria-current': i === nu ? 'step' : null, onclick: () => o.ga(i) }));
    }
    doel.append(rij);
    if (o.ga && o.n > 1) doel.append(el('div', { class: 'stappen-nav' },
      el('button', { type: 'button', class: 'knop licht klein', en: 'previous', disabled: nu <= min, onclick: () => o.ga(nu - 1) }, 'Vorige'),
      el('span', { class: 'zacht klein' }, `${nu + 1} / ${o.n}`),
      el('button', { type: 'button', class: 'knop licht klein', en: 'next', disabled: nu >= max, onclick: () => o.ga(nu + 1) }, 'Volgende')));
  }
  // Na de uitslag van een les: de stappen met een foute vraag, als knoppen. lijst = [{ naam, ga }]. Leeg: niets (null).
  const foutKnoppen = (lijst) => (lijst.length ? el('div', { class: 'foutlijst' },
    el('p', { class: 'klein', en: 'These were wrong. Click one and try it again: your score goes up.' }, 'Deze waren fout. Klik erop en probeer het opnieuw: uw score gaat omhoog.'),
    el('div', { class: 'foutlijst-rij' }, lijst.map((x) => el('button', { type: 'button', class: 'knop klein foutknop', onclick: x.ga }, x.naam)))) : null);
  // de knop bij een fout antwoord in een les
  const opnieuwKnop = (doe) => el('button', { type: 'button', class: 'knop licht', en: 'try again', onclick: doe }, 'Probeer opnieuw');
  // Een les die u al haalde (80% of meer) is helemaal open: in de balk kunt u naar elke stap, ook als u de les opnieuw opent.
  // r = het bewaarde resultaat van de les ({ beste, totaal }), n = het aantal stappen. Antwoord: de verste stap die open is. Dat is de laatste, de uitslag: wie daarheen springt, ziet zijn beste score van eerder (App.alGehaald).
  const lesGehaald = (r) => !!r && !!r.totaal && r.beste / r.totaal >= 0.8;
  const vrijTot = (r, n) => (lesGehaald(r) ? Math.max(0, n - 1) : 0);
  // Rondkijken in een les die u al haalde telt niet als een nieuwe poging: anders stond er "0 / 5" na een paar klikken in de balk.
  //   sprong(stand, i)   bij een klik in de balk naar stap i: onthoudt dat de leerling stappen oversloeg (stand.ver = de verste stap die gewoon bereikt is)
  //   bladert(stand, r)  bij de uitslag: sloeg de leerling stappen over in een les die al gehaald is? Dan geen nieuwe score.
  //   alGehaald(r, knoppen) het vak dat dan in plaats van de uitslag komt: de beste score van eerder.
  const sprong = (stand, i) => { if (i > (stand.ver || 0)) stand.sprong = true; };
  const bladert = (stand, r) => !!stand.sprong && !stand.geteld && lesGehaald(r);
  const alGehaald = (r, knoppen) => el('div', { class: 'kaart midden' },
    el('div', { class: 'groot' }, `${r.beste} / ${r.totaal}`),
    el('p', { class: 'uitslag goed', en: 'You passed this lesson before. This is your best score.' }, '✔ Deze les haalde u al. Dit is uw beste score.'),
    el('p', { class: 'zacht klein', en: 'You looked around without doing every step, so this time is not counted.' }, 'U keek rond zonder elke stap te doen. Daarom telt deze keer niet mee.'),
    el('div', { class: 'knoppen', style: 'justify-content:center' }, knoppen));
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
  // wis('lezen') = alles van één examen, wis('herhalen') = de woordkaarten, wis() = alle voortgang.
  // De instellingen (thema, Engels, slot) en de lijst Mijn woorden blijven altijd; uw eigen gegevens voor het formulier blijven bij wis('schrijven').
  // 'account-in' = deze browser is ingelogd (shared/account.js); de demo-sleutels zijn het nep-account van { "demo": true }
  const BLIJFT = ['instellingen', 'en', 'thema', 'hulptaal', 'stem', 'mijn-woorden', 'profiel', 'account-in', 'account-kan', 'demo-in', 'demo-wolk', 'demo-kaart'];
  BLIJFT.push('tekst'); // de grootte van de tekst is ook een instelling
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

  // ---------- uitleg achter een knop ----------
  // Lange uitleg staat niet open op de pagina: er staat een knop met een i. Een klik laat de uitleg zien, nog een klik haalt hem weg.
  // Zet class="uitleg" op het element met de uitleg. Staat het direct onder een kop (h2, h3), dan komt de knop in die kop.
  // Anders komt er een knop met een woord erbij: "Uitleg", of de tekst van data-knop (en data-knop-en voor de hulp).
  // App.kop() doet dit voor wat al op de pagina staat; komt er later iets bij, roep dan App.uitleg(element) aan.
  let uitlegNr = 0;
  function uitleg(wortel) {
    (wortel || document).querySelectorAll('.uitleg:not(.uitleg-tekst)').forEach((doel) => {
      doel.classList.add('uitleg-tekst'); doel.hidden = true;
      if (!doel.id) doel.id = 'uitleg-' + (++uitlegNr);
      const vorige = doel.previousElementSibling, inKop = vorige && /^H[1-4]$/.test(vorige.tagName);
      const naam = inKop ? '' : (doel.dataset.knop || 'Uitleg');
      const k = el('button', { type: 'button', class: 'infoknop' + (inKop ? '' : ' met-tekst'), title: 'uitleg', 'aria-label': naam || 'uitleg', 'aria-expanded': 'false', 'aria-controls': doel.id,
        onclick: () => { doel.hidden = !doel.hidden; k.setAttribute('aria-expanded', String(!doel.hidden)); k.classList.toggle('open', !doel.hidden); } },
        teken('info'), naam ? el('span', { en: doel.dataset.knopEn || 'explanation' }, naam) : null);
      if (inKop) vorige.append(' ', k); else doel.before(el('p', { class: 'uitleg-rij' }, k));
    });
  }

  // kop met terug-pijl, de knop Delen, het menu en de taal van de hulp
  function kop(titel, terug) {
    const h = el('header', { class: 'kop' },
      terug ? el('a', { class: 'terug', href: terug, title: 'terug', 'aria-label': 'terug' }, teken('terug')) : el('a', { class: 'merk-link', href: WORTEL + 'index.html', 'aria-label': NAAM + ': de startpagina' }, el('img', { class: 'merk', src: WORTEL + 'shared/icoon.svg?v=' + VERSIE, alt: '', width: 38, height: 38 })),
      el('h1', {}, titel),
      nav(),
      el('button', { class: 'rond deel', title: 'deel deze pagina', 'aria-label': 'deel deze pagina', onclick: () => deel() }, teken('deel')),
      profielKnop(),
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
    uitleg();
    ververs();
    // inloggen met Google (als de site dat heeft): laadt na de pagina, en zet de eerste letter van de naam op de knop Profiel
    document.addEventListener('account', () => {
      const g = window.Account && window.Account.staat.gebruiker, k = h.querySelector('.profielknop');
      if (!k) return;
      k.classList.toggle('in', !!g); k.textContent = '';
      k.classList.toggle('tip', !g && window.Account.staat.beschikbaar); // een stip: u kunt inloggen
      k.append(g ? ((ruw('profiel', {}) || {}).naam || g.naam || g.email || '?').trim().slice(0, 1).toUpperCase() : teken('mens'));
    });
    document.head.append(el('script', { src: WORTEL + 'shared/account.js?v=' + VERSIE }));
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
      examens: (await overzicht()).map((x) => ({ n: x.n, gedaan: x.gedaan, cijfers: x.toetsen.filter((t) => t.beste != null).map((t) => [t.id, honderd(t.beste)]) })) };
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

  // Het cijfer wordt naar beneden afgerond: 5,96 is een 5,9 en geen 6,0. Zo staat er nooit "6,0" bij een toets die niet gehaald is.
  const honderd = (deel) => Math.floor(deel * 100 + 1e-9);
  const cijfer = (goed, totaal) => (totaal ? honderd(goed / totaal) / 10 : 0).toFixed(1).replace('.', ',');

  // ---------- het cijfer zoals op het echte examen ----------
  // U slaagt met een 6. Maar een 6 is niet 60% goed: DUO legt de grens (de cesuur) per examen vast, en die ligt hoger.
  // De oefenexamens van DUO laten de grens zien: KNM "minimaal 28 van de 40 goed"; bij Lezen begint "een redelijke kans" bij 17 van de 25,
  // bij Luisteren "een kans" bij 19 van de 25. Schrijven en Spreken: het niveau "voldoende" op elk punt van het beoordelingsmodel van DUO
  // (Schrijven: 22 van de 37 punten; Spreken: 7 van de 12 punten per vraag). Die grens is hier een 6,0. Daaronder loopt het cijfer van 1 tot 6,
  // daarboven van 6 tot 10. Bronnen: research_notes/ (niet in git) en plans/0-masterplan.md.
  const CESUUR = { lezen: [17, 25], luisteren: [19, 25], knm: [28, 40], schrijven: [22, 37], spreken: [7, 12] };
  const grens = (map) => (CESUUR[map] ? CESUUR[map][0] / CESUUR[map][1] : 0.6);
  // het cijfer als deel van 1 (0,6 = 6,0): daarmee werken de medailles, de lijn en het profiel
  function cijferDeel(map, goed, totaal) {
    if (!totaal) return 0;
    const p = Math.max(0, Math.min(1, goed / totaal)), c = grens(map);
    return p + 1e-9 >= c ? 0.6 + 0.4 * Math.max(0, p - c) / (1 - c) : 0.1 + 0.5 * p / c;
  }
  const cijferVan = (map, goed, totaal) => cijfer(cijferDeel(map, goed, totaal), 1);
  // het beste cijfer (deel van 1) uit een lijst pogingen [{ score, totaal }], of null als er nog geen poging is
  const besteDeel = (map, lijst, totaal) => ((lijst || []).length ? Math.max(...lijst.map((x) => cijferDeel(map, x.score, x.totaal || totaal || 1))) : null);
  const nodigVoor = (map, totaal) => Math.ceil(grens(map) * totaal - 1e-9); // zoveel goed (of punten) is een 6,0
  // De oefenexamens van DUO zeggen na afloop hoe groot de kans is dat u slaagt voor het echte examen. Dezelfde stappen, bij 25 vragen.
  const KANS = {
    lezen: [0, 13, 17, 23],
    luisteren: [0, 16, 19, 22],
  };
  const KANS_TEKST = [['geen kans', 'no chance'], ['een kleine kans', 'a small chance'], ['een redelijke kans', 'a fair chance'], ['een grote kans', 'a good chance']];
  function kansBalk(map, goed, totaal) {
    if (map === 'knm') return el('p', { class: 'midden kans-zin', en: 'DUO practice exam: you need at least 28 of the 40 right.' },
      `Op het oefenexamen van DUO hebt u minimaal 28 van de 40 vragen goed nodig. U had er ${Math.round(goed * 40 / (totaal || 40))} goed.`);
    if (!KANS[map]) return null;
    const n = (x) => Math.round(x * 25 / (totaal || 25)), g = n(goed), stap = KANS[map].filter((v) => g >= v).length - 1;
    const van = (i) => KANS[map][i] / 25, tot = (i) => (i < 3 ? KANS[map][i + 1] / 25 : 1);
    return el('div', { class: 'kans' },
      el('p', { class: 'midden', en: `DUO practice exam: with this score you have ${KANS_TEKST[stap][1]} to pass the real exam.` },
        'Volgens DUO hebt u met deze score ', el('b', {}, KANS_TEKST[stap][0]), ' om te slagen voor het echte examen.'),
      el('div', { class: 'kans-balk', dir: 'ltr', role: 'img', 'aria-label': `kans om te slagen: ${KANS_TEKST[stap][0]}` },
        KANS_TEKST.map((t, i) => el('span', { class: `kans-${i}` + (i === stap ? ' nu' : ''), style: `flex:${tot(i) - van(i)}` }, el('small', {}, `${KANS[map][i]}${i < 3 ? '-' + (KANS[map][i + 1] - 1) : '-25'}`)))));
  }

  // ---------- medailles voor de oefenexamens ----------
  // Geslaagd is 6,0 of hoger (60% goed), net als op het echte examen: dat is brons. Zilver vanaf 7,5 en goud vanaf 9,0.
  // deel = het deel goed, van 0 tot 1 (0,75 = cijfer 7,5). Antwoord: 'brons' | 'zilver' | 'goud', of null: (nog) niet geslaagd.
  const MEDAILLES = [['goud', 0.9, 'gold'], ['zilver', 0.75, 'silver'], ['brons', 0.6, 'bronze']];
  const medaille = (deel) => { const m = deel == null ? null : MEDAILLES.find((x) => deel + 1e-9 >= x[1]); return m ? m[0] : null; };
  // De tekening: een lint met een schijf. Goud heeft een ster, zilver een ring, brons een vinkje: zo ziet u het verschil ook zonder kleur.
  // Zonder soort (null): een lege plek met een stippellijn, voor een oefenexamen dat u nog niet haalde.
  const MEDAILLE_VORM = { goud: '<path class="m-teken m-vol" d="m12 10.4 1.35 2.8 3.05.4-2.25 2.1.55 3L12 17.3l-2.7 1.4.55-3-2.25-2.1 3.05-.4z"/>',
    zilver: '<circle class="m-teken" cx="12" cy="15" r="3.6"/>', brons: '<path class="m-teken" d="m9.4 15.1 1.8 1.8 3.4-3.6"/>' };
  function medailleTeken(soort) { // vaste tekst, geen invoer van buiten
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'medaille m-' + (MEDAILLE_VORM[soort] ? soort : 'leeg')); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<path class="m-lint" d="M7.5 2h3.2l2 4.6-2.6 2zM16.5 2h-3.2l-2 4.6 2.6 2z"/><circle class="m-schijf" cx="12" cy="15" r="7"/>' + (MEDAILLE_VORM[soort] || '');
    return s;
  }
  // De lijn van 0 tot 10 met uw cijfer als stip. De streep bij 6 is "geslaagd"; bij 6, 7,5 en 9 staat de medaille die u daar krijgt.
  // eerder = de delen (0 tot 1) van uw eerdere pogingen: vage stippen, zodat u ziet of u vooruit gaat.
  function slaagBalk(deel, eerder) {
    const pct = (d) => Math.max(0, Math.min(100, d * 100));
    return el('div', { class: 'slaagbalk' + (medaille(deel) ? ' geslaagd' : ''), dir: 'ltr', role: 'img', 'aria-label': `uw cijfer op een lijn van 0 tot 10. Geslaagd vanaf 6,0.` },
      el('div', { class: 'slaag-medailles' }, MEDAILLES.map(([m, v]) => el('span', { class: deel + 1e-9 >= v ? 'aan' : '', style: `left:${v * 100}%` }, medailleTeken(m), el('small', {}, cijfer(v, 1))))),
      el('div', { class: 'slaag-spoor' },
        el('i', { class: 'slaag-vul', style: `width:${pct(deel)}%` }),
        el('i', { class: 'slaag-streep', style: 'left:60%' }),
        (eerder || []).map((d) => el('i', { class: 'slaag-stip oud', style: `left:${pct(d)}%` })),
        el('i', { class: 'slaag-stip', style: `left:${pct(deel)}%` })));
  }
  // Feest na een gehaald oefenexamen: de medaille springt, er valt confetti en de telefoon trilt kort.
  // Alleen als er een medaille is, en niet als het apparaat om minder beweging vraagt.
  function vier(deel) {
    if (!medaille(deel)) return;
    const groot = document.querySelector('.medaille-groot');
    if (groot) groot.classList.add('spring');
    confetti(46);
  }
  function confetti(aantal) {
    try { if (navigator.vibrate) navigator.vibrate(70); } catch (e) { /* geen trilling */ }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const KLEUR = ['#f2b21b', '#3b4fe0', '#16a34a', '#e2476b', '#7c3aed', '#fb923c'];
    const vak = el('div', { class: 'confetti', 'aria-hidden': 'true' }, Array.from({ length: aantal }, (_, i) => el('i', {
      style: `left:${Math.random() * 100}%;background:${KLEUR[i % KLEUR.length]};animation-delay:${(Math.random() * 0.5).toFixed(2)}s;animation-duration:${(1.5 + Math.random()).toFixed(2)}s;--draai:${Math.round(Math.random() * 720 - 360)}deg;--opzij:${Math.round(Math.random() * 120 - 60)}px` })));
    document.body.append(vak);
    setTimeout(() => vak.remove(), 3200);
  }
  // Na een les: het teken van het examen met een balk "13 van 38 lessen". Haalde u net een nieuwe les? Dan loopt de balk een stukje vol
  // en valt er een beetje confetti (minder dan bij een oefenexamen). Wat al gevierd is staat in 'feest': opnieuw laden viert niet nog een keer.
  function lesVoortgang(map, n, gehaald) {
    const gedaan = Math.min(n, Object.values(lees(map, {}).lessen || {}).filter(lesGehaald).length);
    const oud = ruw('feest', {}) || {}, was = oud[map] == null ? gedaan - 1 : oud[map], nieuw = !!gehaald && gedaan > was;
    const pct = (g) => (n ? Math.round(100 * Math.max(0, g) / n) : 0);
    const vul = el('i', { style: `width:${pct(nieuw ? gedaan - 1 : gedaan)}%` });
    if (nieuw) { oud[map] = gedaan; schrijf('feest', oud); setTimeout(() => { vul.style.width = pct(gedaan) + '%'; confetti(18); }, 300); }
    return el('div', { class: 'les-voortgang' + (nieuw ? ' nieuw' : ''), style: `--k:var(--k-${map})` },
      el('span', { class: 'ex-icoon', 'aria-hidden': 'true' }, teken(map)),
      el('div', {}, el('div', { class: 'balk' }, vul), el('span', { class: 'klein zacht', en: 'lessons passed' }, `${gedaan} van ${n} lessen gehaald`)));
  }
  // ---------- de dagen waarop u oefende: de week met zeven rondjes en "4 dagen op rij" ----------
  // Bewaard als een rij dagnummers (zoals SRS.vandaag). Een dag telt bij een goed antwoord, of als een les, trainer of oefenexamen bewaard wordt;
  // alleen de site openen telt niet. Eén dag overslaan breekt de rij niet: wie ziek is of nachtdienst heeft, verliest niets.
  // De eerste keer is de rij leeg: dan komen de dagen uit de datums van de lessen en oefenexamens die al bewaard zijn.
  const Dagen = (() => {
    const nr = (iso) => Math.floor(Date.parse(iso + 'T00:00:00Z') / 86400000);
    function uitVoortgang() {
      const s = new Set();
      for (const m of EXAMENS) {
        const P = ruw(m, {}) || {};
        for (const r of Object.values(P.lessen || {})) if (r && r.datum) s.add(nr(r.datum));
        for (const l of Object.values(P.toets || {})) for (const r of (Array.isArray(l) ? l : [])) if (r && r.datum) s.add(nr(r.datum));
      }
      return [...s].filter((d) => Number.isFinite(d)).sort((a, b) => a - b);
    }
    const lijst = () => { const v = ruw('dagen', null); return Array.isArray(v) ? v : uitVoortgang(); };
    return {
      tel() {
        const t = window.SRS.vandaag(), l = lijst();
        if (l.includes(t)) return;
        l.push(t); l.sort((a, b) => a - b);
        try { localStorage.setItem('dutch-exam:dagen', JSON.stringify(l.slice(-400))); } catch (e) { /* geen opslag */ }
        document.dispatchEvent(new CustomEvent('dagen'));
      },
      // hoeveel dagen op rij, tot vandaag of gisteren. Eén lege dag ertussen mag (die telt zelf niet mee).
      reeks() {
        const s = new Set(lijst()), t = window.SRS.vandaag();
        let d = [t, t - 1, t - 2].find((x) => s.has(x)), n = 0;
        if (d == null) return 0;
        for (;;) { if (s.has(d)) { n++; d--; } else if (s.has(d - 1)) d--; else break; }
        return n;
      },
      // deze week, maandag tot en met zondag: [{ aan, vandaag, straks }]
      week() {
        const s = new Set(lijst()), t = window.SRS.vandaag(), ma = t - ((t + 3) % 7); // dag 0 was een donderdag
        return [0, 1, 2, 3, 4, 5, 6].map((i) => ({ aan: s.has(ma + i), vandaag: ma + i === t, straks: ma + i > t }));
      },
      vandaag: () => lijst().includes(window.SRS.vandaag()),
    };
  })();
  function telDag() { try { Dagen.tel(); } catch (e) { /* geen opslag */ } }
  // Het vak met aanmoediging, in het blauwe vak op de startpagina en op de profielkaart.
  //   procent = hoe ver u bent (klaarProcent), delen = de beste cijfers van de oefenexamens (0 tot 1, of null)
  //   metDagen = ook de week en de rij dagen (alleen voor uw eigen voortgang: van een vriend weten we de dagen niet)
  const MOED = [[100, 'U bent klaar voor het examen. Succes!', 'You are ready for the exam. Good luck!'], [75, 'Bijna klaar voor het examen. Nog een klein stukje!', 'Almost ready for the exam. Just a little more!'],
    [50, 'U bent over de helft. Ga zo door!', 'You are past halfway. Keep going!'], [25, 'U bent al een heel eind. De helft komt in zicht!', 'You have come a long way. Halfway is in sight!'],
    [1, 'Goed begin! Elke dag een beetje.', 'A good start! A little every day.'], [0, 'Begin vandaag: vijf minuten is genoeg.', 'Start today: five minutes is enough.']];
  function aanmoediging(procent, delen, metDagen) {
    const [, nl, en] = MOED.find(([v]) => procent >= v);
    const tel = { goud: 0, zilver: 0, brons: 0 };
    for (const d of delen || []) { const m = medaille(d); if (m) tel[m]++; }
    const n = metDagen ? Dagen.reeks() : 0, LETTER = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z'];
    return el('div', { class: 'moed' },
      metDagen ? el('div', { class: 'moed-week', dir: 'ltr', role: 'img', 'aria-label': `deze week oefende u op ${Dagen.week().filter((x) => x.aan).length} dagen` },
        Dagen.week().map((x, i) => el('span', { class: 'moed-dag' + (x.aan ? ' aan' : '') + (x.vandaag ? ' vandaag' : '') + (x.straks ? ' straks' : '') }, el('i', {}, x.aan ? '✓' : ''), LETTER[i])),
        n ? el('b', { class: 'moed-reeks', en: 'days in a row' }, `🔥 ${n} ${n === 1 ? 'dag' : 'dagen op rij'}`) : null) : null,
      tel.goud + tel.zilver + tel.brons ? el('div', { class: 'moed-medailles', dir: 'ltr', 'aria-label': `uw medailles: ${tel.goud} goud, ${tel.zilver} zilver, ${tel.brons} brons` },
        ['goud', 'zilver', 'brons'].filter((m) => tel[m]).map((m) => el('span', {}, medailleTeken(m), `× ${tel[m]}`))) : null,
      metDagen ? el('p', { class: 'moed-tekst', en: Dagen.vandaag() ? en : en + ' Practise five minutes today.' }, Dagen.vandaag() ? '✔ Vandaag geoefend. ' + nl : nl + ' Oefen vandaag vijf minuten.') : null);
  }
  // Hoe ver bent u, van 0 tot 100? Per examen telt het hoogste van twee: het deel van de lessen dat u haalde, of 100% als u een oefenexamen haalde.
  // Zo staat iemand die de basis al kent en direct een oefenexamen haalt niet op 0%. lijst = [{ n, gedaan, geslaagd }]
  const klaarProcent = (lijst) => Math.round(100 * lijst.reduce((s, x) => s + Math.max(x.n ? x.gedaan / x.n : 0, x.geslaagd ? 1 : 0), 0) / (lijst.length || 1));
  // de uitslag van een toets: groot het cijfer, klein eronder hoeveel goed. wat = 'vragen goed' of 'punten'
  // Eronder de knop naar het profiel: daar deelt de leerling het cijfer met vrienden.
  // Erboven de medaille (of een lege plek), eronder de lijn met de streep bij 6: zo ziet u zonder te lezen of u geslaagd bent.
  // o (mag weg) = { eerder: [delen van eerdere pogingen], zelf: true als de leerling zelf nakeek (Schrijven, Spreken) }
  // o.map = het examen: het cijfer volgt de grens van DUO (CESUUR). o.beantwoord = hoeveel vragen de leerling beantwoordde (zoals bij DUO).
  // o.eerder = de eerdere pogingen, al als cijfer (deel van 1).
  function cijferBlok(goed, totaal, wat, o) {
    o = o || {};
    const deel = cijferDeel(o.map, goed, totaal), m = medaille(deel), eerder = (o.eerder || []).filter((d) => d != null && isFinite(d));
    const nodig = Math.max(1, nodigVoor(o.map, totaal) - goed);
    const naam = m ? MEDAILLES.find((x) => x[0] === m) : null;
    return [
      el('div', { class: 'medaille-groot midden' }, medailleTeken(m)),
      el('div', { class: 'groot midden' }, cijfer(deel, 1), el('span', { class: 'cijfer-van' }, ' / 10')),
      slaagBalk(deel, eerder),
      m ? el('p', { class: 'midden uitslag goed', en: `Congratulations, you passed! Your medal: ${naam[2]}.` }, `Gefeliciteerd, u bent geslaagd! Uw medaille: ${m}.`)
        : el('p', { class: 'midden uitslag fout', en: `Not passed yet. You pass with a 6.0: ${nodig} more ${wat === 'punten' ? 'points' : 'right'}.` }, `Nog niet geslaagd. U slaagt met een 6,0: nog ${nodig} ${wat === 'punten' ? (nodig === 1 ? 'punt' : 'punten') : 'goed'} erbij.`),
      eerder.length && deel > Math.max(...eerder) + 1e-9 ? el('p', { class: 'midden record', en: 'your best mark so far' }, '★ Uw beste cijfer tot nu toe!') : null,
      o.beantwoord != null ? el('p', { class: 'midden zacht', en: 'answered / right, as on the DUO practice exam' }, `U hebt ${o.beantwoord} van de ${totaal} vragen beantwoord. U hebt er ${goed} goed.`)
        : el('p', { class: 'midden zacht' }, `${goed} van de ${totaal} ${wat || 'vragen goed'}`),
      kansBalk(o.map, goed, totaal),
      el('p', { class: 'midden zacht klein', en: `You pass with a 6.0. Here a 6.0 is ${nodigVoor(o.map, totaal)} of ${totaal}: the pass line of DUO, not 60%.` },
        `Een 6,0 is hier ${nodigVoor(o.map, totaal)} van de ${totaal} ${wat === 'punten' ? 'punten' : 'goed'}: de grens van DUO.`),
      o.zelf ? el('p', { class: 'midden zacht klein', en: 'You checked this yourself. In the real exam a person marks it.' }, 'U keek dit zelf na. Op het examen kijkt een mens het na.') : null,
      el('p', { class: 'midden' }, el('a', { class: 'knop licht klein', href: WORTEL + 'profiel.html', en: 'share your mark with friends' }, teken('deel'), 'Deel uw cijfer'))].filter(Boolean);
  }

  // ---------- overzicht van de vijf examens: lessen, toetsen en wat de leerling al deed (startpagina en profiel) ----------
  const NAMEN = { lezen: 'Lezen', luisteren: 'Luisteren', schrijven: 'Schrijven', spreken: 'Spreken', knm: 'KNM' };
  const haal = (pad) => fetch(WORTEL + pad, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  // de kop van het grote vak boven aan een overzicht: het teken en de naam van het examen, groot. Zo ziet u meteen waar u bent.
  const sectieKop = (map) => [
    el('span', { class: 'oogje', en: 'today' }, 'Vandaag'),
    el('h3', { class: 'sectie-naam' }, el('span', { class: 'sectie-icoon', 'aria-hidden': 'true' }, teken(map)), NAMEN[map])];
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
      const beste = (t) => { const r = (P.toets || {})[t.id] || []; return r.length ? Math.max(...r.map((y) => cijferDeel(map, y.score, y.totaal || t.vragen || 1))) : null; };
      return { naam: NAMEN[map], map, href: `${map}/index.html`, klaar, n, gedaan, lessen, toetsen: toetsen.map((t) => Object.assign({ beste: beste(t) }, t)) };
    }));
  }

  const schud = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  // ---------- het oefenexamen: zoals de oefenexamens van DUO ----------
  // De volgorde van de antwoorden. Bij DUO staan getallen, prijzen, tijden, dagen en datums op volgorde, van klein naar groot;
  // "niets" of "geen" staat dan achteraan. Bij KNM staan de andere antwoorden op alfabet. Anders: door elkaar, elke keer anders.
  // Geeft de nummers van de antwoorden (0 = het goede antwoord in de data) in de volgorde op het scherm.
  const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const TELWOORD = { een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14,
    vijftien: 15, zestien: 16, zeventien: 17, achttien: 18, negentien: 19, twintig: 20, dertig: 30, veertig: 40, vijftig: 50, zestig: 60, zeventig: 70, tachtig: 80, negentig: 90, honderd: 100 };
  const telwoord = (w) => {
    if (TELWOORD[w] != null && w !== 'een') return TELWOORD[w];
    const m = /^(een|twee|drie|vier|vijf|zes|zeven|acht|negen)en(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)$/.exec(w);
    return m ? TELWOORD[m[1]] + TELWOORD[m[2]] : null;
  };
  const RESTJE = /^(niets|niks|geen|geen van (deze|allen)|nooit|niemand|nergens)\b/;
  // [soort, waarde] van één antwoord, of null als het geen getal, tijd, dag of datum is
  function ordeWaarde(tekst) {
    const t = kaal(String(tekst)).replace(/\[\[[a-z-]+\]\]/g, '').trim();
    if (RESTJE.test(t)) return ['rest', Infinity];
    let m = /\b(\d{1,2})[.:](\d{2})\b/.exec(t);
    if (m && !/€|euro/.test(t)) return ['tijd', +m[1] * 60 + +m[2]];
    m = /\b(\d{1,2}) (januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\b/.exec(t);
    if (m) return ['datum', MAANDEN.indexOf(m[2]) * 32 + +m[1]];
    const dag = DAGEN.findIndex((d) => new RegExp('\\b' + d + '\\b').test(t));
    if (dag >= 0 && t.split(/\s+/).length <= 3) return ['dag', dag];
    m = /\d+(?:[.,]\d+)?/.exec(t.replace(/(\d)\.(\d{3})\b/g, '$1$2'));
    if (m) return ['getal', parseFloat(m[0].replace(',', '.'))];
    for (const w of t.split(/[^a-z]+/)) { const n = telwoord(w); if (n != null) return ['getal', n]; }
    return null;
  }
  function volgorde(opties, o) {
    const nrs = opties.map((_, i) => i);
    const w = opties.map(ordeWaarde);
    const soorten = new Set(w.filter((x) => x && x[0] !== 'rest').map((x) => x[0]));
    if (w.every(Boolean) && soorten.size === 1 && w.filter((x) => x[0] !== 'rest').length >= 2) return nrs.sort((a, b) => w[a][1] - w[b][1]);
    if (o && o.alfabet) return nrs.sort((a, b) => kaal(opties[a]).localeCompare(kaal(opties[b]), 'nl'));
    return schud(nrs);
  }

  // De klok van een oefenexamen, zoals bij DUO: alleen een wekker. Met de muis erop ziet u de tijd in hele minuten ("44 min");
  // een klik (ook op een telefoon) laat de tijd blijven staan, nog een klik verbergt hem. Een melding bij nog 15 en nog 1 minuut.
  // verborgen: false = de tijd staat er meteen (Schrijven: het werk is op papier). o = { kop, minuten, start (ms), verborgen, op0() }.
  function examenKlok(o) {
    let vast = !o.verborgen, zweef = false, vorige = null;
    const tijd = el('span', { class: 'klok-tijd' });
    const knop = el('button', { type: 'button', class: 'klok', title: 'Klik voor continue tijdsweergave', 'aria-label': 'de tijd: klik om hem te laten staan of te verbergen', en: 'time left: hover, or click to keep it' }, teken('klok'), tijd);
    knop.addEventListener('click', () => { vast = !vast; toon(); });
    knop.addEventListener('mouseenter', () => { zweef = true; toon(); });
    knop.addEventListener('mouseleave', () => { zweef = false; toon(); });
    const rest = () => Math.max(0, o.minuten * 60 - Math.floor((Date.now() - o.start) / 1000));
    function toon() {
      const s = rest();
      tijd.textContent = vast || zweef ? `${Math.ceil(s / 60)} min` : '';
      knop.classList.toggle('bijna', s <= 60);
      if (vorige != null) for (const m of [15, 1]) {
        if (vorige > m * 60 && s <= m * 60) toast(m === 1 ? 'Let op: nog 1 minuut.' : 'Let op: nog 15 minuten.', m === 1 ? 'one minute left' : '15 minutes left', null, 6000);
      }
      vorige = s;
      if (s <= 0) { clearInterval(tik); if (o.op0) o.op0(); }
    }
    const h1 = o.kop.querySelector('h1');
    o.kop.insertBefore(knop, h1 ? h1.nextSibling : o.kop.lastChild); // in het midden van de balk (CSS), zoals bij DUO
    const tik = setInterval(toon, 1000);
    toon();
    return { stop() { clearInterval(tik); knop.remove(); } };
  }

  // Het volume van een oefenexamen, zoals bij DUO: een zachte en een harde luidspreker met 7 blokjes ertussen.
  // Geldt voor elk geluid van de site (ook new Audio()): play() zet eerst het gekozen volume. Bewaard in deze browser.
  const VOLUME_STAPPEN = 7;
  let volumeStap = Math.max(0, Math.min(VOLUME_STAPPEN, Number(ruw('volume', VOLUME_STAPPEN))));
  const spelers = new Set();
  if (window.HTMLMediaElement) {
    const speelOrigineel = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) {
      try { this.volume = volumeStap / VOLUME_STAPPEN; } catch (e) { /* geen volume */ }
      spelers.add(this);
      return speelOrigineel.apply(this, a);
    };
  }
  function volumeKnop(kop) {
    const blokjes = el('span', { class: 'vol-blokjes', 'aria-hidden': 'true' }, Array.from({ length: VOLUME_STAPPEN }, () => el('i')));
    const zet = (n) => {
      volumeStap = Math.max(0, Math.min(VOLUME_STAPPEN, n));
      try { localStorage.setItem('dutch-exam:volume', JSON.stringify(volumeStap)); } catch (e) { /* geen opslag */ }
      [...blokjes.children].forEach((b, i) => b.classList.toggle('aan', i < volumeStap));
      for (const m of spelers) { if (m.paused) spelers.delete(m); else m.volume = volumeStap / VOLUME_STAPPEN; }
      vak.setAttribute('aria-label', `volume ${volumeStap} van ${VOLUME_STAPPEN}`);
    };
    const vak = el('span', { class: 'volume', role: 'group' },
      el('button', { type: 'button', class: 'vol-knop', title: 'zachter', 'aria-label': 'zachter', onclick: () => zet(volumeStap - 1) }, teken('zacht')),
      blokjes,
      el('button', { type: 'button', class: 'vol-knop', title: 'harder', 'aria-label': 'harder', onclick: () => zet(volumeStap + 1) }, teken('luid')));
    zet(volumeStap);
    kop.insertBefore(vak, kop.querySelector('.deel') || kop.lastChild); // links van delen, profiel en taal: die staan op elke pagina op dezelfde plek
    return vak;
  }
  // Een vraag markeren, om er later naar terug te gaan (DUO: een bladwijzer). vlaggen = { nummer: true } in de stand van de toets.
  function vlagKnop(vlaggen, nr, bewaar) {
    const k = el('button', { type: 'button', class: 'voet-icoon vlag-knop', title: 'Markeer deze vraag', 'aria-label': 'markeer deze vraag', 'aria-pressed': String(!!vlaggen[nr]) }, teken('bewaar'));
    k.addEventListener('click', () => {
      if (vlaggen[nr]) delete vlaggen[nr]; else vlaggen[nr] = true;
      k.setAttribute('aria-pressed', String(!!vlaggen[nr]));
      bewaar();
    });
    return k;
  }
  // het overzicht van alle vragen: een raster, zoals de knop van DUO
  const overzichtKnop = (op) => el('button', { type: 'button', class: 'voet-icoon', title: 'Overzicht', 'aria-label': 'overzicht van alle vragen', onclick: op }, teken('raster'));
  // Foto's bij de oefenexamens, zoals DUO echte foto's gebruikt (gemaakt door tools/plaatjes.py, in shared/fotos/).
  // foto(beschrijving, reserve): een plek met het plaatje van emoji (reserve); is er een foto bij de beschrijving, dan komt die ervoor in de plaats.
  let fotoLijst = null;
  const fotoIndex = () => (fotoLijst = fotoLijst || fetch(WORTEL + 'shared/fotos/index.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
  function foto(beschrijving, reserve) {
    const vak = el('span', { class: 'foto-plek' }, reserve || '');
    if (beschrijving) fotoIndex().then((l) => {
      if (!l[beschrijving]) return;
      vak.textContent = ''; vak.classList.add('met-foto');
      vak.append(el('img', { src: WORTEL + 'shared/fotos/' + l[beschrijving], alt: '', draggable: 'false' }));
    });
    return vak;
  }
  // Wat vraagt een vraag? Uit de vraagwoorden: een tijd, een getal of prijs, een reden, wat iemand moet doen, wie, waar, of de rest.
  const VRAAGSOORT = [
    ['tijd', /\b(wanneer|hoe laat|welke dag|welke datum|hoe lang|vanaf wanneer|tot wanneer|welk uur)\b/, 'een tijd of dag', 'a time or day'],
    ['getal', /\b(hoeveel|wat kost|hoe duur|welk nummer|welk telefoonnummer|hoe oud)\b/, 'een getal of prijs', 'a number or price'],
    ['reden', /\bwaarom\b/, 'een reden: waarom?', 'a reason: why?'],
    ['doen', /\bwat (moet|moeten|kan|kunnen|mag|mogen|gaat|gaan|wil|willen|doet|doen)\b/, 'wat moet of gaat iemand doen?', 'what must or will someone do?'],
    ['wie', /\b(wie|met wie|voor wie|aan wie)\b/, 'wie?', 'who?'],
    ['waar', /\b(waar|waarheen|naar welke|in welke|op welke plek)\b/, 'waar?', 'where?'],
  ];
  function vraagSoort(tekst) {
    const t = kaal(String(tekst || ''));
    const r = VRAAGSOORT.find(([, re]) => re.test(t));
    return r ? { id: r[0], naam: r[2], en: r[3] } : { id: 'rest', naam: 'de tekst begrijpen', en: 'understand the text' };
  }
  // Na het oefenexamen: per soort vraag hoeveel goed. rijen = [{ naam, en, goed, totaal, href, hrefNaam }]. De zwakste soort krijgt een knop.
  function perSoort(rijen, titel) {
    rijen = rijen.filter((r) => r.totaal);
    if (rijen.length < 2) return null;
    const zwak = rijen.slice().sort((a, b) => a.goed / a.totaal - b.goed / b.totaal)[0];
    return el('div', { class: 'per-soort' },
      el('h3', { en: 'where did your points go?' }, titel || 'Waar gingen de punten heen?'),
      rijen.map((r) => el('div', { class: 'ps-rij' + (r === zwak && r.goed < r.totaal ? ' zwak' : '') },
        el('span', { class: 'ps-naam', en: r.en }, r.naam),
        el('span', { class: 'ps-balk', role: 'img', 'aria-label': `${r.goed} van ${r.totaal} goed` }, Array.from({ length: r.totaal }, (_, i) => el('i', { class: i < r.goed ? 'goed' : '' }))),
        el('span', { class: 'ps-tel' }, `${r.goed}/${r.totaal}`))),
      zwak.goed < zwak.totaal && zwak.href ? el('p', { class: 'knoppen' }, el('a', { class: 'knop licht', href: zwak.href, en: 'practise this' }, zwak.hrefNaam || `Oefen: ${zwak.naam}`)) : null);
  }

  return { NAAM, VERSIE, W, lees, schrijf, kaal, el, teken, Mijn, MAX_NOTITIE, lidwoord, metLidwoord, delen, delenRegel, luisterKnop, vertaalKnop, bewaarKnop, hulp, hulptaal, hulpAan, kiesHulp, zoek, lemmaNr, woorden, kop, tredeStand, schud, sluitPop, instellingen, WORTEL, EXAMENS,
    cijfer, cijferBlok, cijferDeel, cijferVan, besteDeel, nodigVoor, kansBalk, volgorde, examenKlok, volumeKnop, vlagKnop, overzichtKnop, perSoort, vraagSoort, foto, medaille, medailleTeken, slaagBalk, vier, lesVoortgang, klaarProcent, Dagen, aanmoediging, sectieKop, uitleg, overzicht, profielNu, profielRij, profielUit, schoneNaam, deel, deelLink, thema, zetThema, tekst, zetTekst, isDonker, toast, goed, balk, vraagKnoppen, foutKnoppen, opnieuwKnop, vrijTot, lesGehaald, sprong, bladert, alGehaald, bevestig, wis };
})();
