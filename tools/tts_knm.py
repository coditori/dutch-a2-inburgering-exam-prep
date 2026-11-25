#!/usr/bin/env python3
"""De teksten met een luidspreker-knop van KNM (knm/audio/<stem>/): de woorden van de thema's (woord + zin), de vragen van
de weetjes en de situaties, en de vragen en de antwoorden van de toetsen (de knop "Luister" leest daar de situatie, de vraag en elk antwoord voor, zoals DUO).

Dit script maakt zelf geen opnamen: dat doet tools/tts_stemmen.py, voor elke stem uit shared/stemmen.json.
Elke tekst met een luidspreker-knop moet hier staan: de site gebruikt nooit de stem van de browser.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ttslib import ROOT  # noqa: E402


def teksten():
    """elke tekst van KNM met een luidspreker-knop"""
    teksten = []
    for p in sorted((ROOT / "knm" / "themes").glob("*.json")):
        if p.name == "index.json":
            continue
        thema = json.loads(p.read_text(encoding="utf-8"))
        for w in thema["woorden"]:
            teksten += [w["nl"], w["zin"].replace("{", "").replace("}", "")]
        # de vragen op de kaarten (weetjes, situaties, meer weetjes): knm/thema.html leest k.v voor
        for sleutel, waarde in thema.items():
            if sleutel != "woorden" and isinstance(waarde, list):
                teksten += [k["v"] for k in waarde if isinstance(k, dict) and k.get("v")]
    # de toetsen: knm/toets/toets.html leest de situatie en de vraag samen voor
    for p in sorted((ROOT / "knm" / "toets").glob("*.json")):
        if p.name == "index.json":
            continue
        toets = json.loads(p.read_text(encoding="utf-8"))
        if isinstance(toets, dict):
            for v in toets.get("vragen", []):
                teksten.append(" ".join(x for x in [v.get("sit"), v.get("v")] if x))
                teksten += v.get("o", [])  # zoals bij DUO wordt ook elk antwoord voorgelezen
    return [t for t in dict.fromkeys(teksten) if t and t.strip()]

