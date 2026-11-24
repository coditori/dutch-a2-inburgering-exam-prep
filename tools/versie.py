#!/usr/bin/env python3
"""De versie van de site: lezen en verhogen. De versie staat op één plek: de regel VERSIE in shared/app.js.

    python3 tools/versie.py                 # toont de versie, bijvoorbeeld 1.2.0
    python3 tools/versie.py --verhoog patch # 1.2.0 -> 1.2.1   (minor: 1.3.0, major: 2.0.0)
    python3 tools/versie.py --lees-stdin    # leest de versie uit een app.js op de invoer (voor: git show origin/main:shared/app.js)
    python3 tools/versie.py --na 1.2.0 --tak feat/iets
        # voor de CI: staat de versie nog op 1.2.0 (die van main)? Verhoog dan: tak feat/... = minor, major/... = major, anders patch.
        # Is de versie al hoger dan die van main, dan gebeurt er niets.

Elke pull request krijgt zo vanzelf een nieuwe versie (.github/workflows/versie.yml). De versie staat onder aan elke pagina.
"""
import re
import sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / "shared" / "app.js"
REGEL = re.compile(r"const VERSIE = '(\d+)\.(\d+)\.(\d+)';")


def lees(tekst):
    m = REGEL.search(tekst)
    return tuple(int(x) for x in m.groups()) if m else None


def verhoog(v, soort):
    a, b, c = v
    return {"major": (a + 1, 0, 0), "minor": (a, b + 1, 0)}.get(soort, (a, b, c + 1))


def schrijf(v):
    tekst = APP.read_text(encoding="utf-8")
    APP.write_text(REGEL.sub("const VERSIE = '%d.%d.%d';" % v, tekst, count=1), encoding="utf-8")


def soort_van_tak(tak):
    tak = tak.lower()
    if tak.startswith(("major/", "breaking/")):
        return "major"
    return "minor" if tak.startswith(("feat/", "feature/")) else "patch"


def toon(v):
    return "%d.%d.%d" % v


def main(args):
    if "--lees-stdin" in args:
        v = lees(sys.stdin.read())
        print(toon(v) if v else "")
        return 0
    nu = lees(APP.read_text(encoding="utf-8"))
    if not nu:
        print("shared/app.js heeft geen regel: const VERSIE = 'x.y.z';", file=sys.stderr)
        return 1
    if "--verhoog" in args:
        nieuw = verhoog(nu, args[args.index("--verhoog") + 1])
        schrijf(nieuw)
        print(toon(nieuw))
    elif "--na" in args:
        basis = args[args.index("--na") + 1]
        tak = args[args.index("--tak") + 1] if "--tak" in args else ""
        m = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", basis)
        if not m:
            print(f"main heeft nog geen versie: {toon(nu)} blijft staan", file=sys.stderr)
        elif nu > tuple(int(x) for x in m.groups()):
            print(f"de versie is al verhoogd: {basis} -> {toon(nu)}", file=sys.stderr)
        else:
            nieuw = verhoog(tuple(int(x) for x in m.groups()), soort_van_tak(tak))
            schrijf(nieuw)
            print(f"verhoogd ({soort_van_tak(tak)}): {basis} -> {toon(nieuw)}", file=sys.stderr)
            nu = nieuw
        print(toon(nu))
    else:
        print(toon(nu))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
