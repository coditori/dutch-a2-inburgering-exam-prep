"""Gedeelde code voor de tools: woorden.txt + werkwoorden lezen en woordvormen herkennen.

Gebruikt door bouw.py (maakt shared/woorden.js) en controleer.py (controleert de lessen).
Alleen de standaardbibliotheek van Python.
"""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WOORDEN = ROOT / "woorden" / "woorden.txt"
WERKWOORDEN = ROOT / "woorden" / "werkwoorden-a2.tsv"
NAMEN = ROOT / "woorden" / "namen.txt"
PLAATJES = ROOT / "woorden" / "plaatjes.txt"

KLINKERS = "aeiou"
LIDWOORDEN = {"de", "het", "een"}
TOKEN = re.compile(r"[a-zà-ÿ]+(?:['’-][a-zà-ÿ]+)*")

EENHEDEN = "een twee drie vier vijf zes zeven acht negen".split()
TIENTALLEN = "twintig dertig veertig vijftig zestig zeventig tachtig negentig".split()
GETALLEN = EENHEDEN + "nul tien elf twaalf dertien veertien vijftien zestien zeventien achttien negentien".split() \
    + TIENTALLEN + "honderd duizend eerste tweede derde vierde vijfde zesde zevende achtste negende tiende".split()
SAMEN_GETAL = re.compile("^(%s)(en)(%s)$" % ("|".join(EENHEDEN), "|".join(TIENTALLEN)))
MAANDEN = "januari februari maart april mei juni juli augustus september oktober november december".split()

# tegenwoordige tijd die niet volgens de regel gaat: infinitief -> vormen
ONREGELMATIG = {
    "zijn": "ben bent is zijn was waren geweest".split(),
    "hebben": "heb hebt heeft had hadden gehad".split(),
    "kunnen": "kan kunt kun kon konden".split(),
    "mogen": "mag mocht mochten".split(),
    "willen": "wil wilt wilde wilden wou".split(),
    "zullen": "zal zult zou zouden".split(),
    "moeten": "moet moest moesten".split(),
    "gaan": "ga gaat".split(),
    "staan": "sta staat".split(),
    "slaan": "sla slaat".split(),
    "doen": "doe doet".split(),
    "zien": "zie ziet".split(),
    "komen": "kom komt".split(),
    "houden": "hou houd houdt".split(),
    "rijden": "rij rijd rijdt".split(),
}


def kaal(s):
    """kleine letters, zonder accenten (vóór -> voor)"""
    s = unicodedata.normalize("NFD", s.lower().replace("’", "'"))
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def tokens(tekst):
    """alle woorden in een tekst (kleine letters, zonder accenten)"""
    uit = []
    for t in TOKEN.findall(kaal(tekst)):
        t = t.strip("'-")
        if len(t) > 1 or t == "u":  # losse letters tellen niet: 's ochtends, gebouw B, niveau A2
            uit.append(t)
    return uit


def stam(inf):
    """ik-vorm van een regelmatig werkwoord: lopen -> loop, schrijven -> schrijf"""
    if not inf.endswith("en"):
        return [inf[:-1]] if inf.endswith("n") else [inf]
    s = inf[:-2]
    uit = []
    if len(s) > 2 and s[-1] == s[-2] and s[-1] not in KLINKERS:
        s = s[:-1]  # zitten -> zit
    elif len(s) >= 2 and s[-1] not in KLINKERS and s[-2] in "aeou" and (len(s) < 3 or s[-3] not in KLINKERS):
        lang = s[:-2] + s[-2] * 2 + s[-1]  # lopen -> loop
        onbeklemtoond = s[-2] == "e" and s[-1] in "rlnm" and any(k in s[:-2] for k in KLINKERS)
        if onbeklemtoond:
            uit.append(s)  # luisteren -> luister
            if s.endswith("er"):
                uit.append(lang)  # proberen -> probeer
            s = None
        else:
            s = lang
    if s:
        uit.append(s)
    klaar = []
    for u in uit:
        if u.endswith("v"):
            u = u[:-1] + "f"
        elif u.endswith("z"):
            u = u[:-1] + "s"
        klaar.append(u)
    return klaar


