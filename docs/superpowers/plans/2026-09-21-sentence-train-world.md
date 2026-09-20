# Sentence train 3D world implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development with Route 2.3 model/context rules; execute automatically under the current task authorization.

**Goal:** Replace split train surfaces with one attractive 3D station and successful-departure fireworks.
**Architecture:** Keep data/core and scene lifecycle interface, redesign the view/scene/CSS, extract model/effect modules when useful. Semantic controls project into the shared world and remain usable in fallback.
**Tech Stack:** Existing Three.js/Vite/Playwright/Vitest; no new runtime dependencies.
**Spec:** `docs/superpowers/specs/2026-09-21-sentence-train-world-design.md`.

## Global constraints

- Existing 3–7 tokens, up to6Han/token,28Han/sentence,72course records and all game-state rules remain intact.
- One unified WebGL scene/canvas; true mesh scenery, unified perspective, legible word plates.
- Fireworks rise and burst above/behind teaching words only on accepted success; departure2–2.5seconds, exactly-once advancement and cancellation.
- 1920×1080/1280×720 projection and390×844 mobile; preserve actual hit-target alignment, keyboard and reduced-motion/fallback paths.
- Existing scene public API update/setActive/setSimple/animateDeparture/cancelAnimation/dispose remains compatible.
- Prior Route automatic implementation and same-site commit/deploy authorization apply to this revision. Baseline177c19a in existing isolated D:/Repository/hanzi-sentence-train, branchfeat/sentence-train.

## Review focus

1. Replacing projected controls or re-layout during movement must not strand clickable areas at old positions.
2. New scene geometry must not obscure six-character labels or force projector controls below fold.
3. Success animation interrupted by restart/switch/hide/context loss must settle once, without leftover particles.
4. A visible firework burst is required, not just a DOM flag or stationary confetti.
5. Reduced-motion and simple view must retain complete gameplay after removal of two old canvas hosts.

## Task1: Unified world and success presentation — Astra High

**Own:** `src/sentence-train-scene.js`, `src/sentence-train.js`, `src/sentence-train.css`, optional `src/sentence-train-models.js`, `src/sentence-train-effects.js`, train UI tests, README, narrowly necessary main integration. Pure state/storage untouched.

- [x] Write failing tests for one scene canvas, existing model-coordinate selection, same-question restart, moving selection/return and success/cancel lifecycle. Representative new expectation:

```js
await page.getByRole('button', {name:'句子小火车',exact:true}).click();
await expect(page.locator('#train-scene canvas')).toHaveCount(1);
```

- [x] Observe RED against split-canvas baseline, then implement shared camera/world with reusable model builders, ground/terrain/station/vegetation/railway/departure structure. Keep student text at readable projected size and keep consistent global perspective.
- [x] Implement carriage motion and coordinate-aligned semantic controls; use world object locations and camera projection, update every needed animation/layout revision.
- [x] Implement fireworks/steam on successful `animateDeparture()` with deterministic lifetime bounds and safe completion/cancellation. Add meaningful lifecycle regressions using actual gameplay and screenshots of intermediate fireworks frames.
- [x] Adapt old layout-specific browser assertions to unified viewport while preserving their original user-facing guarantees. Do not weaken no-overflow, full-model/controls fit, focus, restart, teacher/mode and score assertions.
- [x] Run targeted tests on isolated port5193, then full unit/UI and production-base build once source stable. Capture actual idle/selected/success1920,1280 and390images. Update README; commit owned files and evidence.

## Task2: Fresh independent review — Astra High visual, Sol High code

- [x] Review actual screenshots/motion capture and relevant changed code against original user requirement and this spec. Code review checks scene/control lifecycle and unchanged game rules; visual review checks unified world, appreciable depth/shadows, legibility and actual fireworks.
- [x] Fix material findings through original implementer with focused regressions and appropriate rechecks; no unrelated polish expansion.
- [x] Record review findings, remedies, raw test logs and route requests; actual model metadata is UNVERIFIED unless exposed.

## Task3: Deploy and online acceptance — controller

- [x] Check latest main, integrate any intervening changes safely, revalidate affected scope. Origin main remained at 177c19a; no further integration change was needed.
- [ ] Merge/push to existing main only after required checks; track matching-SHA GitHub Pages run to success.
- [ ] In a fresh browser context verify online one-canvas scene, word selection, successful train/fireworks and no runtime errors; preserve screenshot.
- [ ] Update local handoff, report deployment URL, final commit and exact check results.

## Routing and decisions

Route2.3 offset0. UI/world/effects form one tightly coupled unit, requestedgpt-6-astra/high using existing train_ui context where helpful. No separable business-code stage needed. Fresh reviewers use fork_turns none with requestedAstraHigh visual andSolHigh code. Root coordinates tests/deployment and documents. Actual execution metadata remainsUNVERIFIED when tools expose only task identity.

User purpose is clear; choose bright toy-station art direction consistent with existing classroom palette. New request is an iteration of the same game under existing automatic-execution preference; no renewed stage approval requested. Existing explicit deploy instruction supplies same-repository/site publishing authorization.
