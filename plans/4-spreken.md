# Plan 4 — Spreken (speaking) · priority 4

## The exam
- Computer with headset, 35 minutes (official). You watch short films and answer aloud; your answers are recorded and checked by a person (result takes about 16 weeks).
- Structure from your friend's notes (`Part 0.pdf`) — 16 exercises, about 2 minutes each:
  1. 4× a person in a video asks a **two-part** question (`Waar doet u boodschappen? Vertel ook wanneer.`)
  2. 4× a two-part question about **one picture**
  3. 4× a two-part question about **one of two pictures** (choose, say why)
  4. 3 pictures: say something about **each** picture
- You may listen again, record again and go back. Watch the clock.
- Scoring: **content** (did you answer the question — if not, 0 for everything) and **language** (grammar, words, fluency, pronunciation).

## What makes you pass
- **Answer both halves.** Two short sentences beat one beautiful sentence. This is the number one rule.
- Reuse the words of the question: `Waar doet u boodschappen?` → `Ik doe boodschappen bij de supermarkt.`
- You may invent answers. Nobody checks whether you really like football.
- Seven sentence patterns cover almost every question (from `Part 0.pdf`):

| Pattern | Example |
|---------|---------|
| Ik vind ___ (niet) leuk. | Ik vind voetbal leuk. |
| Ik hou (niet) van ___. | Ik hou van popmuziek. |
| Ik ___ (niet) graag. | Ik kook graag. |
| Ik ga het liefst ___. | Ik ga het liefst naar het strand. |
| ... omdat het ___ is. | ... omdat het gezond is. |
| Ik denk dat ___ . | Ik denk dat ze koffie drinken. |
| Ik ___ elke dag / vaak / elke week. | Ik fiets elke dag. |

- The **4-sentence formula** when you have time: `Ik fiets graag. Ik vind dat leuk. Maar ik hou niet van hardlopen. Ik vind dat saai.`
- Five ready reasons: `leuk, makkelijk, gezond, goedkoop, interessant` (and `saai, duur, moeilijk` for "not").
- Pictures: `Ik zie een man. Hij werkt in een winkel. Ik denk dat hij blij is.`

## The ladder (26 lessons, 10 minutes each)

| Trede | Lessons | You say | How |
|-------|---------|---------|-----|
| 1 | P1–P4 | sounds: ui, eu, ij/ei, g, sch, uu; word stress | listen → repeat → compare your recording |
| 1 | P5–P8 | the 7 patterns with 5 words each (35 sentences) | shadowing: speak together with the audio |
| 2 | P9–P12 | question word → answer start (`Waar` → `Ik ... in/bij/naar`) | flash drill, 3 seconds per card |
| 2 | P13–P16 | two-part answers on 12 topics: boodschappen, weekend, weer, muziek, tv, vakantie, werk, buren, vervoer, koken, kleding, seizoen | hear question → speak → hear model |
| 3 | P17–P20 | one picture: wie, waar, wat doet hij/zij + `Ik denk dat` | picture prompts |
| 3 | P21–P23 | two pictures: choose + `omdat` | `Ik ga liever met de trein, omdat het makkelijk is.` |
| 4 | P24–P26 | three pictures, one sentence each; full 16-question run, 35 min | timed, exam layout |
| ✔ | Toets | the 3 DUO speaking practice exams (Chrome/Firefox, not Safari) | record, listen back |

## Lesson page
1. **Luister** — the question as audio (and text if you click 👁).
2. **Spreek** — press record, answer, stop.
3. **Check** — your speech is turned into text and compared:
   ☐ part 1 answered ☐ part 2 answered (key words found) ☐ a verb in each sentence.
   You also see what the computer understood — if it cannot understand you, a human examiner may also struggle.
4. **Model** — hear the model answer, shadow it twice, record again.
5. Questions you failed come back tomorrow (spaced repetition).

## Speech tools — open source
- **Recording:** browser `MediaRecorder` (no install).
- **Speech → text:** [faster-whisper](https://github.com/SYSTRAN/faster-whisper), model `small`, `language="nl"`, in `tools/stt_server.py` (a ~40-line local server). Runs on CPU; a few seconds per answer.
  Zero-install alternative: Chrome Web Speech API (`nl-NL`) — Chrome only, audio goes to Google.
  In-browser alternative: [whisper via transformers.js](https://github.com/huggingface/transformers.js) — no server, slower first load.
- **Question audio and model answers:** Piper TTS, same voices as Luisteren.
- Limit: Whisper "repairs" bad pronunciation, so it cannot grade your accent. For pronunciation, the page plays the model and your recording side by side — your ear is the judge.

## Content sources
- `Part 0.pdf` (patterns, formula, Q&A) and `Part 1 - (Q01 to Q04) - 3 Pic.pdf` (~45 real-style part-1 questions with model answers and "things to be careful about") — these become the first question bank, grouped by question word (Wat 18, Waarom 7, Waar 4, Welke 3, ...).
- I add questions for parts 2–4 with pictures (simple drawings/emoji scenes).
- Outside our pages: the Ad Appel speaking practice (site + YouTube) — exam takers recommend doing it about 10 times.

## Folder
```
spreken/
  index.html
  les.html               template
  lessons/P01.json       { trede, vraag, deel1, deel2, model, sleutelwoorden[] }
  patronen.html          the 7 patterns + 4-sentence formula, with audio
  audio/                 generated question + model mp3
  toets/                 16-question run with 35 min timer
tools/stt_server.py      faster-whisper server
```

## Ready when
- You can answer 20 random part-1 questions with two correct sentences each, without reading.
- A full 16-question run inside 35 minutes, both halves answered every time.
