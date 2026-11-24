// Spraak: een mp3 van Piper (shared/audio/, gemaakt door tools/tts.py). Elk woord en elke zin van de site heeft er een.
// De stem van de browser (speechSynthesis) gebruiken we NOOIT: op veel computers leest die het Nederlands met een Engelse stem voor.
// Is er geen mp3, of wil hij niet spelen, dan blijft het stil.
window.Spraak = (() => {
  const basis = new URL('audio/', document.currentScript.src).href;
  // UITGAVE staat achter het adres van elke mp3 (?v=2). Een browser mag een mp3 lang bewaren; de naam van een mp3 hangt alleen van de
  // tekst af. Zijn de opnamen opnieuw gemaakt of schoongemaakt (tools/tts*.py, tools/schoon_audio.py), verhoog dit getal dan:
  // zo haalt elke browser de nieuwe opnamen op.
  const UITGAVE = '2';
  const vers = (url) => url + '?v=' + UITGAVE;
  let lijst = null;
  const laad = fetch(basis + 'index.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((j) => { lijst = j; });
  let speler = null;

  // Geluid begint nooit vanzelf bij het openen of verversen van een pagina: pas nadat de leerling op DEZE pagina heeft geklikt,
  // getikt of een toets heeft ingedrukt. Daarna mag een oefening het volgende woord zelf laten horen (na "Verder" bijvoorbeeld).
  // We houden dit zelf bij: de browser onthoudt een klik soms over een verversing heen, en zou het geluid dan toch starten.
  let geklikt = false;
  for (const soort of ['pointerdown', 'keydown']) window.addEventListener(soort, () => { geklikt = true; }, { capture: true, passive: true });
  const magSpelen = () => geklikt;

  const extra = []; // lijsten van een examen: Spraak.map('audio/') in luisteren/ of spreken/

  return {
    // een eigen map met mp3's + index.json erbij (pad vanaf de pagina)
    map(pad) {
      const url = new URL(pad, location.href).href;
      const m = { url, lijst: {} };
      m.klaar = fetch(url + 'index.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((j) => { m.lijst = j; });
      extra.push(m);
      return m.klaar;
    },
    // adres van de mp3 bij een sleutel (tekst, of "stem|tekst"), of null
    async adres(sleutel) {
      await laad;
      for (const m of extra) { await m.klaar; if (m.lijst[sleutel]) return vers(m.url + m.lijst[sleutel]); }
      return lijst[sleutel] ? vers(basis + lijst[sleutel]) : null;
    },
    // speelt de mp3 bij de sleutel (of bij de tekst). Geen mp3: stil. snelheid: 1 = gewoon, 0.75 = langzaam. Geeft de Audio terug (of null).
    async zeg(tekst, opties) {
      const o = opties || {};
      if (!magSpelen()) return null; // de pagina is net geopend: stil, tot de leerling zelf klikt
      const url = await this.adres(o.sleutel || tekst);
      if (speler) speler.pause();
      if (!url) return null; // geen opname: stil
      speler = new Audio(url);
      speler.playbackRate = o.snelheid || 1;
      speler.play().catch(() => { /* de browser weigert, of het bestand werkt niet: stil */ });
      return speler;
    },
    stop() { if (speler) speler.pause(); },
    magSpelen,
  };
})();
