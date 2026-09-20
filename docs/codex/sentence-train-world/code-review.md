# Sentence train world: independent code review

## Verdict

PASS for commit `991ded136fd2a19ca0d6b484dc8b34dee56a8293`.

No open P0, P1, or P2 findings remain in the requested scene/view/effects scope. The core sentence data, scoring, storage, and main orchestration files are unchanged from product base `177c19ab1335cc76ad16738cb84b67e22feb1918`.

Route request: Route 2.3, offset 0, requested Sol High code review. Actual execution model/effort metadata was not exposed, so `ActualRouteUNVERIFIED` applies.

## Scope reviewed

- Original world design and implementation plan.
- Final diffs in `sentence-train-scene.js`, `sentence-train-models.js`, `sentence-train-effects.js`, `sentence-train.js`, `sentence-train.css`, the sentence-train browser tests, and README.
- Single-renderer ownership; resource allocation and disposal; RAF, resize, visibility, context-loss, simple-mode, and inactive-scene lifecycles.
- Semantic control rebuilding and projection during carriage movement, deselection, resize, same-question restart, and practice rebuild.
- Successful automatic and teacher-accepted departures, stale-token cancellation, exactly-once progression, reduced-motion behavior, and bounded particle/steam effects.

## Findings and remedies

One P2 lifecycle issue was found during review: the directional-light shadow map and other scene-owned GPU resources were initially disposed after `WebGLRenderer.dispose()`. Three.js clears its WebGL resource registry during renderer disposal, so that order could leave GPU allocations until context teardown. The final commit disposes the light shadow, effects, model resources, and floor resources before the renderer. The post-fix lifecycle regression and production build passed.

No further material findings remain. The final implementation has one scene renderer and one scene-owned RAF. `cancelAnimation()` clears motion and effects, resolves a pending departure once, resets world positions, and relies on the existing departure token guard to reject stale continuations. Hidden-page, inactive-mode, simple-mode, restart, and WebGL-loss paths all converge through that cancellation behavior. Effects use fixed-size reusable pools with no timers or independent RAFs, and static scenes do not schedule frames.

Projected buttons are recalculated from current world coordinates on every movement frame. Replacement DOM controls are covered by `controlsRevision`, and both selection and return motion keep the active semantic target aligned with the visible carriage. Same-question restart and practice rebuild create fresh aligned controls.

## Verification evidence

- Unit suite: 82/82 passed (`unit-final.log`).
- Full browser suite: 88/88 passed (`ui-final.log`).
- Post-disposal-order lifecycle/control regression: 5/5 passed (`ui-cleanup-final.log`). This includes mode-switch/restart cancellation, context loss, hidden-page completion, moving hit targets, teacher success, and exactly-once scoring.
- Production-base build: passed with `--base=/hanzi-flip-classroom/` (`build-final.log`).
- Independent browser probes during review also confirmed exactly-once completion for hidden-page, context-loss, manual-simple, resize-during-departure, and reduced-motion paths.
- `git diff --check` is clean for product source and tests. Archived raw Windows test logs contain CRLF whitespace diagnostics when checked as patches; this does not affect runtime code.

The separate visual review covers screenshots and aesthetic acceptance; this report is limited to code, lifecycle, controls, and regression behavior.
