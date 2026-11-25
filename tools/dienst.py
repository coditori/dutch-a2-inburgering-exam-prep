#!/usr/bin/env python3
"""De site op uw eigen computer, om te testen. Ook bereikbaar voor andere apparaten op hetzelfde netwerk.

    python3 tools/dienst.py               # poort 8001
    python3 tools/dienst.py 9000          # een andere poort
    python3 tools/dienst.py 8443 --https  # met https: nodig om op een telefoon op te nemen (Spreken)

Het verschil met "python3 -m http.server": dit zegt tegen de browser dat hij niets mag bewaren. Na een verandering
is een gewone verversing genoeg; u hoort of ziet nooit een oud bestand. Alleen om te testen, niet voor de echte site.

Waarom --https? Een browser geeft de microfoon alleen aan een pagina op https of op localhost. Op een telefoon opent u
de site via het adres van deze computer (http://192.168.x.x:...): dan is er geen microfoon. Met --https maakt dit script
één keer een eigen certificaat (in tools/.dienst-tls/, niet in git). De telefoon waarschuwt de eerste keer dat hij het
certificaat niet kent: dat is goed, het komt van uw eigen computer.
  iPhone (Safari): "Toon details" > "bezoek deze website" > nog een keer "Bezoek website".
  Android (Chrome): "Geavanceerd" > "Doorgaan naar ...".
"""
import http.server
import shutil
import socket
import ssl
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TLS = ROOT / "tools" / ".dienst-tls"


class Dienst(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def _altijd_vers(self):
        # geen "304 niet veranderd": altijd het bestand zelf
        for kop in ("If-Modified-Since", "If-None-Match"):
            del self.headers[kop]

    def do_GET(self):
        self._altijd_vers()
        super().do_GET()

    def do_HEAD(self):
        self._altijd_vers()
        super().do_HEAD()

    def log_message(self, *a):
        pass


class Server(http.server.ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        # een browser die het certificaat (nog) niet vertrouwt, sluit de verbinding: dat is geen fout van de site
        if isinstance(sys.exc_info()[1], (ssl.SSLError, ConnectionError)):
            return
        super().handle_error(request, client_address)


def mijn_adres():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def certificaat(adres):
    """een eigen certificaat voor localhost, 127.0.0.1 en het adres op het netwerk. Eén keer gemaakt; opnieuw als het adres verandert."""
    sleutel, cert, voor = TLS / "sleutel.pem", TLS / "cert.pem", TLS / "adres.txt"
    if sleutel.exists() and cert.exists() and voor.exists() and voor.read_text().strip() == adres:
        return cert, sleutel
    if not shutil.which("openssl"):
        sys.exit("Voor --https is het programma openssl nodig (bijvoorbeeld: sudo pacman -S openssl).")
    TLS.mkdir(exist_ok=True)
    subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "825", "-sha256",
                    "-keyout", str(sleutel), "-out", str(cert), "-subj", "/CN=Taal Klim test",
                    "-addext", f"subjectAltName=DNS:localhost,IP:127.0.0.1,IP:{adres}",
                    "-addext", "extendedKeyUsage=serverAuth"], check=True, capture_output=True)
    voor.write_text(adres + "\n")
    return cert, sleutel


if __name__ == "__main__":
    https = "--https" in sys.argv
    getallen = [a for a in sys.argv[1:] if a.isdigit()]
    poort = int(getallen[0]) if getallen else (8443 if https else 8001)
    adres = mijn_adres()
    with Server(("0.0.0.0", poort), Dienst) as d:
        if https:
            cert, sleutel = certificaat(adres)
            ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ctx.load_cert_chain(cert, sleutel)
            # de handdruk pas in de draad van de verbinding: één trage of weigerende browser houdt de rest niet op
            d.socket = ctx.wrap_socket(d.socket, server_side=True, do_handshake_on_connect=False)
        s = "https" if https else "http"
        print(f"Op deze computer:   {s}://127.0.0.1:{poort}/")
        print(f"Op het netwerk:     {s}://{adres}:{poort}/")
        if https:
            print("De eerste keer waarschuwt de browser voor het certificaat: dat is uw eigen certificaat, ga door naar de site.")
        d.serve_forever()
