# Word Workshop Implementation Plan

## Revision 2: immersive word desk (current)

User supersedes the earlier character assembly flow: use complete-word blocks, single selection moves to the center with a 3D effect, submission returns the block and records the word. Complete-word interpretation explicitly confirmed. The workbench fills the play surface; the old miniature scene and separate text-entry form are replaced.

- [x] Pure state: normalized reference-word options, single selection, immutable submission records, reset selection after submission, duplicate protection. First submission scores once per target; additional distinct reference words are recorded without extra score. Keep existing session navigation and mode isolation.
- [x] UI: large tactile Three.js desktop, labelled solid word blocks, central selection animation, submit action, desktop notebook of submitted words, accessible buttons and usable WebGL fallback. Preserve teacher bank/settings and original flip game.
- [x] Verify real selection/submission/reset, multiple records and one score, mode/navigation retention, keyboard, GPU recovery, empty/invalid options, projector/mobile bounds, and inspect actual animated rendered desk.
- [x] Fresh independent review, fixes, full unit/browser/build checks, documentation, commit on existing feature branch.

Route v2.3, offset 0: pure rules requested Sol Medium; mixed UI/rendering/integration requested Astra High; final independent feature review requested Astra High per Superpowers. Native agents receive minimal context; actual model/effort execution metadata remains UNVERIFIED. Root owns browser tests, visual verification and docs, with no overlapping file writers. No push/deploy.

Historical sections below describe revision 1 and its completed validation, not current revision 2 acceptance.

> **For agentic workers:** Use superpowers:executing-plans with task-local Route v2.3 model dispatch. User approved the spec and autonomous Route execution; further stage approvals are waived by that explicit instruction.

**Goal:** Add a usable classroom word-building mode with generic Three.js workshop models.
**Architecture:** Reuse existing classroom core and question bank. Keep word drafts and palette generation in a pure module; keep the workshop view and renderer separate. Main owns per-mode snapshots and shared teacher tools.
**Tech Stack:** Existing Vite, JavaScript, Three.js, Vitest, Playwright; no new production dependencies.
**Spec:** `docs/superpowers/specs/2026-09-20-word-workshop-design.md` (approved; no word-specific models).

## Global Constraints

- Teacher operates, students answer aloud; teacher decides semantic correctness.
- 2–8 Unicode Han characters containing the target; trim boundary whitespace only.
- Existing bank schemaVersion 1; no added persistence for classroom progress.
- Each mode retains its own session, selection, teams, pinyin and current draft on switching.
- No push or deployment in this task.
- Worktree `D:/Repository/hanzi-word-workshop`, branch `feat/word-workshop`, base `45fe130`.
- Native worktree tool returned Not a git repository because the task cwd is the parent directory; a manual Git worktree was created against the verified repository.

## Review Focus

- Mode switching after edits or scoring restores each mode's exact UI and underlying snapshot.
- IME composition and Space on buttons must not trigger reveal or navigation.
- Input editing must preserve focus; invalid drafts must not enable scoring.
- WebGL context loss or rapid switching must not lose state or multiply render loops.
- Short projector screens and narrow mobile screens must keep the main actions reachable and text legible.

## Routing

Profile: route_offset 0 (default), AdjustmentResult UNCHANGED throughout. Request support comes from the native collaboration tool schema; record returned execution metadata separately in HANDOFF.

1. Pure rules: NormalRoute/RequestedRoute/ExecutionTarget `gpt-5.6-sol`, medium, fresh minimal implementation context.
2. UI, rendering and integration: NormalRoute/RequestedRoute/ExecutionTarget `gpt-6-astra`, high, fresh minimal implementation context. UI and event integration stay together to avoid two writers in main.js.
3. Independent review: Route default is Sol High; Superpowers whole-feature review requires strongest available model, so ExecutionTarget `gpt-6-astra`, high. Fresh context, original spec and actual diff only.

No actual model is inferred from a requested name; missing returned execution evidence is UNVERIFIED. Coordinator handles plan, test orchestration and documentation in its existing context (actual effort UNVERIFIED).

## Task 1: Pure word-building rules

