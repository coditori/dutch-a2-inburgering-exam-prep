# Dutch A2 inburgering — master plan

Start: half A1 (greetings + clock). Goal: pass the 5 A2 exams with the **least** study time.
This is not IELTS. You need short, simple, correct-enough Dutch on everyday topics.

## The 5 exams (plans in `plans/`)

| # | Exam | Plan | Format (official: inburgeren.nl) | Pass mark (unofficial) |
|---|------|------|----------------------------------|------------------------|
| 1 | Lezen (reading) | `plans/1-lezen.md` | computer, 65 min, multiple choice | ~18–19 of 25 |
| 2 | Luisteren (listening) | `plans/2-luisteren.md` | computer, 45 min, videos + audio, multiple choice | ~18 of 25 |
| 3 | Schrijven (writing) | `plans/3-schrijven.md` | pen and paper, 40 min, 4 tasks | ~60% of points |
| 4 | Spreken (speaking) | `plans/4-spreken.md` | computer, 35 min, 16 spoken answers | ~60% of points |
| 5 | KNM (society) | `plans/5-knm.md` | computer, 45 min, multiple choice | ~28 of 40 |

Durations, "4 tasks" and computer/paper come from DUO's site. Question counts and pass marks come
from prep sites and an open-source project, **not** from DUO — treat them as approximate.
The speaking structure (16 exercises, 4 parts) comes from your friend's notes (`Part 0.pdf`).

## The ladder (same 5 steps in every exam)

| Trede | What you can do | Words (`woorden/woorden.txt`) |
|-------|-----------------|-------------------------------|
| 0 | greetings, clock (you are here) | 15 |
| 1 | building blocks: ik/u, niet/geen, question words, 46 core verbs | ~120 + 46 verbs |
| 2 | daily life: family, house, food, shop, transport, time | ~150 + 65 verbs |
| 3 | exam themes: work, health, school, gemeente | ~120 |
| 4 | exam language: the words used in the questions themselves | ~55 |

Rule: nothing on a page uses words above its trede, except new words that are marked and clickable.
Grammar is only 6 things, taught as patterns, never as theory:
1. verb in 2nd place (`Ik werk.` / `Morgen werk ik.`)
2. `niet` / `geen`
3. questions (`Waar woont u?`)
4. `kunnen / moeten / willen / gaan` + verb at the end
5. `omdat` + verb at the end (`omdat het leuk is`)
6. past: `Ik heb gewerkt.` — recognise only; you rarely need to produce it

## Order and time

Suggested order of taking exams: **Lezen → Luisteren → Schrijven → Spreken → KNM**.
Reading builds the vocabulary everything else uses. KNM last (your priority, and it needs trede 3 Dutch).

My estimate (not a guarantee): about 1 hour a day, 14–16 weeks.

| Weeks | Focus | Daily hour |
|-------|-------|-----------|
| 1–3 | Trede 1 → 2, all through reading + listening to the same sentences | 20 min words, 30 min lezen, 10 min luisteren |
| 4–7 | Trede 2 → 3, Lezen exam practice, start writing templates | 15 words, 25 lezen, 10 luisteren, 10 schrijven |
| 8–10 | Lezen + Luisteren mock exams (DUO), speaking formulas | 10 words, 20 luisteren, 15 spreken, 15 schrijven |
| 11–13 | Schrijven + Spreken exam practice | 25 spreken, 25 schrijven, 10 review |
| 14–16 | KNM + redo all DUO practice exams | 40 KNM, 20 review |

Note: Speaking and Writing results take about 16 weeks at DUO; others about 8. Book early if you have a deadline.

## How the pages help you memorise

- **Spaced repetition (Leitner boxes)** for words: wrong → tomorrow, right → 2, 4, 8, 16 days. Stored in the browser (`localStorage`).
- **One sentence, four uses**: every example sentence is read, heard, typed and spoken. Same 300 sentences across all exams.
- **Click a word** → picture or simpler Dutch word first; English only behind the ❗ button.
- **Chunks, not single words**: `boodschappen doen`, `een afspraak maken`, `Ik vind ... leuk`.
- **10-minute lessons**, each ends with a 5-question test. 80% = next step unlocks.

## Tech (simple, local, no build step)

```
dutch-exam/
  index.html            start page: ladder + today's tasks
  shared/               app.css, srs.js (Leitner), woorden.js (built from woorden.txt), audio.js
  woorden/              woorden.txt (shared list), werkwoorden-a2.tsv (466 verbs, tagged)
  lezen/ luisteren/ schrijven/ spreken/ knm/    one folder per exam: lessons + data + tests
  tools/                tts.py (make mp3), stt_server.py (check speaking)
  plans/                the five plans
```

