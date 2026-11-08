# Lesson Word Bricks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, task by task.

**Goal:** Match one removable labeled brick to each lesson word and vary building/maze geometry by lesson.
**Architecture:** Pure lesson identity/blueprint/generation contracts, persistent existing Three scene, identical native SVG fallback and unchanged reading/rescue core.
**Tech Stack:** Existing JS/Three.js/CSS/Vitest/Playwright, no new dependencies.
**Spec:** docs/superpowers/specs/2026-11-08-lesson-word-bricks-design.md

## Global Constraints
- 1–16 selected words, one labeled/removable word brick each; decorations are separate.
- Confirmed construction, read-card challenge, hidden danger collapse, full sentence restoration and next activity remain.
- Four actual geometric variants per type; adjacent lessons differ, text/mode refreshes retain appearance.
- Maze9×9 remains connected, solvable, with at least2 non-exit dead ends; adjacent lessons and same-lesson restart differ.
- Same persistent renderer, bounded textures disposed per blueprint; inactive/hidden/reduced motion/context loss settles accurately.
- Personal bank/storage untouched, no new dependency or service.

## Review Focus
- Removing a non-final, arbitrary word brick must remove that exact word once, with no reappearance on refresh or mode return.
- Danger after several removals collapses the remaining building; sentence restoration and a new challenge restore all words once.
- A reset/context loss during removal must preserve authoritative state without stale animation locks or leaked textures.
- Sparse1-word and full16-word blueprints, long words and all variants must stay legible and in camera bounds on mobile/projector.
- Lesson changes with fixed RNG must change real geometry/topology; restart still yields a connected, solvable maze with dead ends.

### Task 1: Lesson identity, blueprint and maze contracts
**Files:** create src/lesson-appearance.js, src/building-blueprint.js, tests/lesson-appearance.test.js, tests/building-blueprint.test.js; modify building-core.js, maze-core.js, tests/maze.test.js.
**Interfaces:** lessonAppearance(selection,grade)->{key,variant}; buildingBlueprint(type,{words,variant})->{name,blocks}; block descriptors include wordId/word for one brick per selected word; visibleBuildingWords(state)->word ids (restored resets); createBuildingState accepts variant0–3; createMazeState accepts layoutKey, previousGrid and layoutVariant.
- [ ] RED real geometry/unique ownership, sparse/full counts, visible words after arbitrary safe/danger/restoration, neighbor lesson variants and maze topology even with constant RNG.
- [ ] Implement pure contracts and seeded generation with bounded retries, run focused tests and all units. Expected all pass. Commit.

### Task 2: Persistent word-brick scene and lesson integration
**Files:** modify building-scene.js/building.js/building.css/building-camera.js/main.js/README; create src/building-blueprint-art.js, tests/word-bricks/ui.spec.js.
**Interfaces:** scene uses blueprint descriptors, one canvas glyph texture per word; remove animation slides/shrinks exact word group to hidden endpoint. Flat SVG shares blueprint and visibility. Main passes lesson appearance to state/previews and maze generation; previousGrid prevents same restart.
- [ ] RED browser cases for labeled brick counts/pixels, arbitrary safe removal, danger→full rescue/new challenge, mode/reduce/context/flat boundaries and real lesson/maze changes.
- [ ] Implement scene/flat/view integration; retain native controls and correct busy locks. Expected browser cases pass.
- [ ] All units/build, existing building/maze/witch flow regressions and real production preview/screenshots. Expected green, bank unchanged.
- [ ] One fresh whole-change read-only review, fix material findings once RED→GREEN; prepare reviewable result before release authorization. Publish only after authorization and verify public flow.
