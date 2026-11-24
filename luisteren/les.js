// Eén sjabloon voor alle lessen: les.html?les=U01 laadt lessons/U01.json
// Stappen: Woorden (als er nieuwe zijn) -> per fragment: Luister + Kies, dan Kijk -> Dictee -> Zeg na -> Klaar
(async () => {
  const { el } = App;
  const id = new URLSearchParams(location.search).get('les') || 'U01';
  const pagina = document.getElementById('pagina');
  let les, index;
  try { [les, index] = await Promise.all([Lezen.json(`lessons/${id}.json`), Lezen.json('lessons/index.json')]); }
  catch (e) { pagina.textContent = 'Deze les bestaat niet: ' + id; return; }
  document.title = `Luisteren: ${les.id} ${les.titel}`;
  App.kop(`${les.id}: ${les.titel}`, 'index.html');

  const woorden = les.woorden || [];
  const nieuw = new Set(woorden.map((w) => App.lemmaNr(w.nl)).filter((n) => n >= 0));
  const items = les.items.map((it) => Object.assign({}, it, { vragen: it.vragen || [{ v: it.v, o: it.o, typ: it.typ }] }));
  const vragen = items.flatMap((it, ii) => it.vragen.map((v) => ({ ii, v })));
  const dictee = les.dictee || [];
  const stappen = [
    ...(woorden.length ? [{ soort: 'woorden' }] : []),
    ...items.map((_, ii) => ({ soort: 'item', ii })),
    ...(dictee.length ? [{ soort: 'dictee' }, { soort: 'zegna' }] : []),
    { soort: 'klaar' }];

  let stand = App.lees('luisteren-bezig', null);
  if (!stand || stand.les !== id) stand = { les: id, stap: 0, antwoorden: [], dictee: [], start: Date.now() };
  const bewaar = () => App.schrijf('luisteren-bezig', stand);
  const verder = () => { Luister.stop(); stand.stap++; bewaar(); toon(); };
  const knopVerder = (tekst, en) => el('button', { class: 'knop', en: en || 'next', onclick: verder }, tekst || 'Verder');
  // de balk is klikbaar: terug naar elke stap waar u al was (stand.max)
  const balk = () => App.balk({ n: stappen.length, nu: stand.stap, max: stand.max, ga: (i) => { Luister.stop(); stand.stap = i; bewaar(); toon(); } });

  // ---------- woorden ----------
  function toonWoorden() {
    const kaarten = woorden.map((w) => {
      SRS.voegToe('w:' + w.nl, { soort: 'w', nl: w.nl, en: w.en, beeld: w.beeld || '' });
      const zin = el('div', { class: 'zin', hidden: true }, App.woorden(w.zin || '', nieuw));
      const en = el('div', { class: 'en', hidden: true, hulp: w.en });
      const kaart = el('div', { class: 'wkaart' },
        el('div', { class: 'beeld' }, w.beeld || '💬'), el('div', { class: 'nl' }, w.nl), zin, en,
        el('div', { class: 'knoppen', style: 'justify-content:center' },
          el('button', { class: 'rond', title: 'luister', onclick: (e) => { e.stopPropagation(); Luister.speel([{ s: 'A', t: zin.hidden ? w.nl : w.zin }]); } }, App.teken('luid')),
          el('button', { class: 'rond', title: 'vertaling', 'aria-label': 'vertaling', onclick: (e) => { e.stopPropagation(); en.hidden = !en.hidden; } }, App.teken('vertaal')), App.bewaarKnop(w.nl)));
      kaart.addEventListener('click', (e) => { if (e.target.closest('.w')) return; zin.hidden = !zin.hidden; kaart.classList.toggle('om', !zin.hidden); });
      return kaart;
    });
    pagina.append(el('h2', { en: 'words' }, 'Woorden'),
      el('p', { class: 'zacht', en: 'Listen to every word first. Click a card for a sentence.' }, 'Luister eerst naar elk woord. Klik op een kaart: u ziet een zin.'),
      el('div', { class: 'wkaarten' }, kaarten), el('div', { class: 'knoppen' }, knopVerder()));
  }

  // ---------- luister + kies, daarna kijk ----------
  function toonItem(ii) {
    const it = items[ii];
    const eersteNr = vragen.findIndex((q) => q.ii === ii);
    const nav = el('div'), vraagDoel = el('div'), onder = el('div'), kijk = el('div');
    pagina.append(...[
      el('h2', { en: 'listen, then choose' }, `Luister en kies (${ii + 1} / ${items.length})`),
      les.trede >= 3 ? el('p', { class: 'zacht klein', en: 'Read the question first. Then listen.' }, 'Lees eerst de vraag. Luister daarna.') : null,
      it.context ? el('p', { class: 'context' }, App.woorden(it.context, nieuw)) : null,
      Luister.speler(it.regels), nav, vraagDoel, onder, kijk].filter(Boolean));

    function toonKijk() {
      const tr = Luister.transcript(it.regels, nieuw);
      kijk.textContent = '';
      kijk.append(el('h3', { style: 'margin-top:18px', en: 'look: the text' }, 'Kijk: de tekst'),
        el('p', { class: 'zacht klein', en: 'Play again and read along. Click a word for help.' }, 'Luister nog een keer en lees mee. Klik op een woord voor hulp.'),
        Luister.speler(it.regels, { opRegel: tr.opRegel, opTijd: tr.opTijd }), tr.vak,
        el('div', { class: 'knoppen' }, knopVerder()));
    }
    function toonVraag(k) {
      onder.textContent = '';
      if (k >= it.vragen.length) return toonKijk(); // de laatste vraag blijft staan boven de tekst
      kijk.textContent = '';
      const nr = eersteNr + k, v = it.vragen[k], al = stand.antwoorden[nr];
      // bij meer vragen over één fragment: 1 2 3, klik om een vorige vraag terug te zien
      const tekenNav = () => { nav.textContent = ''; if (it.vragen.length > 1) nav.append(App.vraagKnoppen(it.vragen.length, k, (i) => { const a = stand.antwoorden[eersteNr + i]; return a == null ? null : a === 0 ? 'goed' : 'fout'; }, toonVraag)); };
      tekenNav();
      const na = (goed, nieuwAntwoord) => {
        const laatste = k === it.vragen.length - 1;
        tekenNav();
        onder.textContent = '';
        onder.append(el('p', { class: 'uitslag ' + (goed ? 'goed' : 'fout') }, goed ? '✔ Goed!' : '✘ Niet goed. ' + (v.typ ? 'Het goede antwoord: ' + v.typ : 'Het goede antwoord is groen.')));
        if (!nieuwAntwoord && laatste) return toonKijk(); // terugkijken: de tekst staat er meteen onder
        const knop = el('button', { class: 'knop', en: 'next', onclick: () => toonVraag(k + 1) }, 'Verder');
        onder.append(el('div', { class: 'knoppen' }, knop));
        if (nieuwAntwoord && goed) App.goed(knop);
      };
      if (v.typ) { // typ wat u hoort (een getal, een tijd)
        const invoer = el('input', { class: 'typ', autocomplete: 'off', inputmode: 'text' });
        const klaar = () => { if (invoer.disabled) return; invoer.disabled = true; const goed = schoon(invoer.value) === schoon(v.typ); stand.antwoorden[nr] = goed ? 0 : 1; bewaar(); na(goed, true); };
        invoer.addEventListener('keydown', (e) => { if (e.key === 'Enter') klaar(); });
        vraagDoel.textContent = '';
        vraagDoel.append(el('div', { class: 'vraag' }, el('p', { class: 'v', en: v.en || 'Type the number you hear (digits).' }, v.v || 'Typ het getal dat u hoort (in cijfers).'), invoer, ' ',
          el('button', { class: 'knop', en: 'check', onclick: klaar }, 'Controleer')));
        if (al != null) { invoer.value = al === 0 ? v.typ : ''; invoer.disabled = true; na(al === 0); } else invoer.focus();
        return;
      }
      const blok = Lezen.vraag(vraagDoel, v, { nieuw, gekozen: al == null ? undefined : al, toonGoed: al != null,
        op: (keuze) => { stand.antwoorden[nr] = keuze; bewaar(); blok.teken(keuze, true); na(keuze === 0, true); } });
      if (al != null) na(al === 0);
    }
    const schoon = (s) => String(s).toLowerCase().replace(/[\s€-]/g, '').replace(/,/g, '.').replace(/^0+(?=\d)/, '').replace(/[:.]/g, '.').replace(/uur$/, '');
    const open = it.vragen.findIndex((_, i) => stand.antwoorden[eersteNr + i] == null);
    toonVraag(open < 0 ? it.vragen.length - 1 : open);
    if (open >= 0) Luister.speel(it.regels).catch(() => {}); // begint meteen (kan door de browser geblokkeerd zijn: dan ▶)
  }

  // ---------- dictee ----------
  function toonDictee() {
    pagina.append(el('h2', { en: 'dictation' }, 'Dictee'),
      el('p', { class: 'zacht', en: 'Listen and type what you hear. Capital letters and full stops do not count.' }, 'Luister en typ wat u hoort. Hoofdletters en punten tellen niet.'));
    dictee.forEach((zin, i) => {
      const regels = [{ s: 'A', t: zin }];
      const invoer = el('input', { class: 'dictee', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
      const uit = el('div');
      const toonUitslag = (r) => { uit.textContent = ''; uit.append(el('p', {}, r.woorden.flatMap((x) => [el('span', { class: 'dw ' + (x.goed ? 'goed' : 'fout') }, x.w), ' ']), el('b', {}, ` ${r.procent}%`))); };
      const controleer = () => { const r = Luister.vergelijk(zin, invoer.value); invoer.disabled = true; stand.dictee[i] = { tekst: invoer.value, procent: r.procent }; bewaar(); toonUitslag(r); };
      invoer.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !invoer.disabled) controleer(); });
      pagina.append(el('div', { class: 'kaart' }, el('b', {}, `Zin ${i + 1}`), Luister.speler(regels), invoer,
        el('div', { class: 'knoppen' }, el('button', { class: 'knop licht', en: 'check', onclick: () => { if (!invoer.disabled) controleer(); } }, 'Controleer')), uit));
      if (stand.dictee[i]) { invoer.value = stand.dictee[i].tekst; invoer.disabled = true; toonUitslag(Luister.vergelijk(zin, invoer.value)); }
    });
    pagina.append(el('div', { class: 'knoppen' }, knopVerder()));
  }

  // ---------- zeg na ----------
  function toonZegNa() {
    pagina.append(el('h2', { en: 'repeat aloud' }, 'Zeg na'),
      el('p', { class: 'zacht', en: 'Listen, then say the sentence aloud. You can record yourself and compare.' }, 'Luister en zeg de zin hardop na. U kunt uzelf opnemen en vergelijken.'));
    dictee.forEach((zin) => {
      const regels = [{ s: 'A', t: zin }];
      const terug = el('span');
      let rec = null;
      const knop = el('button', { class: 'knop licht', en: 'record / stop', onclick: async () => {
        if (rec) { rec.stop(); return; }
        try {
          const stroom = await navigator.mediaDevices.getUserMedia({ audio: true });
          const stukken = [];
          rec = new MediaRecorder(stroom);
          rec.ondataavailable = (e) => stukken.push(e.data);
          rec.onstop = () => { stroom.getTracks().forEach((t) => t.stop()); rec = null; knop.textContent = '⏺ Neem op';
            terug.textContent = ''; terug.append(el('audio', { controls: true, src: URL.createObjectURL(new Blob(stukken)) })); };
          rec.start(); knop.textContent = '⏹ Stop';
        } catch (e) { terug.textContent = 'Geen microfoon. Zeg de zin gewoon hardop.'; }
      } }, '⏺ Neem op');
      pagina.append(el('div', { class: 'kaart' }, el('p', { style: 'font-size:1.15rem;margin:0' }, App.woorden(zin, nieuw)), Luister.speler(regels), el('div', { class: 'knoppen' }, knop, terug)));
      SRS.voegToe(`z:${les.id}:${zin}`, { soort: 'z', zin: gatZin(zin), les: les.id });
    });
    pagina.append(el('div', { class: 'knoppen' }, knopVerder('Klaar', 'done')));
  }
  // zin met een gat voor de herhaal-pagina van Lezen: het langste woord wordt het gat
  function gatZin(zin) {
    const ws = zin.match(/[A-Za-zÀ-ÿ]+/g) || [];
    const lang = ws.slice().sort((a, b) => b.length - a.length)[0];
    return lang ? zin.replace(lang, `{${lang}}`) : zin;
  }

  // ---------- klaar ----------
  function toonKlaar() {
    const goed = vragen.filter((_, i) => stand.antwoorden[i] === 0).length, totaal = vragen.length;
    const oud = Luister.P.lessen[les.id] || { beste: 0, keer: 0 };
    const dict = stand.dictee.filter(Boolean);
    const dictProcent = dict.length ? Math.round(dict.reduce((n, d) => n + d.procent, 0) / dict.length) : null;
    if (!stand.geteld) {
      Luister.P.lessen[les.id] = { score: goed, beste: Math.max(oud.beste, goed), totaal, keer: oud.keer + 1, dictee: dictProcent, datum: new Date().toISOString().slice(0, 10), sec: Math.round((Date.now() - stand.start) / 1000) };
      Luister.bewaar(); stand.geteld = true; bewaar();
    }
    const gehaald = goed / totaal >= 0.8;
    const volgende = index[index.findIndex((l) => l.id === les.id) + 1];
    const weg = () => App.schrijf('luisteren-bezig', null);
    pagina.append(el('div', { class: 'kaart midden' },
      el('div', { class: 'groot' }, `${goed} / ${totaal}`),
      el('p', { class: 'uitslag ' + (gehaald ? 'goed' : 'fout'), en: gehaald ? 'Passed. The next lesson is open.' : 'You need 80%. Do the lesson again.' }, gehaald ? '✔ Gehaald. De volgende les is open.' : 'U hebt 80% nodig. Doe de les nog een keer.'),
      dictProcent != null ? el('p', { class: 'zacht' }, `Dictee: ${dictProcent}% van de woorden goed`) : null,
      el('div', { class: 'knoppen', style: 'justify-content:center' },
        gehaald && volgende ? el('a', { class: 'knop', href: `les.html?les=${volgende.id}`, en: 'next lesson', onclick: weg }, `Volgende les: ${volgende.id}`) : null,
        el('button', { class: 'knop licht', en: 'again', onclick: () => { weg(); location.reload(); } }, 'Nog een keer'),
        el('a', { class: 'knop licht', href: 'index.html', en: 'overview', onclick: weg }, 'Overzicht'))));
  }

  function toon() {
    App.sluitPop(); Luister.stop();
    pagina.textContent = '';
    stand.stap = Math.max(0, Math.min(stand.stap, stappen.length - 1));
    stand.max = Math.max(stand.max || 0, stand.stap);
    balk();
    const s = stappen[stand.stap];
    if (s.soort === 'woorden') toonWoorden(); else if (s.soort === 'item') toonItem(s.ii);
    else if (s.soort === 'dictee') toonDictee(); else if (s.soort === 'zegna') toonZegNa(); else toonKlaar();
    window.scrollTo(0, 0);
  }
  toon();
})();
