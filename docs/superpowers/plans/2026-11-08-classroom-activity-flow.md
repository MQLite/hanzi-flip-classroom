# Classroom Activity Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, sequentially. User explicitly ordered Tasks1→2→3.

**Goal:** Link same-lesson3D building word choices, instant witch feedback/antidote, and a reading-gated maze.
**Architecture:** Existing immutable cores with small new immediate-read actions; independent maze state/view; main owns lesson-carrying navigation. No storage changes.
**Tech Stack:** Existing JavaScript/CSS/Three.js, native WebAudio, Vitest/Playwright.
**Spec:** docs/superpowers/specs/2026-11-08-classroom-activity-flow-design.md.

## Global Constraints

- Preserve prior3D scene fixes, first-poison round end, exact current-lesson content and saved banks.
- Teacher clicks after oral reading; no speech recognition. One card triggers one immediate outcome.
- Activity links carry source/stage/lesson/grade and prepare a fresh same-lesson target; regular nav retains independent snapshots.
- Maze9×9, connected exit, at least two dead ends, only adjacent legal steps after teacher confirmation.
- No timed penalties, elimination or new services. Mobile/native keyboard/reduced motion remain usable.

## Review Focus

- Already-read/invalid cards cannot alter progress, reveal hidden danger or play sound twice.
- Sound/antidote UI and animation callbacks cannot leak into another mode/round or deadlock navigation.
- Activity continuation must overwrite stale target lesson without corrupting source snapshots or banks.
- Maze generation must terminate, retain an exit/dead ends and never bypass reading or walls.
- Long source lists, empty data and mobile/keyboard must remain playable with all nine modes.

### Task1: Building choice cards

**Files:** building-core.js/building.js/building.css, building tests and3D helper tests.
**Interface:** chooseBuildingChallengeWord(state,id) starts a challenge from built/restored as needed, immediately checks a legal unused word. View shows remaining word cards and dispatches challenge-card; prepare/build flows unchanged.
- [x] RED test direct choice, disappearing safe cards, invalid/duplicate prevention, immediate collapse; implement and verify core/UI/3D.154 units and19 building/browser cases pass.
- [x] Commit and ledger Task1 completion before Task2.

### Task2: Instant witch and antidote prompt

**Files:** poison-core.js/poison.js/poison.css/main.js, new poison-sound.js, poison tests.
**Interfaces:** readPoisonCard(state,id); skipPoisonAntidote(state); createPoisonAudio().playPoison/playRescue/setEnabled/stop/dispose. View removes public reveal step, offers use/skip antidote and next-activity dispatch; main shows sound toggle and later routes continuation.
- [x] RED immediate-safe/toxic/prompt/reset/duplicate tests and real offline-audio output; implement core, prompt and audio lifecycle.
- [x] Update old UI cases to latest one-click results; verify/commit/ledger Task2 before Task3.155 units and13 poison/instant/audio UI tests pass; prompt screenshot inspected.

### Task3: Maze and activity links

**Files:** create maze-core.js/maze.js/maze.css, tests/maze.test.js and tests/maze/ui.spec.js; modify main/README and relevant regressions.
**Interfaces:** createMazeState({words,random}), selectMazeCell(state,index), confirmMazeStep(state), cancelMazeStep(state). createMazeView(host,dispatch).update({state,pool,showPinyin}); main goActivity(mode) passes current lesson with fresh target initialization.
- [x] RED generated-graph/exit/dead-end, legal/read-gated/repeated/complete/snapshot tests; implement core and accessible9×9 view.
- [x] Integrate ninth mode, lesson selection/snapshots/keyboard guards and three-activity strip/buttons. Verify all lesson boundaries and full continuation flow.159 units,38 new/activity browser cases pass;8 original-mode checks verified after a720p navigation-padding fix. Production helper completes3D→instant witch→maze→next lesson without bank writes/errors.
- [ ] Run relevant UI regressions, all units, production build/screenshots; one fresh whole-new-scope review, fix material findings once with RED/GREEN, publish and verify public activities/3D.
