#!/usr/bin/env python3
"""Maakt mp3's voor alle woorden van de site (stem: Piper, nl_NL-ronnie-medium):
de woordkaarten van de lessen van alle vijf examens met hun zin, de onthoud-zinnen van Lezen,
en elk woord van de woordenlijst (shared/woorden.js) met zijn voorbeeldzin. Draai eerst tools/bouw.py.

Eén keer klaarzetten (Piper heeft Python 3.12 nodig):
    uv venv --python 3.12 tools/.venv
    uv pip install --python tools/.venv/bin/python piper-tts
    tools/.venv/bin/python -m piper.download_voices nl_NL-ronnie-medium --data-dir tools/voices

Draaien (slaat over wat er al is):
    tools/.venv/bin/python tools/tts.py

Uitvoer: shared/audio/<code>.mp3 en shared/audio/index.json (tekst -> bestand).
Staat een tekst niet in index.json, dan gebruikt de pagina de stem van de browser. Die klinkt op veel computers slecht
(een robotstem, soms met ruis). Daarom heeft elk woord dat een leerling kan aanklikken hier een mp3.
"""
import hashlib
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import re  # noqa: E402

from woordenlib import EXAMENS, ROOT, lessen  # noqa: E402  (de teksten en gesprekken van Luisteren, Spreken en KNM: zie tools/ttslib.py)

STEM = ROOT / "tools" / "voices" / "nl_NL-ronnie-medium.onnx"
UIT = ROOT / "shared" / "audio"


def teksten():
    uit = []
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


def main():
    from piper import PiperVoice
    stem = PiperVoice.load(str(STEM))
    UIT.mkdir(parents=True, exist_ok=True)
    index_pad = UIT / "index.json"
    index = json.loads(index_pad.read_text(encoding="utf-8")) if index_pad.exists() else {}
    nieuw = 0
    for t in teksten():
        naam = hashlib.sha1(t.encode("utf-8")).hexdigest()[:12] + ".mp3"
        if index.get(t) == naam and (UIT / naam).exists():
            continue
        with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
            with wave.open(tmp.name, "wb") as w:
                stem.synthesize_wav(uitspraak(t), w)
            # het einde loopt zacht weg (80 ms): Piper laat aan het einde wat ruis staan, en zonder dit eindigt het bestand met een tik
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-af", "areverse,afade=t=in:d=0.08,areverse", "-ac", "1", "-b:a", "48k", str(UIT / naam)], check=True)
        index[t] = naam
        nieuw += 1
    index_pad.write_text(json.dumps(index, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    print(f"{nieuw} nieuwe mp3's, {len(index)} in totaal in {UIT}")


if __name__ == "__main__":
    main()
