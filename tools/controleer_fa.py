#!/usr/bin/env python3
"""Controleert of elke Engelse hulptekst ook een Perzische heeft in shared/fa.js.

    python3 tools/controleer_fa.py          # telt wat ontbreekt
    python3 tools/controleer_fa.py -v       # toont ook de teksten die ontbreken
    python3 tools/controleer_fa.py --json   # de teksten die ontbreken als JSON (om te laten vertalen)

De hulp (knop EN / FA in de kop, ❗ bij een woord) is in de lessen Engels. shared/fa.js heeft bij elke Engelse tekst
de Perzische: window.FA = { "Engels": "Perzisch", ... }. Ontbreekt een tekst, dan ziet de leerling het Engels.
Dit script faalt dus niet bij ontbrekende teksten; het faalt alleen als fa.js zelf kapot is (lege of dubbele tekst).
Engelse hulp komt uit: data-en="..." en en: '...' in de pagina's, de velden "en", "..._en" en "...En" in de lessen,
en de woordenlijst (shared/woorden.js).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FA = ROOT / "shared" / "fa.js"
EXAMENS = ["lezen", "luisteren", "schrijven", "spreken", "knm"]
TEKST = re.compile(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"")


def uit_paginas():
    """Engelse teksten in html en js: data-en="...", en: <uitdrukking> en uitlegEn: <uitdrukking>"""
    uit = {}
    paden = [ROOT / "index.html", ROOT / "instellingen.html", ROOT / "shared" / "app.js", ROOT / "shared" / "srs.js"]
    for x in EXAMENS:
        paden += sorted((ROOT / x).rglob("*.html")) + sorted((ROOT / x).rglob("*.js"))
    for p in paden:
        if not p.exists():
            continue
        t = p.read_text(encoding="utf-8")
        for m in re.finditer(r'data-en="([^"]*)"', t):
            uit.setdefault(m.group(1).replace("&quot;", '"').replace("&amp;", "&"), "")
        for m in re.finditer(r"\b(?:en|uitlegEn): ?", t):
            if "//" in t[t.rfind("\n", 0, m.start()) + 1:m.start()]:
                continue  # in een commentaarregel
            j, diep = m.end(), 0
            while j < len(t):  # tot de komma of haak op hetzelfde niveau
                c = t[j]
                if c in "'\"`":
                    j += 1
                    while j < len(t) and t[j] != c:
                        j += 2 if t[j] == "\\" else 1
                elif c in "([{":
                    diep += 1
                elif c in ")]}":
                    if diep == 0:
                        break
                    diep -= 1
                elif c == "," and diep == 0:
                    break
                j += 1
            stuk = t[m.end():j]
            for s in TEKST.finditer(stuk):
                v = (s.group(1) if s.group(1) is not None else s.group(2)).replace("\\'", "'")
                voor = stuk[:s.start()].rstrip()
                # geen Engelse hulp: een vergelijking (soort === 'tijd'), een tag of klasse (el('span', { class: 'zacht' }))
                if voor.endswith(("===", "!==", "el(", "class:", "includes(", "title:", "type:", "style:")):
                    continue
                if re.search(r"[A-Za-z]{2}", v):
                    uit.setdefault(v, "")
        for m in re.finditer(r"toast\('[^']*', ?'([^']*)'\)", t):
            uit.setdefault(m.group(1), "")
    return uit


def uit_lessen():
    """Engelse teksten in de json van lessen, trainers en toetsen, met het Nederlands erbij (voor de vertaler)"""
    uit = {}

    def context(o):
        for k in ("nl", "a", "v", "tekst", "titel", "uitleg"):
            if isinstance(o.get(k), str):
                return o[k]
        return ""

    def loop(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k == "en" or k.endswith("_en") or k.endswith("En"):
                    for s in v if isinstance(v, list) else [v]:
                        if isinstance(s, str) and s.strip():
                            uit.setdefault(s, context(o))
                else:
                    loop(v)
        elif isinstance(o, list):
            for x in o:
                loop(x)

    for x in EXAMENS:
        for p in sorted((ROOT / x).rglob("*.json")):
            if p.name != "index.json" and "audio" not in p.parts:
                loop(json.loads(p.read_text(encoding="utf-8")))
    return uit


def uit_woorden():
    t = (ROOT / "shared" / "woorden.js").read_text(encoding="utf-8")
    lijst = json.loads(t.split("window.WOORDEN = ", 1)[1].rstrip().rstrip(";"))["lijst"]
    uit = {}
    for r in lijst:
        uit.setdefault(r[2], r[1])
    return uit


def alle_teksten():
    """[{en, nl, soort}] zonder dubbele"""
    uit, gezien = [], set()
    for soort, d in (("ui", uit_paginas()), ("les", uit_lessen()), ("woord", uit_woorden())):
        for en, nl in d.items():
            if en.strip() and en not in gezien:
                gezien.add(en)
                uit.append({"en": en, "nl": nl, "soort": soort})
    return uit


def lees_fa():
    if not FA.exists():
        return {}
    t = FA.read_text(encoding="utf-8")
    return json.loads(t[t.index("{"):t.rindex("}") + 1])


def schrijf_fa(d):
    regels = ",\n".join(json.dumps(k, ensure_ascii=False) + ": " + json.dumps(v, ensure_ascii=False) for k, v in sorted(d.items(), key=lambda kv: kv[0].lower()))
    FA.write_text("// Perzische hulp: bij elke Engelse hulptekst de Perzische. Geladen door shared/app.js als de hulptaal Perzisch is.\n"
                  "// Nieuwe Engelse tekst in een les? Draai tools/controleer_fa.py: dat toont wat hier nog ontbreekt.\n"
                  "window.FA = {\n" + regels + "\n};\n", encoding="utf-8")


if __name__ == "__main__":
    fa = lees_fa()
    teksten = alle_teksten()
    mist = [t for t in teksten if t["en"] not in fa]
    if "--json" in sys.argv:
        print(json.dumps(mist, ensure_ascii=False, indent=0))
        sys.exit(0)
    fouten = [k for k, v in fa.items() if not isinstance(v, str) or not v.strip()]
    for k in fouten:
        print("✗ lege Perzische tekst bij:", k)
    if "-v" in sys.argv:
        for t in mist:
            print(f"   ontbreekt ({t['soort']}): {t['en']}")
    print(f"Perzisch: {len(teksten) - len(mist)} van {len(teksten)} hulpteksten vertaald, {len(mist)} ontbreken (dan staat er Engels). {len(fouten)} fouten")
    sys.exit(1 if fouten else 0)
