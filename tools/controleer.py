#!/usr/bin/env python3
"""Controleert elke les, trainer en toets van alle examens tegen woorden/woorden.txt.

    python3 tools/controleer.py          # alleen fouten
    python3 tools/controleer.py -v       # ook aantal woorden per tekst

    python3 tools/controleer.py spreken  # alleen dit examen (lezen telt altijd mee voor de woorden)
    python3 tools/controleer.py --betekenis weer   # elke zin met "weer" en de betekenis die woorden/betekenis.txt kiest

Regel: een les van trede N gebruikt alleen woorden van trede <= N, woorden uit eerdere lessen
van hetzelfde examen, woorden uit de lessen van Lezen tot en met trede N (Lezen is de basis),
en maximaal 8 nieuwe woorden (het veld "woorden" van de les; een les mag "max_nieuw" zetten als het plan meer vraagt).
De vaste vorm van de lessen (aantal vragen, bewijs) wordt alleen voor Lezen hier gecontroleerd;
andere examens hebben daarvoor een eigen script: tools/controleer_<examen>.py.
Draai eerst tools/bouw.py: dat zet de nieuwe woorden in woorden.txt.
"""
import re
import sys

from woordenlib import EXAMENS, Lijst, kaal, lessen, overig, strings, tokens

MAX_NIEUW = 8
VERBOSE = "-v" in sys.argv


MAX_ONBEKEND_TOETS = 5


def controleer_tekst(lijst, data, trede, geleerd):
    """geeft {woord: reden} voor alle woorden die niet mogen"""
    fout = {}
    eigen_namen = {kaal(n) for n in data.get("namen", [])} if isinstance(data, dict) else set()
    for pad, s in strings(data):
        for t in tokens(s):
            if t in lijst.namen or t in eigen_namen or t in fout:
                continue
            mogelijk = lijst.zoek(t)
            if not mogelijk:
                fout[t] = f"onbekend ({pad})"
                continue
            goed = any(all(any(lijst.trede(i) <= trede or i in geleerd for i in deel) for deel in m) for m in mogelijk)
            if not goed:
                hoogste = max(min(lijst.trede(i) for i in deel) for deel in mogelijk[0])
                fout[t] = f"trede {hoogste} ({pad})"
    return fout


def vorm_fouten(naam, data):
    """vaste vorm: bewijs moet in de tekst staan, onthoud-zinnen hebben een {gat}"""
    fouten = []
    n_vragen = 0
    for ti, tekst in enumerate(data.get("teksten", [])):
        regels = tekst.get("tekst", [])
        for vi, v in enumerate(tekst.get("vragen", [])):
            n_vragen += 1
            if len(v.get("o", [])) < 3:
                fouten.append(f"tekst {ti + 1} vraag {vi + 1}: minder dan 3 antwoorden")
            if len(set(v.get("o", []))) != len(v.get("o", [])):
                fouten.append(f"tekst {ti + 1} vraag {vi + 1}: twee dezelfde antwoorden")
            b = v.get("b")
            if b and not any(b in r for r in regels):
                fouten.append(f"tekst {ti + 1} vraag {vi + 1}: bewijs staat niet in de tekst: {b!r}")
            if not b and not data.get("soort") == "plaatje":
                fouten.append(f"tekst {ti + 1} vraag {vi + 1}: geen bewijs (b)")
        if VERBOSE:
            n = sum(len(tokens(r)) + len(re.findall(r"\d+[.:,]?\d*", r)) for r in regels)
            print(f"      tekst {ti + 1}: {n} woorden, {len(tekst.get('vragen', []))} vragen")
    for z in data.get("onthoud", []):
        if not re.search(r"\{[^}]+\}", z):
            fouten.append(f"onthoud zonder {{gat}}: {z}")
    return fouten, n_vragen


