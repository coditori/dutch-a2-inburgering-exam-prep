// Spraak: een mp3 van Piper (shared/audio/, gemaakt door tools/tts.py). Elk woord en elke zin van de site heeft er een.
// Is er toch geen mp3, dan de stem van de browser, maar ALLEEN als de browser een Nederlandse stem heeft.
// Veel computers hebben die niet: dan leest een Engelse stem het Nederlands voor, en dat is erger dan stilte. Dan dus: stil.
window.Spraak = (() => {
  const basis = new URL('audio/', document.currentScript.src).href;
  let lijst = null;
  const laad = fetch(basis + 'index.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((j) => { lijst = j; });
  let speler = null;

  // de Nederlandse stem van de browser, of null. De lijst met stemmen komt soms pas later (voiceschanged).
  const kan = 'speechSynthesis' in window;
  const nlStem = () => (kan ? speechSynthesis.getVoices().find((v) => /^nl[-_]NL/i.test(v.lang)) || speechSynthesis.getVoices().find((v) => /^nl\b/i.test(v.lang)) || null : null);
  if (kan) { speechSynthesis.getVoices(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices()); }
  function browserStem(tekst) {
    const stem = nlStem();
    if (!stem) return; // geen Nederlandse stem: liever stil dan een andere taal
    const u = new SpeechSynthesisUtterance(tekst);
    u.voice = stem;
    u.lang = stem.lang;
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
      // Mag het geluid nog niet spelen (de browser wacht op een klik, bijvoorbeeld net na het laden van de pagina), dan blijft het stil:
      // de leerling klikt op de knop met de luidspreker. Alleen als het bestand zelf niet werkt, proberen we de Nederlandse browserstem.
      speler.play().catch((e) => { if (!e || e.name !== 'NotAllowedError') browserStem(tekst); });
      return speler;
    },
    stop() { if (speler) speler.pause(); if ('speechSynthesis' in window) speechSynthesis.cancel(); },
    nlStem, // de Nederlandse stem van de browser of null (voor luisteren/luisteren.js)
  };
})();
