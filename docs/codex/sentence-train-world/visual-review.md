# Independent visual review — sentence train world

Date: 2026-09-21. Route 2.3, offset 0, UI QA. Requested route: Astra High. ActualRouteUNVERIFIED: available native metadata does not independently establish the execution model/effort.

Scope: independent visual review of the live implementation at http://127.0.0.1:5194 against `docs/superpowers/specs/2026-09-21-sentence-train-world-design.md`. No product edits. Browser captures made with Playwright Chromium and inspected as actual pixels using `view_image`; no approval based on canvas presence or data flags.

## Final decision

**PASS — no open blocking visual findings.** Final independent captures were regenerated after the camera settled at position (3,12,26), target (0,1.8,1). The camera provides enough sky for recognizable full blooms while preserving readable carriage labels and the projector/mobile layout. Final browser capture and feedback scripts both completed successfully. This is approval of the reviewed visual implementation; the root still owns full regression, build and deployed-site verification.

## Observed findings and resolved issues

- **P2 — resolved: firework headroom.** Earlier frames cropped upper gold/coral tips. Regenerated `independent-success-450.png`, `independent-success-750.png` and `independent-success-1050.png` (all 1280×720) now show recognizable full radial blooms with top clearance. Cyan/coral lower rays cross the roof/tree backdrop, but the particles remain visible, separate from the word area and easy to identify as fireworks; this is not an outstanding blocker.
- **Resolved: roof/word collision.** Current candidate and assembled labels sit fully in front of the carriage side without the old roof slicing through the upper strokes. Both six-character labels, “我们学校老师” and “一起开心看书”, retain normal-looking proportions and complete glyphs at 1280×720 and 1920×1080.
- **Resolved: invisible celebration/departure mismatch.** Real-browser screenshots show a rising shell/trail and steam, then locomotive movement, two clear radial bursts while carriages remain in the frame, then remaining bursts fading after departure. Final samples use a fresh game per capture to avoid cumulative screenshot delay. The suffixes remain scheduled delays, not exact rendered frame ages; `independent-metadata.json` records both capture-start and capture-finish times. Every sampled success run completed with exactly one point and the summary visible.

## Accepted visual and interaction evidence

- The scene reads as one coherent miniature station: thick terrain slab, shaded tree volumes, station roof/front/side, platform/fence, connected rails, locomotive, rounded carriage wheels, parking slots, flowers and tunnel. Warm coral, cream, teal and soft green stay consistent with the surrounding classroom UI. Real geometry and shadows establish depth.
- `independent-1920-seven-candidates.png`, `independent-1920-mixed.png`, `independent-1920-seven-assembled.png`: actual 1920×1080 screenshots, all seven candidate/assembled cars within the visible world, readable labels and visible primary controls/feedback.
- `independent-1280-seven-candidates.png`, `independent-1280-mixed.png`, `independent-1280-seven-assembled.png`: actual 1280×720 screenshots, all seven words and assembled cars fit. Departure/undo/clear/reference controls and feedback fit the viewport. Below-stage footer/navigation can extend below the viewport; this does not conceal the specified primary controls or feedback.
- `independent-1280-error-revealed.png`: actual 1280×720, wrong seven-token sentence with revealed answer and teacher acceptance. Teacher acceptance occupies y219–246, reference y664–684, feedback y688–706. None are clipped.
- `independent-1280-teacher-burst.png`: actual 1280×720, teacher acceptance also triggers visible gold/coral celebration with the seven-car train still departing. Score finishes at 1 and summary appears.
- `independent-390-seven-assembled.png`: actual 390×844 viewport. `independent-390-full.png`: actual 390×1849 full-page image. Page width remains exactly 390 CSS pixels; local horizontal world scrolling reveals the appended final carriage. Seven choices succeeded and removing the final carriage returned the selected count to six. The scroll guidance, word labels, reading text, primary actions, scoring and bottom navigation remain reachable through ordinary scrolling.
- Independent browser runs recorded no page errors. This is visual/interaction evidence, not a substitute for the root's full regression and production-build verification.

## Evidence integrity

Initial implementer captures used full-page output (`train-1280.png` was 1280×796 and `train-390.png` was 390×1849); the initial success capture was 1440×900 despite its `1280` filename. **This evidence issue is now resolved:** the final regenerated `train-1920.png`, `train-1280.png`, `train-390.png` and `success-burst-1280.png` are respectively 1920×1080, 1280×720, 390×844 and 1280×720. These final dimensions were independently checked from PNG headers. The separately inspected independent captures above also use real viewport sizes, except the explicitly named mobile full-page image.

Capture scripts and machine-readable results: `independent-capture.mjs`, `independent-metadata.json`, `independent-feedback.mjs`, `independent-feedback.json`. All are under the ignored `docs/codex/sentence-train-world/` evidence directory.