Files: create `src/workshop-core.js`, `tests/workshop.test.js`. Do not modify main.js, scene files, styles or existing core.js.

Interfaces (exact exports):

```js
buildTiles(question, random = Math.random) // string[], target + up to 12 unique other Han chars, shuffled once
validateWord(value, character) // { ok: boolean, value: trimmed string, error: string }
createWorkshopState(session, random = Math.random) // { drafts: string[], tiles: string[][] }
setWorkshopDraft(state, session, value) // immutable next state; settled/nonactive unchanged
markWorkshopCurrent(session, state, options) // session; wraps markCurrent, enforces valid draft for correct
collectedWords(session, state) // { word, teamId, questionId }[], correct records only
```

- [x] Write failing real tests for repeated characters, non-BMP Han, invalid bounds/missing target, teacher-accepted non-reference words, immutable settled drafts, single settlement and palette limits.
- [x] Run `npm test -- tests/workshop.test.js`; inspect failure from missing implementation.
- [x] Implement the exports above; reuse `markCurrent` and current question accessor from core.
- [x] Run `npm test`; expected all existing and new unit tests pass.
- [x] Report files and observed output; coordinator commits validated task changes.

Representative independent expectations:

```js
expect(validateWord(' 爸爸 ', '爸')).toMatchObject({ok:true, value:'爸爸'});
expect(validateWord('木', '木').ok).toBe(false);
expect(validateWord('树 林', '林').ok).toBe(false);
expect(validateWord('大海', '木').ok).toBe(false);
```

## Task 2: Classroom UI and generic 3D workshop

Files: create `src/workshop.js`, `src/workshop-scene.js`, `src/workshop.css`; modify `src/main.js`, `src/scene.js` and only necessary base CSS. Use Task 1 interfaces above.

View owns stable input DOM and word tile controls; main provides current session, draft state and callbacks. Renderer owns scene lifecycle only, exposes setActive, setSimple, update, reward, dispose. Scene update consumes word length and number of collected words, never changes scores.

- [x] Coordinator adds browser acceptance tests first and observes failure on the absent mode control.
- [x] Implement accessible mode buttons with exact names 识字翻翻乐 and 组词小工坊, per-mode state snapshots and current-scene dispatch.
- [x] Implement target, palette, word slots, input, undo/clear, reference/teacher judgment flow, collected words and summary. Preserve existing classroom control IDs and core behavior.
- [x] Implement locally modeled desk, tiles, conveyor with rollers, stamp and shelf, short add/reward animations, reduced motion, context-loss/simple fallback and explicit lifecycle.
- [x] Update main's keyboard handling for buttons, IME, dialog and input isolation; release/pause old scenes when switching.
- [x] Run `npm test`, `npm run test:ui`, `npm run build`. Visually check 1920×1080, 1280×720 and 390×844 and real animation with reduced motion disabled.

Browser contracts used by acceptance tests:

```js
await page.getByRole('button', {name:'组词小工坊', exact:true}).click();
await expect(page.getByRole('heading', {name:'组词小工坊', exact:true})).toBeVisible();
await page.getByLabel('输入其他词语', {exact:true}).fill('爸爸');
await page.getByRole('button', {name:'揭晓参考词', exact:true}).click();
```

Keep common controls `#progress`, `#correct`, `#practice`, `#back`, `#next`, `#simplify`, `#teams`; expose workshop target `#workshop-target`, draft display `#workshop-word`, scene host `#workshop-scene`, palette `#workshop-tiles`, collected list `#workshop-collection`. Input is always reachable while active; locked after settlement.

## Task 3: Validation, documentation and independent review

Files: `tests/workshop-ui.spec.js`, `playwright.config.js` to include both UI suites; README and this plan/HANDOFF.

