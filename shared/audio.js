// Spraak: een mp3 per tekst (shared/audio/<stem>/, gemaakt door tools/tts_stemmen.py). Elk woord en elke zin van de site heeft er een.
// De stem van de browser (speechSynthesis) gebruiken we NOOIT: op veel computers leest die het Nederlands met een Engelse stem voor.
// Is er geen mp3, of wil hij niet spelen, dan blijft het stil.
window.Spraak = (() => {
  const basis = new URL('audio/', document.currentScript.src).href;
  // UITGAVE staat achter het adres van elke mp3 (?v=2). Een browser mag een mp3 lang bewaren; de naam van een mp3 hangt alleen van de
  // tekst af. Zijn de opnamen opnieuw gemaakt of schoongemaakt (tools/tts*.py, tools/schoon_audio.py), verhoog dit getal dan:
  // zo haalt elke browser de nieuwe opnamen op.
  const UITGAVE = '2';
  const vers = (url) => url + '?v=' + UITGAVE;
  // ---------- de stem van de verteller ----------
  // Elke stem heeft een eigen map: audio/<stem>/ met een eigen index.json, met dezelfde sleutels (tools/tts_stemmen.py).
  // Heeft de gekozen stem een tekst (nog) niet, dan hoort u STANDAARD. In audio/ zelf staan alleen de vaste stemmen:
  // de rollen in de gesprekken van Luisteren en de vragen van Spreken.
  // De lijst met stemmen staat ook in shared/stemmen.json, met dezelfde "standaard" (tools/controleer_stemmen.py kijkt of dat klopt).
  const STEMMEN = ['vindemiatrix', 'leda', 'algenib', 'puck'];
  const STANDAARD = 'vindemiatrix';
  const PROEF = 'Goedemorgen. Ik lees de woorden en de zinnen voor.'; // dit zegt elke stem op de pagina Instellingen
  // de bewaarde keuze; een stem die er niet meer is, wordt de standaard
  const leesStem = () => {
    try { const s = JSON.parse(localStorage.getItem('dutch-exam:stem')); return s && STEMMEN.includes(s.id) ? s.id : STANDAARD; } catch (e) { return STANDAARD; }
  };
  let stem = leesStem();
  const haal = (url) => fetch(url + 'index.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  // een map met opnamen: per stem een lijst (pas opgehaald als die stem nodig is). '' = de map zelf: de vaste stemmen.
  const maakMap = (url, vast) => {
    const lijsten = vast ? {} : { '': Promise.resolve({}) };
    const m = { url, van: (id) => (lijsten[id] = lijsten[id] || haal(id ? url + id + '/' : url)) };
    m.van(''); m.van(stem);
    return m;
  };
  const eigen = maakMap(basis, false); // shared/audio/: alleen de verteller, geen vaste stemmen
  const extra = []; // de map van een examen: Spraak.map('audio/') in luisteren/, spreken/ of knm/
  document.addEventListener('account-gegevens', () => { stem = leesStem(); }); // de keuze kwam van het account (shared/account.js)
  let speler = null;

  // Geluid begint nooit vanzelf bij het openen of verversen van een pagina: pas nadat de leerling op DEZE pagina heeft geklikt,
  // getikt of een toets heeft ingedrukt. Daarna mag een oefening het volgende woord zelf laten horen (na "Verder" bijvoorbeeld).
  // We houden dit zelf bij: de browser onthoudt een klik soms over een verversing heen, en zou het geluid dan toch starten.
  let geklikt = false;
  for (const soort of ['pointerdown', 'keydown']) window.addEventListener(soort, () => { geklikt = true; }, { capture: true, passive: true });
  const magSpelen = () => geklikt;

  return {
    // een eigen map met mp3's + index.json erbij (pad vanaf de pagina)
    map(pad) {
      const m = maakMap(new URL(pad, location.href).href, true);
      extra.push(m);
      return Promise.all([m.van(''), m.van(stem)]);
    },
    // adres van de mp3 bij een sleutel (tekst, of "stem|tekst"), of null.
    // opties: { vast: true } = een vaste stem (een rol in een gesprek), { stem: 'leda' } = deze stem en geen andere (de proef bij Instellingen)
    async adres(sleutel, opties) {
      const o = opties || {};
      const mappen = [...extra, eigen];
      // de verteller: de gekozen stem, en heeft die de tekst (nog) niet, dan de standaard-stem
      const ids = o.stem ? [o.stem] : o.vast ? [] : [...new Set([stem, STANDAARD])];
      for (const id of ids) {
        for (const m of mappen) {
          const l = await m.van(id);
          if (l[sleutel]) return vers(m.url + id + '/' + l[sleutel]);
          // de stem heeft deze zin wel, maar niet langzaam: de pagina speelt de gewone opname langzamer af
          if (sleutel.includes('|langzaam|') && l[sleutel.replace('|langzaam|', '|')]) return null;
        }
      }
      if (o.stem) return null;
      for (const m of mappen) { const l = await m.van(''); if (l[sleutel]) return vers(m.url + l[sleutel]); }
      return null;
    },
    // speelt de mp3 bij de sleutel (of bij de tekst). Geen mp3: stil. snelheid: 1 = gewoon, 0.75 = langzaam. Geeft de Audio terug (of null).
    async zeg(tekst, opties) {
      const o = opties || {};
      if (!magSpelen()) return null; // de pagina is net geopend: stil, tot de leerling zelf klikt
      const url = await this.adres(o.sleutel || tekst, o);
      if (speler) speler.pause();
      if (!url) return null; // geen opname: stil
      speler = new Audio(url);
      speler.playbackRate = o.snelheid || 1;
      speler.play().catch(() => { /* de browser weigert, of het bestand werkt niet: stil */ });
      return speler;
    },
    stop() { if (speler) speler.pause(); },
    // de stem van de verteller: lezen, kiezen (bewaard in deze browser, en bij het account als de leerling is ingelogd), en laten horen
    stem: () => stem,
    kiesStem(id) {
      if (!STEMMEN.includes(id)) return;
      stem = id;
      try { localStorage.setItem('dutch-exam:stem', JSON.stringify({ id, t: Date.now() })); } catch (e) { /* geen opslag */ }
      for (const m of [...extra, eigen]) m.van(id);
      document.dispatchEvent(new CustomEvent('stem'));
      if (window.Account && window.Account.staat.gebruiker) window.Account.sync();
    },
    proef(id) { return this.zeg(PROEF, { stem: id }); },
    PROEF, STANDAARD,
    magSpelen,
  };
})();
