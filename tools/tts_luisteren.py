#!/usr/bin/env python3
"""Maakt de mp3's van de rollen in de gesprekken van Luisteren met Piper (drie stemmen), in luisteren/audio/.

    tools/.venv/bin/python tools/tts_luisteren.py

Stemmen: A = nl_NL-ronnie-medium (man), B = nl_BE-nathalie-medium (vrouw), C = nl_NL-pim-medium (man 2).
Lessen: elke regel gewoon + langzaam. Toetsen en trainers: alleen gewoon. Slaat over wat er al is.
De sleutel in luisteren/audio/index.json is "stem|tekst" of "stem|langzaam|tekst" (zie luisteren/luisteren.js).
Wat de verteller voorleest (woordkaart, dictee, trainers getallen en paren) staat per stem in luisteren/audio/<stem>/, met de
sleutel van rol A: die opnamen maakt tools/tts_stemmen.py.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ttslib import maak  # noqa: E402
from woordenlib import ROOT, lessen, overig  # noqa: E402

STEM = {"A": "nl_NL-ronnie-medium", "B": "nl_BE-nathalie-medium", "C": "nl_NL-pim-medium"}
UIT = ROOT / "luisteren" / "audio"


def rollen():
    """(gewoon, langzaam) per spreker: de regels van de gesprekken. Die houden hun vaste stem, welke verteller de leerling ook kiest."""
    gewoon = {s: [] for s in STEM}
    langzaam = {s: [] for s in STEM}
    for _, les in lessen("luisteren"):
        for it in les["items"]:
            for r in it["regels"]:
                gewoon[r.get("s", "A")].append(r["t"])
                langzaam[r.get("s", "A")].append(r["t"])
    for pad, data in overig("luisteren"):
        items = data.get("items", [])
        met_rol = any("s" in it for it in items)  # trainer nietwel: een man en een vrouw om en om
        for it in items:
            for r in it.get("regels", []):
                gewoon[r.get("s", "A")].append(r["t"])
            if "t" in it and not it.get("regels") and met_rol:
                gewoon[it.get("s", "A")].append(it["t"])
    return gewoon, langzaam


def verteller():
    """(gewoon, langzaam): wat de verteller voorleest en geen rol in een gesprek is. De leerling kan daar een andere stem voor kiezen
    (tools/tts_stemmen.py). Op de pagina's zijn dit de regels met v: 1 (woordkaart, dictee, trainers getallen en paren)."""
    gewoon, langzaam = [], []
    for _, les in lessen("luisteren"):
        for w in les.get("woorden", []):
            gewoon += [w["nl"], w["zin"]]
        for z in les.get("dictee", []):
            gewoon.append(z)
            langzaam.append(z)
    for pad, data in overig("luisteren"):
        items = data.get("items", [])
        rollen = any("s" in it for it in items)  # trainer nietwel: een man en een vrouw om en om, dat blijft zo
        for it in items:
            if "t" in it and not it.get("regels") and not rollen:
                gewoon.append(it["t"])
            gewoon += it.get("vormen", [])
    return list(dict.fromkeys(gewoon)), list(dict.fromkeys(langzaam))


if __name__ == "__main__":
    gewoon, langzaam = rollen()
    n = 0
    for s, stem in STEM.items():
        n += maak(gewoon[s], UIT, stem, sleutel_met_stem=True)
        n += maak(langzaam[s], UIT, stem, langzaam=True, sleutel_met_stem=True)
    print(f"{n} nieuwe mp3's in {UIT}")