def controleer_examen(lijst, examen, basis_per_trede, toon):
    """geeft (aantal fouten, woorden geleerd per trede) voor één examen"""
    geleerd = set()
    geleerd_woorden = set()
    geleerd_na = {}
    per_trede = {t: set() for t in range(6)}
    totaal = 0
    for pad, les in lessen(examen):
        trede = les.get("trede", 3)
        basis = basis_per_trede.get(trede, set())
        fouten = []
        nieuw = les.get("woorden", [])
        maxi = les.get("max_nieuw", MAX_NIEUW)
        if len(nieuw) > maxi:
            fouten.append(f"{len(nieuw)} nieuwe woorden (maximaal {maxi})")
        rest = {k: v for k, v in les.items() if k != "woorden"}
        gebruikt = set(t for _, s in strings(rest) for t in tokens(s))
        for w in nieuw:
            i = lijst.vind_lemma(w["nl"])
            if i is None:
                fouten.append(f"nieuw woord staat niet in woorden.txt: {w['nl']} (draai tools/bouw.py)")
                continue
            if kaal(w["nl"]) in geleerd_woorden or lijst.trede(i) < trede or (examen != "lezen" and i in basis):
                fouten.append(f"'{w['nl']}' is niet nieuw (al geleerd of lagere trede)")
            geleerd.add(i)
            geleerd_woorden.add(kaal(w["nl"]))
            if examen == "lezen":
                if not any(t in gebruikt for t in tokens(w["nl"]) if t not in ("de", "het", "een")) and \
                   not any(i in deel for t in gebruikt for m in lijst.zoek(t) for deel in m):
                    fouten.append(f"nieuw woord '{w['nl']}' komt niet voor in de tekst of de vragen")
                if not w.get("zin"):
                    fouten.append(f"nieuw woord '{w['nl']}' mist zin")
            if not w.get("en"):
                fouten.append(f"nieuw woord '{w['nl']}' mist en")
        for t in range(trede, 6):
            per_trede[t] |= {lijst.vind_lemma(w["nl"]) for w in nieuw} - {None}
        geleerd_na[les["id"]] = set(geleerd)
        for woord, reden in controleer_tekst(lijst, les, trede, geleerd | basis).items():
            fouten.append(f"woord boven trede {trede}: {woord}: {reden}")
        n_vragen = "-"
        if examen == "lezen":
            vf, n_vragen = vorm_fouten(pad.name, les)
            fouten += vf
            if not 3 <= n_vragen <= 5:
                fouten.append(f"{n_vragen} vragen (moet 3-5 zijn)")
            if len(les.get("onthoud", [])) != 3:
                fouten.append(f"{len(les.get('onthoud', []))} onthoud-zinnen (moet 3 zijn)")
        totaal += len(fouten)
        if toon and (fouten or VERBOSE):
            print(f"{examen}/{les['id']} (trede {trede}, {len(nieuw)} nieuw, {n_vragen} vragen): {'OK' if not fouten else ''}")
        if toon:
            for f in fouten:
                print("   ✗", f)
    for pad, data in overig(examen):
        trede = data.get("trede", 4)
        na = data.get("na")
        bekend = (geleerd_na.get(na, geleerd) if na else geleerd) | basis_per_trede.get(trede, set())
        if pad.parent.name == "toets" or data.get("niveau") == "examen":
            # het echte examen heeft ook woorden die u niet kent: per tekst mogen er een paar in staan
            # (ook voor een trainer met "niveau": "examen": die oefent juist de woorden van het examen)
            fouten = []
            eenheden = data.get("teksten") or data.get("items") or data.get("vragen") or []
            for ti, tekst in enumerate(eenheden):
                onbekend = controleer_tekst(lijst, {"namen": data.get("namen", []), "t": tekst}, trede, bekend)
                if VERBOSE and toon and onbekend:
                    print(f"      {pad.name} deel {ti + 1}: niet in de lijst: {', '.join(onbekend)}")
                if len(onbekend) > MAX_ONBEKEND_TOETS:
                    fouten.append(f"deel {ti + 1}: {len(onbekend)} woorden niet in de lijst (maximaal {MAX_ONBEKEND_TOETS}): {', '.join(onbekend)}")
        else:
            fouten = [f"woord boven trede {trede}: {w}: {r}" for w, r in controleer_tekst(lijst, data, trede, bekend).items()]
        if examen == "lezen":
            vf, n_vragen = vorm_fouten(pad.name, data)
            fouten += vf
            if pad.parent.name == "toets" and n_vragen != 25:
                fouten.append(f"{n_vragen} vragen (moet 25 zijn)")
        totaal += len(fouten)
        if toon and (fouten or VERBOSE):
            print(f"{examen}/{pad.parent.name}/{pad.name} (trede {trede}, na {na}): {'OK' if not fouten else ''}")
        if toon:
            for f in fouten:
                print("   ✗", f)
    return totaal, per_trede


def toon_betekenis(lijst, woord):
    """elke zin met het woord, met de regel die woorden/betekenis.txt kiest (en welk patroon). Om na te lezen."""
    woord = kaal(woord)
    if woord not in lijst.kies():
        sys.exit(f"'{woord}' staat niet in woorden/betekenis.txt")
    gezien, per = set(), {}
    for x in EXAMENS:
        for pad, data in lessen(x) + overig(x):
            for _, s in strings(data):
                for zin in re.split(r"(?<=[.!?])\s+", s):
                    toks, komma = lijst.zin_tokens(zin)
                    for i, t in enumerate(toks):
                        if t == woord and (zin, i) not in gezien:
                            gezien.add((zin, i))
                            nr, waarom = lijst.kies_in_zin(woord, toks, komma, i)
                            per.setdefault(lijst.items[nr]["nl"], []).append(f"{zin.strip()[:100]}   [{waarom}]")
    for nl, zinnen in per.items():
        print(f"\n{woord} = {nl}: {len(zinnen)} zinnen")
        for z in sorted(zinnen):
            print("   ", z)


def main():
    lijst = Lijst()
    lijst.kies()  # stopt met een duidelijke fout als woorden/betekenis.txt niet klopt
    if "--betekenis" in sys.argv:
        return toon_betekenis(lijst, sys.argv[sys.argv.index("--betekenis") + 1])
    kies = [a for a in sys.argv[1:] if a in EXAMENS] or EXAMENS
    # Lezen eerst: de woorden uit de lessen van Lezen zijn de basis voor de andere examens
    fouten, lezen_per_trede = controleer_examen(lijst, "lezen", {}, "lezen" in kies)
    totaal = fouten if "lezen" in kies else 0
    for examen in EXAMENS[1:]:
        if examen in kies:
            totaal += controleer_examen(lijst, examen, lezen_per_trede, True)[0]
    n = sum(len(lessen(x)) for x in kies)
    m = sum(len(overig(x)) for x in kies)
    print(f"\n{', '.join(kies)}: {n} lessen en {m} trainers/toetsen gecontroleerd: {totaal} fouten")
    sys.exit(1 if totaal else 0)


if __name__ == "__main__":
    main()