def vervoeg(inf, verl_ev="", verl_mv="", voltooid=""):
    """alle vormen van een werkwoord die we in een tekst willen herkennen"""
    vormen = {inf}
    partikel = ""
    if " " in verl_ev:  # scheidbaar: kwam aan
        partikel = verl_ev.split()[-1]
        if not inf.startswith(partikel):
            partikel = ""
    basis = inf[len(partikel):]
    tt = []
    for onr, lijst in ONREGELMATIG.items():
        if basis == onr or (basis.endswith(onr) and len(basis) > len(onr)):
            voor = basis[: -len(onr)]
            tt = [voor + v for v in lijst if basis == onr or v not in ("geweest", "gehad")]
            break
    if not tt:
        for s in stam(basis):
            tt += [s, s if s.endswith("t") else s + "t"]
    verl = [w for deel in (verl_ev, verl_mv) for w in deel.split() if w != partikel]
    for v in tt + verl + [basis]:
        vormen.add(v)
        if partikel:
            vormen.add(partikel + v)  # omdat hij aankomt
    if partikel:
        vormen.add(partikel)
    for v in voltooid.replace("/", " ").split():
        vormen.add(v)
    return sorted(v for v in vormen if v)


def sublemmas(nl):
    """'de koffie / de thee' -> ['de koffie', 'de thee']"""
    delen = re.split(r"\s+/\s+|,\s+", nl)
    return [d.replace("...", "").strip(" .?!") for d in delen if d.replace("...", "").strip(" .?!")]


def lees_woorden():
    items = []
    for regel in WOORDEN.read_text(encoding="utf-8").splitlines():
        if not regel.strip() or regel.startswith("#"):
            continue
        d = [x.strip() for x in regel.split("|")]
        items.append({
            "trede": int(d[0]), "nl": d[1], "en": d[2], "thema": d[3] if len(d) > 3 else "",
            "vormen": d[4].split() if len(d) > 4 else [], "extra": "",
        })
    return items


def lees_werkwoorden():
    items = []
    for regel in WERKWOORDEN.read_text(encoding="utf-8").splitlines():
        d = regel.split("\t")
        if regel.startswith("#") or len(d) < 7 or not d[0].isdigit():
            continue
        volt = "" if d[5] == "/" else d[5]
        hulp = {"hebben": "heeft", "zijn": "is"}.get(d[4], "heeft / is")
        items.append({
            "trede": int(d[0]), "nl": d[1], "en": d[6], "thema": "werkwoord",
            "vormen": vervoeg(d[1], d[2], d[3], volt),
            "extra": f"{hulp} {volt}" if volt else "",
        })
    return items


def lees_namen():
    if not NAMEN.exists():
        return set()
    return {kaal(r.strip()) for r in NAMEN.read_text(encoding="utf-8").splitlines() if r.strip() and not r.startswith("#")}


def lees_plaatjes():
    uit = {}
    if PLAATJES.exists():
        for regel in PLAATJES.read_text(encoding="utf-8").splitlines():
            if "|" in regel and not regel.startswith("#"):
                w, b = [x.strip() for x in regel.split("|")][:2]
                uit[w] = b
    return uit


def _varianten(s):
    """mogelijke grondvormen van een afgekapt woord: buss -> bus, strat -> straat, briev -> brief"""
    if len(s) < 2:
        return
    yield s
    if len(s) > 2 and s[-1] == s[-2] and s[-1] not in KLINKERS:
        yield s[:-1]
    t = s
    if s[-1] == "v":
        t = s[:-1] + "f"
    elif s[-1] == "z":
        t = s[:-1] + "s"
    if t != s:
        yield t
    for u in {s, t}:
        if len(u) >= 2 and u[-1] not in KLINKERS and u[-2] in "aeou" and (len(u) < 3 or u[-3] not in KLINKERS):
            yield u[:-2] + u[-2] * 2 + u[-1]


UITGANGEN = ["'s", "s", "en", "e", "n", "er", "ere", "st", "ste", "je", "jes", "tje", "tjes", "pje", "pjes", "etje", "etjes"]


def stammen(tok):
    for uitgang in UITGANGEN:
        if tok.endswith(uitgang) and len(tok) - len(uitgang) >= 2:
            yield from _varianten(tok[: -len(uitgang)])


