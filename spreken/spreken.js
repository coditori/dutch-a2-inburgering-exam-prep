// Gedeeld door alle pagina's van spreken: voortgang, vragen die terugkomen, opnemen, spraak -> tekst, controle.
window.Spreken = (() => {
  const { el } = App;
  // Spraak -> tekst met tools/stt_server.py (faster-whisper, op uw eigen computer). Twee wegen naar die server:
  //   1. via de testserver van de site (tools/dienst.py stuurt /_stt/ door): zo werkt het ook op een telefoon, op hetzelfde https-adres
  //   2. rechtstreeks: http://127.0.0.1:8787 (de site op deze computer)
  // Antwoordt geen van beide: de spraakherkenning van de browser, anders controleert de leerling zelf.
  const STT_ADRESSEN = [App.WORTEL + '_stt', 'http://127.0.0.1:8787'];
  let STT = STT_ADRESSEN[1]; // het adres dat antwoordde (server() zet het)
  const DAGEN = [1, 2, 4, 8, 16];

  // ---------- voortgang ----------
  const P = Object.assign({ lessen: {}, toets: {}, open: false }, App.lees('spreken', {}));
  const bewaar = () => App.schrijf('spreken', P);
  const gehaald = (id) => { const r = P.lessen[id]; return !!r && r.beste / r.totaal >= 0.8; };
  const isOpen = (lijst, i) => P.open || i === 0 || gehaald(lijst[i - 1].id);
  async function json(pad) {
    const r = await fetch(pad, { cache: 'no-cache' });
    if (!r.ok) throw new Error(pad + ' niet gevonden');
    return r.json();
  }

  // ---------- vragen die fout gingen komen terug (zelfde dagen als de woorddozen) ----------
  const terug = {
    alle: () => App.lees('spreken-terug', {}),
    fout(id) { const k = terug.alle(); k[id] = { box: 0, due: SRS.vandaag() + 1 }; App.schrijf('spreken-terug', k); },
    goed(id) {
      const k = terug.alle();
      if (!k[id]) return;
      k[id].box++;
      if (k[id].box >= DAGEN.length) delete k[id]; else k[id].due = SRS.vandaag() + DAGEN[k[id].box];
      App.schrijf('spreken-terug', k);
    },
    nu() { const k = terug.alle(), t = SRS.vandaag(); return Object.keys(k).filter((id) => k[id].due <= t); },
  };

  // ---------- geluid ----------
  const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
  // speelt zinnen na elkaar (mp3 van Piper, of de stem van de browser)
  async function speel(zinnen, snelheid) {
    for (const z of [].concat(zinnen)) {
      const a = await Spraak.zeg(z, { snelheid: snelheid || 1 });
      if (a) await new Promise((r) => { a.addEventListener('ended', r); a.addEventListener('error', r); setTimeout(r, (1500 + z.length * 95) / (snelheid || 1)); });
      else await wacht(900 + z.length * 75);
    }
  }

  // ---------- spraak -> tekst ----------
  let serverAan = null;
  function server() {
    if (serverAan === null) {
      serverAan = (async () => {
        for (const adres of STT_ADRESSEN) {
          const c = new AbortController(), klok = setTimeout(() => c.abort(), 900);
          try {
            const r = await fetch(adres + '/ping', { signal: c.signal, cache: 'no-store' });
            if (r.ok && (await r.text()).trim() === 'ok') { STT = adres; return true; } // een 404-pagina van de echte site telt niet
          } catch (e) { /* niet bereikbaar: de volgende */ } finally { clearTimeout(klok); }
        }
        return false;
      })();
    }
    return serverAan;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // opnemer() -> { stroom, stop(opties) }. stop() geeft { url, tekst, bron }   bron: 'whisper' | 'browser' | ''
  // stop({ weg: true }): de opname wordt weggegooid (Annuleer): geen spraak naar tekst.
  async function opnemer() {
    const stroom = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stroom);
    const stukken = [];
    rec.addEventListener('dataavailable', (e) => stukken.push(e.data));
    const metServer = await server();
    let herken = null, gehoord = '';
    if (!metServer && SR) {
      herken = new SR();
      herken.lang = 'nl-NL';
      herken.continuous = true;
      herken.addEventListener('result', (e) => { gehoord = [...e.results].filter((r) => r.isFinal).map((r) => r[0].transcript).join(' '); });
      try { herken.start(); } catch (e) { herken = null; }
    }
    rec.start();
    return {
      stroom,
      async stop(opties) {
        const klaar = new Promise((r) => rec.addEventListener('stop', r));
        rec.stop();
        await klaar;
        stroom.getTracks().forEach((t) => t.stop());
        if (opties && opties.weg) { if (herken) try { herken.abort(); } catch (e) { /* al gestopt */ } return null; }
        const blob = new Blob(stukken, { type: rec.mimeType });
        const uit = { url: URL.createObjectURL(blob), tekst: '', bron: '' };
        if (metServer) {
          try {
            const r = await fetch(STT + '/stt', { method: 'POST', body: blob });
            uit.tekst = (await r.json()).tekst || '';
            uit.bron = 'whisper';
          } catch (e) { /* server weg: zelf controleren */ }
        } else if (herken) {
          try { herken.stop(); } catch (e) { /* al gestopt */ }
          await wacht(700);
          uit.tekst = gehoord;
          uit.bron = gehoord ? 'browser' : '';
        }
        return uit;
      },
    };
  }

  // ---------- controle ----------
  const woordenVan = (s) => App.kaal(s).replace(/[^a-z' -]/g, ' ').split(/\s+/).filter(Boolean);
  const isWerkwoord = (w) => App.zoek(w).some((r) => r.thema.startsWith('werkwoord'));
  // item.sleutel = [[woorden voor deel 1], [woorden voor deel 2], ...]: een deel is goed als één van de woorden gezegd is
  function controle(item, tekst) {
    const t = ' ' + woordenVan(tekst).join(' ') + ' ';
    const delen = (item.sleutel || []).map((alts) => alts.some((a) => t.includes(App.kaal(a))));
    const werkwoorden = woordenVan(tekst).filter(isWerkwoord).length;
    return { delen, werkwoorden };
  }
  // nazeggen: welk deel van de woorden van de zin is gehoord
  function gelijk(doel, tekst) {
    const a = woordenVan(doel), b = new Set(woordenVan(tekst));
    return a.length ? a.filter((w) => b.has(w)).length / a.length : 0;
  }

  // ---------- plaatjes ----------
  // fotos = de beschrijvingen van de foto's (tools/plaatjes.py); is er een foto, dan staat die er in plaats van de emoji
  function scene(beelden, fotos) {
    if (!beelden || !beelden.length) return null;
    return el('div', { class: 'scene' }, beelden.map((b, i) => el('div', { class: 'plaat' }, App.foto((fotos || [])[i], b), beelden.length > 1 ? el('small', {}, `plaatje ${i + 1}`) : null)));
  }

  // ---------- het opnamescherm ----------
  // Onder in beeld, zodat de vraag te zien blijft (net als het kaartje bij een woord op een telefoon).
  // Een rode bol die meebeweegt met de stem, een golf van de laatste seconden, de tijd, en wat er gebeurt:
  //   "Spreek maar." -> "Ik luister." -> "Klaar? De opname stopt zo." Een ring om de bol loopt vol tijdens de stilte;
  //   weer praten zet hem terug. Stilte aan het begin telt nooit (spreken/stilte.js). Na 1 minuut stopt het altijd.
  // Stop en Annuleer; Esc = annuleer. Kan de browser het geluid niet meten: de bol klopt rustig en de leerling klikt op Stop.
  // opnameScherm(rec, ctx, o) -> Promise: { url, tekst, bron } na Stop, of null na Annuleer.
  //   o.stil = ms stilte voor de automatische stop
  const MAX_MS = 60000;
  const tijdTekst = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function opnameScherm(rec, ctx, o) {
    return new Promise((af) => {
      const STREPEN = 36;
      const bol = el('div', { class: 'opn-bol', 'aria-hidden': 'true' }, el('i', {}, App.teken('microfoon')));
      const strepen = Array.from({ length: STREPEN }, () => el('i'));
      const golf = el('div', { class: 'opn-golf', 'aria-hidden': 'true' }, strepen);
      const status = el('p', { class: 'opn-status', 'aria-live': 'polite' });
      const tijd = el('span', { class: 'opn-tijd' });
      const stop = el('button', { type: 'button', class: 'knop rood', en: 'stop recording', onclick: () => klaar(true) }, '⏹ Stop');
      const weg = el('button', { type: 'button', class: 'knop licht', en: 'cancel', onclick: () => klaar(false) }, 'Annuleer');
      const scherm = el('div', { class: 'opn-scherm', role: 'dialog', 'aria-modal': 'false', 'aria-label': 'opname' },
        bol, el('div', { class: 'opn-midden' }, status, golf), el('div', { class: 'opn-onder' }, tijd, el('div', { class: 'opn-knoppen' }, weg, stop)));
      let staat = '', begin = performance.now(), dicht = false;
      const toonStaat = (s) => {
        if (s === staat) return;
        staat = s;
        scherm.dataset.staat = s;
        const tekst = {
          wacht: { nl: 'Spreek maar.', en: 'speak now' },
          praat: { nl: 'Ik luister.', en: 'listening' },
          stil: { nl: 'Klaar? De opname stopt zo.', en: 'done? the recording stops soon' },
          niets: { nl: 'Ik hoor nog niets. Spreek wat harder, of dichter bij de microfoon.', en: 'I cannot hear you yet. Speak a bit louder, or closer to the microphone.' },
          los: { nl: 'De opname loopt. Klik op Stop als u klaar bent.', en: 'recording: click Stop when you are done' },
          bezig: { nl: 'Even wachten. De computer luistert naar uw opname.', en: 'one moment: the computer listens to your recording' },
        }[s];
        status.textContent = tekst.nl;
        App.zetHulp(status, tekst.en); // de hulp (EN of FA) bij de tekst
      };
      const zetTijd = () => { tijd.textContent = `${tijdTekst(Math.min(MAX_MS, performance.now() - begin))} / ${tijdTekst(MAX_MS)}`; };
      // het geluid: de bol, de golf en de ring. Zonder Web Audio: alleen de tijd (en Stop).
      // Een korte stilte tussen twee woorden is nog praten: pas na RUST ms stilte zegt het scherm "Klaar? ..." en loopt de ring.
      const niveaus = new Array(STREPEN).fill(0), STIL = o.stil || 3000, RUST = 700;
      const meting = Stilte.meet(rec.stroom, ctx, {
        stil: STIL, max: MAX_MS,
        elk: (u) => {
          if (dicht) return;
          const stilMs = u.deel * STIL, echtStil = u.staat === 'stil' && stilMs >= RUST;
          bol.style.setProperty('--niveau', u.niveau.toFixed(3));
          bol.style.setProperty('--stil', echtStil ? ((stilMs - RUST) / (STIL - RUST)).toFixed(3) : '0');
          niveaus.shift(); niveaus.push(u.niveau);
          strepen.forEach((s, i) => s.style.setProperty('--h', niveaus[i].toFixed(3)));
          toonStaat(u.nietsGehoord ? 'niets' : u.staat === 'stil' && !echtStil ? 'praat' : u.staat);
          if (u.klaar) klaar(true);
        },
      });
      if (!meting) { scherm.classList.add('zonder-meter'); toonStaat('los'); } else toonStaat('wacht');
      zetTijd();
      const klok = setInterval(() => { zetTijd(); if (performance.now() - begin >= MAX_MS) klaar(true); }, 250);
      const toets = (e) => { if (e.key === 'Escape') { e.preventDefault(); klaar(false); } };
      async function klaar(bewaar) {
        if (dicht) return;
        dicht = true;
        clearInterval(klok);
        if (meting) meting.stop();
        document.removeEventListener('keydown', toets);
        stop.disabled = true; weg.disabled = true;
        let uit = null;
        if (bewaar) { toonStaat('bezig'); scherm.classList.add('bezig'); uit = await rec.stop(); } else await rec.stop({ weg: true });
        if (ctx) ctx.close().catch(() => {});
        scherm.remove();
        document.body.classList.remove('opname-open');
        af(uit);
      }
      document.addEventListener('keydown', toets);
      document.body.classList.add('opname-open');
      document.body.append(scherm);
      stop.focus();
    });
  }

  // ---------- het opname-blok ----------
  // punten: [{ tekst, en }] de vakjes;  auto(tekst) -> [true/false per vakje];  model: zinnen;  klaar(allesGoed)
  function opnameBlok(doel, o) {
    doel.textContent = '';
    let rec = null, laatste = null;
    const knop = el('button', { class: 'knop', en: 'record' }, '⏺ Opnemen');
    const status = el('span', { class: 'zacht klein' });
    const uit = el('div');
    const vakjes = o.punten.map((p) => { const i = el('input', { type: 'checkbox' }); return { i, rij: el('label', { en: p.en }, i, p.tekst) }; });
    const lijst = el('div', { class: 'lijstje', hidden: true }, el('p', { class: 'zacht klein', en: 'Tick what you did. The computer already ticked what it heard.' }, 'Zet een vinkje bij wat goed ging. De computer heeft al gekeken.'), vakjes.map((v) => v.rij));
    const modelVak = el('div', { class: 'model', hidden: true }, o.model.map((z) => el('p', {}, App.woorden(z))),
      el('button', { class: 'knop licht klein', en: 'listen to the model', onclick: () => speel(o.model) }, App.teken('luid'), 'Luister'),
      ' ', el('button', { class: 'knop licht klein', en: 'slow', onclick: () => speel(o.model, 0.75) }, '🐢 Langzaam'));
    const verder = el('button', { class: 'knop', hidden: true, en: 'next', onclick: () => { Spraak.stop(); o.klaar(vakjes.every((v) => v.i.checked), laatste); } }, 'Verder');
    const zelf = el('button', { class: 'knop licht klein', en: 'no microphone: say it aloud and check yourself', onclick: toonCheck }, 'Zonder microfoon');

    function toonCheck(res) {
      lijst.hidden = false; modelVak.hidden = false; verder.hidden = false; zelf.hidden = true;
      uit.textContent = '';
      if (res && res.url) uit.append(el('p', {}, el('span', { en: 'your recording' }, 'Uw opname: '), el('audio', { controls: true, src: res.url })));
      if (res && res.tekst) {
        uit.append(el('div', { class: 'gehoord' }, el('span', { class: 'zacht klein', en: 'the computer heard' }, 'De computer hoorde: '), res.tekst));
        o.auto(res.tekst).forEach((ok, i) => { vakjes[i].i.checked = ok; });
      } else if (res && res.url) {
        uit.append(el('p', { class: 'tip', en: 'No speech-to-text available: listen to your recording and check yourself.' }, 'De computer kan uw opname nu niet lezen. Luister zelf en zet de vinkjes.'));
      }
      knop.textContent = '⏺ Nog een keer opnemen';
    }

    // Opnemen opent het opnamescherm onder in beeld. Stop (of vanzelf, na de stilte): de uitslag komt hier.
    // Annuleer: er verandert niets. De AudioContext nu al, tijdens de klik: anders blijft hij op een iPhone stil.
    knop.addEventListener('click', async () => {
      if (rec) return;
      Spraak.stop();
      const ctx = Stilte.context();
      knop.disabled = true; status.textContent = '';
      try {
        rec = await opnemer();
      } catch (e) {
        if (ctx) ctx.close().catch(() => {});
        knop.disabled = false;
        status.textContent = 'Geen microfoon. Zeg het antwoord hardop en controleer zelf.';
        toonCheck(null);
        return;
      }
      const res = await opnameScherm(rec, ctx, { stil: o.stil });
      rec = null; knop.disabled = false;
      if (res) { laatste = res; toonCheck(res); }
      knop.focus(); // terug waar u was: de knop (nu "Nog een keer opnemen"), de uitslag staat eronder
    });
    doel.append(el('div', { class: 'opname' }, knop, zelf, status), uit, lijst, modelVak, el('div', { class: 'knoppen' }, verder));
  }

  // de vakjes en de automatische controle bij een item
  function punten(item) {
    if (item.soort === 'zegna') {
      // na een korte zin is 2 s stilte genoeg; bij een eigen antwoord denkt de leerling langer na: 3 s (zie opnameScherm)
      return { punten: [{ tekst: 'Ik zeg de zin goed na.', en: 'I repeat the sentence correctly.' }], auto: (t) => [gelijk(item.tekst, t) >= 0.7], model: [item.tekst], stil: 2000 };
    }
    if (item.drie) { // "Noem drie dingen": drie zinnen = drie werkwoorden
      return {
        punten: [1, 2, 3].map((k) => ({ tekst: `Ik noem ding ${k}.`, en: `I mention thing ${k}.` })),
        auto: (t) => { const w = controle(item, t).werkwoorden; return [w >= 1, w >= 2, w >= 3]; },
        model: item.model, stil: 3000,
      };
    }
    const n = (item.sleutel || [[], []]).length;
    const namen = n === 3 && item.deel === 4
      ? ['plaatje 1', 'plaatje 2', 'plaatje 3'].map((p) => ({ tekst: `Ik zeg iets over ${p}.`, en: 'I say something about this picture.' }))
      : Array.from({ length: n }, (_, i) => ({ tekst: `Deel ${i + 1} van de vraag: antwoord gegeven.`, en: `Part ${i + 1} of the question answered.` }));
    namen.push({ tekst: 'Een werkwoord in elke zin.', en: 'A verb in every sentence.' });
    return {
      punten: namen,
      auto: (t) => { const c = controle(item, t); return [...c.delen, c.werkwoorden >= c.delen.length]; },
      model: item.model, stil: 3000,
    };
  }

  // tekst van de vraag zoals de stem hem zegt
  const vraagTekst = (item) => [item.sit, item.vraag].filter(Boolean).join(' ');

  return { P, bewaar, gehaald, isOpen, json, terug, speel, opnemer, opnameScherm, controle, gelijk, scene, opnameBlok, punten, vraagTekst, server, STT, heeftSR: !!SR };
})();
