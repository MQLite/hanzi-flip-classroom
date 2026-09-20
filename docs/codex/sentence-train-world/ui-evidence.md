# Unified train world implementation evidence

Date: 2026-09-21. Worktree: `D:/Repository/hanzi-sentence-train`.
Requested route: Route 2.3, offset 0, Astra High for UI/world/effects. Actual runtime route: UNVERIFIED (no model execution metadata exposed).

## Implemented

- Replaced two render surfaces with one Three.js scene/camera/canvas. Rounded engine and carriage geometry, thick grass terrain, station/roof/canopy, platform, rails/sleepers, tunnel, fences, trees, flowers, lamps and shadows share the same world.
- Persistent per-question carriages move between fixed numbered parking slots and the left-to-right train. Projected semantic buttons follow the actual models each frame; rebuilding same-question controls still forces layout through the existing controls revision.
- Accepted automatic and teacher judgments share a bounded 2.4-second departure with moving wheels, 14 pooled steam puffs and three successive 48-point fireworks with rising shells, trails, radial bursts and fade. Reduced motion and fallback preserve immediate settlement.
- Retained keyboard focus, local mobile scrolling and reveal of the latest carriage, teacher/editor controls, independent modes and existing state/token contracts. No pure state/data/storage change and no added runtime dependency.
- Shared geometry/material/word textures are cached, idle scenes draw on demand, and all effects/listeners/observers/shadows/model resources are released before renderer disposal.

## Verification

| Check | Result | Raw output |
| --- | --- | --- |
| Initial one-canvas and longer-success expectations against baseline | Expected RED: 2 failures (two canvases and old early completion) | `ui-red.log` |
| Initial unified-world implementation | 3 passed | `ui-first-world.log` |
| Refined labels, projector fit and actual burst capture | 4 passed | `ui-art-headroom.log` |
| In-motion coordinate return; wrong idle versus teacher celebration and context loss | 2 passed | `ui-motion.log` |
| Complete unit suite | 82 passed, exit 0 | `unit-final.log` |
| Complete browser suite with app source frozen | 88 passed, exit 0 | `ui-final.log` |
| Final disposal-order correction, scoped lifecycle/control regression | 5 passed, exit 0 | `ui-cleanup-final.log` |
| Production base build `/hanzi-flip-classroom/` | Success, exit 0 | `build-final.log` |
| Whitespace check | `git diff --check` clean | command output |

Full browser regression ran before the final review correction that moved scene-owned GPU resource disposal before `renderer.dispose()`. Only that cleanup order changed afterward; five relevant tests and the production build passed on final source. No hot-reload source mutation occurred during the full run. Existing Three.js bundle-size notice remains non-blocking (604.95 kB minified, 155.37 kB gzip).

The moving-control test clicks the projected target halfway through its transfer, confirms the exact carriage returns, and clicks the original parking position again. The teacher test compares actual canvas frames: a wrong check stays pixel-identical while idle, teacher acceptance changes the rendered frame, and context loss completes exactly once. The 2.4-second stale-restart observation exceeds the full animation duration. Existing mobile, seven-word, no-WebGL, keyboard, hidden-page and independent-mode checks remain active.

## Viewed image evidence

- `train-1920.png`, `train-1280.png`: actual 1920×1080 and 1280×720 viewport captures, seven-token fixture with four selected carriages and the remaining candidates. Six-Han labels are aspect-correct and unobscured.
- `train-default-1920.png`, `train-default-1280.png`: actual default textbook lesson with populated 3D train.
- `train-390.png`: actual 390×844 page viewport. The independent reviewer additionally captured the scrolled working stage in `independent-390-seven-assembled.png` and the full mobile page in `independent-390-full.png`; those demonstrate the locally scrolling world and complete mobile controls.
- `success-burst-1280.png`, `teacher-success-1280.png`: actual 1280×720 intermediate rendered celebrations. Final camera leaves headroom above the gold/coral/cyan blooms while keeping the moving carriages readable.
- `train-error-revealed-1280.png`: long seven-word error plus reference/teacher controls. Primary controls and feedback remain within 720 pixels.

Early full-page captures were replaced by actual viewport-sized captures during the final full suite. Screenshot names now correspond to viewport dimensions. Independent visual review passed final framing, full long labels, seven-car projection fit and mobile interactions; see `visual-review.md`. Independent code review identified the shadow/resource disposal-order correction above and found no additional blocker in its working-tree review. Root owns final commit review and deployment.
