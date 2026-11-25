#!/usr/bin/env python3
"""Maakt de mp3's van de vragen van spreken/ met stemmen van Google.

    python3 tools/tts_spreken.py          # laat zien wat er te maken is
    python3 tools/tts_spreken.py --ja     # maakt het (dit kost tegoed bij Google; sleutel in tools/google-sleutel.txt)

Elke vraag krijgt een vaste stem: twee mannen en twee vrouwen, gekozen uit de tekst zelf (op het examen vraagt een man of een vrouw
iets in een video). Uitvoer: spreken/audio/*.mp3 + index.json (tekst -> bestand). Opnamen die niet meer gebruikt worden, gaan weg.
De voorbeeldantwoorden, nazeg-zinnen, woorden en patronen leest de verteller voor: die opnamen maakt tools/tts_stemmen.py,
per stem in spreken/audio/<stem>/.
"""
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ttslib import ROOT, maak_google  # noqa: E402

MANNEN = ["nl-NL-Chirp3-HD-Schedar", "nl-NL-Chirp3-HD-Achird"]
VROUWEN = ["nl-NL-Chirp3-HD-Despina", "nl-NL-Chirp3-HD-Sulafat"]
STEMMEN = MANNEN + VROUWEN
MAP = ROOT / "spreken" / "audio"


def verzamel():
    """(vragen, rest): de vragen hebben vaste stemmen (een man en een vrouw om en om); de rest leest de verteller voor"""
    vragen, rest = [], []
    bestanden = sorted((ROOT / "spreken" / "lessons").glob("P*.json")) + sorted(p for p in (ROOT / "spreken" / "toets").glob("*.json") if p.name != "index.json")
    for pad in bestanden:
        data = json.loads(pad.read_text(encoding="utf-8"))
        for w in data.get("woorden", []):
            rest += [w["nl"], w.get("zin", "")]
        for it in data["items"]:
            if it["soort"] == "zegna":
                rest.append(it["tekst"])
            elif it["soort"] == "kaart":
                vragen.append(it["vraag"])
                rest.append(it["model"])
            else:
                vragen.append(" ".join(x for x in (it.get("sit"), it["vraag"]) if x))
                rest += it["model"]
    p = json.loads((ROOT / "spreken" / "patronen.json").read_text(encoding="utf-8"))
    for blok in p["patronen"] + p["formules"]:
        rest += [z["nl"] for z in blok["zinnen"]]
    vragen = list(dict.fromkeys(vragen))
    rest = [t for t in dict.fromkeys(rest) if t and t not in vragen]
    return vragen, rest


def sprekers():
    """vraag -> 'man' of 'vrouw': in onderdeel 1 van een toets zegt een persoon de vraag; de stem past bij de foto van die persoon"""
    uit = {}
    for pad in sorted((ROOT / "spreken" / "toets").glob("[A-Z].json")):
        for it in json.loads(pad.read_text(encoding="utf-8"))["items"]:
            foto = (it.get("foto") or "").lower()
            if it.get("deel") == 1 and foto:
                vrouw = any(w in foto for w in ("woman", "girl", "female", "lady", "mother"))
                uit[" ".join(x for x in (it.get("sit"), it["vraag"]) if x)] = "vrouw" if vrouw else "man"
    return uit


_SPREKERS = None


def stem_van(tekst):
    """altijd dezelfde stem voor dezelfde vraag; bij een persoon in een video: een man of een vrouw, zoals op de foto"""
    global _SPREKERS
    if _SPREKERS is None:
        _SPREKERS = sprekers()
    lijst = {"man": MANNEN, "vrouw": VROUWEN}.get(_SPREKERS.get(tekst), STEMMEN)
    return lijst[int(hashlib.sha1(tekst.encode("utf-8")).hexdigest(), 16) % len(lijst)]


def main():
    vragen, _ = verzamel()
    index_pad = MAP / "index.json"
    index = json.loads(index_pad.read_text(encoding="utf-8")) if index_pad.exists() else {}
    naam = lambda t: hashlib.sha1(f"{stem_van(t)}|{t}".encode("utf-8")).hexdigest()[:12] + ".mp3"  # noqa: E731 (zoals ttslib)
    open_ = [t for t in vragen if index.get(t) != naam(t) or not (MAP / naam(t)).exists()]
    print(f"te maken: {len(open_)} vragen, {sum(map(len, open_))} tekens")
    if "--ja" not in sys.argv:
        sys.exit("Dit kost tegoed bij Google. Draai met --ja om de opnamen te maken.")
    n = sum(maak_google([t], MAP, stem_van(t)) for t in open_)
    # opruimen: alleen de vragen die er nog zijn, en hun mp3's
    index = {k: v for k, v in json.loads(index_pad.read_text(encoding="utf-8")).items() if k in set(vragen)}
    index_pad.write_text(json.dumps(index, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    weg = [p for p in MAP.glob("*.mp3") if p.name not in set(index.values())]
    for p in weg:
        p.unlink()
    print(f"{n} nieuwe mp3's; {len(vragen)} vragen in {MAP}; {len(weg)} oude mp3's weg")


if __name__ == "__main__":
    main()
