#!/usr/bin/env node
// Test van spreken/stilte.js: wanneer stopt de opname vanzelf? Zonder browser, met geluidssporen uit tools/stilte-sporen.json.
//
//     node tools/test_stilte.js
//
// Elk spoor is een opname (elke 50 ms hoe hard, rms), gemaakt van de stem van de site met stilte, geruis en pauzes erbij,
// en "einde" = wanneer het praten ophoudt. Elk spoor draait met 3 s en 2 s stilte voor de stop, en met gelijke en ongelijke
// stappen (40 tot 70 ms, zoals een telefoon). Wat moet:
//   - de opname stopt ongeveer "stil" seconden na het praten, nooit eerder
//   - stilte aan het begin (nadenken, 4 s) telt niet; een klik of een hoest is geen praten
//   - niemand zegt iets: nooit vanzelf stoppen, na 8 s "ik hoor niets"
//   - een rumoerige kamer (een tv die aangaat) stopt toch, na een tijdje
//   - een pauze van 2,5 s: bij 3 s gaat de opname door, bij 2 s stopt hij (zo bedoeld)
global.window = {};
require('../spreken/stilte.js');
const sporen = require('./stilte-sporen.json');

function draai(s, stil, ongelijk) {
  const b = window.Stilte.beslisser({ stil });
  let t = 0, praatOp = null, klaarOp = null, nietsOp = null, r = 7;
  while (t < s.duur * 1000) {
    const dt = ongelijk ? 40 + ((r = (r * 16807) % 2147483647) % 31) : 50;
    t += dt;
    const u = b.stap(s.rms[Math.min(s.rms.length - 1, Math.floor(t / 50) - 1)] || 0, dt);
    if (u.staat !== 'wacht' && praatOp === null) praatOp = t / 1000;
    if (u.nietsGehoord && nietsOp === null) nietsOp = t / 1000;
    if (u.klaar) { klaarOp = t / 1000; break; }
  }
  return { praatOp, klaarOp, nietsOp };
}

let fout = 0, n = 0;
for (const stil of [3000, 2000]) {
  for (const ongelijk of [false, true]) {
    for (const [naam, s] of Object.entries(sporen)) {
      const r = draai(s, stil, ongelijk), na = r.klaarOp === null ? null : r.klaarOp - s.einde;
      let ok, uitleg;
      if (s.einde === null) { ok = r.klaarOp === null && r.praatOp === null && r.nietsOp >= 7.9 && r.nietsOp < 8.2; uitleg = `stopt niet, "ik hoor niets" na ${r.nietsOp} s`; }
      else if (naam.startsWith('4') && stil === 2000) { ok = r.klaarOp !== null && r.klaarOp < s.einde; uitleg = `stopt in de pauze van 2,5 s op ${r.klaarOp} s (bij 2 s zo bedoeld)`; }
      else if (naam.startsWith('12')) { ok = r.klaarOp !== null; uitleg = `stopt toch, ${na === null ? '' : na.toFixed(1)} s na het praten`; }
      else {
        ok = na !== null && na > stil / 1000 - 0.3 && na < stil / 1000 + 0.35 && r.praatOp < s.einde && (!naam.startsWith('8') || r.praatOp > 4.1);
        uitleg = `praten op ${r.praatOp === null ? '-' : r.praatOp.toFixed(2)} s, stop ${na === null ? 'NOOIT' : '+' + na.toFixed(2) + ' s na het praten'}`;
      }
      n++;
      if (!ok) { fout++; console.log(`✘ ${naam} (stil ${stil / 1000} s${ongelijk ? ', ongelijke stappen' : ''}): ${uitleg}`); }
    }
  }
}
console.log(`stilte.js: ${n - fout} van ${n} goed`);
process.exit(fout ? 1 : 0);
