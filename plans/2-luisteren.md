# Plan 2 — Luisteren (listening) · priority 2

## The exam
- Computer, 45 minutes. Short films and audio texts, multiple choice (about 25 questions, ~18 correct to pass — unofficial numbers).
- Everyday conversations: at the doctor, at work, at school, in a shop, a phone call, a voicemail, an announcement.
- You see the question and the answers **while** you listen. No dictionary.

## What makes you pass
1. The words are the same as in Lezen — you must recognise them **by ear**, at normal speed.
2. Read the question and the answers before the audio starts. Listen only for that answer.
3. Catch numbers, times, days and `niet/geen` — most questions hang on them.
4. Speakers often change their mind: `Dinsdag? Nee, dat kan niet. Woensdag dan.` The **last** option is usually the answer.

## The ladder (30 lessons, 10 minutes each)

| Trede | Lessons | You hear | Task |
|-------|---------|----------|------|
| 1 | U1–U5 | single words and numbers, slow + normal | click the picture / type the number |
| 1 | U6–U9 | times, days, prices, phone numbers | `Het is kwart voor drie` → kies de klok |
| 2 | U10–U16 | one sentence (the same sentences as Lezen L1–L24) | choose the picture; then dictation: type what you hear |
| 2 | U17–U21 | 2-line dialogue | `Wie praat? Waar zijn ze?` |
| 3 | U22–U27 | 30–45 second dialogue, 2 voices, one question | huisarts, werk, school, winkel, gemeente |
| 4 | U28–U30 | exam format, incl. "changed mind" and voicemail items | timed |
| ✔ | Toets A–C | 3 mock exams of 25, then the 3 DUO practice exams | 19/25 twice = ready |

## Lesson page
1. **Luister** — audio only, question visible. Buttons: 🐢 slow (0.75×), ▶ normal, ↻ again.
2. **Kies** — multiple choice.
3. **Kijk** — the transcript appears, words highlight while the audio plays (karaoke). Click a word to hear it alone.
4. **Dictee** — one sentence from the dialogue: type what you hear. This is the fastest way to train the ear.
5. **Zeg na** — repeat the sentence aloud (feeds into Spreken).

Extra trainers in `luisteren/`:
- **Getallen-trainer**: `vijfenveertig` → 45 (Dutch says the last digit first), prices, times, dates.
- **Minimale paren**: `man/maan`, `zon/zoon`, `huur/hier`, `ui/eu/ij` sounds.
- **Niet-of-wel**: did you hear `niet` / `geen`? yes or no.

## Audio — open source
- **Piper TTS** (`pip install piper-tts`), run once by `tools/tts.py` to turn every sentence and dialogue in the JSON files into mp3.
  - Voices: `nl_NL-ronnie-medium` (man), `nl_NL-pim-medium` (man 2), `nl_BE-nathalie-medium` (woman, Flemish accent). Two different voices per dialogue.
  - Slow version made by Piper's `--length-scale 1.3` (clearer than slowing the mp3).
- Fallback if Piper fails on your Python 3.14: browser `speechSynthesis` with an nl-NL voice.
- TTS is clean studio speech. The real exam has real people. So from trede 3 the plan adds **real** audio: the 3 DUO listening exams, netinnederland.nl videos, and 10 minutes a day of NOS Jeugdjournaal or "Easy Dutch" on YouTube.

## Content sources
- Dialogues: I write them at trede level, on the exam situations above. Trede 1–2 reuse the Lezen sentences, so you hear what you already read.
- Extra practice: examklaar.nl listening exams; the listening playlists linked in github.com/sonambhatnagar/inburgering.

## Folder
```
luisteren/
  index.html
  les.html                 template, loads lessons/U01.json
  lessons/U01.json         { trede, items:[{ sprekers, tekst, vraag, opties, goed }] }
  audio/                   generated mp3 (normal + slow)
  trainers/                getallen.html, paren.html, nietwel.html
  toets/                   A.json ... C.json (25 questions, 45 min timer)
tools/tts.py               JSON → mp3 with Piper
```

## Ready when
- Dictation of trede 2 sentences: 80% of words correct at normal speed.
- 19/25 or better on two mock exams and two DUO practice exams.
