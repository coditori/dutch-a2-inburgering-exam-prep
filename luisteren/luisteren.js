// Gedeeld door alle pagina's van luisteren: voortgang, audio afspelen (regel voor regel), transcript met karaoke.
// De vraag-knoppen en het laden van JSON komen uit ../lezen/lezen.js (Lezen.vraag, Lezen.json).
window.Luister = (() => {
  const { el } = App;
  // spreker -> stem van Piper (tools/tts_luisteren.py gebruikt dezelfde tabel)
  const STEM = { A: 'nl_NL-ronnie-medium', B: 'nl_BE-nathalie-medium', C: 'nl_NL-pim-medium' };
  const NAAM = { A: 'man', B: 'vrouw', C: 'man 2' };

  const P = Object.assign({ lessen: {}, toets: {}, trainers: {} }, App.lees('luisteren', {}));
  const bewaar = () => App.schrijf('luisteren', P);
  const gehaald = (id) => { const r = P.lessen[id]; return !!r && r.beste / r.totaal >= 0.8; };
  const alles = () => !!App.lees('lezen', {}).open; // "alle lessen open" van Lezen geldt ook hier
  const isOpen = (lijst, i) => alles() || P.open || i === 0 || gehaald(lijst[i - 1].id);
  const naLes = (id) => alles() || P.open || !id || gehaald(id);

  const klaar = Spraak.map(new URL('audio/', document.currentScript.src).href);
  const sleutel = (regel, langzaam) => STEM[regel.s || 'A'] + (langzaam ? '|langzaam|' : '|') + regel.t;

  let loopNr = 0, audio = null;
  function stop() { loopNr++; if (audio) audio.pause(); audio = null; }

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
      let url = await Spraak.adres(sleutel(regels[i], o.langzaam));
      let tempo = 1;
      if (!url && o.langzaam) { url = await Spraak.adres(sleutel(regels[i], false)); tempo = 0.75; }
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
    const start = (langzaam) => { laatst = langzaam; bezig.textContent = '🔊 ...'; speel(regels, Object.assign({}, o, { langzaam, opEinde: () => { bezig.textContent = ''; } })); };
    return el('div', { class: 'speler' },
      el('button', { class: 'knop', title: 'luister', en: 'play', onclick: () => start(false) }, '▶'),
      o.langzaam === false ? null : el('button', { class: 'knop licht', title: 'langzaam', en: 'slow', onclick: () => start(true) }, '🐢'),
      el('button', { class: 'knop licht', title: 'nog een keer', en: 'again', onclick: () => start(laatst) }, '↻'),
      el('button', { class: 'knop licht', title: 'stop', onclick: () => { stop(); bezig.textContent = ''; } }, '■'),
      bezig);
  }

  // transcript: elke regel een alinea; woorden lichten op tijdens het afspelen. Klik op een woord: pop-up (hoor het woord met 🔊).
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

  return { P, bewaar, gehaald, isOpen, naLes, speel, stop, speler, transcript, vergelijk, ronde, STEM, NAAM };
})();
