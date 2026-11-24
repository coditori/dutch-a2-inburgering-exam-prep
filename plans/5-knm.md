# Plan 5 — KNM (Kennis van de Nederlandse Maatschappij) · last priority

## The exam
- Computer, 45 minutes, multiple choice, by theme (official). About 40 questions, ~28 correct to pass (unofficial numbers).
- Questions are short situations with a photo or film: `Fatima is ziek. Wat moet zij eerst doen?`
- It is a **reading** exam about facts. With trede 3 Dutch from Lezen, half the work is done. That is why it comes last.

## What makes you pass
- You do not need history books. You need the "normal Dutch answer" for ~150 everyday situations.
- Rules of thumb that solve many questions:
  - Sick → first the **huisarts** (not the hospital). Emergency → **112**.
  - Problem → first **talk** to the person (neighbour, boss, teacher), then go to an organisation.
  - Men and women are equal; everyone may choose their own partner, religion and opinion.
  - Children **must** go to school from age 5 (leerplicht).
  - You **must** have health insurance; you **must** register with the gemeente.
  - Be on time; make an appointment first; cancel if you cannot come.
- Learn the names of organisations: gemeente, Belastingdienst, UWV, DUO, IND, huisarts, consultatiebureau, woningcorporatie, vakbond, politie.

## The 8 themes (official KNM themes)
1. Werk en inkomen
2. Omgangsvormen, waarden en normen
3. Wonen
4. Gezondheid en gezondheidszorg
5. Geschiedenis en geografie
6. Instanties
7. Staatsinrichting en rechtsstaat
8. Onderwijs en opvoeding

## The ladder (24 lessons, 10 minutes each — 3 per theme)

| Step | Per theme | What |
|------|-----------|------|
| a | **Woorden** | 15 key words of the theme (trede 3 list), with picture + audio |
| b | **Weetjes** | 10 facts as one-sentence cards in simple Dutch, ❗ English behind a button. Spaced repetition. |
| c | **Situaties** | 10 exam-style questions (situation + 3 options), with a one-line "waarom" after each answer |
| ✔ | Toets A–B | 2 mock exams of 40 mixed questions, then the 2 DUO KNM practice exams |

Order of themes, easiest Dutch first: Gezondheid → Wonen → Werk → Onderwijs → Instanties → Omgangsvormen → Staatsinrichting → Geschiedenis en geografie.

## Lesson page
- Fact card: front = question in simple Dutch, back = answer + picture. Wrong → comes back tomorrow.
- Situation question: after you answer, the rule of thumb behind it is shown (`Eerst naar de huisarts.`).
- **Kaart-trainer**: click the province / big city / neighbouring country on a map.
- **Instantie-trainer**: `Je wilt een paspoort.` → kies: gemeente / Belastingdienst / UWV / DUO.

## Content sources — and one warning
- `KNM vragen.pdf` is the answer key of the book *Bagage* (Coutinho), **2011 edition**, 35 pages, tests per chapter.
  - It is useful for the **topics** and the question style.
  - It is **15 years old**: amounts, ages, names (head of state, government), benefits and rules have changed. I will not copy its facts without checking them against current sources (rijksoverheid.nl, DUO practice exams).
  - It is copyrighted. We use it for your private study and write our own questions.
- The 2 DUO KNM practice exams = the real style and level.
- netinnederland.nl has videos per exam subject (recommended by DUO).
- Open practice elsewhere: examklaar.nl KNM exams; HayrullahC's 220-question KNM bank (site only, no license to copy).

## Folder
```
knm/
  index.html
  thema.html             template, loads themes/gezondheid.json ...
  themes/*.json          { woorden[], weetjes[], situaties[] }
  trainers/              kaart.html, instantie.html
  toets/                 A.json, B.json (40 questions, 45 min timer)
```

## Ready when
- All fact cards in the "known" boxes.
- 32/40 or better on our 2 mock exams and both DUO practice exams.
