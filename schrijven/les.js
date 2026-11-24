// Eén sjabloon voor alle lessen: les.html?les=S01 laadt lessons/S01.json
// Een les = woorden + een rij oefeningen. Soorten: typ, tegels, gat, formulier, opdracht (voorbeeld, bouw, schrijf, papier), set.
(async () => {
  const { el } = App;
  const id = new URLSearchParams(location.search).get('les') || 'S01';
  const pagina = document.getElementById('pagina');
  let les, index;
  try { [les, index] = await Promise.all([Schrijven.json(`lessons/${id}.json`), Schrijven.json('lessons/index.json')]); }
  catch (e) { pagina.textContent = 'Deze les bestaat niet: ' + id; return; }
  document.title = `Schrijven: ${les.id} ${les.titel}`;
  App.kop(`${les.id}: ${les.titel}`, 'index.html');
  const nieuw = new Set((les.woorden || []).map((w) => App.lemmaNr(w.nl)).filter((n) => n >= 0));

  // stappen maken
  const stappen = [];
  if ((les.woorden || []).length || les.uitleg) stappen.push({ soort: 'begin' });
  les.oefeningen.forEach((o, nr) => {
    if (o.soort === 'opdracht') (o.stappen || ['voorbeeld', 'bouw', 'schrijf', 'papier']).forEach((s) => stappen.push({ soort: s, o, nr }));
    else stappen.push({ soort: o.soort, o, nr });
  });
  stappen.push({ soort: 'klaar' });
  const telt = les.oefeningen.map((o, nr) => nr).filter((nr) => les.oefeningen[nr].soort !== 'set');

  let stand = App.lees('schrijven-bezig', null);
  if (!stand || stand.les !== id) stand = { les: id, stap: 0, uitslag: {}, tekst: {}, start: Date.now() };
  const bewaar = () => App.schrijf('schrijven-bezig', stand);
  const verder = () => { stand.stap++; bewaar(); toon(); };

  // de balk is klikbaar: terug naar elke stap waar u al was (stand.max)
  const balk = () => App.balk({ n: stappen.length, nu: stand.stap, max: stand.max, ga: (i) => { App.sprong(stand, i); stand.stap = i; bewaar(); toon(); } });
  const knopVerder = (uit) => el('div', { class: 'knoppen' }, el('button', { class: 'knop', en: 'next', disabled: !!uit, onclick: verder }, 'Verder'));
  function metVerder(nr) {
    const rij = knopVerder(stand.uitslag[nr] == null);
    return { rij, af: (goed) => { if (stand.uitslag[nr] == null) { stand.uitslag[nr] = !!goed; bewaar(); } rij.firstChild.disabled = false; } };
  }
  const kopje = (s) => pagina.append(el('p', { class: 'zacht klein' }, `Oefening ${s.nr + 1} van ${les.oefeningen.length}`));

  function toonBegin() {
    if (les.uitleg) pagina.append(el('div', { class: 'kaart' }, el('h3', { en: 'the rule' }, 'De regel'), les.uitleg.map((u) => el('p', { en: u.en || '' }, App.woorden(u.nl, nieuw)))));
    if ((les.woorden || []).length) {
      pagina.append(el('h2', { en: 'new words' }, 'Nieuwe woorden'),
        el('p', { class: 'zacht', en: 'Click a card for a sentence.' }, 'Klik op een kaart: u ziet een zin.'),
        el('div', { class: 'wkaarten' }, les.woorden.map((w) => {
          SRS.voegToe('w:' + w.nl, { soort: 'w', nl: w.nl, en: w.en, beeld: w.beeld || '' });
          const zin = el('div', { class: 'zin', hidden: true }, App.woorden(w.zin || '', nieuw));
          const en = el('div', { class: 'en', hidden: true, hulp: w.en });
          const kaart = el('div', { class: 'wkaart' }, el('div', { class: 'beeld' }, w.beeld || '✏️'), el('div', { class: 'nl' }, w.nl), zin, en,
            el('div', { class: 'knoppen', style: 'justify-content:center' },
              el('button', { class: 'rond', title: 'luister', onclick: (e) => { e.stopPropagation(); Spraak.zeg(w.nl); } }, App.teken('luid')),
              el('button', { class: 'rond', title: 'vertaling', 'aria-label': 'vertaling', onclick: (e) => { e.stopPropagation(); en.hidden = !en.hidden; } }, App.teken('vertaal')), App.bewaarKnop(w.nl)));
          kaart.addEventListener('click', (e) => { if (e.target.closest('.w')) return; zin.hidden = !zin.hidden; kaart.classList.toggle('om', !zin.hidden); });
          return kaart;
        })));
    }
    pagina.append(knopVerder(false));
  }

  function toonOefening(s) {
    kopje(s);
    const o = s.o;
    const m = metVerder(s.nr);
    const rij = m.rij;
    const af = (goed) => { m.af(goed); if (goed) App.goed(rij.firstChild); }; // goed: melding en vanzelf verder
    const vak = el('div');
    pagina.append(vak);
    if (o.uitleg) vak.append(el('p', { en: o.en || '' }, el('b', {}, App.woorden(o.uitleg, nieuw))));
    if (s.soort === 'typ') Schrijven.typ(vak, o, af);
    else if (s.soort === 'gat') {
      Schrijven.gat(vak, o, (g1) => {
        if (o.typ === false) return af(g1);
        const tweede = el('div', { style: 'margin-top:18px' });
        vak.append(tweede);
        Schrijven.typ(tweede, { toon: o.zin.replace(/[{}]/g, ''), vraag: 'Typ nu de hele zin.' }, (g2) => af(g1 && g2));
      });
    } else if (s.soort === 'tegels') {
      Schrijven.tegels(vak, o.zin, (g1) => {
        if (o.typ === false) return af(g1);
        const tweede = el('div', { style: 'margin-top:18px' });
        vak.append(tweede);
        Schrijven.typ(tweede, { toon: o.zin, geheugen: true }, (g2) => af(g1 && g2));
      });
    } else if (s.soort === 'formulier') Schrijven.formulier(vak, o, af);
    pagina.append(rij);
  }

  function toonVoorbeeld(s) {
    kopje(s);
    const t = s.o.taak;
    pagina.append(el('h2', { en: 'example: task and model answer' }, 'Voorbeeld'),
      el('p', { class: 'zacht', en: 'Each point in the task has the same colour as its sentence in the answer.' }, 'Elk punt van de opdracht heeft dezelfde kleur als de zin in het antwoord.'),
      Schrijven.taakKaart(t, { kleur: true }), Schrijven.modelKaart(t, true), knopVerder(false));
  }
  function toonBouw(s) {
    kopje(s);
    const t = s.o.taak;
    pagina.append(el('h2', { en: 'build the sentences of the model answer' }, 'Bouw'), Schrijven.taakKaart(t, { kleur: true }));
    const vak = el('div');
    const rij = knopVerder(true);
    pagina.append(vak, rij);
    let k = 0;
    const volgende = () => {
      vak.textContent = '';
      if (k >= t.punten.length) { vak.append(el('p', { class: 'uitslag goed' }, '✔ Alle zinnen zijn klaar.')); rij.firstChild.disabled = false; return; }
      vak.append(el('p', {}, el('span', { class: Schrijven.kleur(k) }, t.punten[k].p || `Zin ${k + 1}`)));
      const d = el('div'); vak.append(d);
      Schrijven.tegels(d, t.punten[k].model, () => { k++; setTimeout(volgende, 700); });
    };
    volgende();
  }
  function toonSchrijf(s) {
    kopje(s);
    const t = s.o.taak;
    const { rij, af } = metVerder(s.nr);
    const model = el('div', { hidden: true }, el('p', { class: 'zacht', en: 'A model answer. Yours may be different.' }, 'Een voorbeeld. Uw antwoord mag anders zijn.'), Schrijven.modelKaart(t, true));
    pagina.append(el('h2', { en: 'now write your own answer' }, 'Schrijf'), Schrijven.taakKaart(t, { kleur: true }));
    const vak = el('div');
    pagina.append(vak);
    Schrijven.schrijfvak(vak, t, { kader: s.o.kader, bewaard: stand.tekst[s.nr], opInvoer: (v) => { stand.tekst[s.nr] = v; bewaar(); } }, (goed) => { if (goed) { af(true); model.hidden = false; } }); // verbeteren mag: de oefening telt als goed als de controle goed is zonder het voorbeeld
    pagina.append(el('div', { class: 'knoppen' }, el('button', { class: 'knop licht', en: 'show the model answer (this exercise then counts as not right)', onclick: () => { model.hidden = false; af(false); } }, 'Toon het voorbeeld')), model, rij);
  }
  function toonPapier(s) {
    kopje(s);
    const t = s.o.taak;
    pagina.append(...[el('h2', { en: 'the exam is on paper: write it by hand' }, 'Papier'),
      el('p', { en: 'Take pen and paper. Write your answer again by hand. Then tick the list.' }, 'Pak een pen en papier. Schrijf uw antwoord nog een keer met de hand. Kijk daarna naar de lijst.'),
      Schrijven.taakKaart(t), stand.tekst[s.nr] ? el('div', { class: 'brief' }, stand.tekst[s.nr]) : null, Schrijven.vinklijst(),
      el('details', { class: 'kaart' }, el('summary', { en: 'optional: real feedback from an AI chatbot' }, 'Wilt u echte feedback?'),
        el('p', { class: 'klein', en: 'Copy this line and your text into Claude or ChatGPT.' }, 'Kopieer deze regel en uw tekst naar Claude of ChatGPT:'),
        el('p', { class: 'klein' }, el('code', {}, 'Corrigeer deze tekst op A2-niveau. Leg elke fout kort uit in simpel Nederlands.'))),
      knopVerder(false)].filter(Boolean)); // append(null) zou het woord "null" tonen
  }
  function toonSet(s) {
    const r = (Schrijven.P.toets[s.o.goed] || []).slice(-1)[0];
    pagina.append(el('div', { class: 'kaart' },
      el('h3', {}, App.woorden(s.o.uitleg)),
      el('p', { en: 'Four tasks, 40 minutes, with pen and paper. Like the real exam.' }, 'Vier opdrachten, 40 minuten, met pen en papier. Net als het echte examen.'),
      r ? el('p', { class: 'uitslag goed' }, `✔ Gedaan op ${r.datum}: ${r.score} van ${r.totaal} punten van de lijst.`) : null,
      el('div', { class: 'knoppen' }, el('a', { class: 'knop', href: `toets/toets.html?t=${s.o.goed}&les=${les.id}` }, `Naar ${s.o.goed === 'A' ? 'set A' : 'set ' + s.o.goed}`), el('a', { class: 'knop licht', href: 'index.html' }, 'Overzicht'))));
  }

  function toonKlaar() {
    const goed = telt.filter((nr) => stand.uitslag[nr]).length;
    const totaal = telt.length;
    const oud = Schrijven.P.lessen[les.id] || { beste: 0, keer: 0 };
    // rondgekeken in een les die al gehaald is (stappen overgeslagen in de balk): geen nieuwe score
    if (App.bladert(stand, oud)) {
      const volgende = index[index.findIndex((l) => l.id === les.id) + 1], weg = () => App.schrijf('schrijven-bezig', null);
      return pagina.append(App.alGehaald(oud, [
      volgende ? el('a', { class: 'knop', href: `les.html?les=${volgende.id}`, en: 'next lesson', onclick: weg }, `Volgende les: ${volgende.id}`) : null,
      el('button', { class: 'knop licht', en: 'do the lesson again', onclick: () => { weg(); location.reload(); } }, 'Doe de les opnieuw'),
      el('a', { class: 'knop licht', href: 'index.html', en: 'overview', onclick: weg }, 'Overzicht')]));
    }
    if (!stand.geteld) {
      Schrijven.P.lessen[les.id] = { score: goed, beste: Math.max(oud.beste, goed), totaal, keer: oud.keer + 1, datum: new Date().toISOString().slice(0, 10) };
      Schrijven.bewaar(); stand.geteld = true; bewaar();
    }
    const ok = goed / totaal >= 0.8;
    const volgende = index[index.findIndex((l) => l.id === les.id) + 1];
    const weg = () => App.schrijf('schrijven-bezig', null);
    pagina.append(el('div', { class: 'kaart midden' },
      el('div', { class: 'groot' }, `${goed} / ${totaal}`),
      el('p', { class: 'zacht klein', en: 'Typing and tiles count when right the first time. A writing task counts when the check is all green without looking at the model.' }, 'Typen en tegels tellen als ze de eerste keer goed zijn. Een schrijfopdracht telt als de controle goed is zonder het voorbeeld.'),
      el('p', { class: 'uitslag ' + (ok ? 'goed' : 'fout'), en: ok ? 'Passed. The next lesson is open.' : 'You need 80%. Do the lesson again.' }, ok ? '✔ Gehaald. De volgende les is open.' : 'U hebt 80% nodig. Doe de les nog een keer.'),
      App.lesVoortgang('schrijven', index.length, ok),
      el('div', { class: 'knoppen', style: 'justify-content:center' },
        ok && volgende ? el('a', { class: 'knop', href: `les.html?les=${volgende.id}`, onclick: weg }, `Volgende les: ${volgende.id}`) : null,
        el('button', { class: 'knop licht', en: 'again', onclick: () => { weg(); location.reload(); } }, 'Nog een keer'),
        el('a', { class: 'knop licht', href: 'index.html', onclick: weg }, 'Overzicht'))));
  }

  function toon() {
    App.sluitPop();
    pagina.textContent = '';
    stand.stap = Math.max(0, Math.min(stand.stap, stappen.length - 1));
    stand.max = Math.max(stand.max || 0, stand.stap, App.vrijTot(Schrijven.P.lessen[les.id], stappen.length)); // een les die u al haalde is helemaal open
    stand.ver = Math.max(stand.ver || 0, stand.stap);
    balk();
    const s = stappen[stand.stap];
    if (s.soort === 'begin') toonBegin();
    else if (s.soort === 'voorbeeld') toonVoorbeeld(s);
    else if (s.soort === 'bouw') toonBouw(s);
    else if (s.soort === 'schrijf') toonSchrijf(s);
    else if (s.soort === 'papier') toonPapier(s);
    else if (s.soort === 'set') toonSet(s);
    else if (s.soort === 'klaar') toonKlaar();
    else toonOefening(s);
    window.scrollTo(0, 0);
  }
  // een les met alleen een set (S23, S24): geen eindscherm, de toets schrijft de uitslag
  if (les.oefeningen.every((o) => o.soort === 'set')) { stappen.pop(); stand.stap = Math.min(stand.stap, stappen.length - 1); }
  toon();
})();
