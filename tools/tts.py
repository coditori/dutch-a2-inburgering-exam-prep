#!/usr/bin/env python3
"""Maakt mp3's voor de woordkaarten en de onthoud-zinnen van de lessen (stem: Piper, nl_NL-ronnie-medium).

Eén keer klaarzetten (Piper heeft Python 3.12 nodig):
    uv venv --python 3.12 tools/.venv
    uv pip install --python tools/.venv/bin/python piper-tts
    tools/.venv/bin/python -m piper.download_voices nl_NL-ronnie-medium --data-dir tools/voices

Draaien (slaat over wat er al is):
    tools/.venv/bin/python tools/tts.py

Uitvoer: shared/audio/<code>.mp3 en shared/audio/index.json (tekst -> bestand).
Staat een tekst niet in index.json, dan gebruikt de pagina de stem van de browser.
"""
import hashlib
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from woordenlib import ROOT, lessen  # noqa: E402  (alleen Lezen; andere examens: zie tools/ttslib.py)

STEM = ROOT / "tools" / "voices" / "nl_NL-ronnie-medium.onnx"
UIT = ROOT / "shared" / "audio"


def teksten():
    uit = []
    for _, les in lessen():
        for w in les.get("woorden", []):
            uit += [w["nl"], w["zin"]]
        for z in les.get("onthoud", []):
            uit.append(z.replace("{", "").replace("}", ""))
    return list(dict.fromkeys(uit))


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
                stem.synthesize_wav(t, w)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-ac", "1", "-b:a", "48k", str(UIT / naam)], check=True)
        index[t] = naam
        nieuw += 1
    index_pad.write_text(json.dumps(index, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    print(f"{nieuw} nieuwe mp3's, {len(index)} in totaal in {UIT}")


if __name__ == "__main__":
    main()
