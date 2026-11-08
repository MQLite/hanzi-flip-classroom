# Touch Handwriting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. Two explicitly independent domain tasks use superpowers:dispatching-parallel-agents, with disjoint files; no per-task implementation/review chain.

**Goal:** Add scored touch tracing beside dragging, correct piě audio, and arrange puzzle controls left/middle/right with introductions below.

**Architecture:** A pure geometry matcher/reducer feeds an SVG pointer pad. The construction/main integration selects independent drag and handwriting sessions. A separately rendered puzzle module receives the existing safe glyph loader. Static reviewed pronunciation recordings remain hosted with the site.

**Tech Stack:** Existing JavaScript, SVG/Pointer Events, Vite, Vitest, Playwright, Windows System.Speech. No new runtime dependency or external service.

**Spec:** `docs/superpowers/specs/2026-11-09-touch-handwriting-design.md`

## Global Constraints

- Preserve dragging, lesson-scoped reviewed data, all current games and personal question banks.
- Stroke recognition requires canonical order; wrong attempts never advance or speak.
- Scores compare shape/position/length, never speed or retry count; label them reference scores.
- Finish handwriting and puzzle before editing witch aftermath copy.
- No publishing without explicit authorization for this update.

## Review Focus

- Canonical glyphs with short dots/hooks, curved or multi-turn strokes, and close parallel strokes must be drawable without accepting arbitrary scribbles.
- Touch cancellation, capture loss, simultaneous pointers, resize and interrupted mode/lesson changes must never save a phantom stroke or leak event listeners.
- Correct-stroke audio must play once, honor mute, stop across contexts, and use the corrected cached-asset revision.
- Completed character scores and both input-mode sessions must survive navigation/snapshots; final score must remain visible before review.
- Puzzle three-column positioning, long component sets, shared parts and empty/unsupported lessons must preserve discovery and usable projector/mobile layout.

### Task 1: Recognition and scoring core

**Files:** create `src/handwriting-core.js`, `tests/handwriting.test.js`.

**Interfaces:** `evaluateHandwritingStroke(points,median)` returns `{accepted,score,reason,metrics}`; `createHandwritingState(characters)`, `submitHandwritingStroke(state,points,geometry)`, `undoHandwritingStroke(state)`, `rewriteHandwritingCharacter(state)`, `navigateHandwriting(state,delta)` return immutable session states with `index,placed,progress,completed,review,drawings,strokeScores,scores,lastAttempt,feedback`.

- [ ] Write failing tests for literal 十/三/hook paths, exact/near scores, wrong direction/position/order, short/tap/scribble inputs and immutable undo/rewrite/navigation/completion.
- [ ] Run `npx vitest run tests/handwriting.test.js`; Expected: FAIL missing module.
- [ ] Implement bounded point sanitization/resampling, ordered path comparison, coverage and meaningful terminal direction; deterministic 0–100 metrics and reducer.
- [ ] Run the tests plus all recorded canonical medians; Expected: PASS and canonical scores100. Commit task files.

### Task 2: Touch input view and site integration

**Files:** create `src/handwriting-pad.js`, `src/handwriting.css`; modify `src/construction-view.js`, `src/main.js`; test `tests/handwriting/ui.spec.js`.

- [ ] Write failing browser tests for input toggles, real pointer tracing, rejected gestures/no audio, per-stroke audio, per-character score, independent drag/write sessions, undo/rewrite, cancellation, mode/lesson/hidden-page changes and 390/1280/1920 layouts.
- [ ] Run the focused test; Expected: FAIL absent input choice.
- [ ] Implement pointer capture/cancellation and SVG traces with focused cleanup. Mount through construction view's existing glyph load/epoch guard. Add snapshots, current-mode actions and progress checks in main; preserve existing drag controls and review behavior.
- [ ] Run focused unit/browser and existing construction tests; Expected: PASS. Commit task files.

### Task 3: Pronunciation and puzzle layout integration

**Files:** independent audio agent owns generator, pronunciation clips/manifest and focused tests/docs. Independent puzzle agent owns new `src/component-puzzle.js`, `src/component-puzzle.css`, `tests/puzzle-layout/*`, optional layout doc. Parent owns integration in construction view, runtime audio cache revision and shared tests.

- [ ] Independent agents first reproduce pronunciation/layout failures and implement within assigned ownership. Expected: explicit tone control and passing measured layout tests.
- [ ] Parent verifies audio/source changes and imports `renderComponentPuzzle(root,{state,pool,onAction,renderGlyph})`; remove replaced inner puzzle-only code, retain shared references/coverage helpers used by strokes.
- [ ] Version hosted audio URLs. Run pronunciation tests, handwriting tests, construction/puzzle layout browsers, `npm test -- --run` and production-base build. Expected: PASS; no witch changes in diff.
- [ ] Commit, run one fresh final whole-change review from ae932af, address Important/Critical findings in one RED→GREEN pass, preserve review decisions/validation in a committed report. Present concrete preview and seek publish authorization at the final release boundary.

### Follow-up after Tasks 1–3 are complete

Keep the user's witch-copy request pending. Then handle it as a separate small change: preserve actual lesson antidote sentence and functional controls, remove redundant aftermath narration and source/poison-word captions. Do not start it while Tasks 1–3 remain incomplete.
