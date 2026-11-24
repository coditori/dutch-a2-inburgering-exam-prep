#!/usr/bin/env python3
"""De teksten met een luidspreker-knop die bij alle examens horen (shared/audio/<stem>/):
de woordkaarten van de lessen van alle vijf examens met hun zin, de onthoud-zinnen van Lezen,
en elk woord van de woordenlijst (shared/woorden.js) met zijn voorbeeldzin. Draai eerst tools/bouw.py.

Dit script maakt zelf geen opnamen: dat doet tools/tts_stemmen.py, voor elke stem uit shared/stemmen.json.
Staat een tekst niet in de index.json van een stem, dan blijft het stil: de site gebruikt nooit de stem van de browser.
Daarom heeft elk woord dat een leerling kan aanklikken een mp3 (tools/controleer_stemmen.py kijkt of dat klopt).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import re  # noqa: E402

from woordenlib import EXAMENS, ROOT, lessen  # noqa: E402  (de teksten en gesprekken van Luisteren, Spreken en KNM: zie tools/ttslib.py)

PROEF = "Goedemorgen. Ik lees de woorden en de zinnen voor."  # de proef van een stem op de pagina Instellingen (shared/audio.js: PROEF)


def teksten():
    uit = [PROEF]
    for x in EXAMENS:
        for _, les in lessen(x):
            for w in les.get("woorden", []) or []:
                if isinstance(w, dict):
                    uit += [w.get("nl"), w.get("zin")]
            if x == "lezen":
                for z in les.get("onthoud", []):
                    uit.append(z.replace("{", "").replace("}", ""))
    # de woordenlijst: elk woord en zijn voorbeeldzin (Herhalen, de ladder op de startpagina, de pop-up bij een woord)
    js = (ROOT / "shared" / "woorden.js").read_text(encoding="utf-8")
    for rij in json.loads(js[js.index("{"):js.rindex("}") + 1])["lijst"]:
        uit += [rij[1], rij[6] if len(rij) > 6 else None]
    return list(dict.fromkeys(t for t in uit if t and t.strip()))


def uitspraak(t):
    """Wat de stem zegt bij een tekst. 'dag / doei' -> 'dag, doei' (geen 'schuine streep'); '...' en haakjes worden een korte pauze."""
    t = t.replace(" / ", ", ").replace("/", ", ")
    t = re.sub(r"\s*\.\.\.\s*", ", ", t)
    t = re.sub(r"[()]", "", t)
    return re.sub(r"\s+", " ", re.sub(r",\s*([,.?!])", r"\1", t)).strip(" ,") or t
