#!/usr/bin/env python3
"""Maakt de mp3's van de rollen in de gesprekken van Luisteren met stemmen van Google (vier stemmen), in luisteren/audio/.

    python3 tools/tts_luisteren.py            # laat zien wat er te maken is
    python3 tools/tts_luisteren.py --ja       # maakt het (dit kost tegoed bij Google; sleutel in tools/google-sleutel.txt)

Stemmen (STEM): A = man, B = vrouw, C = man 2, D = vrouw 2. Geen langzame opnamen: de knop "langzaam" speelt de gewone opname trager.
Slaat over wat er al is. De sleutel in luisteren/audio/index.json is "stem|tekst" (zie luisteren/luisteren.js).
Elke toets krijgt ook een mp3 per fragment: alle regels achter elkaar, zoals de video of het geluid bij DUO (sleutel "fragment|...",
in luisteren/audio/fragment/). Wat de verteller voorleest (woordkaart, dictee, trainers, en bij de toetsen de inleiding, de vraag en
de antwoorden, zoals DUO) staat per stem in luisteren/audio/<stem>/, met de sleutel VERTELLER: die opnamen maakt tools/tts_stemmen.py.
Met --opruimen gaan daarna de opnamen weg die niet meer gebruikt worden (alleen in luisteren/audio/ zelf, niet die van de verteller).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import hashlib  # noqa: E402
import json  # noqa: E402
import subprocess  # noqa: E402
import tempfile  # noqa: E402

from ttslib import maak_google  # noqa: E402
from woordenlib import ROOT, lessen, overig  # noqa: E402

# de rollen in de gesprekken: vaste stemmen van Google, niet dezelfde als de vier vertellers (shared/stemmen.json)
STEM = {"A": "nl-NL-Chirp3-HD-Charon", "B": "nl-NL-Chirp3-HD-Kore", "C": "nl-NL-Chirp3-HD-Iapetus", "D": "nl-NL-Chirp3-HD-Aoede"}
VERTELLER = "nl_NL-ronnie-medium"  # de sleutel van wat de verteller voorleest (een oude naam; de opnamen zelf zijn per gekozen stem)
INSTRUCTIE = "Lees eerst de vraag. Luister daarna naar de tekst."  # zoals bij DUO, voorgelezen vóór elk fragment van een toets
UIT = ROOT / "luisteren" / "audio"
STILTE = 0.45  # seconden tussen twee regels in een fragment


def rollen():
    """(gewoon, langzaam) per spreker: de regels van de gesprekken. Die houden hun vaste stem, welke verteller de leerling ook kiest."""
    gewoon = {s: [] for s in STEM}
    langzaam = {s: [] for s in STEM}
    for _, les in lessen("luisteren"):
        for it in les["items"]:
            for r in it["regels"]:
                gewoon[r.get("s", "A")].append(r["t"])
    for pad, data in overig("luisteren"):
        items = data.get("items", [])
        met_rol = any("s" in it for it in items)  # trainer nietwel: een man en een vrouw om en om
        for it in items:
            for r in it.get("regels", []):
                gewoon[r.get("s", "A")].append(r["t"])
            if "t" in it and not it.get("regels") and met_rol:
                gewoon[it.get("s", "A")].append(it["t"])
    return gewoon, langzaam


def toetsen():
    """[(pad, toets)] van luisteren/toets/"""
    return [(p, json.loads(p.read_text(encoding="utf-8"))) for p in sorted((ROOT / "luisteren" / "toets").glob("*.json")) if p.name != "index.json"]


def fragment_sleutel(regels):
    """de sleutel van de mp3 van een heel fragment (luisteren/luisteren.js maakt dezelfde)"""
    return "fragment|" + "\n".join(f"{r.get('s', 'A')}:{r['t']}" for r in regels)


def fragmenten():
    """per fragment van een toets één mp3: de regels achter elkaar met een korte stilte, zoals één video of geluid bij DUO"""
    index_pad = UIT / "index.json"
    index = json.loads(index_pad.read_text(encoding="utf-8"))
    (UIT / "fragment").mkdir(exist_ok=True)
    nieuw = 0
    for _, toets in toetsen():
        for it in toets.get("items", []):
            k = fragment_sleutel(it["regels"])
            naam = "fragment/" + hashlib.sha1(k.encode("utf-8")).hexdigest()[:12] + ".mp3"
            if index.get(k) == naam and (UIT / naam).exists():
                continue
            delen = [UIT / index[f"{STEM[r.get('s', 'A')]}|{r['t']}"] for r in it["regels"]]
            with tempfile.TemporaryDirectory() as tmp:
                stil = Path(tmp) / "stil.mp3"
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"anullsrc=r=24000:cl=mono", "-t", str(STILTE), "-b:a", "48k", str(stil)], check=True)
                lijst = Path(tmp) / "lijst.txt"
                lijst.write_text("".join(f"file '{p}'\nfile '{stil}'\n" for p in delen), encoding="utf-8")
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lijst), "-ar", "24000", "-ac", "1", "-b:a", "48k", str(UIT / naam)], check=True)
            index[k] = naam
            nieuw += 1
    index_pad.write_text(json.dumps(index, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    return nieuw


def opruimen():
    """weg met sleutels en mp3's in luisteren/audio/ die niet meer gebruikt worden (de oude stemmen van Piper, oude zinnen)"""
    gewoon, _ = rollen()
    nodig = {f"{STEM[s]}|{t}" for s in STEM for t in gewoon[s]}
    nodig |= {fragment_sleutel(it["regels"]) for _, toets in toetsen() for it in toets.get("items", [])}
    index_pad = UIT / "index.json"
    index = json.loads(index_pad.read_text(encoding="utf-8"))
    index = {k: v for k, v in index.items() if k in nodig}
    index_pad.write_text(json.dumps(index, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    gebruikt = set(index.values())
    weg = [p for p in list(UIT.glob("*.mp3")) + list((UIT / "fragment").glob("*.mp3")) if p.relative_to(UIT).as_posix() not in gebruikt]
    for p in weg:
        p.unlink()
    return len(weg)


def verteller():
    """(gewoon, langzaam): wat de verteller voorleest en geen rol in een gesprek is. De leerling kan daar een andere stem voor kiezen
    (tools/tts_stemmen.py). Op de pagina's zijn dit de regels met v: 1 (woordkaart, dictee, trainers getallen en paren)."""
    gewoon, langzaam = [], []
    for _, les in lessen("luisteren"):
        for w in les.get("woorden", []):
            gewoon += [w["nl"], w["zin"]]
        for z in les.get("dictee", []):
            gewoon.append(z)
            langzaam.append(z)
    for pad, data in overig("luisteren"):
        items = data.get("items", [])
        rollen = any("s" in it for it in items)  # trainer nietwel: een man en een vrouw om en om, dat blijft zo
        for it in items:
            if "t" in it and not it.get("regels") and not rollen:
                gewoon.append(it["t"])
            gewoon += it.get("vormen", [])
    # de toetsen: zoals bij DUO leest de verteller de inleiding, de opdracht, de vraag en elk antwoord voor
    for _, toets in toetsen():
        gewoon.append(INSTRUCTIE)
        for it in toets.get("items", []):
            gewoon.append(it["context"])
            for v in it.get("vragen", []):
                gewoon.append(" ".join(x for x in (v.get("sit"), v["v"]) if x))
                gewoon += v["o"]
    return list(dict.fromkeys(gewoon)), list(dict.fromkeys(langzaam))


if __name__ == "__main__":
    gewoon, _ = rollen()
    index = json.loads((UIT / "index.json").read_text(encoding="utf-8")) if (UIT / "index.json").exists() else {}
    open_ = {s: [t for t in dict.fromkeys(gewoon[s]) if f"{STEM[s]}|{t}" not in index] for s in STEM}
    print(f"te maken: {sum(map(len, open_.values()))} regels, {sum(len(t) for v in open_.values() for t in v)} tekens")
    if "--ja" not in sys.argv:
        sys.exit("Dit kost tegoed bij Google. Draai met --ja om de opnamen te maken.")
    n = sum(maak_google(open_[s], UIT, STEM[s], sleutel_met_stem=True) for s in STEM)
    n += fragmenten()
    weg = opruimen() if "--opruimen" in sys.argv else 0
    print(f"{n} nieuwe mp3's in {UIT}" + (f"; {weg} oude mp3's weg" if weg else "; oude opnamen blijven staan (weg met --opruimen)"))
