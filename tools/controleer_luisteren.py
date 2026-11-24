#!/usr/bin/env python3
"""Controleert de vaste vorm van Luisteren (de woorden controleert tools/controleer.py luisteren).

    python3 tools/controleer_luisteren.py

- elke les: minstens 5 vragen; elke vraag heeft 3 of 4 verschillende antwoorden of een "typ"-antwoord; elke regel heeft een stem A, B of C
- elke les: 2 dictee-zinnen
- elke toets: 25 vragen
- bij elke regel hoort een mp3 in luisteren/audio/index.json (draai anders tools/tts_luisteren.py)
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from woordenlib import ROOT, lessen, overig  # noqa: E402

STEM = {"A": "nl_NL-ronnie-medium", "B": "nl_BE-nathalie-medium", "C": "nl_NL-pim-medium"}
index_pad = ROOT / "luisteren" / "audio" / "index.json"
audio = json.loads(index_pad.read_text(encoding="utf-8")) if index_pad.exists() else {}
fouten = []
mist = 0


def heeft_audio(s, t, langzaam=False):
    global mist
    sleutel = STEM[s] + ("|langzaam|" if langzaam else "|") + t
    if sleutel not in audio or not (ROOT / "luisteren" / "audio" / audio[sleutel]).exists():
        mist += 1


def vragen_van(it):
    return it.get("vragen") or [{"v": it.get("v"), "o": it.get("o"), "typ": it.get("typ")}]


def controleer_item(naam, i, it, langzaam):
    n = 0
    if not it.get("regels"):
        fouten.append(f"{naam} deel {i + 1}: geen regels")
    for r in it.get("regels", []):
        if r.get("s", "A") not in STEM:
            fouten.append(f"{naam} deel {i + 1}: onbekende stem {r.get('s')}")
            continue
        heeft_audio(r.get("s", "A"), r["t"])
        if langzaam:
            heeft_audio(r.get("s", "A"), r["t"], True)
    for v in vragen_van(it):
        n += 1
        o = v.get("o") or []
        if not v.get("typ") and (not 3 <= len(o) <= 4 or len(set(o)) != len(o)):
            fouten.append(f"{naam} deel {i + 1}: een vraag heeft geen 3 of 4 verschillende antwoorden")
    return n


for pad, les in lessen("luisteren"):
    n = sum(controleer_item(les["id"], i, it, True) for i, it in enumerate(les["items"]))
    if n < 5:
        fouten.append(f"{les['id']}: {n} vragen (minstens 5)")
    if len(les.get("dictee", [])) != 2:
        fouten.append(f"{les['id']}: {len(les.get('dictee', []))} dictee-zinnen (moet 2 zijn)")
    for z in les.get("dictee", []):
        heeft_audio("A", z)
        heeft_audio("A", z, True)
for pad, data in overig("luisteren"):
    if pad.parent.name == "toets":
        n = sum(controleer_item(pad.name, i, it, False) for i, it in enumerate(data["items"]))
        if n != 25:
            fouten.append(f"{pad.name}: {n} vragen (moet 25 zijn)")
    else:
        for it in data["items"]:
            for t in ([it["t"]] if "t" in it else it.get("vormen", [])):
                heeft_audio(it.get("s", "A"), t)
for f in fouten:
    print("✗", f)
print(f"{len(lessen('luisteren'))} lessen, {len(overig('luisteren'))} trainers/toetsen: {len(fouten)} fouten in de vorm, {mist} regels zonder mp3")
sys.exit(1 if fouten or mist else 0)
