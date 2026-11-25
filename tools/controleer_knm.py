#!/usr/bin/env python3
"""Controleert de vaste vorm van KNM (de woorden controleert tools/controleer.py knm).

    python3 tools/controleer_knm.py

Per thema: hoogstens 15 woorden met een zin met {gat}, 10 weetjes (vraag, antwoord, Engels),
10 situaties met precies 3 verschillende antwoorden en een "waarom".
Blok "meer" (stap d, uit het lesmateriaal van de gebruiker): 12-20 weetjes, 3-5 situaties,
en hoogstens 8 eigen woorden (in "woorden" met "meer": true; max_nieuw = 15 + dat aantal).
Per toets de vorm van de twee oefenexamens KNM 2025 van DUO: 40 vragen, elk met thema, 3 antwoorden,
een "waarom" en een "foto" (Engelse beschrijving van de foto). Geen vraag "wat is waar". Korte antwoorden:
gemiddeld hoogstens 6 woorden per antwoord en geen antwoord langer dan 10 woorden. Korte vragen: situatie (sit)
plus vraag (v) samen hoogstens 30 woorden. (DUO: gemiddeld 3,9 woorden per antwoord en 13,5 per vraag.)
Trainers verwar.json en lezen.json: elk item wijst naar een bestaand paar, of is een vraag met 3 antwoorden.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "knm"
THEMAS = {"gezondheid", "wonen", "werk", "onderwijs", "instanties", "omgang", "staat", "geschiedenis"}
fouten = []


MAX_STAM = 30          # woorden in sit + v
MAX_ANTWOORD = 10      # woorden in één antwoord
MAX_GEM_ANTWOORD = 6   # gemiddeld aantal woorden per antwoord in een toets


def n_woorden(tekst):
    """aantal woorden: alles tussen spaties met een letter of een cijfer ("€ 200" is 1 woord)"""
    return sum(1 for t in tekst.split() if re.search(r"[^\W_]", t))


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
    antwoorden, stammen = [], []
    for i, v in enumerate(d["vragen"]):
        waar = f"{p.name} vraag {i + 1}"
        vraag_ok(waar, v, True)
        stam = f"{v.get('sit', '')} {v.get('v', '')}"
        stammen.append(n_woorden(stam))
        if "wat is waar" in stam.lower():
            fouten.append(f"{waar}: 'wat is waar' (DUO stelt die vraag nooit)")
        if stammen[-1] > MAX_STAM:
            fouten.append(f"{waar}: situatie en vraag hebben {stammen[-1]} woorden (maximaal {MAX_STAM})")
        for o in v.get("o", []):
            antwoorden.append(n_woorden(o))
            if antwoorden[-1] > MAX_ANTWOORD:
                fouten.append(f"{waar}: antwoord van {antwoorden[-1]} woorden (maximaal {MAX_ANTWOORD}): {o!r}")
        if not v.get("foto"):
            fouten.append(f"{waar}: mist foto (Engelse beschrijving van de foto)")
    gem = sum(antwoorden) / max(1, len(antwoorden))
    print(f"{p.name}: gemiddeld {sum(stammen) / max(1, len(stammen)):.1f} woorden per vraag, {gem:.1f} per antwoord")
    if gem > MAX_GEM_ANTWOORD:
        fouten.append(f"{p.name}: antwoorden hebben gemiddeld {gem:.1f} woorden (maximaal {MAX_GEM_ANTWOORD})")

d = json.loads((ROOT / "trainers" / "instantie.json").read_text(encoding="utf-8"))
ids = {x["id"] for x in d["instanties"]}
for it in d["items"]:
    if it["goed"] not in ids:
        fouten.append(f"instantie.json: onbekende instantie {it['goed']!r}")

d = json.loads((ROOT / "trainers" / "verwar.json").read_text(encoding="utf-8"))
for i, it in enumerate(d["items"]):
    if not 0 <= it.get("p", -1) < len(d["paren"]) or it.get("goed") not in ("a", "b") or not it.get("v"):
        fouten.append(f"verwar.json: item {i + 1} mist v, een bestaand paar (p) of goed (a/b)")
for i in set(range(len(d["paren"]))) - {it["p"] for it in d["items"]}:
    fouten.append(f"verwar.json: paar {i + 1} ({d['paren'][i]['a'][0]}) heeft geen item")
d = json.loads((ROOT / "trainers" / "lezen.json").read_text(encoding="utf-8"))
for i, it in enumerate(d["items"]):
    vraag_ok(f"lezen.json item {i + 1}", it)

for f in fouten:
    print("✗", f)
print(f"KNM vorm: {len(fouten)} fouten")
sys.exit(1 if fouten else 0)
