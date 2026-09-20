# Sentence train Tasks 2–3 UI evidence

Implemented on the isolated `feat/sentence-train` worktree, baseline `57aee16`, approved design and implementation plan dated 2026-09-20. Requested route: `gpt-6-astra high`, Route 2.3 offset 0. ActualRoute: **UNVERIFIED** (no runtime model metadata exposed to this agent).

## Implementation

- Real Three.js engine/cabin/chimney, rails/sleepers/platform, wheeled carriage bodies and couplers. Word textures use the physical plate aspect ratio and a fixed source font, yielding approximately 24px glyphs on desktop for both short and six-character phrases. The engine is left of the left-to-right words; only the train group departs left, while the track stays fixed.
- Track and candidate yard use two retained rendering surfaces. Shared geometry/materials and cached word textures avoid allocation growth on repeated selection. Both surfaces render only when active, resized or animated; context loss, reduced motion, manual simplification and page hiding preserve state. Disposal removes observers, listeners, RAF, textures and renderers.
- Stable semantic candidate buttons and selected-carriage controls share state actions. Native focus follows a selected or returned carriage. Narrow screens wrap candidates and scroll the track locally to a newly selected carriage.
- Third-mode snapshot integration preserves filter, teams, selected team, round, draft, result and score independently. Departure finalizes before saving a mode snapshot; stale callbacks cannot advance a restarted or other-mode session. Island travel and workshop fusion regression suites remain unchanged and pass.
- Editor foldout reads built-in/manual segmentation, retains manual fields during unrelated edits, validates drafts, supports clearing and invalidates an exact built-in map after sentence edits. README documents gameplay, 72 course-linked records, source limits, editing and backup compatibility.

## TDD and defects reproduced

- Initial RED: new-mode browser assertion timed out because `句子小火车` did not exist on the baseline. Raw `ui-initial-red.log`.
- Initial six interaction tests GREEN: stable selection/undo; mismatch retains order; teacher scores actual sentence; reveal prevents auto award; mode preservation; no-WebGL keyboard fallback; editor invalid-draft protection.
- Visual review identified projector controls below the viewport and compressed long-token glyphs. Compact projector layout, top action row and aspect-correct textures fixed these; bounding-box tests cover seven long tokens at 1280×720 and 1920×1080, including a 16px allowance below semantic buttons for carriage wheels. Independent reviewer recorded scoped visual PASS.
- Resize RED: a window error capture found six `ResizeObserver loop completed with undelivered notifications` errors. Width-only observation with queued layout removes the self-triggered resize loop. `ui-resize-red.log` and `ui-resize-green.log` retain evidence.
- Revealed long-sentence RED: feedback bottom was 726px on a 720px projector. Removing redundant reference spacing brought the error/reference/teacher controls within the viewport; targeted test passed.
- Two exploratory expanded test fixtures were rejected because one token exceeded six characters and another sentence omitted its source target character. Corrected the fixtures, not production validation.

## Final verification

All commands executed from `D:/Repository/hanzi-sentence-train`.

| Command | Result | Raw log |
| --- | --- | --- |
| `npm test` | **82/82 passed**, 8 files, exit 0 | `ui-unit.log` |
| `$env:PLAYWRIGHT_PORT='5186'; npm run test:ui` | **75/75 passed**, exit 0, 1.5 min | `ui-final.log` |
| `npm run build` | **PASS**, exit 0 | `ui-build.log` |
| Enhanced natural keyboard test after the full suite | **1/1 passed**, exit 0, both WebGL/simple; one initial focus followed only by Tab/Space/Enter to assemble and check | `ui-keyboard.log` |

No production behavior changed after the full unit/browser/build run. The later keyboard test strengthened the existing test; Playwright config only had a trailing blank line removed. The build retains the existing warning about the ~598 kB Three.js chunk. Browser logs include expected renderer errors from tests deliberately disabling WebGL, plus environment `NO_COLOR`/`FORCE_COLOR` warnings; no unexpected browser errors were accepted.

The 18 train browser tests cover stable candidates, adjustment, wrong/teacher/reveal paths, independent modes and island scoring, fallback keyboard, editor preservation, seven long tokens and local scrolling, actual departure/switch/restart, practice versus skipped summary, repeated-mode/context loss, dialog input isolation, screenshot resize errors, viewport fit, native focus, default textbook, revealed/error fit, page hiding, and changed-sentence stale mapping.

## Visual artifacts (local evidence)

- `train-1920.png`, `train-1280.png`, `train-390.png`: seven-token fixture, including six-character phrases, at target viewport sizes; full-page captures make any vertical scrolling visible.
- `train-default-1920.png`, `train-default-1280.png`: actual default textbook bank with populated 3D train.
- `train-error-revealed-1280.png`: wrong seven-token order after reference reveal, teacher acceptance available.

Primary actions, all candidate controls plus wheel margin, and feedback have explicit viewport-bound assertions on both projector sizes. The 390px test asserts no page horizontal overflow, actual track overflow and the appended carriage fully visible. Mobile intentionally permits vertical scrolling.

No push, merge, or deployment was performed. No optional visual-polish expansion beyond review fixes was pursued.