- [x] Add representative browser acceptance tests for full round and review, invalid/correct scoring, custom input, mode snapshot restoration, empty bank, layout and context fallback. Use existing real fixtures and real page state, no production test-only API.
- [x] Execute failing browser test before UI implementation; then the complete unit/browser/build commands after integration.
- [x] Capture and inspect real browser screenshots of workshop and reduced/simple variants; fix any actual obstruction or clipping.
- [x] Update README with mode use, generic models, independent in-memory progress, teacher semantic judgment and input limits.
- [x] Dispatch independent reviewer with approved spec, plan, current Git diff and tests. Fix important findings and rerun affected tests; report any unresolved limits truthfully.
- [x] Commit completed work on feature branch; preserve local worktree for access. No push or deploy.

## Execution evidence

- Baseline before implementation: `npm test` passed 28 tests in 4 files on original checkout. Clean Git baseline `45fe130`.
- New worktree dependency setup: `npm ci` passed, 0 vulnerabilities reported.
- Task progress and runtime routing evidence are recorded in `docs/codex/word-workshop/HANDOFF.md` (local ignored execution record).

## Final validation

- `npm test`: PASS, 46 tests in 5 files (2026-09-20 local).
- `npm run test:ui`: PASS, 47 browser tests, 36.7 seconds. Includes both original classroom and workshop, real GPU context loss/restoration, focus/IME/keyboard, independent mode state, and projector layout regressions.
- `npm run build`: PASS. Existing Three.js vendor chunk is 532.98 kB (132.67 kB gzip), generating the Vite 500 kB advisory; no new dependencies or raised warning threshold.
- `git diff --check`: PASS.
- Visual QA in the live in-app browser: 1920×1080, 1280×720,390×844; inspected target/word/reference/controls, detailed generic desk/conveyor/stamp/shelf, selected blocks and collected result. Short projection prioritizes readable text and reachable controls with a smaller scene.
- Independent read-only native reviewer (fresh context) found two P2 bugs. Focused-button arrow navigation and GPU restoration were reproduced in failing regression tests, fixed, and passed the full suite. Re-review: both resolved; no remaining important findings.
- Existing Space test now clicks the scene before using the global shortcut. Space on a focused button intentionally retains native button activation; test intent is preserved.
- UI layout iterations removed tray/model and target/progress overlaps, then kept before/after-reveal primary buttons within both projector sizes.
- Final source is retained on `feat/word-workshop` in the isolated worktree. No push, publication or deployment performed.
- Route v2.3 native minimal-context dispatch requested Sol Medium for rules and Astra High for UI/review. Tools exposed requested target support but no actual model/effort execution metadata; ActualRoute remains UNVERIFIED. Review independence is confirmed by `fork_turns: none`.

## Revision 2 final verification

- User-confirmed whole-word AC implemented: dominant 3D desktop, actual beveled blocks and projected native labels moving into the central tray, submission returns them and records distinct words, one score per target.
- Pure state TDD: 8 expected failures before implementation; root full `npm test` PASS 53/53 in 5 files.
- Browser TDD: root first observed missing submit control. Original 34 flip tests remain unchanged and pass. Full integration run found one long-word text overflow after other 46 tests passed; adjusted label font to reserve padding. Final `npx playwright test tests/workshop-ui.spec.js` PASS 13/13 (19.2 seconds), including exact text bounds, real animated movement/return, practice lock, visible summary records, GPU recovery, fallback, restart and mode isolation. All 47 current browser tests have passed their final relevant checks.
- `npm run build` PASS; Three.js chunk 533.49 kB /132.76 kB gzip retains the existing 500 kB size advisory. No new dependency or warning-threshold changes.
- Actual in-app browser screenshots at1280×720 and1920×1080 checked: desk dominates, word mesh+label move together, target/tray/notebook text align to projected model anchors, submitted word appears in notebook. Mobile390×844 uses a tactile accessible layout. Reduced-motion and fallback covered by browser tests.
- Fresh native independent review found two P2 issues: settled non-correct controls were enabled but inert, and summary hid records. Both fixed and independently reproduced as corrected. Practice regression was first observed failing; summary visibility assertion now passes. No remaining important findings.
- Route v2.3 offset0: native minimal-context Sol Medium rules, Astra High UI and fresh independent reviewer; actual model/effort metadata not returned, ActualRoute UNVERIFIED. Same local Windows worktree and branch retained; no push/deploy.