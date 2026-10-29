# Hanzi Sudoku Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth vocabulary Sudoku game using nine words from the selected lesson, with collect-then-fill play.

**Architecture:** Keep Sudoku math/state, sourced vocabulary/pictures, and DOM interaction in separate modules. The existing main controller owns the fourth mode and snapshots its state alongside the three existing modes. No question-bank schema or saved-bank mutation.

**Tech Stack:** Existing Vite, native JavaScript/CSS, Vitest, Playwright. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-30-hanzi-sudoku-design.md` (approved; optional pictures).

## Global Constraints

- 9×9, nine distinct word identities; each row/column/box contains each identity once.
- Default 12 blanks, every row/column/box has 1–2 blanks; unique solution, solvable by single candidates.
- Given clues are copied; collect nine different words before filling. Word cards are reusable.
- Prefer daily-use words in the current lesson's 读一读. No silent cross-lesson or helper-example substitution.
- Optional meaningful pictures; suppress ambiguous pinyin/picture clues within the chosen nine words.
- A blank scores at most once per round, including undo/refill. Original three modes and saved banks are preserved.

## Review Focus

- Same word in different forms must never bypass duplicate collection or Sudoku constraints.
- Homophones and shared picture meanings must remain unambiguous in the selected set.
- Short lessons must explain the real shortage after inspecting reading material; no fabricated ninth word.
- Touch/keyboard users need click-source/click-target alternatives; no whole-page horizontal overflow.
- New mode must not invoke flip/train keyboard actions or overwrite another mode's progress.

### Task 1: Puzzle and game state

**Files:** Create `src/sudoku-core.js`, `tests/sudoku.test.js`.

**Interfaces:**
- `createSudokuPuzzle({random,blankCount=12})` returns `{solution,givens}`: 81-number solution using 0–8, nullable givens.
- `createSudokuState({words,teamNames,random,blankCount=12})` returns an immutable state with `phase`, `words`, `solution`, `givens`, `values`, `presentations`, `collected`, `teams`, `scores`, `scored`, `history`, `feedback`.
- Words are `{id,word,pinyin,picture?,source?}`; collected stores word IDs; cell values store 0–8 indices.
- Actions: `collectSudokuWord(state,cell)`, `placeSudokuWord(state,{cell,wordId,teamId})`, `clearSudokuCell(state,cell)`, `undoSudoku(state)`, `getSudokuProgress(state)`.

- [ ] Write failing tests for unit validity, blank counts, independent solution counting, single-candidate completion, invalid nine-word sets, same-form identity, given-copy, phase locking, correct/wrong placement, undo and one-score-per-cell.
- [ ] Run `npm test -- tests/sudoku.test.js`, observe missing behavior.
- [ ] Implement a randomized valid base grid with a synchronized prevalidated mask; keep all state transitions pure and guard invalid indices/teams/word IDs.
- [ ] Verify standard and seeded-random puzzles, then commit the core and tests.

### Task 2: Lesson vocabulary and meaningful pictures

**Files:** Create `src/sudoku-vocabulary-content.js`, `src/sudoku-vocabulary.js`, `src/sudoku-pictures.js`, `tests/sudoku-vocabulary.test.js`, `docs/sudoku-vocabulary-sources.md`.

**Interfaces:**
- `getSudokuCandidates({source,stage,lesson,grade},bankQuestions)` returns `{words,label,note,course?,supported}`.
- Candidate IDs are stable within the selected source/course. Preserve pinyin and source section/page; prefer curated daily-use reading words. Keep single-character word entries.
- `pictureForWord(word)` returns a static meaningful picture descriptor `{key,label,glyph?,count?,month?}` or null; no remote image fetching or unrelated placeholders.
- Content is course records `{textbook,book,lesson,preferredWords,readingVocabulary?,note?}`; supplementary words require verified same-lesson PDF provenance.
- Personal-bank candidates may use the existing character/pinyin pairs, clearly labeled personal字题. A textbook lacking a verified complete word list reports that limitation instead of using auxiliary examples.

- [ ] Audit Chinese 读一读 daily-use choices and Hanyu short-lesson reading material in parallel, keeping source evidence outside product code until reviewed.
- [ ] Write and run failing tests for source/lesson isolation, reading priority, nine-word shortages, pinyin/provenance and picture semantics; implement the adapter/catalog.
- [ ] Verify against curated source records and bank non-mutation; commit data, source notes and adapter.

### Task 3: Two-stage board and fourth-mode integration

**Files:** Create `src/sudoku.js`, `src/sudoku.css`, `tests/sudoku-ui.spec.js`; modify `src/main.js`, `playwright.config.js`, `README.md`.

**Interfaces:**
- `createSudokuView(host,dispatch)` exposes `update({state,candidates,selectedIds,label,note,teamId})` and `dispose()`.
- Intents: `choose-word(id)`, `start`, `collect(cell)`, `place({cell,wordId})`, `clear(cell)`, `undo`.
- Native pointer drag and click/tap alternatives share those same intents. A given clue never moves out of the grid; collect drop targets add one canonical word; filled-stage right cards remain reusable.
- Main keeps `sudokuState` and selected nine IDs in mode snapshots, forces textbook Sudoku to single-lesson scope, and supplies the current team when placing. Other modes keep their existing snapshots, rendering and shortcuts.

- [ ] Add failing browser scenarios for collecting nine, duplicates, given-copy, mouse drag, click/tap, homophone presentation, fill/clear/undo scoring, insufficient vocabulary and mode isolation.
- [ ] Build a green/beige 9×9 board with thick box borders and a right-side nine-card rail; preserve readable local scrolling on small screens.
- [ ] Integrate the fourth button, preparation choices, progress, shared team scores, keyboard guards and help; no old bank writes.
- [ ] Run Sudoku browser tests plus targeted original-mode regression, all unit tests, and production-base-path build. Check desktop/mobile screenshots.
- [ ] Request one fresh whole-branch review; fix material findings with regression checks, then commit and publish through the existing GitHub Pages workflow. Confirm live behavior and clean status.
