# Island Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline; independent map/celebration modules may use superpowers:dispatching-parallel-agents with explicit disjoint ownership after Tasks1–2.

**Goal:** Finish minimal witch copy, reorder games, limit mole rounds, and add optional lesson islands with a ten-second completion celebration.

**Architecture:** A shared ordered-game catalog drives navigation and a pure per-lesson journey reducer. A separate storage/controller layer bridges native completion to an interactive island map and context-bound exploration pages. A cancellable full-viewport celebration is independent of game rules.

**Tech Stack:** Existing JavaScript, DOM/SVG/canvas, localStorage, Vite/Vitest/Playwright. No new paid service, account or runtime dependency.

**Spec:** `docs/superpowers/specs/2026-11-09-island-journey-design.md`

## Global Constraints

- Perform B then C then D, after GroupA is complete.
- Preserve question-bank schema/content, independent games and all GroupA features.
- Exact game sequence and maximum9 distinct lesson words per mole round.
- Journey progress is separate from question banks and binds textbook/stage/lesson/grade and run.
- Fireworks show“太牛啦”for10seconds, once per completed run, with cleanup/reduced-motion support.
- Complete reviewable work and verification before the consolidated production release boundary.

## Review Focus

- Empty/independent-only/unsupported lessons cannot deadlock a journey or be falsely celebrated with no played stage.
- Native completion must not pass another stage or lesson; repeated renders, replay, mode snapshots and stale callbacks must not grant progress twice.
- External exploration navigation must preserve the intended course/run and require real scenario completion.
- Storage corruption, blocking/quota, reloads and paused independent play must not damage personal banks or manufacture completion.
- Added map/step controls and fireworks must remain usable on projector/phone, with no stale canvases, timers, keyboard actions or body-scroll locks.

### Task 1: Minimal witch aftermath

**Files:** `src/poison.js`, `src/poison-witch.js`, `src/poison.css`, tests `tests/poison-minimal/ui.spec.js`, existing witch/poison assertions.

- [ ] Write a real-page visible-copy test: after poison and antidote selection, remove functional button text and require only “哎呀，中毒啦！”、“请读出解药句子” and the selected lesson sentence. Ensure a different lesson retains its actual sentence and no source caption. Run; Expected: FAIL redundant copy.
- [ ] Remove redundant aftermath copy/decorative text while keeping illustration, immediate choice and function buttons. Update old rescue tests to assert actual rescued visual/state. Run focused poison regressions; Expected: PASS. Commit.

### Task 2: Shared order and nine-word mole

**Files:** create `src/game-order.js`; modify `src/main.js`, `src/mole-core.js`, `src/mole.js` and relevant tests.

- [ ] Write failing unit test that20input words produce9distinct roundwords, and browser assertion for exact11game order and finite completion/replay. Expected: FAIL old unlimitedround/order.
- [ ] Centralize `{id,label}` game order; reorder existing navigation after allbuttons exist. Limit shuffled unique mole snapshots to9, preserving complete lesson pool for newrounds and honest smaller counts.
- [ ] Run mole/order, construction and pinyin regressions; Expected: PASS. Commit.

### Task 3: Journey rules, native signals and persistence

**Files:** create `src/island-journey-core.js`, `src/island-journey-data.js`, `src/island-journey-storage.js`, unit tests.

**Interfaces:** pure `createJourney({course,availability,runId})`, `completeJourneyStage(state,mode)`, `advanceJourney(state)`, `pauseJourney(state)`, `resumeJourney(state)`, `journeyProgress(state)`; `getJourneyAvailability(selection,bank,grade)`; `isJourneyStageComplete(mode,models)`; storage load/save under `hanzi-flip.island-journeys.v1`.

- [ ] Tests cover all11native completion gates, partial/empty states, exact course/run identity, skip reasons, pause/resume, all-skipped nocelebration, idempotence, corrupt/blocked storage, and no question-bank write. Run; Expected: FAIL missingmodules.
- [ ] Implement immutable rules and validated bounded persistence. Use existing data functions for availability; do not mutate live game states just to inspect availability.
- [ ] Run focused and full unit tests; Expected: PASS. Commit.

### Task 4: Island map and main classroom integration

**Files:** create `src/island-journey.js`, `src/island-journey.css`; modify `src/main.js`; tests `tests/island-journey/ui.spec.js`.

- [ ] Add failing real-entry tests for opening11islands in order, independent challenge, starting from first available, native completion→nextisland, samecourse navigation, pause/resume and unavailable exploration skip.
- [ ] Implement map dialog, progress/next controls and contextual main integration, preserving per-game snapshots for standalone use. No unconditional pass control. Add responsive layout without default standalone projector regression.
- [ ] Run targeted new/old UI tests; Expected: PASS, question-bank bytes unchanged. Commit.

### Task 5: Exploration bridge, celebration and final validation

**Files:** create `src/island-exploration.js`, `src/lesson-celebration.js`, `src/lesson-celebration.css`; modify `src/exploration.js`, native scenario completion hooks in `src/room-escape.js`, `src/poetry-quest.js` and cityentry as identified; update tests/docs.

- [ ] Write failing tests for matchingrun/scenario completion only, samecourse return, no award on catalog visit, exactly10second overlay, once-per-run persistence, earlyclose/reducedmotion and resource cleanup. Expected: FAIL absent bridge/celebration.
- [ ] Implement hooks at native successful completion, bound to current journey context. Add fullviewport canvas fireworks and “太牛啦”, with keyboard isolation/cleanup. Preserve standalone exploration routes.
- [ ] Run complete unit suite, focused journey/witch/mole/handwriting/puzzle/scenario UI and production-base build. Test an actual multi-island route and an end-to-end final celebration; inspect screenshots at1280×720,1920×1080,390px. Expected: PASS; separate known obsolete2Dbuilding assertions.
- [ ] Commit and request one fresh final review for367ba23..HEAD. Fix Important/Critical findings in one RED→GREEN pass; green suites. Preserve QA/Rulings report. Then perform consolidated release within authorization; verify GitHub Pages and public real-use flows. If publication approval review blocks, do not bypass; present concrete finished preview and exact blocking reason for one final approval.
