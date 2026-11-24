// Gedeeld door de pagina's van KNM: voortgang, slot, eigen Leitner-dozen voor de weetjes.
// De vraag met drie antwoorden komt uit ../lezen/lezen.js (Lezen.vraag): niet twee keer maken.
window.KNM = (() => {
  const STAPPEN = [['a', 'Woorden', 'words'], ['b', 'Weetjes', 'facts'], ['c', 'Situaties', 'situations'], ['d', 'Meer weetjes', 'more facts (from your own lesson material)']];
  const P = Object.assign({ lessen: {}, toets: {}, trainers: {}, open: false }, App.lees('knm', {}));
  const bewaar = () => App.schrijf('knm', P);
  const gehaald = (id) => { const r = P.lessen[id]; return !!r && r.beste / r.totaal >= 0.8; };
  const sla = (id, goed, totaal) => {
    const oud = P.lessen[id] || { beste: 0, keer: 0 };
    P.lessen[id] = { score: goed, beste: Math.max(oud.beste, goed), totaal, keer: oud.keer + 1, datum: new Date().toISOString().slice(0, 10) };
    bewaar();
  };
  // alle stappen op volgorde: thema 1 a, b, c, thema 2 a, ...
  const rij = (themas) => themas.flatMap((t) => STAPPEN.map(([s]) => `${t.id}-${s}`));
  const isOpen = (themas, id) => { const r = rij(themas); const i = r.indexOf(id); return P.open || i <= 0 || gehaald(r[i - 1]); };
  const allesKlaar = (themas) => P.open || rij(themas).every(gehaald);

  // Leitner-dozen voor de weetjes (eigen opslag, zelfde regels als shared/srs.js)
  const DAGEN = [1, 2, 4, 8, 16];
  const Kaarten = {
    alle: () => App.lees('knm-kaarten', {}),
    voegToe(id) { const k = this.alle(); if (!k[id]) { k[id] = { box: 0, due: SRS.vandaag() + 1 }; App.schrijf('knm-kaarten', k); } },
    antwoord(id, goed) {
      const k = this.alle(); const c = k[id] || { box: 0 };
      c.box = goed ? Math.min(c.box + 1, DAGEN.length - 1) : 0;
      c.due = SRS.vandaag() + (goed ? DAGEN[c.box] : 1);
      k[id] = c; App.schrijf('knm-kaarten', k);
    },
    aanDeBeurt() { const k = this.alle(), t = SRS.vandaag(); return Object.keys(k).filter((id) => k[id].due <= t); },
    bekend() { const k = this.alle(); return Object.keys(k).filter((id) => k[id].box >= SRS.BEKEND).length; },
  };

  return { STAPPEN, P, bewaar, gehaald, sla, rij, isOpen, allesKlaar, Kaarten };
})();
