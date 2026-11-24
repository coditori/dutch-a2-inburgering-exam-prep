// Eén sjabloon voor alle lessen van spreken: les.html?les=P01 laadt lessons/P01.json
// les.html?terug=1 : de vragen die eerder fout gingen en vandaag terugkomen.
// Soorten items: zegna (luister, zeg na, vergelijk) · kaart (3 seconden: begin van het antwoord) · vraag (examenvraag met opname)
(async () => {
  const { el } = App;
  const q = new URLSearchParams(location.search);
  const pagina = document.getElementById('pagina');
  await Spraak.map('audio/');
  const index = await Spreken.json('lessons/index.json');
  let les, items, terugModus = q.get('terug') === '1';

  if (terugModus) {
    const ids = Spreken.terug.nu();
    const perLes = {};
    for (const id of ids) { const [l] = id.split(':'); perLes[l] = perLes[l] || await Spreken.json(`lessons/${l}.json`).catch(() => null); }
    items = ids.map((id) => { const [l, i] = id.split(':'); return perLes[l] && perLes[l].items[+i] ? Object.assign({ terugId: id }, perLes[l].items[+i]) : null; }).filter(Boolean);
    les = { id: 'terug', titel: 'Vragen van eerder', trede: 0, woorden: [], items };
  } else {
    const id = q.get('les') || 'P01';
    try { les = await Spreken.json(`lessons/${id}.json`); } catch (e) { pagina.textContent = 'Deze les bestaat niet: ' + id; return; }
    items = les.items;
  }
  document.title = `Spreken – ${les.id} ${les.titel}`;
  App.kop(terugModus ? les.titel : `${les.id} · ${les.titel}`, 'index.html');
  const nieuw = new Set((les.woorden || []).map((w) => App.lemmaNr(w.nl)).filter((n) => n >= 0));

  // stap 0 = uitleg + woorden, stap 1..n = items, stap n+1 = klaar
  let stand = App.lees('spreken-bezig', null);
  if (terugModus || !stand || stand.les !== les.id) stand = { les: les.id, stap: terugModus ? 1 : 0, goed: [], start: Date.now() };
  const bewaar = () => { if (!terugModus) App.schrijf('spreken-bezig', stand); };

  function balk() {
    const s = document.getElementById('stappen');
    s.textContent = '';
    for (let i = 0; i <= items.length + 1; i++) s.append(el('i', { class: i <= stand.stap ? 'aan' : '' }));
  }
  const verder = () => { stand.stap++; bewaar(); toon(); };

  function toonUitleg() {
    pagina.append(el('div', { class: 'kaart' },
      el('h3', { en: 'what you practise' }, 'Dit oefent u'),
      el('p', { en: les.en || '' }, App.woorden(les.uitleg || '', nieuw)),
      les.patroon ? el('p', { class: 'patroon' }, les.patroon) : null));
    if (les.woorden && les.woorden.length) {
      pagina.append(el('h2', { en: 'new words' }, 'Nieuwe woorden'),
        el('div', { class: 'wkaarten' }, les.woorden.map((w) => {
          SRS.voegToe('w:' + w.nl, { soort: 'w', nl: w.nl, en: w.en, beeld: w.beeld || '' });
          const zin = el('div', { class: 'zin', hidden: true }, App.woorden(w.zin || '', nieuw));
          const en = el('div', { class: 'en', hidden: true }, w.en);
          const k = el('div', { class: 'wkaart' }, el('div', { class: 'beeld' }, w.beeld || '💬'), el('div', { class: 'nl' }, w.nl), zin, en,
            el('div', { class: 'knoppen', style: 'justify-content:center' },
              el('button', { class: 'rond', title: 'luister', onclick: (e) => { e.stopPropagation(); Spraak.zeg(zin.hidden ? w.nl : w.zin); } }, '🔊'),
              el('button', { class: 'rond', title: 'Engels', onclick: (e) => { e.stopPropagation(); en.hidden = !en.hidden; } }, '❗')));
          k.addEventListener('click', (e) => { if (e.target.closest('.w')) return; zin.hidden = !zin.hidden; k.classList.toggle('om', !zin.hidden); });
          return k;
        })));
    }
    pagina.append(el('div', { class: 'knoppen' }, el('button', { class: 'knop', en: 'start', onclick: verder }, 'Begin')));
  }

  function klaarMetItem(i, goed) {
    stand.goed[i] = goed;
    const it = items[i];
    if (terugModus) { if (goed) Spreken.terug.goed(it.terugId); else Spreken.terug.fout(it.terugId); }
    else if (!goed && it.soort !== 'zegna') Spreken.terug.fout(`${les.id}:${i}`);
    verder();
  }

  function toonItem(i) {
    const it = items[i];
    pagina.append(el('p', { class: 'zacht klein' }, `${i + 1} / ${items.length}`));
    const vak = el('div');
    const onder = el('div');
    pagina.append(vak, onder);

    if (it.soort === 'zegna') {
      vak.append(el('div', { class: 'kaart midden' },
        el('p', { class: 'zacht', en: 'Listen. Say it together with the voice. Then record and compare.' }, 'Luister. Zeg het samen met de stem. Neem daarna op en vergelijk.'),
        it.beeld ? el('div', { class: 'klemtoon' }, it.beeld) : null,
        el('p', { class: 'spreekvraag' }, App.woorden(it.tekst, nieuw)),
        it.en ? (() => { const e = el('p', { class: 'zacht', hidden: true, style: 'font-style:italic' }, it.en); return el('div', {}, el('button', { class: 'rond', title: 'Engels', onclick: () => { e.hidden = !e.hidden; } }, '❗'), e); })() : null,
        el('div', { class: 'knoppen', style: 'justify-content:center' },
          el('button', { class: 'knop licht', en: 'listen', onclick: () => Spreken.speel(it.tekst) }, '🔊 Luister'),
          el('button', { class: 'knop licht', en: 'slow', onclick: () => Spreken.speel(it.tekst, 0.75) }, '🐢 Langzaam'))));
      Spreken.speel(it.tekst);
      Spreken.opnameBlok(onder, Object.assign(Spreken.punten(it), { klaar: (ok) => klaarMetItem(i, ok) }));
      return;
    }

    if (it.soort === 'kaart') {
      const balkje = el('i', { style: 'width:100%;background:var(--accent)' });
      const antwoord = el('div', { hidden: true },
        el('p', { class: 'patroon' }, it.begin),
        el('div', { class: 'model' }, el('p', {}, App.woorden(it.model, nieuw)), el('button', { class: 'knop licht klein', onclick: () => Spreken.speel(it.model) }, '🔊 Luister')),
        el('p', { class: 'zacht', en: 'Did you start your answer like this within 3 seconds?' }, 'Begon u binnen 3 seconden zo met uw antwoord?'),
        el('div', { class: 'knoppen', style: 'justify-content:center' },
          el('button', { class: 'knop licht', en: 'no', onclick: () => klaarMetItem(i, false) }, '✘ Nee'),
          el('button', { class: 'knop', en: 'yes', onclick: () => klaarMetItem(i, true) }, '✔ Ja')));
      vak.append(el('div', { class: 'kaart midden' },
        el('p', { class: 'zacht', en: 'Say the start of your answer aloud. You have 3 seconds.' }, 'Zeg hardop het begin van uw antwoord. U hebt 3 seconden.'),
        el('p', { class: 'spreekvraag' }, App.woorden(it.vraag, nieuw)),
        el('div', { class: 'balk' }, balkje), antwoord));
      Spreken.speel(it.vraag).then(() => {
        const start = Date.now();
        const tik = setInterval(() => {
          const over = 3 - (Date.now() - start) / 1000;
          balkje.style.width = Math.max(0, 100 * over / 3) + '%';
          if (over <= 0) { clearInterval(tik); antwoord.hidden = false; }
        }, 100);
      });
      return;
    }

    // examenvraag
    const tekst = el('div', { hidden: it.deel === 1 },
      it.sit ? el('p', {}, App.woorden(it.sit, nieuw)) : null,
      el('p', { class: 'spreekvraag' }, App.woorden(it.vraag, nieuw)));
    const hint = { 2: ['Gebruik het plaatje.', 'Use the picture.'], 3: ['Kies een van de plaatjes.', 'Choose one of the pictures.'], 4: ['Gebruik alle plaatjes.', 'Use all pictures.'] }[it.deel];
    vak.append(el('div', { class: 'kaart' },
      el('p', { class: 'zacht klein' }, `Onderdeel ${it.deel || 1}` + (it.deel === 1 ? ' · u hoort de vraag (op het examen: een video)' : '')),
      Spreken.scene(it.beelden),
      tekst,
      hint ? el('p', { class: 'zacht', en: hint[1] }, hint[0]) : null,
      el('div', { class: 'knoppen' },
        el('button', { class: 'knop licht', en: 'listen to the question', onclick: () => Spreken.speel(Spreken.vraagTekst(it)) }, '🔊 Vraag'),
        it.deel === 1 ? el('button', { class: 'knop licht', en: 'show the text', onclick: () => { tekst.hidden = !tekst.hidden; } }, '👁 Tekst') : null),
      it.en ? (() => { const t = el('p', { class: 'tip', hidden: true }, it.en); return el('div', {}, el('button', { class: 'knop licht klein', title: 'tip (Engels)', onclick: () => { t.hidden = !t.hidden; } }, '❗ Tip'), t); })() : null));
    Spreken.speel(Spreken.vraagTekst(it));
    Spreken.opnameBlok(onder, Object.assign(Spreken.punten(it), { klaar: (ok) => klaarMetItem(i, ok) }));
  }

  function toonKlaar() {
    const goed = items.filter((_, i) => stand.goed[i]).length;
    const totaal = items.length;
    if (terugModus) {
      pagina.append(el('div', { class: 'kaart midden' }, el('div', { class: 'groot' }, `${goed} / ${totaal}`),
        el('p', { en: 'Wrong ones come back tomorrow.' }, 'Wat fout ging, komt morgen terug.'),
        el('div', { class: 'knoppen', style: 'justify-content:center' }, el('a', { class: 'knop', href: 'index.html' }, 'Overzicht'))));
      return;
    }
    const oud = Spreken.P.lessen[les.id] || { beste: 0, keer: 0 };
    if (!stand.geteld) {
      Spreken.P.lessen[les.id] = { score: goed, beste: Math.max(oud.beste, goed), totaal, keer: oud.keer + 1, datum: new Date().toISOString().slice(0, 10) };
      Spreken.bewaar();
      stand.geteld = true; bewaar();
    }
    const ok = goed / totaal >= 0.8;
    const volgende = index[index.findIndex((l) => l.id === les.id) + 1];
    const weg = () => App.schrijf('spreken-bezig', null);
    pagina.append(el('div', { class: 'kaart midden' },
      el('div', { class: 'groot' }, `${goed} / ${totaal}`),
      el('p', { class: 'uitslag ' + (ok ? 'goed' : 'fout'), en: ok ? 'Passed. The next lesson is open.' : 'You need 80%. Do the lesson again.' }, ok ? '✔ Gehaald. De volgende les is open.' : 'U hebt 80% nodig. Doe de les nog een keer.'),
      el('p', { class: 'zacht klein', en: 'Questions that went wrong come back tomorrow.' }, 'Vragen die fout gingen, komen morgen terug.'),
      el('div', { class: 'knoppen', style: 'justify-content:center' },
        ok && volgende ? el('a', { class: 'knop', href: `les.html?les=${volgende.id}`, onclick: weg }, `Volgende les: ${volgende.id}`) : null,
        el('button', { class: 'knop licht', en: 'again', onclick: () => { weg(); location.reload(); } }, 'Nog een keer'),
        el('a', { class: 'knop licht', href: 'index.html', onclick: weg }, 'Overzicht'))));
  }

  function toon() {
    App.sluitPop(); Spraak.stop();
    pagina.textContent = '';
    balk();
    if (!items.length) { pagina.append(el('p', { class: 'kaart' }, 'Er zijn vandaag geen vragen die terugkomen.'), el('a', { class: 'knop', href: 'index.html' }, 'Overzicht')); return; }
    if (stand.stap === 0) toonUitleg();
    else if (stand.stap <= items.length) toonItem(stand.stap - 1);
    else toonKlaar();
    window.scrollTo(0, 0);
  }
  toon();
})();
