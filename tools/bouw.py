#!/usr/bin/env python3
"""Bouwt de gegenereerde bestanden. Draai dit na elke nieuwe of veranderde les:

    python3 tools/bouw.py

1. Nieuwe woorden uit de lessen komen in woorden/woorden.txt (met trede en thema).
2. shared/woorden.js wordt gemaakt uit woorden.txt + werkwoorden-a2.tsv.
3. Per examen worden lessons/index.json en toets/index.json gemaakt (lijst voor de startpagina).
"""
import json

import fcntl

from woordenlib import EXAMENS, ROOT, WOORDEN, Lijst, kaal, lees_plaatjes, lessen, overig, strings, sublemmas, tokens

KOP = "# ---------- UIT DE LESSEN (automatisch toegevoegd door tools/bouw.py) ----------"


def voeg_nieuwe_woorden_toe():
    lijst = Lijst()
    nieuw = []
    gezien = set()
    for pad, les in alle_lessen():
        for w in les.get("woorden", []):
            sleutel = kaal(w["nl"])
            if lijst.vind_lemma(w["nl"]) is None and sleutel not in gezien:
                gezien.add(sleutel)
                regel = f'{les.get("trede", 3)} | {w["nl"]} | {w["en"]} | {w.get("thema", "algemeen")}'
                if w.get("vormen"):
                    regel += " | " + " ".join(w["vormen"])
                nieuw.append(regel)
    if nieuw:
        tekst = WOORDEN.read_text(encoding="utf-8").rstrip("\n")
        if KOP not in tekst:
            tekst += "\n\n" + KOP
        WOORDEN.write_text(tekst + "\n" + "\n".join(nieuw) + "\n", encoding="utf-8")
    return nieuw


def maak_woorden_js():
    lijst = Lijst()
    beeld = {kaal(k): v for k, v in lees_plaatjes().items()}
    for pad, les in alle_lessen():
        for w in les.get("woorden", []):
            if w.get("beeld"):
                beeld[kaal(w["nl"])] = w["beeld"]
    # een voorbeeldzin bij het woord: de zin uit de eerste les waar het woord in staat (voor de woordkaarten bij Herhalen)
    zin = {}
    for pad, les in alle_lessen():
        for w in les.get("woorden", []):
            if w.get("zin"):
                zin.setdefault(kaal(w["nl"]), w["zin"])
    rijen = []
    for it in lijst.items:
        b = [beeld[kaal(s)] for s in [it["nl"]] + sublemmas(it["nl"]) if kaal(s) in beeld]
        z = next((zin[kaal(s)] for s in [it["nl"]] + sublemmas(it["nl"]) if kaal(s) in zin), "")
        rijen.append([it["trede"], it["nl"], it["en"], it["thema"], "".join(dict.fromkeys(b)), it["extra"], z])
    vormen = {k: v[:3] for k, v in lijst.vormen.items()}
    # vormen die in de teksten staan (meervoud, verkleinwoord, samenstelling) vooraf opzoeken
    inhoud = [d for _, d in alle_lessen()] + [d for x in EXAMENS for _, d in overig(x)]
    for data in inhoud:
        for _, s in strings(data):
            for t in tokens(s):
                if t in vormen or t in lijst.namen:
                    continue
                gevonden = lijst.zoek(t)
                if gevonden:
                    vormen[t] = list(dict.fromkeys(deel[0] for deel in gevonden[0]))[:3]
    uit = ROOT / "shared" / "woorden.js"
    uit.parent.mkdir(exist_ok=True)
    uit.write_text(
        "// GEGENEREERD door tools/bouw.py uit woorden/woorden.txt en woorden/werkwoorden-a2.tsv. Niet met de hand veranderen.\n"
        "// lijst: [trede, nederlands, engels, thema, plaatje, extra, voorbeeldzin]   vormen: woordvorm -> nummers in lijst\n"
        "window.WOORDEN = " + json.dumps({"lijst": rijen, "vormen": vormen}, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    return len(rijen), len(vormen)


def maak_indexen():
    """per examen: lessons/index.json (id, trede, titel, soort) en toets/index.json"""
    tel = {}
    for x in EXAMENS:
        ls = lessen(x)
        if ls:
            index = [{"id": d["id"], "trede": d.get("trede", 3), "titel": d.get("titel", d["id"]), "soort": d.get("soort", "")} for _, d in ls]
            ls[0][0].parent.joinpath("index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        toetsen = []
        for pad, data in overig(x):
            if pad.parent.name == "toets":
                eenheden = data.get("teksten") or data.get("items") or data.get("vragen") or []
                n = sum(len(t["vragen"]) for t in eenheden) if eenheden and isinstance(eenheden[0], dict) and "vragen" in eenheden[0] else len(eenheden)
                toetsen.append({"id": data.get("id", pad.stem), "titel": data.get("titel", pad.stem), "vragen": n})
        if toetsen:
            (ROOT / x / "toets" / "index.json").write_text(json.dumps(toetsen, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        tel[x] = (len(ls), len(toetsen))
    return tel


def alle_lessen():
    return [paar for x in EXAMENS for paar in lessen(x)]


if __name__ == "__main__":
    # slot: twee keer tegelijk draaien mag woorden.txt niet kapot maken
    with open(ROOT / "tools" / ".bouw.lock", "w") as slot:
        fcntl.flock(slot, fcntl.LOCK_EX)
        nieuw = voeg_nieuwe_woorden_toe()
        print(f"woorden.txt: {len(nieuw)} nieuwe woorden toegevoegd")
        for r in nieuw:
            print("   +", r)
        n, v = maak_woorden_js()
        print(f"shared/woorden.js: {n} woorden, {v} vormen")
        for x, (ln, tn) in maak_indexen().items():
            if ln or tn:
                print(f"{x}: {ln} lessen, {tn} toetsen in de index")
