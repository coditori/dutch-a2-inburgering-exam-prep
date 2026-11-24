#!/usr/bin/env python3
"""Maakt de mp3's van de vragen van spreken/ (Piper).

    tools/.venv/bin/python tools/tts_spreken.py

Vragen krijgen om en om een mannenstem en een vrouwenstem (op het examen vraagt een man of een vrouw iets). Uitvoer:
spreken/audio/*.mp3 + index.json (tekst -> bestand). De voorbeeldantwoorden, nazeg-zinnen, woorden en patronen leest de
verteller voor: die opnamen maakt tools/tts_stemmen.py, per stem in spreken/audio/<stem>/.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ttslib import ROOT, maak  # noqa: E402

MAP = ROOT / "spreken" / "audio"


def verzamel():
    """(vragen, rest): de vragen hebben vaste stemmen (een man en een vrouw om en om); de rest leest de verteller voor"""
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
    return vragen, rest


def main():
    vragen, rest = verzamel()
    n = maak(vragen[0::2], MAP, stem="nl_NL-pim-medium")
    n += maak(vragen[1::2], MAP, stem="nl_BE-nathalie-medium")
    print(f"{n} nieuwe mp3's; {len(vragen)} vragen in {MAP}")


if __name__ == "__main__":
    main()
