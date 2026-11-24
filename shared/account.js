// Inloggen met Google, en de voortgang bewaren bij het account. Nodig: app.js staat vóór dit bestand (App.kop laadt het zelf).
//
// Zonder shared/config.json gebeurt hier niets: de site werkt dan als altijd, met de voortgang alleen in de browser.
// shared/config.json staat NIET in git (.gitignore). Het voorbeeld is shared/config.voorbeeld.json; de uitleg staat in docs/inloggen.md.
//   { "firebase": { ...de gegevens van uw Firebase-project... } }   -> echt inloggen met Google
//   { "demo": true }                                                -> alleen om de schermen te bekijken: een nep-account in deze browser
//
// Bezoekers die niet inloggen, halen niets op bij Google: de code van Firebase laadt pas bij "Log in", bij iemand die al ingelogd was,
// of bij het openen van een profiel-link met #u=.
window.Account = (() => {
  const VOOR = 'dutch-exam:';
  // Dit gaat naar het account. Niet: instellingen, half gemaakte lessen en toetsen, en uw eigen gegevens voor het formulier (naam, adres).
  const EXAMENS = ['lezen', 'luisteren', 'schrijven', 'spreken', 'knm'];
  const SLEUTELS = [...EXAMENS, 'srs', 'knm-kaarten', 'profiel'];
  const FIREBASE = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const lees = (k) => { try { return localStorage.getItem(VOOR + k); } catch (e) { return null; } };
  const zet = (k, v) => { try { if (v == null) localStorage.removeItem(VOOR + k); else localStorage.setItem(VOOR + k, v); } catch (e) { /* geen opslag */ } };
  const json = (s, d) => { try { const v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } };

  // status: 'uit' (niet ingelogd) | 'bezig' | 'bewaard' | 'fout'
  const staat = { beschikbaar: false, demo: false, gebruiker: null, status: 'uit', fout: '' };
  const meld = () => document.dispatchEvent(new CustomEvent('account'));
  const zetStatus = (status, fout) => { staat.status = status; staat.fout = fout || ''; meld(); };

  // ---------- samenvoegen: wat in de browser staat en wat bij het account staat. Niemand verliest werk: het beste blijft. ----------
  const deel = (r) => (r && r.totaal ? r.beste / r.totaal : -1);
  const besteVan = (a, b) => { // lessen en trainers: per les het beste resultaat
    const uit = Object.assign({}, b, a);
    for (const id of Object.keys(b || {})) if (deel(b[id]) > deel((a || {})[id])) uit[id] = b[id];
    return uit;
  };
  const toetsenSamen = (a, b) => { // toetsen: alle pogingen van beide kanten, elke poging één keer
    const uit = {};
    for (const id of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
      const gezien = new Set();
      uit[id] = [...((a || {})[id] || []), ...((b || {})[id] || [])].filter((r) => { const s = JSON.stringify(r); if (gezien.has(s)) return false; gezien.add(s); return true; })
        .sort((x, y) => String(x.datum || '').localeCompare(String(y.datum || '')));
    }
    return uit;
  };
  const kaartenSamen = (a, b) => { // woordkaarten: per kaart het hoogste vak; gelijk? dan de kaart die het laatst terugkomt
    const uit = Object.assign({}, b, a);
    for (const id of Object.keys(b || {})) {
      const x = (a || {})[id], y = b[id];
      if (x && y && (y.box > x.box || (y.box === x.box && y.due > x.due))) uit[id] = y;
    }
    return uit;
  };
  function voegSamen(sleutel, hier, daar) { // twee teksten (JSON) -> één tekst
    if (daar == null) return hier;
    if (hier == null) return daar;
    const a = json(hier, {}), b = json(daar, {});
    if (EXAMENS.includes(sleutel)) return JSON.stringify(Object.assign({}, b, a, { lessen: besteVan(a.lessen, b.lessen), trainers: besteVan(a.trainers, b.trainers), toets: toetsenSamen(a.toets, b.toets) }));
    if (sleutel === 'profiel') return JSON.stringify({ naam: a.naam || b.naam || '' });
    return JSON.stringify(kaartenSamen(a, b));
  }
  const alles = () => { const o = {}; for (const k of SLEUTELS) { const v = lees(k); if (v != null) o[k] = v; } return o; };
  const afdruk = (o) => JSON.stringify(SLEUTELS.map((k) => o[k] || '')); // om te zien of er iets veranderd is

  // ---------- waar het account staat: Firebase, of (demo) deze browser ----------
  // Elke soort heeft: start(cb) · login() · loguit() · haal(uid) · bewaar(uid, gegevens, kaart) · wis(uid) · kaart(uid)
  const demoWolk = () => ({
    start(cb) { this.cb = cb; cb(lees('demo-in') ? { uid: 'demo', naam: 'Sara Demo', email: 'sara@voorbeeld.nl' } : null); },
    async login() { zet('demo-in', '1'); this.start(this.cb); },
    async loguit() { zet('demo-in', null); this.start(this.cb); },
    async haal() { return json(lees('demo-wolk'), null); },
    async bewaar(uid, gegevens, kaart) { zet('demo-wolk', JSON.stringify(gegevens)); zet('demo-kaart', JSON.stringify(kaart)); },
    async wis() { zet('demo-wolk', null); zet('demo-kaart', null); },
    async kaart(uid) { return uid === 'demo' ? json(lees('demo-kaart'), null) : null; },
  });
  const script = (src) => new Promise((goed, fout) => { const s = document.createElement('script'); s.src = src; s.onload = goed; s.onerror = () => fout(new Error('laden mislukt: ' + src)); document.head.append(s); });
  const firebaseWolk = (config) => {
    let geladen = null;
    const laad = () => (geladen = geladen || (async () => {
      for (const deel of ['app', 'auth', 'firestore']) await script(`${FIREBASE}firebase-${deel}-compat.js`);
      window.firebase.initializeApp(config);
      return window.firebase;
    })());
    const db = async () => (await laad()).firestore();
    return {
      // De code van Firebase laadt alleen als dat nodig is: was deze browser ingelogd (lees('account-in')), dan nu; anders pas bij login().
      start(cb) { this.cb = cb; if (lees('account-in')) this.luister().catch(() => cb(null)); else cb(null); },
      async luister() {
        if (this.luistert) return; this.luistert = true;
        (await laad()).auth().onAuthStateChanged((u) => { zet('account-in', u ? '1' : null); this.cb(u ? { uid: u.uid, naam: u.displayName || '', email: u.email || '' } : null); });
      },
      async login() {
        const fb = await laad();
        await this.luister();
        await fb.auth().signInWithPopup(new fb.auth.GoogleAuthProvider());
      },
      async loguit() { await (await laad()).auth().signOut(); },
      // gebruikers/{uid}: alleen voor de leerling zelf. profielen/{uid}: de kaart, voor iedereen met de link. Zie docs/inloggen.md voor de regels.
      async haal(uid) { const d = await (await db()).doc('gebruikers/' + uid).get(); return d.exists ? (d.data().gegevens || {}) : null; },
      async bewaar(uid, gegevens, kaart) {
        const d = await db(), nu = Date.now();
        await Promise.all([d.doc('gebruikers/' + uid).set({ v: 1, gegevens, bijgewerkt: nu }), d.doc('profielen/' + uid).set({ v: 1, kaart: JSON.stringify(kaart), bijgewerkt: nu })]);
      },
      async wis(uid) { const d = await db(); await Promise.all([d.doc('gebruikers/' + uid).delete(), d.doc('profielen/' + uid).delete()]); },
      async kaart(uid) { const d = await (await db()).doc('profielen/' + uid).get(); return d.exists ? json(d.data().kaart, null) : null; },
    };
  };

  // ---------- gelijk maken: ophalen, samenvoegen, in de browser zetten, terugsturen ----------
  let wolk = null, bezig = null;
  async function maakGelijk() {
    const g = staat.gebruiker;
    if (!g || !wolk) return;
    zetStatus('bezig');
    try {
      const hier = alles();
      // Na "Wis alle voortgang" (App.wis) telt alleen wat in de browser staat: anders komt het gewiste terug van het account.
      const daar = lees('account-wis') ? {} : ((await wolk.haal(g.uid)) || {});
      const samen = {};
      for (const k of SLEUTELS) { const v = voegSamen(k, hier[k], daar[k]); if (v != null) samen[k] = v; }
      if (!json(samen.profiel, {}).naam && g.naam) samen.profiel = JSON.stringify({ naam: g.naam.split(' ')[0].slice(0, 30) }); // de voornaam van Google als begin
      const anders = afdruk(samen) !== afdruk(hier);
      for (const k of SLEUTELS) if (samen[k] !== hier[k]) zet(k, samen[k]);
      const kaart = window.App.profielRij(await window.App.profielNu());
      if (afdruk(samen) !== afdruk(daar) || lees('account-kaart') !== JSON.stringify(kaart)) await wolk.bewaar(g.uid, samen, kaart);
      zet('account-wis', null); zet('account-afdruk', afdruk(samen)); zet('account-kaart', JSON.stringify(kaart));
      zetStatus('bewaard');
      if (anders) document.dispatchEvent(new CustomEvent('account-gegevens')); // de pagina kan zich opnieuw tekenen
    } catch (e) { zetStatus('fout', String((e && e.message) || e)); }
  }
  const sync = () => (bezig = (bezig || Promise.resolve()).then(maakGelijk));

  // ---------- begin ----------
  const klaar = (async () => {
    // config.json: één keer per bezoek ophalen (sessionStorage), niet op elke pagina
    let tekst = null;
    try { tekst = sessionStorage.getItem(VOOR + 'config'); } catch (e) { /* geen opslag */ }
    if (tekst == null) {
      tekst = await fetch(window.App.WORTEL + 'shared/config.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.text() : '')).catch(() => '');
      try { sessionStorage.setItem(VOOR + 'config', tekst); } catch (e) { /* geen opslag */ }
    }
    const config = json(tekst, null);
    if (!config || !(config.demo || (config.firebase && config.firebase.apiKey))) return;
    staat.beschikbaar = true; staat.demo = !!config.demo;
    wolk = config.demo ? demoWolk() : firebaseWolk(config.firebase);
    await new Promise((af) => wolk.start((g) => {
      const was = staat.gebruiker && staat.gebruiker.uid;
      staat.gebruiker = g;
      if (!g) zetStatus('uit'); else if (g.uid !== was) sync(); else meld();
      af();
    }));
  })().catch(() => { /* geen config, geen account */ }).then(meld);

  // Verliet de leerling de pagina met nieuwe voortgang? Dan nog één keer bewaren.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && staat.gebruiker && lees('account-afdruk') !== afdruk(alles())) sync(); });
  document.addEventListener('gewist', () => { if (staat.gebruiker) { zet('account-wis', '1'); sync(); } });

  const UID = /^[A-Za-z0-9_-]{4,128}$/;
  return {
    staat, klaar, sync,
    async login() {
      if (!wolk) return;
      zetStatus('bezig');
      try { await wolk.login(); } catch (e) {
        const code = (e && e.code) || '';
        zetStatus('uit', code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' ? '' : code === 'auth/popup-blocked' ? 'venster' : String((e && e.message) || e));
      }
    },
    async loguit() { if (wolk) { await sync(); await wolk.loguit(); } }, // de voortgang blijft in deze browser staan
    // alles weg bij het account (niet in deze browser), en uitloggen
    async verwijder() { const g = staat.gebruiker; if (!g || !wolk) return; await wolk.wis(g.uid); zet('account-afdruk', null); zet('account-kaart', null); await wolk.loguit(); },
    // de kaart van iemand anders, voor de link profiel.html#u=...
    async kaartVan(uid) { await klaar; if (!wolk || !UID.test(uid)) return null; return wolk.kaart(uid); },
  };
})();
