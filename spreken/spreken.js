// Gedeeld door alle pagina's van spreken: voortgang, vragen die terugkomen, opnemen, spraak -> tekst, controle.
window.Spreken = (() => {
  const { el } = App;
  const STT = 'http://127.0.0.1:8787'; // tools/stt_server.py (faster-whisper). Draait die niet: Chrome Web Speech, anders zelf controleren.
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
      const c = new AbortController();
      setTimeout(() => c.abort(), 900);
      serverAan = fetch(STT + '/ping', { signal: c.signal }).then((r) => r.ok).catch(() => false);
    }
    return serverAan;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // opnemer: start() -> stop() geeft { url, tekst, bron }   bron: 'whisper' | 'browser' | ''
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
      async stop() {
        const klaar = new Promise((r) => rec.addEventListener('stop', r));
        rec.stop();
        await klaar;
        stroom.getTracks().forEach((t) => t.stop());
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
  function scene(beelden) {
    if (!beelden || !beelden.length) return null;
    return el('div', { class: 'scene' }, beelden.map((b, i) => el('div', { class: 'plaat' }, b, beelden.length > 1 ? el('small', {}, `plaatje ${i + 1}`) : null)));
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

    knop.addEventListener('click', async () => {
      if (rec) {
        knop.disabled = true; status.textContent = 'even wachten...';
        const r = rec; rec = null;
        laatste = await r.stop();
        knop.disabled = false; knop.classList.remove('rood', 'bezig'); status.textContent = '';
        toonCheck(laatste);
        return;
      }
      Spraak.stop();
      try {
        rec = await opnemer();
        knop.textContent = '⏹ Stop'; knop.classList.add('rood', 'bezig'); status.textContent = 'opname loopt...';
      } catch (e) {
        status.textContent = 'Geen microfoon. Zeg het antwoord hardop en controleer zelf.';
        toonCheck(null);
      }
    });
    doel.append(el('div', { class: 'opname' }, knop, zelf, status), uit, lijst, modelVak, el('div', { class: 'knoppen' }, verder));
  }

  // de vakjes en de automatische controle bij een item
  function punten(item) {
    if (item.soort === 'zegna') {
      return { punten: [{ tekst: 'Ik zeg de zin goed na.', en: 'I repeat the sentence correctly.' }], auto: (t) => [gelijk(item.tekst, t) >= 0.7], model: [item.tekst] };
    }
    if (item.drie) { // "Noem drie dingen": drie zinnen = drie werkwoorden
      return {
        punten: [1, 2, 3].map((k) => ({ tekst: `Ik noem ding ${k}.`, en: `I mention thing ${k}.` })),
        auto: (t) => { const w = controle(item, t).werkwoorden; return [w >= 1, w >= 2, w >= 3]; },
        model: item.model,
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
      model: item.model,
    };
  }

  // tekst van de vraag zoals de stem hem zegt
  const vraagTekst = (item) => [item.sit, item.vraag].filter(Boolean).join(' ');

  return { P, bewaar, gehaald, isOpen, json, terug, speel, opnemer, controle, gelijk, scene, opnameBlok, punten, vraagTekst, server, STT, heeftSR: !!SR };
})();
