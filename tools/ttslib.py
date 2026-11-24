"""Piper-spraak voor alle examens. Gebruik vanuit een script per examen:

    from ttslib import maak
    maak(["Goedemorgen.", "Hoe laat is het?"], map_=ROOT / "luisteren" / "audio", stem="nl_NL-ronnie-medium")
    maak(zinnen, map_=..., stem="nl_BE-nathalie-medium", langzaam=True)   # extra: langzame versie (length_scale 1.3)

Uitvoer: <map>/<code>.mp3 en <map>/index.json  (sleutel: tekst, of "stem|tekst" / "stem|langzaam|tekst" als sleutel_met_stem=True).
Stemmen staan in tools/voices (download: tools/.venv/bin/python -m piper.download_voices <stem> --data-dir tools/voices).
Draai met tools/.venv/bin/python (Piper heeft Python 3.12 nodig).
"""
import hashlib
import json
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STEMMEN = ROOT / "tools" / "voices"
_geladen = {}


def _stem(naam):
    if naam not in _geladen:
        from piper import PiperVoice
        _geladen[naam] = PiperVoice.load(str(STEMMEN / f"{naam}.onnx"))
    return _geladen[naam]


def maak(teksten, map_, stem="nl_NL-ronnie-medium", langzaam=False, sleutel_met_stem=False):
    """maakt mp3's voor teksten die er nog niet zijn; geeft het aantal nieuwe bestanden"""
    from piper import SynthesisConfig
    map_ = Path(map_)
    map_.mkdir(parents=True, exist_ok=True)
    index_pad = map_ / "index.json"
    index = json.loads(index_pad.read_text(encoding="utf-8")) if index_pad.exists() else {}
    nieuw = 0
    for t in dict.fromkeys(teksten):
        sleutel = t if not sleutel_met_stem else "|".join([stem] + (["langzaam"] if langzaam else []) + [t])
        naam = hashlib.sha1((stem + ("|langzaam|" if langzaam else "|") + t).encode("utf-8")).hexdigest()[:12] + ".mp3"
        if index.get(sleutel) == naam and (map_ / naam).exists():
            continue
        with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
            with wave.open(tmp.name, "wb") as w:
                _stem(stem).synthesize_wav(t, w, syn_config=SynthesisConfig(length_scale=1.3 if langzaam else 1.0))
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-ac", "1", "-b:a", "48k", str(map_ / naam)], check=True)
        index[sleutel] = naam
        nieuw += 1
        index_pad.write_text(json.dumps(index, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    return nieuw
