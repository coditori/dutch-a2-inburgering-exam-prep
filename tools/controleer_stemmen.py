#!/usr/bin/env python3
"""Controleert de stemmen van de verteller: heeft elke stem een opname van elke tekst met een luidspreker-knop?

    python3 tools/controleer_stemmen.py

Kijkt per stem uit shared/stemmen.json en per map (shared, knm, spreken, luisteren) of elke tekst van de verteller in de
index.json van die stem staat en of het mp3-bestand er is. Elke stem staat in audio/<id>/.
Ook: de stemmen en de standaard-stem in shared/stemmen.json zijn dezelfde als STEMMEN en STANDAARD in shared/audio.js, de proefzin
is dezelfde als in tools/tts.py, en in audio/ zelf staat geen opname die bij geen vaste stem hoort.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import tts  # noqa: E402
import tts_luisteren  # noqa: E402
import tts_spreken  # noqa: E402
from tts_stemmen import ROOT, sleutels, stemmen  # noqa: E402

fouten = []
lijst = stemmen()
js = (ROOT / "shared" / "audio.js").read_text(encoding="utf-8")
in_js = re.findall(r"'([^']+)'", re.search(r"const STEMMEN = \[([^\]]*)\]", js).group(1))
standaard = re.search(r"const STANDAARD = '([^']+)'", js).group(1)
proef = re.search(r"const PROEF = '([^']+)'", js).group(1)
ids = [s["id"] for s in lijst["stemmen"]]
if lijst["standaard"] != standaard:
    fouten.append(f"standaard: shared/stemmen.json zegt {lijst['standaard']!r}, shared/audio.js zegt {standaard!r}")
if standaard not in ids:
    fouten.append(f"de stem {standaard!r} staat niet in shared/stemmen.json")
if in_js != ids:
    fouten.append(f"stemmen: shared/stemmen.json heeft {ids}, shared/audio.js heeft {in_js}")
if proef != tts.PROEF:
    fouten.append("de proefzin in shared/audio.js is anders dan in tools/tts.py")

werk = sleutels()
for s in lijst["stemmen"]:
    mist = totaal = 0
    for map_, rijen in werk.items():
        pad = ROOT / map_ / "audio" / s["id"]
        index = json.loads((pad / "index.json").read_text(encoding="utf-8")) if (pad / "index.json").exists() else {}
        for k, _, langzaam in rijen:
            if langzaam and (s.get("elevenlabs") or s.get("google")):
                continue  # geen langzame opname: de pagina speelt de gewone langzamer af
            totaal += 1
            f = index.get(k)
            if not f or not (pad / f).exists() or (pad / f).stat().st_size < 500:
                mist += 1
                if mist <= 5:
                    fouten.append(f"{s['id']}: geen opname in {map_} voor {k!r}")
    print(f"{s['id']}: {totaal - mist} van {totaal} teksten hebben een opname")
    if mist > 5:
        fouten.append(f"{s['id']}: en nog {mist - 5} teksten zonder opname")
# audio/ zelf: alleen de vaste stemmen (de rollen van Luisteren, de vragen van Spreken)
gewoon, langzaam = tts_luisteren.rollen()
vast = {
    "shared": set(), "knm": set(), "spreken": set(tts_spreken.verzamel()[0]),
    "luisteren": {f"{tts_luisteren.STEM[s]}|{t}" for s in gewoon for t in gewoon[s]} | {f"{tts_luisteren.STEM[s]}|langzaam|{t}" for s in langzaam for t in langzaam[s]},
}
for map_, sleutels_ in vast.items():
    pad = ROOT / map_ / "audio"
    index = json.loads((pad / "index.json").read_text(encoding="utf-8")) if (pad / "index.json").exists() else {}
    over = len(set(index) - sleutels_) + len({p.name for p in pad.glob("*.mp3")} - set(index.values()))
    mist = sum(1 for k in sleutels_ if k not in index or not (pad / index[k]).exists())
    print(f"{map_}/audio: {len(sleutels_) - mist} van {len(sleutels_)} vaste opnamen")
    if over:
        fouten.append(f"{map_}/audio: {over} opnamen of regels in index.json horen bij geen vaste stem")
    if mist:
        fouten.append(f"{map_}/audio: {mist} vaste opnamen ontbreken")
for f in fouten:
    print("✗", f)
sys.exit(1 if fouten else 0)
