// Leitner-dozen in localStorage.
// Fout -> morgen terug. Goed -> over 2, 4, 8, 16 dagen terug.
// Kaart: { box, due, soort: 'w' (woord) | 'z' (zin met gat), ... }
window.SRS = (() => {
  const SLEUTEL = 'dutch-exam:srs';
  const DAGEN = [1, 2, 4, 8, 16];
  const BEKEND = 2; // vanaf dit vak telt een kaart als "gekend"

  const vandaag = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
  const lees = () => { try { return JSON.parse(localStorage.getItem(SLEUTEL)) || {}; } catch (e) { return {}; } };
  const schrijf = (k) => { try { localStorage.setItem(SLEUTEL, JSON.stringify(k)); } catch (e) { /* vol of geblokkeerd */ } };

  return {
    BEKEND,
    vandaag,
    alle: lees,
    // nieuwe kaart; komt morgen voor het eerst terug (of vandaag met nu = true)
    voegToe(id, kaart, nu) {
      const k = lees();
      if (k[id]) return false;
      k[id] = Object.assign({ box: 0, due: vandaag() + (nu ? 0 : 1) }, kaart);
      schrijf(k);
      return true;
    },
    antwoord(id, goed) {
      const k = lees();
      const c = k[id];
      if (!c) return;
      c.box = goed ? Math.min(c.box + 1, DAGEN.length - 1) : 0;
      c.due = vandaag() + (goed ? DAGEN[c.box] : 1);
      schrijf(k);
      return c;
    },
    // kaarten die vandaag aan de beurt zijn
    aanDeBeurt() {
      const k = lees(), t = vandaag();
      return Object.keys(k).filter((id) => k[id].due <= t).map((id) => Object.assign({ id }, k[id]));
    },
    tel() {
      const k = lees(), t = vandaag();
      const ids = Object.keys(k);
      return { totaal: ids.length, nu: ids.filter((id) => k[id].due <= t).length, bekend: ids.filter((id) => k[id].box >= BEKEND).length };
    },
  };
})();
