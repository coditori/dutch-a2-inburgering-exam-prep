#!/usr/bin/env python3
"""Zet in elke pagina wat WhatsApp, Telegram, e-mail en zoekmachines laten zien bij een link: titel, tekst en plaatje.

    python3 tools/deelkaart.py https://voorbeeld.nl/site [map]

Zulke apps lezen alleen de HTML: ze voeren geen scripts uit. De regels moeten dus in de <head> van elk bestand staan,
met het volledige adres van de site erin. Dat adres kennen we pas bij het publiceren; daarom draait dit daar
(.github/workflows/site.yml), op de kopie die naar de site gaat. De bestanden in git blijven zoals ze zijn.

Het plaatje is shared/deelkaart.jpg (1200 × 630). De titel is de <title> van de pagina.
"""
import html
import re
import sys
from pathlib import Path

NAAM = "Taal Klim"
TEKST = ("Gratis oefenen voor het inburgeringsexamen A2: lessen vanaf nul en oefenexamens met een klok. "
         "Lezen, Luisteren, Schrijven, Spreken en KNM.")
TITEL = re.compile(r"<title>(.*?)</title>", re.S)


def main():
    if len(sys.argv) < 2 or not re.fullmatch(r"https?://[^\s\"'<>]+", sys.argv[1]):
        sys.exit("gebruik: deelkaart.py <adres van de site> [map]")
    basis = re.sub(r"^http://", "https://", sys.argv[1]).rstrip("/")
    map_ = Path(sys.argv[2] if len(sys.argv) > 2 else ".")
    n = 0
    for pad in sorted(map_.rglob("*.html")):
        if ".git" in pad.parts:
            continue
        tekst = pad.read_text(encoding="utf-8")
        if "</head>" not in tekst or 'property="og:title"' in tekst:
            continue
        m = TITEL.search(tekst)
        titel = html.unescape(m.group(1)).strip() if m else NAAM
        if NAAM not in titel:
            titel = f"{titel} · {NAAM}"
        rel = pad.relative_to(map_).as_posix()
        adres = f"{basis}/" if rel == "index.html" else f"{basis}/{rel}"
        e = lambda s: html.escape(s, quote=True)
        regels = [
            None if 'name="description"' in tekst else f'<meta name="description" content="{e(TEKST)}">',
            f'<meta property="og:site_name" content="{e(NAAM)}">',
            '<meta property="og:type" content="website">',
            '<meta property="og:locale" content="nl_NL">',
            f'<meta property="og:title" content="{e(titel)}">',
            f'<meta property="og:description" content="{e(TEKST)}">',
            f'<meta property="og:url" content="{e(adres)}">',
            f'<meta property="og:image" content="{e(basis)}/shared/deelkaart.jpg">',
            '<meta property="og:image:width" content="1200">',
            '<meta property="og:image:height" content="630">',
            f'<meta property="og:image:alt" content="{e(NAAM)}: oefen voor het inburgeringsexamen A2">',
            '<meta name="twitter:card" content="summary_large_image">',
        ]
        blok = "".join(r + "\n" for r in regels if r)
        pad.write_text(tekst.replace("</head>", blok + "</head>", 1), encoding="utf-8")
        n += 1
    print(f"{n} pagina's kregen een deelkaart ({basis})")
    if not n:
        sys.exit("geen enkele pagina gevonden: klopt de map?")


if __name__ == "__main__":
    main()
