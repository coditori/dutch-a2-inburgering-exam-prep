// Gedeeld door alle pagina's van schrijven: voortgang, oefeningen (typen, tegels, gat, formulier) en de controle van een tekst.
window.Schrijven = (() => {
  const { el } = App;

  // ---------- voortgang ----------
  const P = Object.assign({ lessen: {}, toets: {}, trainers: {}, open: false }, App.lees('schrijven', {}));
  const bewaar = () => App.schrijf('schrijven', P);
  const gehaald = (id) => { const r = P.lessen[id]; return !!r && r.beste / r.totaal >= 0.8; };
  const isOpen = (lijst, i) => P.open || i === 0 || gehaald(lijst[i - 1].id);
  const naLes = (id) => P.open || !id || gehaald(id);
  async function json(pad) {
    const r = await fetch(pad, { cache: 'no-cache' });
    if (!r.ok) throw new Error(pad + ' niet gevonden');
    return r.json();
  }

  const strak = (s) => s.trim().replace(/\s+/g, ' ').replace(/[’‘]/g, "'");
  const los = (s) => App.kaal(strak(s)).replace(/[.,!?;:]/g, '');
  const MAANDEN = 'januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december';

  // één regel typen en vergelijken. geeft { invoer, kijk() -> 'goed' | 'bijna' | 'fout' }
  function vergelijk(invoer, goed) {
    const a = strak(invoer), b = strak(goed);
    if (a === b) return 'goed';
    return los(a) === los(b) ? 'bijna' : 'fout';
  }

  // ---------- oefening: typ de zin (overschrijven, uit het hoofd, of verbeteren) ----------
  // o = { toon, goed?, geheugen?, vraag? }   klaar(eersteKeerGoed)
  function typ(doel, o, klaar) {
    const goed = o.goed || o.toon;
    let pogingen = 0;
    const voorbeeld = el('div', { class: 'voorbeeld' }, App.woorden(o.toon));
    const invoer = el('input', { class: 'regel', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
    const uit = el('div');
    const knop = el('button', { class: 'knop', en: 'check', onclick: kijk }, 'Controleer');
    const kijkKnop = el('button', { class: 'knop licht', en: 'look again', hidden: !o.geheugen, onclick: () => { voorbeeld.classList.remove('dicht'); invoer.value = ''; setTimeout(() => voorbeeld.classList.add('dicht'), 3000); } }, 'Nog een keer kijken');
    doel.append(
      el('p', { class: 'zacht', en: o.vraag ? '' : (o.geheugen ? 'Read the sentence. It disappears when you start typing. Type it from memory.' : 'Copy the sentence exactly: capital letter and full stop.') },
        o.vraag || (o.geheugen ? 'Lees de zin. De zin gaat weg als u begint. Typ de zin uit het hoofd.' : 'Schrijf de zin precies over. Let op de hoofdletter en de punt.')),
      voorbeeld, invoer, el('div', { class: 'knoppen' }, knop, kijkKnop), uit);
    if (o.geheugen) invoer.addEventListener('focus', () => voorbeeld.classList.add('dicht'));
    invoer.addEventListener('keydown', (e) => { if (e.key === 'Enter') kijk(); });
    function kijk() {
      if (invoer.disabled) return;
      pogingen++;
      const r = vergelijk(invoer.value, goed);
      uit.textContent = '';
      invoer.classList.toggle('goed', r === 'goed');
      invoer.classList.toggle('fout', r !== 'goed');
      if (r === 'goed') {
        invoer.disabled = true; knop.remove(); kijkKnop.remove(); voorbeeld.classList.remove('dicht');
        if (goed !== o.toon) { voorbeeld.textContent = goed; }
        uit.append(el('p', { class: 'uitslag goed' }, '✔ Goed!'));
        klaar(pogingen === 1);
      } else {
        uit.append(el('p', { class: 'uitslag fout', en: r === 'bijna' ? 'Almost. Check the capital letter, the full stop or the question mark.' : 'Not right yet. Look at the sentence and try again.' },
          r === 'bijna' ? '✘ Bijna goed. Kijk naar de hoofdletter, de punt of het vraagteken.' : '✘ Nog niet goed. Kijk naar de zin en probeer het nog een keer.'));
        if (pogingen >= 3) { voorbeeld.classList.remove('dicht'); voorbeeld.textContent = goed; }
      }
    }
  }

  // ---------- oefening: bouw de zin met tegels ----------
  // zin = "Morgen werk ik niet."   klaar(eersteKeerGoed)
  function tegels(doel, zin, klaar, uitleg) {
    const woorden = strak(zin).split(' ');
    let volgorde = App.schud(woorden.map((_, i) => i));
    if (woorden.length > 1 && volgorde.every((v, i) => v === i)) volgorde.reverse();
    const gekozen = [];
    let pogingen = 0, af = false;
    const boven = el('div', { class: 'tegelrij antwoord' });
    const onder = el('div', { class: 'tegelrij' });
    const uit = el('div');
    const knop = el('button', { class: 'knop', en: 'check', onclick: kijk }, 'Controleer');
    const bron = volgorde.map((nr) => { const k = el('button', { class: 'woordtegel', type: 'button' }, woorden[nr]); k.addEventListener('click', () => { if (af) return; gekozen.push(nr); teken(); }); onder.append(k); return k; });
    function teken() {
      boven.textContent = '';
      gekozen.forEach((nr, plek) => { const k = el('button', { class: 'woordtegel', type: 'button' }, woorden[nr]); k.addEventListener('click', () => { if (af) return; gekozen.splice(plek, 1); teken(); }); boven.append(k); });
      bron.forEach((k, i) => k.classList.toggle('weg', gekozen.includes(volgorde[i])));
    }
    function kijk() {
      if (af) return;
      pogingen++;
      const goed = gekozen.map((nr) => woorden[nr]).join(' ') === woorden.join(' ');
      uit.textContent = '';
      if (goed) {
        af = true; knop.remove();
        uit.append(el('p', { class: 'uitslag goed' }, '✔ Goed!'));
        klaar(pogingen === 1);
      } else {
        uit.append(el('p', { class: 'uitslag fout', en: 'Not right yet. Click a word in your sentence to take it away.' }, '✘ Nog niet goed. Klik op een woord in uw zin: dan gaat het weg.'));
        if (pogingen >= 3) uit.append(el('p', { class: 'zacht' }, 'De goede zin: ', el('b', {}, woorden.join(' '))));
      }
    }
    doel.append(el('p', { class: 'zacht', en: 'Put the words in the right order. Click the words.' }, uitleg || 'Zet de woorden in de goede volgorde. Klik op de woorden.'), boven, onder, el('div', { class: 'knoppen' }, knop), uit);
  }

  // ---------- oefening: kies het woord in het gat ----------
  // o = { zin: "Ik heb {geen} auto.", opties: ["geen","niet"] }
  function gat(doel, o, klaar) {
    const [voor, woord, na] = o.zin.split(/[{}]/);
    let eerste = true;
    const plek = el('span', { class: 'gatwoord' }, ' ___ ');
    const uit = el('div');
    const knoppen = App.schud(o.opties).map((x) => el('button', { class: 'knop licht', type: 'button', onclick: () => {
      if (x === woord) { plek.textContent = woord; knoppen.forEach((k) => { k.disabled = true; }); uit.textContent = ''; uit.append(el('p', { class: 'uitslag goed' }, '✔ Goed!')); klaar(eerste); }
      else { eerste = false; uit.textContent = ''; uit.append(el('p', { class: 'uitslag fout' }, '✘ Niet goed. Kies een ander woord.')); }
    } }, x));
    doel.append(el('p', { class: 'zacht', en: 'Choose the right word.' }, 'Kies het goede woord.'),
      el('div', { class: 'voorbeeld' }, App.woorden(voor), plek, App.woorden(na)), el('div', { class: 'knoppen' }, knoppen), uit);
  }

  // ---------- formulier ----------
  const VELD = {
    voornaam: [/^[A-ZÀ-Ý][\wÀ-ÿ'-]+$/, 'Schrijf alleen uw voornaam, met een hoofdletter.'],
    achternaam: [/^(?:[a-z]+ ){0,2}[A-ZÀ-Ý][\wÀ-ÿ' -]+$/, 'Schrijf uw achternaam, met een hoofdletter.'],
    naam: [/^[A-ZÀ-Ý][\wÀ-ÿ'-]+ .*[A-ZÀ-Ý][\wÀ-ÿ'-]+$/, 'Schrijf uw voornaam en uw achternaam, met hoofdletters.'],
    adres: [/^[A-ZÀ-Ý0-9][^\d]*\D \d+ ?[A-Za-z]{0,3}$/, 'Schrijf de straat en het huisnummer, bijvoorbeeld: Parkstraat 12.'],
    postcode: [/^\d{4} ?[A-Za-z]{2}$/, 'Een postcode heeft vier cijfers en twee letters: 1234 AB.'],
    woonplaats: [/^[A-ZÀ-Ý'][\wÀ-ÿ' -]+$/, 'Schrijf de naam van uw stad of dorp, met een hoofdletter.'],
    telefoon: [/^(?:\+31|0)[\d -]{8,13}$/, 'Schrijf het nummer met cijfers: 06 12345678.'],
    email: [/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i, 'Een e-mailadres heeft @ en een punt: naam@mail.nl.'],
    datum: [new RegExp(`^(?:\\d{1,2}[-/. ]\\d{1,2}[-/. ]\\d{2,4}|\\d{1,2} (?:${MAANDEN}) \\d{4})$`, 'i'), 'Schrijf dag, maand en jaar: 14-03-1990 of 14 maart 1990.'],
  };
  VELD.geboortedatum = VELD.datum;
  const zinOk = (s) => /^[A-ZÀ-Ý0-9]/.test(s.trim()) && /[.!?]$/.test(s.trim()) && s.trim().split(/\s+/).length >= 3;

  // f = { kop, velden: [{ label, soort, opties?, val? }] }   klaar(alles goed bij de eerste keer)
  function formulier(doel, f, klaar, eigen) {
    let pogingen = 0;
    const rijen = f.velden.map((v) => {
      const hint = el('div', { class: 'hint' });
      let lees, vak;
      if (v.soort === 'keuze') {
        const naam = 'k' + Math.random().toString(36).slice(2);
        vak = el('div', {}, v.opties.map((o) => el('label', { style: 'display:block' }, el('input', { type: 'radio', name: naam, value: o }), ' ', o)));
        lees = () => { const c = vak.querySelector('input:checked'); return c ? c.value : ''; };
      } else {
        vak = el('input', { class: 'regel', autocomplete: 'off', spellcheck: 'false' });
        lees = () => vak.value.trim();
      }
      return { v, hint, lees, vak, rij: el('div', { class: 'veld' }, el('label', {}, App.woorden(v.label)), vak, hint) };
    });
    const uit = el('div');
    const knop = el('button', { class: 'knop', en: 'check', onclick: () => {
      pogingen++;
      let fout = 0;
      rijen.forEach((r) => {
        const w = r.lees();
        let melding = '';
        if (!w) melding = r.v.soort === 'keuze' ? 'Kies één antwoord.' : 'Dit vak is nog leeg.';
        else if (r.v.soort === 'open') { if (!zinOk(w)) melding = 'Schrijf een hele zin, met een hoofdletter en een punt.'; else if (r.v.val && !r.v.val.some((x) => new RegExp(x, 'i').test(w))) melding = 'Geef antwoord op de vraag.'; }
        else if (VELD[r.v.soort] && !VELD[r.v.soort][0].test(w)) melding = VELD[r.v.soort][1];
        else if (eigen && eigen[r.v.soort] && los(eigen[r.v.soort]) !== los(w)) melding = 'Dit is anders dan uw eigen gegevens: ' + eigen[r.v.soort];
        r.hint.textContent = melding;
        if (r.vak.classList) { r.vak.classList.toggle('fout', !!melding && r.v.soort !== 'keuze'); r.vak.classList.toggle('goed', !melding && r.v.soort !== 'keuze'); }
        if (melding) fout++;
      });
      uit.textContent = '';
      if (!fout) { knop.remove(); rijen.forEach((r) => r.rij.querySelectorAll('input').forEach((i) => { i.disabled = true; })); uit.append(el('p', { class: 'uitslag goed' }, '✔ Het formulier is goed ingevuld.')); klaar(pogingen === 1); }
      else uit.append(el('p', { class: 'uitslag fout' }, `✘ ${fout} ${fout === 1 ? 'vak is' : 'vakken zijn'} nog niet goed.`));
    } }, 'Controleer');
    doel.append(el('div', { class: 'taak' }, el('h3', {}, App.woorden(f.kop)), f.situatie ? el('p', {}, App.woorden(f.situatie)) : null,
      f.plaatjes ? el('div', { class: 'plaatjes' }, f.plaatjes.map((p) => el('span', {}, p))) : null, rijen.map((r) => r.rij)), el('div', { class: 'knoppen' }, knop), uit);
  }

  // ---------- een schrijftaak (e-mail, tekst, briefje) ----------
  // t = { soort, kop, situatie, opdracht, punten: [{ p, model, val: [regex] }], aanhef, afsluiting, begin, plaatjes }
  const kleur = (i) => 'k' + ((i % 4) + 1);
  function taakKaart(t, opties) {
    const o = opties || {};
    return el('div', { class: 'taak' },
      el('h3', {}, App.woorden(t.kop)),
      el('p', {}, App.woorden(t.situatie)),
      t.plaatjes ? el('div', { class: 'plaatjes' }, t.plaatjes.map((p) => el('span', {}, p))) : null,
      t.punten[0].p ? el('ul', {}, t.punten.map((p, i) => el('li', {}, o.kleur ? el('span', { class: kleur(i) }, App.woorden(p.p)) : App.woorden(p.p)))) : null,
      el('p', {}, el('b', {}, App.woorden(t.opdracht || 'Schrijf in hele zinnen.'))));
  }
  function modelTekst(t) {
    return [t.aanhef, t.aanhef ? '' : null, t.begin || null, ...t.punten.map((p) => p.model), t.extra || null, t.afsluiting ? '' : null, t.afsluiting, t.afsluiting ? '[uw naam]' : null].filter((x) => x != null).join('\n');
  }
  function modelKaart(t, metKleur) {
    const vak = el('div', { class: 'brief modelvak' });
    if (t.aanhef) vak.append(t.aanhef + '\n\n');
    if (t.begin) vak.append(t.begin + '\n');
    t.punten.forEach((p, i) => { vak.append(metKleur ? el('span', { class: kleur(i) }, p.model) : p.model, '\n'); });
    if (t.extra) vak.append(t.extra + '\n');
    if (t.afsluiting) vak.append('\n' + t.afsluiting + '\n', el('i', {}, '[uw naam]'));
    return vak;
  }

  // de controle zonder computer-intelligentie: vaste regels per punt + hoofdletters, punten, aanhef, afsluiting
  function controleer(tekst, t, opties) {
    const o = opties || {};
    const uit = [];
    let midden = tekst;
    const regels = tekst.split('\n').map((r) => r.trim()).filter(Boolean);
    if (t.aanhef && !o.voorgedrukt) {
      const ok = regels.length > 0 && /^(beste|hallo|hoi|dag|geachte)\b.*,$/i.test(regels[0]);
      uit.push({ naam: 'aanhef (Beste ... , / Hallo ... ,)', ok });
      if (ok) midden = midden.replace(regels[0], '');
    }
    if (t.afsluiting && !o.voorgedrukt) {
      const i = regels.findIndex((r) => /^(met vriendelijke groet|vriendelijke groet|groetjes|groeten|groet)\s*,?$/i.test(r));
      uit.push({ naam: 'afsluiting (Met vriendelijke groet, / Groetjes,)', ok: i >= 0 });
      uit.push({ naam: 'uw naam onder de afsluiting', ok: i >= 0 && i < regels.length - 1 });
      if (i >= 0) midden = regels.slice(regels[0] && /,$/.test(regels[0]) ? 1 : 0, i).join('\n');
    }
    const zinnen = midden.replace(/\n+/g, ' ').match(/[^.!?]+[.!?]*/g) || [];
    const echte = zinnen.map((z) => z.trim()).filter((z) => z.split(/\s+/).length >= 2);
    // elk punt heeft een eigen zin nodig: één zin telt niet voor twee punten
    const past = t.punten.map((p) => echte.map((z) => (p.val || ['\\w+ \\w+ \\w+']).some((x) => new RegExp(x, 'i').test(z))));
    let beste = [];
    (function zoek(i, gebruikt, gevonden) {
      if (gevonden.filter((x) => x >= 0).length > beste.filter((x) => x >= 0).length || !beste.length) beste = gevonden.slice();
      if (i >= t.punten.length) return;
      echte.forEach((_, z) => { if (past[i][z] && !gebruikt.has(z)) { gebruikt.add(z); zoek(i + 1, gebruikt, gevonden.concat(z)); gebruikt.delete(z); } });
      zoek(i + 1, gebruikt, gevonden.concat(-1));
    })(0, new Set(), []);
    t.punten.forEach((p, i) => uit.push({ naam: `punt ${i + 1}: ${p.p || 'een zin over het plaatje'}`, ok: beste[i] >= 0, punt: true }));
    uit.push({ naam: `minimaal ${t.min || t.punten.length} zinnen`, ok: echte.length >= (t.min || t.punten.length) });
    uit.push({ naam: 'elke zin begint met een hoofdletter', ok: echte.length > 0 && echte.every((z) => /^["'‘(]?[A-ZÀ-Ý0-9]/.test(z)) });
    uit.push({ naam: 'elke zin eindigt met een punt of een vraagteken', ok: echte.length > 0 && echte.every((z) => /[.!?]$/.test(z)) });
    return uit;
  }

  // schrijfvak + knop; klaar(goed, aantalOk, aantal)
  function schrijfvak(doel, t, opties, klaar) {
    const o = opties || {};
    let eerste = null;
    const vak = el('textarea', { class: 'schrijfvak', spellcheck: 'false', autocapitalize: 'sentences' });
    if (o.kader && t.aanhef) vak.value = `${t.aanhef}\n\n\n\n${t.afsluiting}\n`;
    if (o.bewaard) vak.value = o.bewaard;
    const lijst = el('ul', { class: 'controle' });
    const na = el('div');
    const knop = el('button', { class: 'knop', en: 'check', onclick: () => {
      const r = controleer(vak.value, t, o);
      const ok = r.filter((x) => x.ok).length;
      const punten = r.filter((x) => x.punt);
      const goed = punten.every((x) => x.ok) && ok >= r.length - 1;
      if (eerste == null) eerste = goed;
      lijst.textContent = '';
      r.forEach((x) => lijst.append(el('li', { class: x.ok ? 'ok' : 'nee' }, (x.ok ? '✔ ' : '✘ ') + x.naam)));
      na.textContent = '';
      na.append(el('p', { class: 'uitslag ' + (goed ? 'goed' : 'fout'), en: goed ? 'All points are there.' : 'Look at the red lines, change your text and check again.' }, goed ? '✔ Alle punten staan erin.' : 'Kijk naar de rode regels. Verander uw tekst en controleer opnieuw.'),
        el('p', { class: 'zacht klein', en: 'The computer only checks fixed rules. It does not see every mistake.' }, 'De computer kijkt alleen naar vaste regels. De computer ziet niet alle fouten.'));
      if (klaar) klaar(goed, eerste, vak.value);
    } }, 'Controleer');
    if (o.opInvoer) vak.addEventListener('input', () => o.opInvoer(vak.value));
    doel.append(vak, el('div', { class: 'knoppen' }, knop), lijst, na);
    return vak;
  }

  const VINKEN = [['alle punten staan erin', 'all bullet points are answered'], ['aanhef (als het een e-mail of een briefje is)', 'greeting'], ['afsluiting en mijn naam', 'closing and my name'], ['hele zinnen: wie + werkwoord + rest', 'whole sentences'], ['hoofdletter en punt bij elke zin', 'capital and full stop']];
  function vinklijst(opVerandering) {
    const d = el('div', { class: 'vinklijst' }, VINKEN.map(([nl, en]) => el('label', { en }, el('input', { type: 'checkbox' }), ' ', nl)));
    d.addEventListener('change', () => opVerandering && opVerandering(d.querySelectorAll('input:checked').length, VINKEN.length));
    return d;
  }

  return { P, bewaar, gehaald, isOpen, naLes, json, typ, tegels, gat, formulier, taakKaart, modelKaart, modelTekst, controleer, schrijfvak, vinklijst, kleur, VELD, los };
})();