- Plain HTML + vanilla JS, opened via `python3 -m http.server`. Content in JSON files, so adding lessons needs no code.
- **Speech out (listening, speaking prompts):** [Piper](https://github.com/OHF-Voice/piper1-gpl) (`pip install piper-tts`), voices `nl_NL-ronnie-medium`, `nl_NL-pim-medium`, `nl_BE-nathalie-medium`. Audio is generated once to mp3, so pages stay static. Older `nl_NL-mls` voices have poor reviews — don't use them. Fallback: browser `speechSynthesis` (nl-NL).
- **Speech in (speaking check):** [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (model `small`, language `nl`) in a tiny local server: record in browser → text → compare with the model answer. Zero-install alternative: Chrome's Web Speech API (`nl-NL`) — works only in Chrome and sends audio to Google.
- Your machine has `ffmpeg` and `espeak-ng` already. Python is 3.14; Piper/Whisper wheels may need a 3.12 venv — to be checked at build time.
- Kokoro TTS has no Dutch voice (from my memory, not re-checked); Coqui XTTS supports Dutch but is heavy and non-commercial licensed.

## What already exists on GitHub (A2, checked 2026-11-24)

| Repo | What | Use for us |
|------|------|-----------|
| [RashadAnsari/examklaar](https://github.com/RashadAnsari/examklaar) | 25 A2 mock exams, all 5 parts, AGPL-3.0, live at examklaar.nl | best source of exam-style practice; good docs on format and Piper |
| [HayrullahC/inburgering](https://github.com/HayrullahC/inburgering) | A2/B1/B2 course, 1000 A2 words with audio, games, 220 KNM questions; no license | use the site, don't copy |
| [meanceo/inburgering-lessons](https://github.com/meanceo/inburgering-lessons) | static HTML A2 lessons with audio; no license | closest to our approach — inspiration |
| [juancho0202/inburgering-a2-cursus](https://github.com/juancho0202/inburgering-a2-cursus) | A2 reading web app with TTS; no license | inspiration |
| [johannes-schmid/inburgering-oefenen](https://github.com/johannes-schmid/inburgering-oefenen) | practice platform for the 4 language parts; no license | inspiration |
| [sonambhatnagar/inburgering](https://github.com/sonambhatnagar/inburgering) | ★59, personal notes + links from someone who passed (lezen 9, luisteren 8, schrijven 9) | tips and resource links |

Almost all are 0-star, AI-generated full exam simulators. None is a slow ladder from zero — that is the gap we fill. "No license" means we may use the sites but not copy content.

## What real exam takers say

- "Read the questions first, then the text." Most people finish Lezen long before 65 minutes.
- Lezen is usually called the easiest; start with it for confidence.
- Speaking: you do not need advanced words. Short, correct sentences that answer **both** halves of the question.
- Practising the Ad Appel speaking questions ~10 times is a common recipe.
- One person: a word list for 30 minutes a day + one course book was enough for A2.
- Self-studiers often find KNM the hardest (many facts, more difficult Dutch).
- Take one exam at a time, easiest first.

I could **not** read your Reddit link (Reddit blocks automated access, HTTP 403). The points above come from r/learndutch snippets, expat.com, Medium, iamexpat and the sonambhatnagar repo. Paste the thread text if you want it included.

## Official practice (do these last, as a final check)

All linked from https://www.inburgeren.nl/en/taking-the-integration-exam/practicing.jsp
- Lezen: 4 practice exams · Luisteren: 3 · Spreken: 3 (not in Safari) · Schrijven: 3 PDFs · KNM: 2
- Extra: oefenen.nl, netinnederland.nl (videos on exam subjects)

## Sources

inburgeren.nl (format) · taalboost.nl (466 A2 verbs) · your friends' PDFs · GitHub repos above ·
[expat.com thread](https://www.expat.com/en/forum/europe/netherlands/894816-inburgeren-a2-exam-experience.html) ·
[Medium guide](https://medium.com/inclusive-future-deisgn/passing-inburgeringsexamen-1ee711b6199b) ·
[iamexpat speaking tips](https://www.iamexpat.nl/education/education-news/secrets-passing-dutch-speaking-integration-exam) ·
[inburgering.org A2 guide](https://inburgering.org/exam-info/a2-inburgeringsexamen-guide) (pass marks, unofficial) ·
[Piper Dutch voices discussion](https://community.home-assistant.io/t/piper-dutch-language-whats-the-most-normal-one/630924)
