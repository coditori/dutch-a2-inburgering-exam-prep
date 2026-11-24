#!/usr/bin/env python3
"""Maakt de opnamen van de vertellers: de leerling kiest de stem bij Instellingen (shared/audio.js).

    tools/.venv/bin/python tools/tts_stemmen.py                    # alle stemmen uit shared/stemmen.json, alleen wat nog ontbreekt
    tools/.venv/bin/python tools/tts_stemmen.py --stem leda --ja           # Google: alles wat nog ontbreekt (dit gebruikt tegoed)
    tools/.venv/bin/python tools/tts_stemmen.py --stem emma --proef 20     # ElevenLabs: eerst 20 teksten om te luisteren
    tools/.venv/bin/python tools/tts_stemmen.py --stem emma --ja           # ElevenLabs: alles (dit kost tegoed)
    python3 tools/schoon_audio.py                                  # daarna (Piper): begin en einde stil maken
    python3 tools/controleer_stemmen.py                            # heeft elke stem elke tekst?

Elke stem krijgt <examen>/audio/<id>/ met een eigen index.json, met precies dezelfde sleutels. Alleen wat de verteller
voorleest: de rollen in de gesprekken van Luisteren en de vragen van Spreken houden hun vaste stemmen, in <examen>/audio/ zelf
(tools/tts_luisteren.py, tools/tts_spreken.py).

shared/stemmen.json: per stem "piper" (naam van het model in tools/voices), "google" (naam van de stem, bijvoorbeeld
nl-NL-Chirp3-HD-Leda; sleutel in tools/google-sleutel.txt of GOOGLE_TTS_API_KEY) of "elevenlabs" (het voice ID).
ElevenLabs heeft een sleutel nodig: in de omgeving (ELEVENLABS_API_KEY) of in tools/elevenlabs-sleutel.txt (staat niet in git).
"""
import argparse
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

sys.path.insert(0, str(Path(__file__).parent))
import tts  # noqa: E402
import tts_knm  # noqa: E402
import tts_luisteren  # noqa: E402
import tts_spreken  # noqa: E402
from ttslib import ROOT, STEMMEN  # noqa: E402

LIJST = ROOT / "shared" / "stemmen.json"
ROL_A = tts_luisteren.STEM["A"]  # in Luisteren heeft een regel van de verteller de sleutel van rol A (luisteren/luisteren.js)
MODEL = "eleven_v4"  # ElevenLabs; met language_code "nl" leest het ook een los woord Nederlands


def stemmen():
    return json.loads(LIJST.read_text(encoding="utf-8"))


def sleutels():
    """{map: [(sleutel in index.json, tekst, langzaam)]}: alles wat de verteller voorleest"""
    gewoon, langzaam = tts_luisteren.verteller()
    return {
        "shared": [(t, t, False) for t in tts.teksten()],
        "knm": [(t, t, False) for t in tts_knm.teksten()],
        "spreken": [(t, t, False) for t in tts_spreken.verzamel()[1]],
        "luisteren": [(f"{ROL_A}|{t}", t, False) for t in gewoon] + [(f"{ROL_A}|langzaam|{t}", t, True) for t in langzaam],
    }


def bestand(sleutel):
    return hashlib.sha1(sleutel.encode("utf-8")).hexdigest()[:12] + ".mp3"


_piper = {}


def met_piper(model, tekst, langzaam, uit):
    from piper import PiperVoice, SynthesisConfig
    if model not in _piper:
        _piper[model] = PiperVoice.load(str(STEMMEN / f"{model}.onnx"))
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        with wave.open(tmp.name, "wb") as w:
            _piper[model].synthesize_wav(tekst, w, syn_config=SynthesisConfig(length_scale=1.3 if langzaam else 1.0))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-ac", "1", "-b:a", "48k", str(uit)], check=True)


def sleutel_elevenlabs():
    pad = ROOT / "tools" / "elevenlabs-sleutel.txt"
    s = os.environ.get("ELEVENLABS_API_KEY") or (pad.read_text(encoding="utf-8").strip() if pad.exists() else "")
    if not s:
        sys.exit("Geen sleutel van ElevenLabs: zet hem in tools/elevenlabs-sleutel.txt of in ELEVENLABS_API_KEY.")
    return s


def met_elevenlabs(voice, tekst, uit, model):
    lijf = {"text": tekst, "model_id": model, "seed": 7}
    if model != "eleven_multilingual_v2":
        lijf["language_code"] = "nl"
    vraag = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_64",
        data=json.dumps(lijf).encode("utf-8"), headers={"xi-api-key": sleutel_elevenlabs(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(vraag, timeout=120) as r:
            geluid = r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs weigert ({e.code}): {e.read().decode('utf-8', 'replace')[:400]}")
    if len(geluid) < 500:
        sys.exit(f"ElevenLabs gaf geen geluid bij: {tekst!r}")
    uit.write_bytes(geluid)


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


def betaald(s):
    """een stem van een dienst met tegoed (ElevenLabs, Google): geen langzame opnamen, en alleen draaien met --proef of --ja"""
    return bool(s.get("elevenlabs") or s.get("google"))


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--stem", help="id uit shared/stemmen.json (zonder: alle stemmen)")
    a.add_argument("--proef", type=int, default=0, help="alleen dit aantal teksten per stem, verdeeld over de mappen")
    a.add_argument("--ja", action="store_true", help="ElevenLabs of Google: ja, gebruik het tegoed voor alle teksten")
    a.add_argument("--model", default=MODEL, help="model van ElevenLabs")
    o = a.parse_args()
    werk = sleutels()
    for s in stemmen()["stemmen"]:
        if (o.stem and s["id"] != o.stem) or not (s.get("piper") or betaald(s)):
            continue
        open_ = []  # (map, sleutel, tekst, langzaam)
        for map_, rijen in werk.items():
            pad = ROOT / map_ / "audio" / s["id"]
            index = json.loads((pad / "index.json").read_text(encoding="utf-8")) if (pad / "index.json").exists() else {}
            # ElevenLabs en Google: geen langzame opnamen; de pagina speelt de gewone opname dan langzamer af
            nodig = [(map_, k, t, lz) for k, t, lz in rijen if not (index.get(k) and (pad / index[k]).exists()) and not (lz and betaald(s))]
            open_ += nodig[:max(1, o.proef // len(werk))] if o.proef else nodig
        tekens = sum(len(tts.uitspraak(t)) for _, _, t, _ in open_)
        print(f"{s['id']}: {len(open_)} teksten te maken, {tekens} tekens")
        if betaald(s) and not (o.proef or o.ja):
            print("  Deze stem gebruikt tegoed bij een dienst: draai met --proef 20 om te luisteren, of met --ja voor alles.")
            continue
        for n, (map_, k, t, lz) in enumerate(open_, 1):
            pad = ROOT / map_ / "audio" / s["id"]
            pad.mkdir(parents=True, exist_ok=True)
            if s.get("piper"):
                met_piper(s["piper"], tts.uitspraak(t), lz, pad / bestand(k))
            elif s.get("google"):
                met_google(s["google"], tts.uitspraak(t), pad / bestand(k))
            else:
                met_elevenlabs(s["elevenlabs"], tts.uitspraak(t), pad / bestand(k), o.model)
            ipad = pad / "index.json"
            index = json.loads(ipad.read_text(encoding="utf-8")) if ipad.exists() else {}
            index[k] = bestand(k)
            ipad.write_text(json.dumps(index, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
            if n % 200 == 0:
                print(f"  {n} / {len(open_)}", flush=True)


if __name__ == "__main__":
    main()