class Lijst:
    """Alle woorden + werkwoorden, met een tabel vorm -> woord."""

    def __init__(self):
        self.items = lees_woorden() + lees_werkwoorden()
        self.namen = lees_namen()
        self.vormen = {}
        self.lemma = {}
        # eerst de gewone woorden, daarna de hele zinnen van trede 4 (examentaal):
        # een woord uit zo'n zin telt alleen als het nog niet op een lagere trede bekend is
        def is_zin(it):
            # alleen de zinnen van trede 4; "dank u wel" (trede 0) is gewoon een woordgroep
            return it["trede"] >= 4 and len([t for t in tokens(it["nl"]) if t not in LIDWOORDEN]) > 2 and it["thema"] not in ("getal", "tijd")
        vast = {}
        for ronde in (0, 1):
            if ronde:
                vast = dict(self.vormen)  # wat na de gewone woorden bekend is
            for i, it in enumerate(self.items):
                if is_zin(it) != bool(ronde):
                    continue
                for sub in sublemmas(it["nl"]):
                    self.lemma.setdefault(kaal(sub), i)
                toks = tokens(it["nl"]) + [kaal(v) for v in it["vormen"]]
                if it["thema"] == "getal":
                    toks += GETALLEN
                if it["nl"].startswith("januari"):
                    toks += MAANDEN
                inhoud = [t for t in toks if t not in LIDWOORDEN]
                for t in inhoud or toks:
                    if ronde and (t in vast or any(k in vast for k in stammen(t))):
                        continue
                    self.vormen.setdefault(t, [])
                    if i not in self.vormen[t]:
                        self.vormen[t].append(i)
        self.getal = self.lemma.get("eenentwintig")

    def zoek1(self, tok):
        if tok in self.vormen:
            return list(self.vormen[tok])
        uit = []
        for k in stammen(tok):
            for i in self.vormen.get(k, []):
                if i not in uit:
                    uit.append(i)
        return uit

    def zoek(self, tok):
        """Geeft mogelijkheden; elke mogelijkheid is een lijst delen, elk deel een lijst woord-nummers.
        Lege lijst = onbekend woord."""
        tok = kaal(tok)
        r = self.zoek1(tok)
        if r:
            return [[r]]
        if SAMEN_GETAL.match(tok) and self.getal is not None:
            return [[[self.getal]]]
        if "-" in tok:
            delen = [self.zoek1(d) for d in tok.split("-")]
            if all(delen):
                return [delen]
        uit = []
        for i in range(3, len(tok) - 2):  # samenstelling: fietsen+winkel
            b = self.zoek1(tok[i:])
            if not b:
                continue
            a_tok = tok[:i]
            for a_kand in (a_tok, a_tok[:-1] if a_tok[-1] in "se" else "", a_tok[:-2] if a_tok.endswith("en") else ""):
                if len(a_kand) >= 3:
                    a = self.zoek1(a_kand) if a_kand == a_tok else self.vormen.get(a_kand, [])
                    if a:
                        uit.append([a, b])
                        break
        return uit

    def trede(self, i):
        return self.items[i]["trede"]

    def vind_lemma(self, nl):
        return self.lemma.get(kaal(nl.strip(" .?!")))


# ---------- inhoud (JSON) ----------

SLA_OVER = {"id", "soort", "en", "thema", "beeld", "na", "vormen", "goed", "trede", "namen", "val"}


def strings(obj, pad=""):
    """alle Nederlandse teksten in een JSON-object, met hun plek"""
    if isinstance(obj, str):
        yield pad, obj
    elif isinstance(obj, list):
        for i, x in enumerate(obj):
            yield from strings(x, f"{pad}[{i}]")
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if k not in SLA_OVER:
                yield from strings(v, f"{pad}.{k}" if pad else k)


EXAMENS = ["lezen", "luisteren", "schrijven", "spreken", "knm"]


def lessen(examen="lezen"):
    """alle lessen van een examen, op volgorde: <examen>/lessons/*.json (knm ook: knm/themes/*.json)"""
    uit = []
    for map_ in ("lessons", "themes"):
        for p in sorted((ROOT / examen / map_).glob("*.json")):
            if p.name != "index.json":
                uit.append((p, json.loads(p.read_text(encoding="utf-8"))))
    return uit


def overig(examen="lezen"):
    """trainers en toetsen van een examen: (pad, data)"""
    uit = []
    for map_ in ("trainers", "toets"):
        for p in sorted((ROOT / examen / map_).glob("*.json")):
            if p.name != "index.json":
                uit.append((p, json.loads(p.read_text(encoding="utf-8"))))
    return uit
