#!/usr/bin/env python3
"""Maakt mp3's voor de woorden van de KNM-thema's (woord + zin) in knm/audio/.

    tools/.venv/bin/python tools/tts_knm.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ttslib import ROOT, maak  # noqa: E402

teksten = []
for p in sorted((ROOT / "knm" / "themes").glob("*.json")):
    if p.name == "index.json":
        continue
    for w in json.loads(p.read_text(encoding="utf-8"))["woorden"]:
        teksten += [w["nl"], w["zin"].replace("{", "").replace("}", "")]
print(maak(teksten, ROOT / "knm" / "audio", stem="nl_NL-ronnie-medium"), "nieuwe mp3's voor KNM")
