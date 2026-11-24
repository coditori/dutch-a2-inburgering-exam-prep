# Plan 1 — Lezen (reading) · priority 1

## The exam
- Computer, 65 minutes, multiple choice (about 25 questions, ~18–19 correct to pass — unofficial numbers).
- Short everyday texts: a letter from the gemeente, a note from school, an advertisement, a work schedule, an email, a notice in the flat, a leaflet. One to three questions per text.
- Time is not the problem (people finish in 15–30 minutes). **Words are the problem.**

## What makes you pass (keep it simple)
1. Know ~1000 frequent words by sight (trede 1–4 of `woorden/woorden.txt`).
2. Know the ~15 question types (`Wat moet ... doen?`, `Waarom schrijft ...?`, `Voor wie is ...?`).
3. Method, always the same: **question first → find the key word in the text → read only that sentence and the one after it → choose.**
4. Watch the trap words: `niet`, `geen`, `alleen`, `behalve`, `vóór`, `uiterlijk`, `wel`, `maar`.
You do not need to understand every word of a text. Two unknown words per text is normal.

## The ladder (38 lessons, 10 minutes each)

| Trede | Lessons | You read | Example |
|-------|---------|----------|---------|
| 1 | L1–L6 | one sentence + picture | `De winkel is open.` → kies het plaatje |
| 1 | L7–L10 | sentence with niet/geen, question words | `Waar woont Anna?` |
| 2 | L11–L18 | 3–4 sentences: bordje, sms, briefje | `De les begint om 9 uur. Neem je boek mee.` |
| 2 | L19–L24 | real-life mini texts: openingstijden, rooster, menu, advertentie | read a table, find a time or price |
| 3 | L25–L32 | 60–100 words: e-mail, brief van school/huisarts/gemeente/werk | 2 questions per text |
| 4 | L33–L38 | exam format: 120–150 words, trap words, 3 options | timed, exam layout |
| ✔ | Toets A–D | 4 mock exams of 25 questions, then the 4 DUO practice exams | 20/25 twice = ready |

## Lesson page (one template for all lessons)
1. **Woorden** — 8 new words, each with picture/emoji + audio + one sentence. Click = flip. ❗ = English.
2. **Lees** — the text. Every word is clickable (simpler Dutch or picture; ❗ English). Clicked words go into your review box automatically.
3. **Vraag** — 3–5 multiple choice questions. After answering, the sentence that holds the answer lights up in the text. This trains the method.
4. **Onthoud** — 3 sentences from the text come back as gap-fill tomorrow (spaced repetition).

Extra trainers in `lezen/`:
- **Vraagwoorden-trainer**: match the question to the kind of answer (`Wanneer` → a time, `Waarom` → a reason).
- **Valwoorden-trainer**: two almost identical sentences, one with `niet/alleen/behalve` — what changes?
- **Snel zoeken**: find the price / date / phone number in a notice within 20 seconds.

## Content sources
- Texts: I write them, controlled by trede (a script checks every word against `woorden.txt`).
- Text types and question style: modelled on the 4 DUO reading practice exams (not copied; DUO exams are for the final check).
- Vocabulary: `woorden/woorden.txt` + `woorden/werkwoorden-a2.tsv`.
- More practice outside our pages: examklaar.nl (25 A2 exams), oefenen.nl.

## Folder
```
lezen/
  index.html          ladder + progress
  les.html            one template, loads lessons/L01.json ...
  lessons/L01.json    { trede, woorden[], tekst, vragen[] }
  trainers/           vraagwoorden.html, valwoorden.html, snelzoeken.html
  toets/              toets.html + A.json ... D.json (25 questions, 65 min timer)
```

## Ready when
- Trede 1–4 words: 85% in the "known" boxes.
- 20/25 or better on two of our mock exams **and** on two DUO practice exams.
