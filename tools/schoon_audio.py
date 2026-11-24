#!/usr/bin/env python3
"""Maakt het begin en het einde van elke mp3 stil.

    python3 tools/schoon_audio.py [map ...]      # zonder map: alle mappen audio/ van de site, ook die van de vertellers (audio/<stem>/)

De stem (Piper) laat voor en na de spraak wat ruis staan, en het bestand houdt daar midden in op. Dat hoor je als
ruis of een tik na het woord. Dit script zoekt per bestand waar de spraak begint en eindigt, laat het geluid daar
kort in- en uitlopen en knipt de rest weg. De spraak zelf verandert niet.

Een bestand dat al schoon is (stil aan het begin en het einde), blijft zoals het is: twee keer draaien kan geen kwaad.
"""
import math
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HZ = 22050
BLOK = 221            # 10 ms
GRENS = -38           # dB onder het hardste stuk: daarboven is het spraak. Een zachte s of f aan het einde zit rond -30 tot -37.
VOOR, NA = 0.03, 0.09  # zoveel seconden blijft er voor en na de spraak staan (in- en uitlopen)
STIL = -62            # dB onder het hardste stuk: zo stil is "schoon"


def pcm(pad):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(pad), "-f", "s16le", "-ac", "1", "-ar", str(HZ), "-"], capture_output=True, check=True).stdout
    return struct.unpack("<%dh" % (len(raw) // 2), raw)


def niveaus(s):
    b = [math.sqrt(sum(v * v for v in s[i:i + BLOK]) / BLOK) for i in range(0, len(s) - BLOK + 1, BLOK)]
    top = max(b) if b else 0
    return [20 * math.log10(max(x, 1e-3) / top) if top else -99 for x in b]


def maak_schoon(pad):
    """True als het bestand veranderd is"""
    db = niveaus(pcm(pad))
    spraak = [i for i, x in enumerate(db) if x > GRENS]
    if not spraak:
        return False
    begin = max(0.0, spraak[0] * BLOK / HZ - VOOR)
    eind = min(len(db) * BLOK / HZ, (spraak[-1] + 1) * BLOK / HZ + NA)
    kop, staart = db[:spraak[0]], db[spraak[-1] + 1 + int(NA * HZ / BLOK):]
    if (not kop or max(kop[:-3] or [-99]) < STIL) and (not staart or max(staart) < STIL):
        return False
    duur = eind - begin
    filters = f"atrim={begin:.3f}:{eind:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={max(0, duur - NA):.3f}:d={NA},apad=pad_dur=0.05"
    with tempfile.NamedTemporaryFile(suffix=".mp3", dir=pad.parent) as tmp:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(pad), "-af", filters, "-ac", "1", "-b:a", "48k", tmp.name], check=True)
        Path(tmp.name).replace(pad)
        Path(tmp.name).touch()  # NamedTemporaryFile wil het bestand zelf nog weghalen
    return True


def main():
    mappen = [Path(a) for a in sys.argv[1:]] or sorted(p for patroon in ("*/audio", "*/audio/*") for p in ROOT.glob(patroon) if p.is_dir())
    for m in mappen:
        bestanden = sorted(m.glob("*.mp3"))
        n = sum(maak_schoon(p) for p in bestanden)
        print(f"{m}: {n} van {len(bestanden)} bestanden schoongemaakt")


if __name__ == "__main__":
    main()
