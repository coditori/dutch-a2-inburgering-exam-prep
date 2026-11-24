#!/usr/bin/env python3
"""Maakt de mp3's voor Luisteren met Piper (drie stemmen), in luisteren/audio/.

    tools/.venv/bin/python tools/tts_luisteren.py

Stemmen: A = nl_NL-ronnie-medium (man), B = nl_BE-nathalie-medium (vrouw), C = nl_NL-pim-medium (man 2).
Lessen: elke regel gewoon + langzaam. Toetsen en trainers: alleen gewoon. Slaat over wat er al is.
De sleutel in luisteren/audio/index.json is "stem|tekst" of "stem|langzaam|tekst" (zie luisteren/luisteren.js).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ttslib import maak  # noqa: E402
from woordenlib import ROOT, lessen, overig  # noqa: E402

STEM = {"A": "nl_NL-ronnie-medium", "B": "nl_BE-nathalie-medium", "C": "nl_NL-pim-medium"}
UIT = ROOT / "luisteren" / "audio"


def verzamel():
    gewoon = {s: [] for s in STEM}
    langzaam = {s: [] for s in STEM}
    for _, les in lessen("luisteren"):
        for w in les.get("woorden", []):
            gewoon["A"] += [w["nl"], w["zin"]]
        for it in les["items"]:
            for r in it["regels"]:
                gewoon[r.get("s", "A")].append(r["t"])
                langzaam[r.get("s", "A")].append(r["t"])
        for z in les.get("dictee", []):
            gewoon["A"].append(z)
            langzaam["A"].append(z)
    for pad, data in overig("luisteren"):
        for it in data.get("items", []):
            for r in it.get("regels", []):
                gewoon[r.get("s", "A")].append(r["t"])
            if "t" in it:
                gewoon[it.get("s", "A")].append(it["t"])
            for v in it.get("vormen", []):
                gewoon["A"].append(v)
    return gewoon, langzaam


if __name__ == "__main__":
    gewoon, langzaam = verzamel()
    n = 0
    for s, stem in STEM.items():
        n += maak(gewoon[s], UIT, stem, sleutel_met_stem=True)
        n += maak(langzaam[s], UIT, stem, langzaam=True, sleutel_met_stem=True)
    print(f"{n} nieuwe mp3's in {UIT}")
