#!/usr/bin/env python3
"""Zet een versie achter elke link naar een eigen script of stijlblad: shared/app.js -> shared/app.js?v=1a2b3c4d

    python3 tools/cachebreker.py 1a2b3c4d [map]

Waarom: een browser (en het netwerk ervoor) mag .js en .css lang bewaren. Zonder dit krijgt een bezoeker na een nieuwe versie
de nieuwe pagina met de oude scripts. Met een andere versie in de link is het voor de browser een ander bestand: hij haalt het opnieuw.

Dit draait alleen bij het publiceren (.github/workflows/site.yml), op de kopie die naar de site gaat. De bestanden in git blijven zoals ze zijn.
Alleen links binnen de site veranderen; een link met http(s):// of met al een ? erin blijft staan.
"""
import re
import sys
from pathlib import Path

LINK = re.compile(r'\b(src|href)="([^":?#]+\.(?:js|css))"')


def main():
    if len(sys.argv) < 2 or not re.fullmatch(r"[A-Za-z0-9._-]+", sys.argv[1]):
        sys.exit("gebruik: cachebreker.py <versie> [map]")
    versie, map_ = sys.argv[1], Path(sys.argv[2] if len(sys.argv) > 2 else ".")
    paginas = links = 0
    for pad in sorted(map_.rglob("*.html")):
        if ".git" in pad.parts:
            continue
        tekst = pad.read_text(encoding="utf-8")
        nieuw, n = LINK.subn(lambda m: f'{m.group(1)}="{m.group(2)}?v={versie}"', tekst)
        if n:
            pad.write_text(nieuw, encoding="utf-8")
            paginas += 1
            links += n
    print(f"{links} links in {paginas} pagina's kregen ?v={versie}")
    if not links:
        sys.exit("geen enkele link gevonden: klopt de map?")


if __name__ == "__main__":
    main()
