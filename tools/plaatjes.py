#!/usr/bin/env python3
"""Maakt de foto's van de oefenexamens met een beeldmodel van Google (Gemini API), zoals DUO echte foto's gebruikt.

    python3 tools/plaatjes.py            # laat zien wat er te maken is (kost niets)
    python3 tools/plaatjes.py --proef 3  # maakt er 3, om te kijken
    python3 tools/plaatjes.py --ja       # maakt alles wat ontbreekt (dit kost tegoed bij Google)

Sleutel: tools/gemini-sleutel.txt (Google AI Studio, aistudio.google.com/apikey; niet in git) of GEMINI_API_KEY.
De beschrijving van een foto staat in de JSON van de toetsen, in het Engels:
  knm/toets/*.json        elke vraag: "foto"
  spreken/toets/*.json    elke vraag: "fotos" (een per plaatje), onderdeel 1: "foto" (de persoon in de video)
  luisteren/toets/*.json  elk fragment: "foto" (de video of de foto bij het geluid)
Uitvoer: shared/fotos/<code>.jpg (640 breed) en shared/fotos/index.json (beschrijving -> bestand). De pagina's vinden een foto
met App.foto(beschrijving); is er (nog) geen foto, dan blijft het plaatje van emoji staan.
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
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UIT = ROOT / "shared" / "fotos"
API = "https://generativelanguage.googleapis.com/v1beta"
# elke foto krijgt dezelfde stijl: gewone mensen, gewone plekken in Nederland, geen tekst in het beeld
STIJL = ("Realistic documentary-style photograph, natural light, everyday life in the Netherlands, ordinary adults and children "
         "of diverse backgrounds, simple uncluttered composition, no text, no letters, no numbers, no signs, no logos, no watermark. Scene: ")


def sleutel():
    pad = ROOT / "tools" / "gemini-sleutel.txt"
    s = os.environ.get("GEMINI_API_KEY") or (pad.read_text(encoding="utf-8").strip() if pad.exists() else "")
    if not s:
        sys.exit("Geen sleutel: maak er een op aistudio.google.com/apikey en zet hem in tools/gemini-sleutel.txt.")
    return s


def vraag(pad, lijf=None):
    req = urllib.request.Request(API + pad, data=json.dumps(lijf).encode("utf-8") if lijf is not None else None,
                                 headers={"x-goog-api-key": sleutel(), "Content-Type": "application/json"})
    for poging in range(8):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            tekst = e.read().decode("utf-8", "replace")[:600]
            if e.code == 429 and "free_tier" in tekst and "limit: 0" in tekst:
                sys.exit("Het project van deze sleutel staat op de gratis laag van Google: daar mag geen enkel beeld (limiet 0). "
                         "Zet facturering (billing) aan voor dit project in AI Studio, of koppel uw tegoed van Google AI Pro, en probeer opnieuw.")
            # 402 = het tegoed is (even) op: bij Google soms een korte storing van de facturering, dus ook wachten en opnieuw
            if e.code in (402, 429, 500, 502, 503) and poging < 7:
                time.sleep(30 * (poging + 1))
                continue
            sys.exit(f"Google weigert ({e.code}): {tekst}")
    sys.exit("Google antwoordt niet.")


def model():
    """het beste beeldmodel dat deze sleutel mag gebruiken: Imagen (predict), anders een Gemini-model dat beelden maakt"""
    namen = []
    pagina = ""
    while True:
        d = vraag("/models?pageSize=200" + (f"&pageToken={pagina}" if pagina else ""))
        namen += [(m["name"], m.get("supportedGenerationMethods", [])) for m in d.get("models", [])]
        pagina = d.get("nextPageToken")
        if not pagina:
            break
    if os.environ.get("BEELDMODEL"):  # zelf kiezen, bijvoorbeeld BEELDMODEL=models/gemini-3-pro-image
        n = os.environ["BEELDMODEL"]
        return n, "predict" if "imagen" in n else "generateContent"
    imagen = sorted((n for n, m in namen if "imagen" in n and "predict" in m), reverse=True)
    if imagen:
        return imagen[0], "predict"
    # Gemini: liefst het gewone Flash-model (goed en niet duur); geen "lite" en geen "preview" als het anders kan
    gemini = [n for n, m in namen if "image" in n and "generateContent" in m]
    gemini.sort(key=lambda n: ("lite" in n, "preview" in n, "pro" in n, [-int(x) if x.isdigit() else 0 for x in n.replace("-", ".").split(".")]))
    if gemini:
        return gemini[0], "generateContent"
    sys.exit("Deze sleutel mag geen beelden maken (geen Imagen- of beeldmodel gevonden).")


def maak(naam, soort, beschrijving):
    """geeft de bytes van een png"""
    prompt = STIJL + beschrijving
    if soort == "predict":
        d = vraag(f"/{naam}:predict", {"instances": [{"prompt": prompt}], "parameters": {"sampleCount": 1, "aspectRatio": "4:3"}})
        return base64.b64decode(d["predictions"][0]["bytesBase64Encoded"])
    d = vraag(f"/{naam}:generateContent", {"contents": [{"parts": [{"text": prompt}]}],
                                           "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "4:3"}}})
    for deel in d["candidates"][0]["content"]["parts"]:
        if "inlineData" in deel:
            return base64.b64decode(deel["inlineData"]["data"])
    sys.exit(f"Geen beeld gekregen bij: {beschrijving}")


def beschrijvingen():
    """alle foto's die de toetsen vragen"""
    uit = []
    for p in sorted((ROOT / "knm" / "toets").glob("[A-Z].json")):
        uit += [v["foto"] for v in json.loads(p.read_text(encoding="utf-8")).get("vragen", []) if v.get("foto")]
    for p in sorted((ROOT / "spreken" / "toets").glob("[A-Z].json")):
        for it in json.loads(p.read_text(encoding="utf-8")).get("items", []):
            uit += [f for f in it.get("fotos", []) if f]
            if it.get("foto"):
                uit.append(it["foto"])
    for p in sorted((ROOT / "luisteren" / "toets").glob("[A-Z].json")):
        uit += [it["foto"] for it in json.loads(p.read_text(encoding="utf-8")).get("items", []) if it.get("foto")]
    return list(dict.fromkeys(uit))


