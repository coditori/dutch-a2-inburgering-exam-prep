// Eén sjabloon voor alle lessen: les.html?les=L01 laadt lessons/L01.json
// Stappen: Woorden -> (Lees + Vraag per tekst) -> Onthoud -> Klaar
(async () => {
  const { el } = App;
  const id = new URLSearchParams(location.search).get('les') || 'L01';
  const pagina = document.getElementById('pagina');
  let les, index;
  try {
    [les, index] = await Promise.all([Lezen.json(`lessons/${id}.json`), Lezen.json('lessons/index.json')]);
  } catch (e) {
    pagina.textContent = 'Deze les bestaat niet: ' + id;
    return;
  }
  document.title = `Lezen: ${les.id} ${les.titel}`;
  App.kop(`${les.id}: ${les.titel}`, 'index.html');

  const nieuw = new Set(les.woorden.map((w) => App.lemmaNr(w.nl)).filter((n) => n >= 0));
  const vragen = les.teksten.flatMap((t, ti) => t.vragen.map((v, vi) => ({ ti, vi, v })));
  const stappen = [{ soort: 'woorden' }, ...les.teksten.map((_, ti) => ({ soort: 'tekst', ti })), { soort: 'onthoud' }, { soort: 'klaar' }];

  // waar was ik? (blijft bewaard als de pagina opnieuw laadt)
  let stand = App.lees('lezen-bezig', null);
  if (!stand || stand.les !== id) stand = { les: id, stap: 0, antwoorden: [], start: Date.now() };
  const bewaar = () => App.schrijf('lezen-bezig', stand);

  // de balk is klikbaar: terug naar elke stap waar u al was (stand.max)
  // Een stap met een foute vraag is rood: een klik brengt u terug, en met "Probeer opnieuw" maakt u de vraag nog een keer.
  const foutInTekst = (ti) => vragen.some((q, nr) => q.ti === ti && stand.antwoorden[nr] != null && stand.antwoorden[nr] !== 0);
  const ga = (i) => { stand.stap = i; bewaar(); toon(); };
  const balk = () => App.balk({ n: stappen.length, nu: stand.stap, max: stand.max, ga, staat: (i) => (stappen[i].soort === 'tekst' && foutInTekst(stappen[i].ti) ? 'fout' : null) });
  const naarUitslag = () => ga(stappen.length - 1);
  function verder() { stand.stap++; bewaar(); toon(); }
  const knopVerder = (tekst, en) => el('button', { class: 'knop', en: en || 'next', onclick: verder }, tekst || 'Verder');

  // ---------- stap 1: woorden ----------
  function toonWoorden() {
    const kaarten = les.woorden.map((w) => {
      SRS.voegToe('w:' + w.nl, { soort: 'w', nl: w.nl, en: w.en, beeld: w.beeld || '' });
      const zin = el('div', { class: 'zin', hidden: true }, App.woorden(w.zin, nieuw));
      const en = el('div', { class: 'en', hidden: true, hulp: w.en });
      const kaart = el('div', { class: 'wkaart' },
        el('div', { class: 'beeld' }, w.beeld || '💬'),
        el('div', { class: 'nl' }, w.nl),
        zin, en,
        el('div', { class: 'knoppen', style: 'justify-content:center' },
          el('button', { class: 'rond', title: 'luister', onclick: (e) => { e.stopPropagation(); Spraak.zeg(zin.hidden ? w.nl : w.zin); } }, App.teken('luid')),
          el('button', { class: 'rond', title: 'vertaling', 'aria-label': 'vertaling', onclick: (e) => { e.stopPropagation(); en.hidden = !en.hidden; } }, App.teken('vertaal')), App.bewaarKnop(w.nl)));
      kaart.addEventListener('click', (e) => { if (e.target.closest('.w')) return; zin.hidden = !zin.hidden; kaart.classList.toggle('om', !zin.hidden); });
      return kaart;
    });
    pagina.append(
      el('h2', { en: 'words' }, '1. Woorden'),
      el('p', { class: 'zacht', en: 'Click a card for a sentence.' }, 'Klik op een kaart: u ziet een zin.'),
      el('div', { class: 'wkaarten' }, kaarten),
      el('div', { class: 'knoppen' }, knopVerder()));
  }

  // ---------- stap 2: lees + vraag ----------
  function toonTekst(ti) {
    const t = les.teksten[ti];
    const eigen = vragen.filter((q) => q.ti === ti);
    const eersteNr = vragen.findIndex((q) => q.ti === ti);
    const tekstDoel = el('div');
    const vraagDoel = el('div');
    const onder = el('div');
    const nav = el('div');
    pagina.append(...[
      el('h2', { en: 'read, then answer' }, `2. Lees en kies (${ti + 1} / ${les.teksten.length})`),
      les.trede >= 4 ? el('p', { class: 'zacht klein', en: 'Read the question first. Then the text.' }, 'Lees eerst de vraag. Lees daarna de tekst.') : null,
      tekstDoel, nav, vraagDoel, onder].filter(Boolean)); // append(null) zou het woord "null" tonen
    Lezen.tekst(tekstDoel, t, { nieuw });

    function toonVraag(k) {
      onder.textContent = '';
      if (k >= eigen.length) return stand.geteld ? naarUitslag() : verder(); // de les was al klaar: u verbeterde een vraag, terug naar de uitslag
      const nr = eersteNr + k;
      const v = eigen[k].v;
      const al = stand.antwoorden[nr];
      // bij meer vragen over één tekst: 1 2 3, klik om een vorige vraag terug te zien
      const tekenNav = () => { nav.textContent = ''; if (eigen.length > 1) nav.append(App.vraagKnoppen(eigen.length, k, (i) => { const a = stand.antwoorden[eersteNr + i]; return a == null ? null : a === 0 ? 'goed' : 'fout'; }, toonVraag)); };
      tekenNav();
      const blok = Lezen.vraag(vraagDoel, v, {
        nieuw,
        gekozen: al == null ? undefined : al,
        toonGoed: al != null,
        op: (keuze) => { stand.antwoorden[nr] = keuze; bewaar(); blok.teken(keuze, true); tekenNav(); balk(); na(keuze, true); },
      });
      Lezen.markeer(tekstDoel, null);
      if (al != null) na(al);
      function na(keuze, nieuwAntwoord) {
        Lezen.markeer(tekstDoel, v.b);
        onder.textContent = '';
        const knop = el('button', { class: 'knop', en: 'next', onclick: () => toonVraag(k + 1) }, 'Verder');
        onder.append(...[
          el('p', { class: 'uitslag ' + (keuze === 0 ? 'goed' : 'fout') }, keuze === 0 ? '✔ Goed!' : '✘ Niet goed. Het goede antwoord is groen.'),
          v.b ? el('p', { class: 'zacht klein', en: 'The yellow sentence in the text holds the answer.' }, 'Het antwoord staat in de gele zin.') : null,
          el('div', { class: 'knoppen' }, knop,
            keuze === 0 ? null : App.opnieuwKnop(() => { stand.antwoorden[nr] = null; bewaar(); balk(); toonVraag(k); }))].filter(Boolean));
        if (nieuwAntwoord && keuze === 0) App.goed(knop);
      }
    }
    // eerste vraag van deze tekst die nog niet beantwoord is
    let k = eigen.findIndex((_, i) => stand.antwoorden[eersteNr + i] == null);
    toonVraag(k < 0 ? eigen.length - 1 : k);
  }

  // ---------- stap 3: onthoud ----------
  function toonOnthoud() {
    les.onthoud.forEach((z, i) => SRS.voegToe(`z:${les.id}:${i}`, { soort: 'z', zin: z, les: les.id }));
    pagina.append(
      el('h2', { en: 'remember' }, '3. Onthoud'),
      el('p', { class: 'zacht', en: 'These three sentences come back tomorrow with a gap. Read them aloud once.' }, 'Deze drie zinnen komen morgen terug met een gat. Lees ze één keer hardop.'),
      el('div', { class: 'kaart' }, les.onthoud.map((z) => {
        const [voor, woord, na] = z.split(/[{}]/);
        const hele = voor + woord + na;
        return el('p', {}, App.woorden(voor, nieuw), el('span', { class: 'gatwoord' }, woord), App.woorden(na, nieuw), ' ',
          el('button', { class: 'rond', title: 'luister', onclick: () => Spraak.zeg(hele) }, App.teken('luid')));
      })),
      el('div', { class: 'knoppen' }, knopVerder('Klaar', 'done')));
  }

  // ---------- stap 4: klaar ----------
  function toonKlaar() {
    const goed = vragen.filter((_, i) => stand.antwoorden[i] === 0).length;
    const totaal = vragen.length;
    const oud = Lezen.P.lessen[les.id] || { beste: 0, keer: 0 };
    if (!stand.geteld) {
      Lezen.P.lessen[les.id] = { score: goed, beste: Math.max(oud.beste, goed), totaal, keer: oud.keer + 1, datum: new Date().toISOString().slice(0, 10), sec: Math.round((Date.now() - stand.start) / 1000) };
      Lezen.bewaar();
      stand.geteld = true;
      bewaar();
    } else if (Lezen.P.lessen[les.id] && goed > Lezen.P.lessen[les.id].score) { // een foute vraag verbeterd: de score gaat omhoog, het is geen nieuwe poging
      Object.assign(Lezen.P.lessen[les.id], { score: goed, beste: Math.max(oud.beste, goed) });
      Lezen.bewaar();
    }
    const gehaald = goed / totaal >= 0.8;
    const fout = les.teksten.map((_, ti) => ti).filter(foutInTekst).map((ti) => ({ naam: `Tekst ${ti + 1}`, ga: () => ga(ti + 1) }));
    const plek = index.findIndex((l) => l.id === les.id);
    const volgende = index[plek + 1];
    const opnieuw = el('button', { class: 'knop licht', en: 'again', onclick: () => { App.schrijf('lezen-bezig', null); location.reload(); } }, 'Nog een keer');
    pagina.append(
      el('div', { class: 'kaart midden' },
        el('div', { class: 'groot' }, `${goed} / ${totaal}`),
        el('p', { class: 'uitslag ' + (gehaald ? 'goed' : 'fout'), en: gehaald ? 'Passed. The next lesson is open.' : 'You need 80%. Do the lesson again.' },
          gehaald ? '✔ Gehaald. De volgende les is open.' : fout.length ? 'U hebt 80% nodig. Verbeter de foute vragen, of doe de les nog een keer.' : 'U hebt 80% nodig. Doe de les nog een keer.'),
        App.foutKnoppen(fout),
        les.trede >= 4 ? el('p', { class: 'zacht klein' }, `Tijd: ${Math.floor(Lezen.P.lessen[les.id].sec / 60)} min ${Lezen.P.lessen[les.id].sec % 60} s`) : null,
        el('p', { class: 'zacht klein', en: 'Tomorrow: review the words and sentences.' }, 'Morgen: herhaal de woorden en de zinnen.'),
        el('div', { class: 'knoppen', style: 'justify-content:center' },
          gehaald && volgende ? el('a', { class: 'knop', href: `les.html?les=${volgende.id}`, en: 'next lesson', onclick: () => App.schrijf('lezen-bezig', null) }, `Volgende les: ${volgende.id}`) : null,
          opnieuw,
          el('a', { class: 'knop licht', href: 'index.html', en: 'overview', onclick: () => App.schrijf('lezen-bezig', null) }, 'Overzicht'))));
  }

  function toon() {
    App.sluitPop();
    pagina.textContent = '';
    stand.stap = Math.max(0, Math.min(stand.stap, stappen.length - 1));
    stand.max = Math.max(stand.max || 0, stand.stap, App.vrijTot(Lezen.P.lessen[les.id], stappen.length)); // een les die u al haalde is helemaal open
    balk();
    const s = stappen[stand.stap];
    if (s.soort === 'woorden') toonWoorden();
    else if (s.soort === 'tekst') toonTekst(s.ti);
    else if (s.soort === 'onthoud') toonOnthoud();
    else toonKlaar();
    window.scrollTo(0, 0);
  }
  toon();
})();
