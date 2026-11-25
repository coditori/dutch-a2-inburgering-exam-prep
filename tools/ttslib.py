"""Piper-spraak voor alle examens. Gebruik vanuit een script per examen:

    from ttslib import maak
    maak(["Goedemorgen.", "Hoe laat is het?"], map_=ROOT / "luisteren" / "audio", stem="nl_NL-ronnie-medium")
    maak(zinnen, map_=..., stem="nl_BE-nathalie-medium", langzaam=True)   # extra: langzame versie (length_scale 1.3)

Uitvoer: <map>/<code>.mp3 en <map>/index.json  (sleutel: tekst, of "stem|tekst" / "stem|langzaam|tekst" als sleutel_met_stem=True).
Stemmen staan in tools/voices (download: tools/.venv/bin/python -m piper.download_voices <stem> --data-dir tools/voices).
Draai met tools/.venv/bin/python (Piper heeft Python 3.12 nodig).
"""
import base64
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
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


def sleutel_google():
    pad = ROOT / "tools" / "google-sleutel.txt"
    s = os.environ.get("GOOGLE_TTS_API_KEY") or (pad.read_text(encoding="utf-8").strip() if pad.exists() else "")
    if not s:
        sys.exit("Geen sleutel van Google: zet hem in tools/google-sleutel.txt of in GOOGLE_TTS_API_KEY.")
    return s


def met_google(naam, tekst, uit):
    """Google Cloud Text-to-Speech: we vragen geluid zonder compressie en maken er zelf een mp3 van (mono, 48 kbps, zoals de andere stemmen)"""
    lijf = {"input": {"text": tekst}, "voice": {"languageCode": naam[:5], "name": naam}, "audioConfig": {"audioEncoding": "LINEAR16"}}
    vraag = urllib.request.Request("https://texttospeech.googleapis.com/v1/text:synthesize", data=json.dumps(lijf).encode("utf-8"),
                                   headers={"X-Goog-Api-Key": sleutel_google(), "Content-Type": "application/json"})
    # 429 = te veel vragen per minuut: wachten en opnieuw (tot een kwartier). Draai daarom ook niet meer dan één stem tegelijk.
    for poging in range(15):
        try:
            with urllib.request.urlopen(vraag, timeout=120) as r:
                geluid = base64.b64decode(json.load(r)["audioContent"])
            break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and poging < 14:
                time.sleep(60)
                continue
            sys.exit(f"Google weigert ({e.code}): {e.read().decode('utf-8', 'replace')[:400]}")
        except (urllib.error.URLError, TimeoutError):
            if poging == 14:
                raise
            time.sleep(30)
    if len(geluid) < 2000:
        sys.exit(f"Google gaf geen geluid bij: {tekst!r}")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "wav", "-i", "-", "-ac", "1", "-b:a", "48k", str(uit)], input=geluid, check=True)


def maak_google(teksten, map_, stem, sleutel_met_stem=False):
    """Zoals maak(), maar met een stem van Google (stem = de naam bij Google, bijvoorbeeld nl-NL-Chirp3-HD-Charon). Geen langzame
    opnamen: de pagina speelt de gewone opname dan langzamer af. Kost tegoed bij Google: het script dat dit gebruikt vraagt om --ja."""
    import tts  # de uitspraak: "dag / doei" wordt "dag, doei"
    map_ = Path(map_)
    map_.mkdir(parents=True, exist_ok=True)
    index_pad = map_ / "index.json"
    index = json.loads(index_pad.read_text(encoding="utf-8")) if index_pad.exists() else {}
    nieuw = 0
    for t in dict.fromkeys(teksten):
        sleutel = f"{stem}|{t}" if sleutel_met_stem else t
        naam = hashlib.sha1(f"{stem}|{t}".encode("utf-8")).hexdigest()[:12] + ".mp3"
        if index.get(sleutel) == naam and (map_ / naam).exists():
            continue
        met_google(stem, tts.uitspraak(t), map_ / naam)
        index[sleutel] = naam
        nieuw += 1
        index_pad.write_text(json.dumps(index, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
        if nieuw % 100 == 0:
            print(f"  {nieuw} nieuw", flush=True)
    return nieuw


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
