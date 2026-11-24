#!/usr/bin/env python3
"""Controleert de vaste vorm van de lessen en sets van schrijven (de woorden controleert tools/controleer.py schrijven).

    python3 tools/controleer_schrijven.py

- elke oefening heeft een bekende soort en de velden die erbij horen
- een zin om over te typen begint met een hoofdletter en eindigt met . ? !  (behalve losse woorden)
- het voorbeeld-antwoord van elke schrijftaak haalt zijn eigen controle (de regels in "val")
- elke set heeft 4 opdrachten
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "schrijven"
SOORTEN = {"typ", "tegels", "gat", "formulier", "opdracht", "set"}
VELDEN = {"voornaam", "achternaam", "naam", "adres", "postcode", "woonplaats", "telefoon", "email", "datum", "geboortedatum", "keuze", "open"}
fouten = []


def zin_ok(z):
    return bool(re.match(r"^[A-ZÀ-Ý0-9]", z)) and z[-1] in ".?!"


def taak(waar, t):
    if t.get("soort") not in ("email", "tekst", "briefje"):
        fouten.append(f"{waar}: onbekende soort taak {t.get('soort')}")
    if not 3 <= len(t.get("punten", [])) <= 4:
        fouten.append(f"{waar}: {len(t.get('punten', []))} punten (moet 3 of 4 zijn)")
    if t.get("soort") in ("email", "briefje") and not (t.get("aanhef") and t.get("afsluiting")):
        fouten.append(f"{waar}: e-mail of briefje zonder aanhef of afsluiting")
    for i, p in enumerate(t.get("punten", [])):
        if not zin_ok(p["model"]):
            fouten.append(f"{waar}: voorbeeldzin {i + 1} zonder hoofdletter of punt: {p['model']}")
        if not any(re.search(x, p["model"], re.I) for x in p.get("val", [])):
            fouten.append(f"{waar}: voorbeeldzin {i + 1} haalt de eigen controle niet: {p['model']}")
        for x in p.get("val", []):
            re.compile(x)


def formulier(waar, f, met_model=False):
    for v in f.get("velden", []):
        if v.get("soort") not in VELDEN:
            fouten.append(f"{waar}: onbekend veld {v.get('soort')}")
        if v.get("soort") == "keuze" and len(v.get("opties", [])) < 2:
            fouten.append(f"{waar}: keuze zonder opties")
        if met_model and not v.get("model"):
            fouten.append(f"{waar}: veld '{v['label']}' zonder voorbeeld")


n_les = 0
for pad in sorted((ROOT / "lessons").glob("S*.json")):
    les = json.loads(pad.read_text(encoding="utf-8"))
    n_les += 1
    oef = les.get("oefeningen", [])
    telt = [o for o in oef if o.get("soort") != "set"]
    if telt and len(telt) < 5:
        fouten.append(f"{les['id']}: {len(telt)} oefeningen (minimaal 5, anders is 80% niet te halen met één fout)")
    for i, o in enumerate(oef):
        waar = f"{les['id']} oefening {i + 1}"
        s = o.get("soort")
        if s not in SOORTEN:
            fouten.append(f"{waar}: onbekende soort {s}")
        elif s == "typ":
            goed = o.get("goed", o["toon"])
            if len(goed.split()) > 2 and not zin_ok(goed):  # losse woorden (de winkel) hebben geen punt
                fouten.append(f"{waar}: zin zonder hoofdletter of punt: {goed}")
        elif s == "tegels" and not zin_ok(o["zin"]):
            fouten.append(f"{waar}: zin zonder hoofdletter of punt: {o['zin']}")
        elif s == "gat":
            m = re.search(r"\{([^}]+)\}", o["zin"])
            if not m or m.group(1) not in o.get("opties", []):
                fouten.append(f"{waar}: het goede woord staat niet bij de opties")
        elif s == "formulier":
            formulier(waar, o)
        elif s == "opdracht":
            taak(waar, o["taak"])
        elif s == "set" and not (ROOT / "toets" / f"{o['goed']}.json").exists():
            fouten.append(f"{waar}: set {o['goed']} bestaat niet")

n_set = 0
for pad in sorted((ROOT / "toets").glob("*.json")):
    if pad.name == "index.json":
        continue
    n_set += 1
    data = json.loads(pad.read_text(encoding="utf-8"))
    if len(data["items"]) != 4:
        fouten.append(f"{pad.name}: {len(data['items'])} opdrachten (moet 4 zijn)")
    for i, t in enumerate(data["items"]):
        waar = f"{pad.name} opdracht {i + 1}"
        if t["soort"] == "formulier":
            formulier(waar, t, met_model=True)
        else:
            taak(waar, t)

for f in fouten:
    print("✗", f)
print(f"schrijven: {n_les} lessen en {n_set} sets gecontroleerd: {len(fouten)} fouten")
sys.exit(1 if fouten else 0)
