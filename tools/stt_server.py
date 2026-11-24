#!/usr/bin/env python3
"""Spraak -> tekst voor spreken/ (faster-whisper, model "small", taal nl). Alles blijft op uw computer.

Eén keer klaarzetten:
    uv pip install --python tools/.venv/bin/python faster-whisper
Starten (naast `python3 -m http.server`):
    tools/.venv/bin/python tools/stt_server.py
De eerste keer wordt het model gedownload (ongeveer 500 MB). Nodig: ffmpeg (staat al op deze computer).

    GET  /ping -> ok
    POST /stt  (de opname uit de browser als body: webm/ogg/wav) -> {"tekst": "..."}
Draait deze server niet, dan gebruikt de pagina de spraakherkenning van Chrome, of u controleert zelf.
"""
import json
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
from faster_whisper import WhisperModel

POORT = 8787
MODEL = sys.argv[1] if len(sys.argv) > 1 else "small"
model = WhisperModel(MODEL, device="cpu", compute_type="int8")


def naar_geluid(data):
    """opname uit de browser (webm/ogg/wav) -> 16 kHz mono, met ffmpeg"""
    uit = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", "16000", "pipe:1"],
                         input=data, capture_output=True, check=True).stdout
    return np.frombuffer(uit, dtype=np.float32)


class H(BaseHTTPRequestHandler):
    def _kop(self, code, soort="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", soort + "; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()

    def do_OPTIONS(self):
        self._kop(204)

    def do_GET(self):
        self._kop(200, "text/plain")
        self.wfile.write(b"ok")

    def do_POST(self):
        data = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        try:
            delen, _ = model.transcribe(naar_geluid(data), language="nl", beam_size=5, vad_filter=True)
            tekst = " ".join(d.text.strip() for d in delen).strip()
            self._kop(200)
            self.wfile.write(json.dumps({"tekst": tekst}, ensure_ascii=False).encode("utf-8"))
        except Exception as e:  # kapotte of lege opname
            self._kop(200)
            self.wfile.write(json.dumps({"tekst": "", "fout": str(e)}).encode("utf-8"))

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print(f"Spraakserver klaar op http://127.0.0.1:{POORT} (model {MODEL}). Stoppen: Ctrl+C")
    ThreadingHTTPServer(("127.0.0.1", POORT), H).serve_forever()
