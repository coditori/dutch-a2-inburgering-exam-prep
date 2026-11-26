// Wanneer is de leerling klaar met praten? Dit bestand luistert naar hoe hard het geluid van de microfoon is, en beslist.
//   wacht = nog niets gehoord. Stilte aan het begin telt nooit: de leerling denkt misschien nog na.
//   praat = de leerling praat: minstens 0,2 s geluid boven de achtergrond (een korte klik of tik is geen praten).
//   stil  = na het praten is het stil. Na o.stil ms stilte is de opname klaar; weer praten zet de tijd terug.
// De achtergrond (ruis) wordt steeds gemeten: zakt snel mee als het stiller wordt, stijgt rustig als het rumoeriger wordt,
// en verandert niet terwijl de leerling praat. Praten = duidelijk harder dan de achtergrond (o.factor), en nooit heel zacht.
// Gebruikt door spreken/spreken.js (het opnamescherm). De beslisser rekent alleen met getallen: te testen zonder browser.
window.Stilte = (() => {
  const STANDAARD = {
    stil: 3000, // ms stilte na het praten: dan is de opname klaar
    begin: 200, // ms geluid voor het telt als praten
    max: 60000, // ms: de opname stopt altijd na 1 minuut
    nietsGehoord: 8000, // ms zonder praten: dan zegt het scherm dat het niets hoort (het stopt niet)
    factor: 2.5, // praten is zoveel harder dan de achtergrond (ongeveer 8 dB)
    minDrempel: 0.01, // nooit zachter dan dit (ongeveer -40 dB)
    kalibreer: 300, // ms aan het begin: alleen de achtergrond meten
    minPraten: 350, // ms echt geluid voor de opname vanzelf mag stoppen (een hoest of een klik is minder)
  };

  // beslisser(o).stap(rms, dt) -> { staat, niveau, deel, klaar, nietsGehoord, tijd }
  //   rms = hoe hard (0..1) in het laatste stukje, dt = ms sinds de vorige stap.
  //   niveau = 0..1 voor het scherm (de bol en de golf), deel = 0..1 van de stilte tot de automatische stop.
  function beslisser(opties) {
    const k = Object.assign({}, STANDAARD, opties);
    let ruis = 0, spraak = 0, gepraat = 0, stil = 0, tijd = 0, kal = 0, staat = 'wacht', niveau = 0;
    const eerst = []; // de eerste 0,3 s met geluid
    return {
      stap(rms, dt) {
        tijd += dt;
        // De eerste 0,3 s met geluid: alleen de achtergrond meten. Helemaal niets (0) telt niet mee: zo begint een microfoon
        // soms, en dan zou elk geruis daarna "praten" zijn. Gelijkmatig geluid (geruis): het gemiddelde. Springt het geluid
        // (de leerling praat al): het stilste stukje, want tussen twee woorden is het even stiller.
        if (kal < k.kalibreer) {
          if (rms > 1e-5) {
            kal += dt;
            eerst.push(rms);
            const min = Math.min(...eerst), max = Math.max(...eerst);
            ruis = max / min < 4 ? eerst.reduce((a, b) => a + b, 0) / eerst.length : min;
          }
          niveau = 0;
          return { staat, niveau, tijd, deel: 0, klaar: tijd >= k.max, nietsGehoord: tijd >= k.nietsGehoord };
        }
        const drempel = Math.max(k.minDrempel, ruis * k.factor);
        const hard = rms > drempel, zacht = rms < drempel * 0.75; // daartussen: blijft wat het was (geen geflikker)
        // de achtergrond bijhouden: snel omlaag (de stilte tussen woorden), rustig omhoog; tijdens het praten heel traag,
        // zodat een rumoerige kamer (een tv die aangaat) na een tijdje toch weer "stil" wordt
        ruis += (rms - ruis) * Math.min(1, dt / (rms < ruis ? 250 : hard ? 10000 : 2000));
        if (staat === 'wacht') {
          spraak = hard ? spraak + dt : Math.max(0, spraak - dt);
          if (spraak >= k.begin) { staat = 'praat'; gepraat = spraak; }
        } else if (hard) { staat = 'praat'; stil = 0; gepraat += dt; } else if (zacht) { staat = 'stil'; stil += dt; }
        // Een kort geluid (hoesten, een stoel, een deur: samen minder dan k.minPraten) en dan weer stil: dat was geen praten.
        // Terug naar wachten: de opname stopt nooit voordat de leerling echt iets gezegd heeft.
        if (staat === 'stil' && gepraat < k.minPraten && stil > 600) { staat = 'wacht'; spraak = 0; gepraat = 0; stil = 0; }
        // het niveau voor het scherm: van de achtergrond tot 30 dB erboven, snel omhoog en rustig omlaag
        const vloer = Math.max(ruis, k.minDrempel / k.factor);
        const doel = Math.max(0, Math.min(1, (20 * Math.log10(Math.max(rms, 1e-6) / vloer)) / 30));
        niveau += (doel - niveau) * (doel > niveau ? 0.6 : 0.2);
        return {
          staat, niveau, tijd,
          deel: staat === 'stil' ? Math.min(1, stil / k.stil) : 0,
          klaar: (staat === 'stil' && stil >= k.stil) || tijd >= k.max,
          nietsGehoord: staat === 'wacht' && tijd >= k.nietsGehoord,
        };
      },
    };
  }

  // Een AudioContext. Maak hem tijdens de klik op Opnemen: een iPhone laat hem anders stil. Geen Web Audio: null.
  function context() {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { const c = new C(); if (c.resume) c.resume().catch(() => {}); return c; } catch (e) { return null; }
  }

  // meet(stroom, ctx, o): koppelt de microfoon aan een beslisser. Elke 50 ms o.elk(uitkomst). Geeft { stop() }, of null zonder Web Audio.
  function meet(stroom, ctx, o) {
    if (!ctx || !stroom) return null;
    try {
      const bron = ctx.createMediaStreamSource(stroom), an = ctx.createAnalyser();
      an.fftSize = 2048;
      bron.connect(an);
      const f = an.getFloatTimeDomainData ? new Float32Array(an.fftSize) : null, b8 = new Uint8Array(an.fftSize);
      const beslis = beslisser(o);
      let vorige = performance.now();
      const tik = setInterval(() => {
        const nu = performance.now(), dt = Math.min(200, nu - vorige); // na een pauze van de browser geen grote sprong
        vorige = nu;
        let som = 0;
        if (f) { an.getFloatTimeDomainData(f); for (let i = 0; i < f.length; i++) som += f[i] * f[i]; } else {
          an.getByteTimeDomainData(b8); for (let i = 0; i < b8.length; i++) { const x = (b8[i] - 128) / 128; som += x * x; }
        }
        o.elk(beslis.stap(Math.sqrt(som / an.fftSize), dt));
      }, 50);
      return { stop() { clearInterval(tik); try { bron.disconnect(); } catch (e) { /* al los */ } } };
    } catch (e) { return null; }
  }

  return { beslisser, context, meet, STANDAARD };
})();
