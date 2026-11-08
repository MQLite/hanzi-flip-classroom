# Character Construction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lesson-based discovery component puzzles and canonical-order stroke construction to the existing classroom site.

**Architecture:** Pure immutable reducers consume a reviewed static character catalog. Small SVG views load the existing locally hosted glyph geometry and play locally hosted Mandarin clips. Main integration retains mode snapshots and existing bank storage.

**Tech Stack:** Existing Vite, JavaScript, SVG, Vitest, Playwright; Windows System.Speech only for asset preparation.

**Spec:** `docs/superpowers/specs/2026-11-09-character-construction-design.md`

## Global Constraints

- Preserve existing question-bank schema and content, games, pinyin behavior and other worktrees.
- Puzzle initially shows components only; mandatory canonical order in strokes.
- No invented decomposition, stroke names, etymology or coverage claims.
- No new runtime network service, paid dependency or credential.
- Production publish requires explicit authorization for this update.

## Review Focus

- Future/custom characters outside the reviewed catalog receive honest coverage feedback, never fabricated data.
- Enclosing components have noncontiguous stroke groups, repeated components require multiplicity and shared combinations can yield multiple legitimate answers.
- Same-name strokes at different positions cannot be placed out of order; view scaling must not corrupt drop coordinates.
- Rapid lesson/mode switches, audio promises and geometry loads cannot mutate a later activity.
- Added navigation must not regress existing projector layout or personal-bank persistence.

### Task 1: Pure construction rules

**Files:** create `src/construction-core.js`, `tests/construction.test.js`.

**Interfaces:** `createPuzzleState(targets)`, `selectPuzzlePart(state,id)`, `removePuzzlePart(state,index)`, `checkPuzzle(state)`; `createStrokeState(characters)`, `placeStroke(state,{name,point},geometry)`, `undoStroke(state)`, `nextStrokeCharacter(state,delta)`.

- [ ] Write tests with literal 明/好/林 puzzle fixtures and 十/三 canonical stroke fixtures. Assert no target exposure from selection, multiset matches, repeated 木, alternate matches, deduplication, wrong type/location, undo, completion and navigation.
- [ ] Run `npx vitest run tests/construction.test.js`; Expected: FAIL missing module.
- [ ] Implement immutable reducers. Stroke point proximity uses exact next median segments, with a conservative glyph-coordinate tolerance. A near later stroke cannot advance if it is away from the next stroke.
- [ ] Run the same command; Expected: all PASS. Commit only task files.

### Task 2: Reviewed data, provenance and audio

**Files:** create `src/construction-data.js`, `src/data/character-forms.json`, `scripts/prepare-construction-data.mjs`, `scripts/prepare-stroke-audio.ps1`, `public/audio/stroke-names/*`, `docs/character-forms-sources.md`, licenses and `tests/construction-data.test.js`.

**Interfaces:** `getConstructionPool(selection,questions,grade)` yields `{characters,puzzles,components,newComponents,label,unsupported,independent}`; catalog records contain `character`, `names`, and approved `parts:[{id,indices}]`. Component catalog contains exact names, English notes and exemplar geometry.

- [ ] Write tests for protected independent characters, noncontiguous 国/回 frames, complete/disjoint partitions, name counts/category agreement, critical exact-name overrides, source-course first appearances and honest unsupported custom data.
- [ ] Run data tests; Expected: FAIL missing data module.
- [ ] Compile approved research into committed source data, retaining explicit exclusions for unresolved decompositions. Include pinned source/license notices, derivation script and raw-source retrieval instructions. Generate Mandarin WAV files for every approved stroke name, with reproducible voice metadata.
- [ ] Run data and reducer tests; Expected: PASS, all published partitions and names validated; decode WAV headers and nonzero audio. Commit task files.

### Task 3: Accessible SVG activities

**Files:** create `src/construction-view.js`, `src/construction.css`, `src/stroke-audio.js`, `tests/stroke-audio.test.js`, browser fixtures/tests under `tests/construction/`.

**Interfaces:** `createConstructionView(root,{onAction})` with `update({mode,state,pool})`, `setVisible(value)` and `dispose()`; callbacks use puzzle selection/check and stroke place/undo/next/review actions. One lazy glyph loader and one cancellable audio player per view.

- [ ] Add failing tests for audio cancellation/stale playback and a browser fixture exercising the reducer/view contract. Expected: FAIL missing implementation.
- [ ] Implement component cards/tray/reveal/English introductions and stroke palette, white shadow, large grid, pointer and click placement, progress, undo/next, mute and final review. Escaped DOM, no target silhouette before puzzle answer, no stale async updates.
- [ ] Run focused unit/browser tests; Expected: PASS for pointer coordinates, repeated parts, decoding, old-load rejection and review. Commit task files.

### Task 4: Site integration and regression

**Files:** modify `src/main.js`; expand `tests/construction/ui.spec.js` and existing layout checks as needed.

- [ ] Write browser assertions for exact navigation order, both URL modes, lesson updates, separate mode snapshots, reset confirmation, new-component notes and unchanged storage/pinyin defaults. Run; Expected: FAIL absent modes.
- [ ] Integrate pool preparation, state actions, lifecycle, mode snapshots and keyboard guards using existing patterns. Keep old mode logic intact. Add help text and responsive navigation as needed.
- [ ] Run `npm test -- --run`, `npm run build`, focused construction browser tests and existing projector/pinyin/word-brick regressions. Expected: all PASS and no horizontal overflow at 390px, 1280×720 and 1920×1080.
- [ ] Commit. Generate one whole-branch review package from b14382a; fresh reviewer explicitly uses the most capable available model. Fix Critical/Important issues once with RED→GREEN tests and green suites. Present concrete result and request current-update publish authorization only after work is reviewable.
