#!/usr/bin/env python3
"""Controleert de vaste vorm van de lessen en toetsen van spreken (de woorden controleert tools/controleer.py).

    python3 tools/controleer_spreken.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "spreken"
PLAATJES = {1: 0, 2: 1, 3: 2, 4: 3}


def item_fouten(it, toets=False):
    f = []
    soort = it.get("soort")
    if soort == "zegna":
        if not it.get("tekst"):
            f.append("zegna zonder tekst")
    elif soort == "kaart":
        for k in ("vraag", "begin", "model"):
            if not it.get(k):
                f.append(f"kaart zonder {k}")
    elif soort == "vraag":
        deel = it.get("deel")
        if deel not in PLAATJES:
            return [f"deel moet 1-4 zijn: {deel}"]
        if len(it.get("beelden", [])) != PLAATJES[deel]:
            f.append(f"onderdeel {deel} moet {PLAATJES[deel]} plaatje(s) hebben, heeft {len(it.get('beelden', []))}")
        if not it.get("vraag") or not it.get("model"):
            f.append("vraag of model ontbreekt")
        if it.get("drie"):
            if len(it["model"]) != 3:
                f.append("'noem drie dingen' moet 3 voorbeeldzinnen hebben")
        else:
            n = len(it.get("sleutel", []))
            if n != (3 if deel == 4 else 2) or any(not a for a in it.get("sleutel", [])):
                f.append(f"sleutel: {n} delen (moet {3 if deel == 4 else 2} zijn, geen lege)")
            if deel == 4 and len(it["model"]) != 3:
                f.append("onderdeel 4 moet 3 voorbeeldzinnen hebben (één per plaatje)")
        if toets and it.get("les"):
            les, _, nr = it["les"].partition(":")
            pad = ROOT / "lessons" / f"{les}.json"
            if not pad.exists() or int(nr) >= len(json.loads(pad.read_text(encoding="utf-8"))["items"]):
                f.append(f"les-verwijzing bestaat niet: {it['les']}")
    else:
        f.append(f"onbekende soort: {soort}")
    return f


def main():
    totaal = 0
    index = {}
    ipad = ROOT / "audio" / "index.json"
    if ipad.exists():
        index = json.loads(ipad.read_text(encoding="utf-8"))
    zonder_geluid = 0
    lessen = sorted((ROOT / "lessons").glob("P*.json"))
    for pad in lessen + sorted(p for p in (ROOT / "toets").glob("*.json") if p.name != "index.json"):
        data = json.loads(pad.read_text(encoding="utf-8"))
        toets = pad.parent.name == "toets"
        fouten = []
        if not data.get("items"):
            fouten.append("geen items")
        for i, it in enumerate(data.get("items", [])):
            fouten += [f"item {i + 1}: {x}" for x in item_fouten(it, toets)]
            teksten = [it.get("tekst")] if it["soort"] == "zegna" else [it.get("model")] if it["soort"] == "kaart" else it.get("model", [])
            vraag = " ".join(x for x in (it.get("sit"), it.get("vraag")) if x)
            zonder_geluid += sum(1 for t in teksten + ([vraag] if vraag else []) if t and t not in index)
        if toets:
            delen = [it.get("deel") for it in data["items"]]
            if delen != [1] * 4 + [2] * 4 + [3] * 4 + [4] * 4:
                fouten.append(f"een toets heeft 4 vragen per onderdeel, in volgorde 1-4; nu: {delen}")
        elif not data.get("uitleg") or not data.get("en"):
            fouten.append("uitleg of en (Engelse uitleg) ontbreekt")
        totaal += len(fouten)
        for f in fouten:
            print(f"{pad.parent.name}/{pad.name}: ✗ {f}")
    if len(lessen) != 26:
        print(f"✗ {len(lessen)} lessen (het plan heeft er 26)")
        totaal += 1
    print(f"spreken: {len(lessen)} lessen gecontroleerd: {totaal} fouten; {zonder_geluid} teksten zonder mp3")
    sys.exit(1 if totaal else 0)


if __name__ == "__main__":
    main()
