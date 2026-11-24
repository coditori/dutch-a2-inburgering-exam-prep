// Spraak: eerst een mp3 van Piper (shared/audio/, gemaakt door tools/tts.py),
// anders de stem van de browser (speechSynthesis, nl-NL).
window.Spraak = (() => {
  const basis = new URL('audio/', document.currentScript.src).href;
  let lijst = null;
  const laad = fetch(basis + 'index.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((j) => { lijst = j; });
  let speler = null;

  function browserStem(tekst) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(tekst);
    u.lang = 'nl-NL';
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

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
      for (const m of extra) { await m.klaar; if (m.lijst[sleutel]) return m.url + m.lijst[sleutel]; }
      return lijst[sleutel] ? basis + lijst[sleutel] : null;
    },
    // speelt de mp3 (sleutel) of anders de browserstem (tekst). snelheid: 1 = gewoon, 0.75 = langzaam. Geeft de Audio terug (of null).
    async zeg(tekst, opties) {
      const o = opties || {};
      const url = await this.adres(o.sleutel || tekst);
      if (speler) speler.pause();
      if (!url) { browserStem(tekst); return null; }
      speler = new Audio(url);
      speler.playbackRate = o.snelheid || 1;
      speler.play().catch(() => browserStem(tekst));
      return speler;
    },
    stop() { if (speler) speler.pause(); if ('speechSynthesis' in window) speechSynthesis.cancel(); },
  };
})();
