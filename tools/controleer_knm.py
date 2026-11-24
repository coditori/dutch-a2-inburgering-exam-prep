#!/usr/bin/env python3
"""Controleert de vaste vorm van KNM (de woorden controleert tools/controleer.py knm).

    python3 tools/controleer_knm.py

Per thema: hoogstens 15 woorden met een zin met {gat}, 10 weetjes (vraag, antwoord, Engels),
10 situaties met precies 3 verschillende antwoorden en een "waarom".
Blok "meer" (stap d, uit het lesmateriaal van de gebruiker): 12-20 weetjes, 3-5 situaties,
en hoogstens 8 eigen woorden (in "woorden" met "meer": true; max_nieuw = 15 + dat aantal).
Per toets: 40 vragen, elk met thema, 3 antwoorden en een "waarom".
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "knm"
THEMAS = {"gezondheid", "wonen", "werk", "onderwijs", "instanties", "omgang", "staat", "geschiedenis"}
fouten = []


def vraag_ok(waar, v, thema_nodig=False):
    if len(v.get("o", [])) != 3 or len(set(v.get("o", []))) != 3:
        fouten.append(f"{waar}: geen 3 verschillende antwoorden")
    if not v.get("v") or not v.get("w"):
        fouten.append(f"{waar}: mist vraag (v) of waarom (w)")
    if thema_nodig and v.get("thema") not in THEMAS:
        fouten.append(f"{waar}: onbekend thema {v.get('thema')!r}")


for p in sorted((ROOT / "themes").glob("*.json")):
    if p.name == "index.json":
        continue
    d = json.loads(p.read_text(encoding="utf-8"))
    basis = [w for w in d["woorden"] if not w.get("meer")]
    extra = [w for w in d["woorden"] if w.get("meer")]
    if len(basis) > 15:
        fouten.append(f"{p.name}: {len(basis)} woorden (maximaal 15)")
    if len(extra) > 8:
        fouten.append(f"{p.name}: {len(extra)} woorden bij 'meer' (maximaal 8)")
    if d.get("max_nieuw", 15) != 15 + len(extra):
        fouten.append(f"{p.name}: max_nieuw moet {15 + len(extra)} zijn (15 + de woorden van 'meer')")
    meer = d.get("meer")
    if not meer:
        fouten.append(f"{p.name}: blok 'meer' ontbreekt")
    else:
        if not 12 <= len(meer.get("weetjes", [])) <= 20:
            fouten.append(f"{p.name}: meer heeft {len(meer.get('weetjes', []))} weetjes (12-20)")
        for i, k in enumerate(meer.get("weetjes", [])):
            if not (k.get("v") and k.get("a") and k.get("en")):
                fouten.append(f"{p.name}: meer-weetje {i + 1} mist v, a of en")
        if not 3 <= len(meer.get("situaties", [])) <= 5:
            fouten.append(f"{p.name}: meer heeft {len(meer.get('situaties', []))} situaties (3-5)")
        for i, x in enumerate(meer.get("situaties", [])):
            vraag_ok(f"{p.name} meer-situatie {i + 1}", x)
    for w in d["woorden"]:
        if not re.search(r"\{[^}]+\}", w.get("zin", "")):
            fouten.append(f"{p.name}: zin van '{w['nl']}' heeft geen {{gat}}")
        if not w.get("en") or not w.get("beeld"):
            fouten.append(f"{p.name}: '{w['nl']}' mist en of beeld")
    if len(d["weetjes"]) != 10:
        fouten.append(f"{p.name}: {len(d['weetjes'])} weetjes (moet 10 zijn)")
    for i, k in enumerate(d["weetjes"]):
        if not (k.get("v") and k.get("a") and k.get("en")):
            fouten.append(f"{p.name}: weetje {i + 1} mist v, a of en")
    if len(d["situaties"]) != 10:
        fouten.append(f"{p.name}: {len(d['situaties'])} situaties (moet 10 zijn)")
    for i, s in enumerate(d["situaties"]):
        vraag_ok(f"{p.name} situatie {i + 1}", s)

for p in sorted((ROOT / "toets").glob("*.json")):
    if p.name == "index.json":
        continue
    d = json.loads(p.read_text(encoding="utf-8"))
    if len(d["vragen"]) != 40:
        fouten.append(f"{p.name}: {len(d['vragen'])} vragen (moet 40 zijn)")
    for i, v in enumerate(d["vragen"]):
        vraag_ok(f"{p.name} vraag {i + 1}", v, True)

d = json.loads((ROOT / "trainers" / "instantie.json").read_text(encoding="utf-8"))
ids = {x["id"] for x in d["instanties"]}
for it in d["items"]:
    if it["goed"] not in ids:
        fouten.append(f"instantie.json: onbekende instantie {it['goed']!r}")

for f in fouten:
    print("✗", f)
print(f"KNM vorm: {len(fouten)} fouten")
sys.exit(1 if fouten else 0)