def main():
    UIT.mkdir(parents=True, exist_ok=True)
    index_pad = UIT / "index.json"
    index = json.loads(index_pad.read_text(encoding="utf-8")) if index_pad.exists() else {}
    alle = beschrijvingen()
    open_ = [b for b in alle if not (index.get(b) and (UIT / index[b]).exists())]
    print(f"{len(alle)} foto's in de toetsen, {len(open_)} nog te maken")
    proef = int(sys.argv[sys.argv.index("--proef") + 1]) if "--proef" in sys.argv else 0
    if not proef and "--ja" not in sys.argv:
        sys.exit("Dit kost tegoed bij Google. Draai met --proef 3 om te kijken, of met --ja voor alles.")
    naam, soort = model()
    print(f"model: {naam}")
    for n, b in enumerate(open_[:proef] if proef else open_, 1):
        code = hashlib.sha1(b.encode("utf-8")).hexdigest()[:12] + ".jpg"
        with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
            Path(tmp.name).write_bytes(maak(naam, soort, b))
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-vf", "scale=640:-2", "-q:v", "5", str(UIT / code)], check=True)
        index[b] = code
        index_pad.write_text(json.dumps(index, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
        print(f"  {n}: {code}  {b[:70]}", flush=True)
    # opruimen: foto's die geen toets meer vraagt
    nodig = set(alle)
    index = {k: v for k, v in index.items() if k in nodig}
    index_pad.write_text(json.dumps(index, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    for p in UIT.glob("*.jpg"):
        if p.name not in set(index.values()):
            p.unlink()


if __name__ == "__main__":
    main()
