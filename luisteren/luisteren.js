// Gedeeld door alle pagina's van luisteren: voortgang, audio afspelen (regel voor regel), transcript met karaoke.
// De vraag-knoppen en het laden van JSON komen uit ../lezen/lezen.js (Lezen.vraag, Lezen.json).
window.Luister = (() => {
  const { el } = App;
  // spreker -> stem van Google (tools/tts_luisteren.py gebruikt dezelfde tabel). VERTELLER: de sleutel van wat de verteller voorleest.
  const STEM = { A: 'nl-NL-Chirp3-HD-Charon', B: 'nl-NL-Chirp3-HD-Kore', C: 'nl-NL-Chirp3-HD-Iapetus', D: 'nl-NL-Chirp3-HD-Aoede' };
  const VERTELLER = 'nl_NL-ronnie-medium';
  const NAAM = { A: 'man', B: 'vrouw', C: 'man 2', D: 'vrouw 2' };

  const P = Object.assign({ lessen: {}, toets: {}, trainers: {} }, App.lees('luisteren', {}));
  const bewaar = () => App.schrijf('luisteren', P);
  const gehaald = (id) => { const r = P.lessen[id]; return !!r && r.beste / r.totaal >= 0.8; };
  const alles = () => !!App.lees('lezen', {}).open; // "alle lessen open" van Lezen geldt ook hier
  const isOpen = (lijst, i) => alles() || P.open || i === 0 || gehaald(lijst[i - 1].id);
  const naLes = (id) => alles() || P.open || !id || gehaald(id);

  const klaar = Spraak.map(new URL('audio/', document.currentScript.src).href);
  const sleutel = (regel, langzaam) => (regel.v ? VERTELLER : STEM[regel.s || 'A']) + (langzaam ? '|langzaam|' : '|') + regel.t;
  // een heel fragment van een toets in één mp3 (tools/tts_luisteren.py maakt dezelfde sleutel)
  const fragmentSleutel = (regels) => 'fragment|' + regels.map((r) => `${r.s || 'A'}:${r.t}`).join('\n');

  let loopNr = 0, audio = null, ketting = null;
  function stop() { loopNr++; if (audio) audio.pause(); audio = null; if (ketting) ketting.pauze(); }

  // speelt de regels na elkaar. opties: { langzaam, opRegel(i), opTijd(i, deel 0..1), opEinde() }
  async function speel(regels, opties) {
    const o = opties || {};
    stop();
    if (!Spraak.magSpelen()) { if (o.opEinde) o.opEinde(); return; } // de pagina is net geopend: geen geluid tot de leerling zelf klikt
    const mijn = loopNr;
    await klaar;
    for (let i = 0; i < regels.length; i++) {
      if (mijn !== loopNr) return;
      if (o.opRegel) o.opRegel(i);
      const vast = { vast: !regels[i].v }; // v = de verteller (de gekozen stem); anders een rol in een gesprek: altijd dezelfde stem
      let url = await Spraak.adres(sleutel(regels[i], o.langzaam), vast);
      let tempo = 1;
      if (!url && o.langzaam) { url = await Spraak.adres(sleutel(regels[i], false), vast); tempo = 0.75; }
      await new Promise((af) => {
        if (!url) return af(); // geen opname: stil (nooit de stem van de browser)
        audio = new Audio(url);
        audio.playbackRate = tempo;
        audio.ontimeupdate = () => { if (o.opTijd && audio && audio.duration) o.opTijd(i, audio.currentTime / audio.duration); };
        audio.onended = af; audio.onerror = af;
        audio.play().catch(af);
      });
      if (mijn !== loopNr) return;
      await new Promise((r) => setTimeout(r, regels.length > 1 ? 350 : 0));
    }
    if (mijn === loopNr) { if (o.opRegel) o.opRegel(-1); if (o.opEinde) o.opEinde(); }
  }

  // knoppen 🐢 ▶ ↻ voor een fragment. opties: { langzaam: false = geen 🐢-knop, opRegel, opTijd }
  function speler(regels, opties) {
    const o = opties || {};
    const bezig = el('span', { class: 'bezig' });
    let laatst = false;
    const start = (langzaam) => { laatst = langzaam; bezig.textContent = 'U luistert ...'; speel(regels, Object.assign({}, o, { langzaam, opEinde: () => { bezig.textContent = ''; } })); };
    return el('div', { class: 'speler' },
      el('button', { class: 'knop', title: 'luister', en: 'play', onclick: () => start(false) }, '▶'),
      o.langzaam === false ? null : el('button', { class: 'knop licht', title: 'langzaam', en: 'slow', onclick: () => start(true) }, '🐢'),
      el('button', { class: 'knop licht', title: 'nog een keer', en: 'again', onclick: () => start(laatst) }, '↻'),
      el('button', { class: 'knop licht', title: 'stop', onclick: () => { stop(); bezig.textContent = ''; } }, '■'),
      bezig);
  }

  // ---------- de speler van het oefenexamen, zoals bij DUO ----------
  // Opent een vraag, dan speelt alles vanzelf na elkaar: de inleiding, de opdracht, het fragment, de vraag en elk antwoord.
  // Knoppen: 10 seconden terug, spelen of pauze (in een ring die laat zien hoe ver het is), 10 seconden verder. Geen snelheid en
  // geen tekst. Opnieuw spelen mag zo vaak als u wilt: na het einde begint spelen weer bij het begin.
  // delen = [{ tekst } (de verteller) | { regels } (het fragment)]; o = { opDeel(i): licht op wat nu speelt (-1 = niets) }
  const INSTRUCTIE = 'Lees eerst de vraag. Luister daarna naar de tekst.';
  function examenSpeler(delen, o) {
    o = o || {};
    if (ketting) ketting.pauze();
    let lijst = null, nu = 0, speelt = false;
    const R = 20, OMTREK = 2 * Math.PI * R;
    const boog = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    boog.setAttribute('cx', '24'); boog.setAttribute('cy', '24'); boog.setAttribute('r', String(R)); boog.setAttribute('class', 'ring-voor');
    boog.style.strokeDasharray = `0 ${OMTREK}`;
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ring.setAttribute('viewBox', '0 0 48 48'); ring.setAttribute('class', 'speel-ring'); ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML = `<circle cx="24" cy="24" r="${R}" class="ring-achter"/>`;
    ring.append(boog);
    const teken = el('span', { class: 'speel-teken' }, '▶');
    const knop = el('button', { type: 'button', class: 'speel-knop', 'aria-label': 'spelen of pauze', en: 'play / pause', onclick: () => (speelt ? pauze() : speel()) }, ring, teken);
    const terug = el('button', { type: 'button', class: 'knop licht klein', 'aria-label': '10 seconden terug', en: '10 seconds back', onclick: () => spring(-10) }, '↺ 10');
    const verder = el('button', { type: 'button', class: 'knop licht klein', 'aria-label': '10 seconden verder', en: '10 seconds forward', onclick: () => spring(10) }, '10 ↻');
    const vak = el('div', { class: 'examen-speler' }, terug, knop, verder);

    // de adressen van de opnamen. Een fragment zonder eigen mp3: de regels een voor een.
    async function laad() {
      if (lijst) return lijst;
      await klaar;
      const uit = [];
      for (const [i, d] of delen.entries()) {
        if (d.regels) {
          const url = await Spraak.adres(fragmentSleutel(d.regels), { vast: true });
          if (url) uit.push({ url, deel: i });
          else for (const r of d.regels) { const u = await Spraak.adres(sleutel(r, false), { vast: true }); if (u) uit.push({ url: u, deel: i }); }
        } else {
          const url = await Spraak.adres(`${VERTELLER}|${d.tekst}`);
          if (url) uit.push({ url, deel: i });
        }
      }
      for (const x of uit) {
        x.a = new Audio(x.url);
        x.a.preload = 'auto';
        x.duur = 0;
        x.a.addEventListener('loadedmetadata', () => { x.duur = x.a.duration || 0; toon(); });
        x.a.addEventListener('timeupdate', toon);
        x.a.addEventListener('ended', () => { if (lijst[nu] !== x) return; if (nu < lijst.length - 1) { nu++; lijst[nu].a.currentTime = 0; start(); } else klaarMet(); });
      }
      lijst = uit;
      return lijst;
    }
    const totaal = () => (lijst || []).reduce((s, x) => s + x.duur, 0);
    const plek = () => (lijst || []).slice(0, nu).reduce((s, x) => s + x.duur, 0) + (lijst && lijst[nu] ? lijst[nu].a.currentTime : 0);
    function toon() {
      const t = totaal(), deel = t ? Math.min(1, plek() / t) : 0;
      boog.style.strokeDasharray = `${deel * OMTREK} ${OMTREK}`;
      teken.textContent = speelt ? '❚❚' : '▶';
      if (o.opDeel) o.opDeel(speelt && lijst && lijst[nu] ? lijst[nu].deel : -1);
    }
    function start() { if (!lijst[nu]) return; speelt = true; lijst[nu].a.play().catch(() => { speelt = false; toon(); }); toon(); }
    function klaarMet() { speelt = false; nu = 0; toon(); boog.style.strokeDasharray = `${OMTREK} ${OMTREK}`; }
    async function speel() {
      if (!Spraak.magSpelen()) return; // de pagina is net geopend: geen geluid tot de leerling zelf klikt
      stop();
      ketting = api;
      await laad();
      if (!lijst.length) return;
      start();
    }
    function pauze() { speelt = false; if (lijst && lijst[nu]) lijst[nu].a.pause(); toon(); }
    async function spring(sec) {
      await laad();
      if (!lijst.length) return;
      const was = speelt;
      if (lijst[nu]) lijst[nu].a.pause();
      let doel = Math.max(0, Math.min(totaal() - 0.1, plek() + sec));
      nu = 0;
      while (nu < lijst.length - 1 && doel >= lijst[nu].duur) { doel -= lijst[nu].duur; nu++; }
      lijst[nu].a.currentTime = Math.max(0, doel);
      if (was) start(); else toon();
    }
    const api = { vak, speel, pauze };
    return api;
  }

  // transcript: elke regel een alinea; woorden lichten op tijdens het afspelen. Klik op een woord: pop-up (hoor het woord met de knop Luister).
  function transcript(regels, nieuw) {
    const meer = new Set(regels.map((r) => r.s || 'A')).size > 1;
    const rijen = regels.map((r) => {
      const tekst = el('span', {}, App.woorden(r.t, nieuw));
      return el('p', {}, meer ? el('span', { class: 'wie' }, NAAM[r.s || 'A'] + ':') : null, tekst);
    });
    const vak = el('div', { class: 'transcript' }, rijen);
    const opRegel = (i) => rijen.forEach((p, j) => { p.classList.toggle('nu', i === j); if (i !== j) p.querySelectorAll('.w.nu').forEach((w) => w.classList.remove('nu')); });
    const opTijd = (i, deel) => {
      const ws = [...rijen[i].querySelectorAll('.w')];
      const totaal = ws.reduce((n, w) => n + w.textContent.length + 1, 0);
      let som = 0, nu = ws.length - 1;
      for (let k = 0; k < ws.length; k++) { som += ws[k].textContent.length + 1; if (som / totaal >= deel) { nu = k; break; } }
      ws.forEach((w, k) => w.classList.toggle('nu', k === nu));
    };
    return { vak, opRegel, opTijd };
  }

  // woorden vergelijken voor het dictee: geeft [{ w, goed }] voor de goede zin en het percentage
  const kaalWoorden = (s) => App.kaal(s).replace(/[^a-z0-9' -]/g, ' ').split(/\s+/).filter(Boolean);
  function vergelijk(goedeZin, getypt) {
    const typ = kaalWoorden(getypt);
    const over = typ.slice();
    const uit = goedeZin.split(/\s+/).map((w) => {
      const k = kaalWoorden(w)[0];
      const plek = k == null ? -1 : over.indexOf(k);
      if (plek >= 0) over.splice(plek, 1);
      return { w, goed: k == null || plek >= 0 };
    });
    const telt = uit.filter((x) => kaalWoorden(x.w).length);
    return { woorden: uit, procent: telt.length ? Math.round(100 * telt.filter((x) => x.goed).length / telt.length) : 100 };
  }


  // ---------- trainers: een ronde van n vragen ----------
  // opties: { id, titel, na, items, n, uitleg, uitlegEn, teken(doel, item, klaar(goed, uitleg)) }
  function ronde(o) {
    App.kop(o.titel, '../index.html');
    const doel = document.getElementById('pagina');
    if (!naLes(o.na)) { doel.append(el('p', { class: 'kaart' }, `Deze trainer gaat open na les ${o.na}.`)); return; }
    let rij, goed, nr;
    const begin = () => { rij = App.schud(o.items).slice(0, o.n); goed = 0; nr = 0; volgende(); };
    function volgende() {
      stop();
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
      let af = false;
      o.teken(vak, rij[nr], (ok, uitleg) => {
        if (af) return;
        af = true;
        if (ok) goed++;
        nr++;
        const knop = el('button', { class: 'knop', en: 'next', onclick: volgende }, 'Verder');
        vak.append(el('p', { class: 'uitslag ' + (ok ? 'goed' : 'fout') }, ok ? '✔ Goed!' : '✘ Niet goed.'), uitleg || '', el('div', { class: 'knoppen' }, knop));
        if (ok) App.goed(knop);
      });
    }
    doel.append(el('div', { class: 'kaart' }, el('p', { en: o.uitlegEn }, o.uitleg), el('div', { class: 'knoppen' }, el('button', { class: 'knop', onclick: begin }, 'Start'))));
  }

  return { P, bewaar, gehaald, isOpen, naLes, speel, stop, speler, examenSpeler, INSTRUCTIE, transcript, vergelijk, ronde, STEM, NAAM };
})();
