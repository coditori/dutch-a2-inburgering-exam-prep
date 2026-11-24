#!/usr/bin/env python3
"""Maakt de mp3's voor spreken/ (Piper): vragen, voorbeeldantwoorden, nazeg-zinnen, woorden en de patronen.

    tools/.venv/bin/python tools/tts_spreken.py

Vragen krijgen om en om de stem van Pim en Nathalie (op het examen vraagt een man of een vrouw iets);
de voorbeelden en nazeg-zinnen zijn van Ronnie. Uitvoer: spreken/audio/*.mp3 + index.json (tekst -> bestand).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ttslib import ROOT, maak  # noqa: E402

MAP = ROOT / "spreken" / "audio"


def main():
    vragen, rest = [], []
    bestanden = sorted((ROOT / "spreken" / "lessons").glob("P*.json")) + sorted(p for p in (ROOT / "spreken" / "toets").glob("*.json") if p.name != "index.json")
    for pad in bestanden:
        data = json.loads(pad.read_text(encoding="utf-8"))
        for w in data.get("woorden", []):
            rest += [w["nl"], w.get("zin", "")]
        for it in data["items"]:
            if it["soort"] == "zegna":
                rest.append(it["tekst"])
            elif it["soort"] == "kaart":
                vragen.append(it["vraag"])
                rest.append(it["model"])
            else:
                vragen.append(" ".join(x for x in (it.get("sit"), it["vraag"]) if x))
                rest += it["model"]
    p = json.loads((ROOT / "spreken" / "patronen.json").read_text(encoding="utf-8"))
    for blok in p["patronen"] + p["formules"]:
        rest += [z["nl"] for z in blok["zinnen"]]
    vragen = list(dict.fromkeys(vragen))
    rest = [t for t in dict.fromkeys(rest) if t and t not in vragen]
    n = maak(vragen[0::2], MAP, stem="nl_NL-pim-medium")
    n += maak(vragen[1::2], MAP, stem="nl_BE-nathalie-medium")
    n += maak(rest, MAP, stem="nl_NL-ronnie-medium")
    print(f"{n} nieuwe mp3's; {len(vragen)} vragen en {len(rest)} zinnen in {MAP}")


if __name__ == "__main__":
    main()
