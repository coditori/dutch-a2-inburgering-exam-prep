#!/usr/bin/env python3
"""De site op uw eigen computer, om te testen. Ook bereikbaar voor andere apparaten op hetzelfde netwerk.

    python3 tools/dienst.py            # poort 8001
    python3 tools/dienst.py 9000       # een andere poort

Het verschil met "python3 -m http.server": dit zegt tegen de browser dat hij niets mag bewaren. Na een verandering
is een gewone verversing genoeg; u hoort of ziet nooit een oud bestand. Alleen om te testen, niet voor de echte site.
"""
import http.server
import socket
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


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


def mijn_adres():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


if __name__ == "__main__":
    poort = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    with http.server.ThreadingHTTPServer(("0.0.0.0", poort), Dienst) as d:
        print(f"Op deze computer:   http://127.0.0.1:{poort}/")
        print(f"Op het netwerk:     http://{mijn_adres()}:{poort}/")
        d.serve_forever()
