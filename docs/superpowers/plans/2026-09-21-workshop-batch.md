# Shared tray implementation plan

> Use Superpowers subagent-driven-development under user-authorized Route v2.3. No repeated stage approval. Spec: ../specs/2026-09-21-workshop-batch-design.md.

**Goal:** Shared character inventory with automatic reference matches and reversible teacher-approved alternatives.
**Architecture:** Workshop state independent of per-character classroom judgments. Session supplies immutable scoped question and team snapshots. Main dispatches workshop-specific render/actions without passing its completion through flip navigation. Scene receives stable original slot numbers, totalSlots, source tags, and success returnTiles flag.
**Tech:** Existing JavaScript, Three.js, Vitest, Playwright. No dependencies.

## Rules contract (Sol High: inventory and pending-decision invariants)

Own src/workshop-core.js and tests/workshop.test.js only. TDD.

- createWorkshopState(session, {wordCount=4,random=Math.random}={}) -> {phase:'active'|'empty'|'complete',references:string[],palette:{id,character,slot}[],totalSlots:number,selections:string[],draft:string,records:{word,source:'reference'|'teacher',teamId}[],pending:null|{word,tileIds:string[],teamId},wordCount:number}.
- buildWordAnswers(question), validateWord retained if useful. New batch accepts unique valid refs across session.questions, shuffled; max count selected; summed multiplicity.
- toggleWorkshopTile(state,session,id), undoWorkshopTile(state,session), clearWorkshopSelection(state,session) -> immutable state; ignored while pending or not active.
- submitWorkshopWord(session,state,{teamId}) -> {session,state,outcome:'correct'|'pending'|'duplicate'|'ignored',word,source?,returnTiles?}. Reference match removes selected ids, collects once, phase complete iff every reference recorded. Unmatched creates pending, preserving selection. Duplicate doesn't score; clears selection to allow return, outcome duplicate.
- resolveWorkshopWord(session,state,{accepted,pending}) -> same result shape, outcome correct/incorrect/ignored. Require identity state.pending === pending. Accepted creates teacher record, clears selection/pending, preserves inventory and reference progress, returnTiles true. Rejection clears selection/pending preserving inventory. Submission team fixed in pending. Session returned unchanged.
- collectedWords(session,state) -> records; getWorkshopScores(session,state) -> team-id score map derived from records.
- Tests: shared/repeated glyph sum, unique refs/limits, exact removal and remaining solvability, teacher accept/reject, locked pending, stale decisions, team attribution, duplicate protection, no mutation, completion, invalid pool, Unicode and 8-char boundaries.

## UI and scene contract (Astra High)

Own src/main.js, src/workshop.js, src/workshop-scene.js, src/workshop.css only. Preserve latest flip and train integration. Root supplies browser tests.

- currentSession workshop snapshots ALL filtered scope questions (not cap8) so batch draws from scope. createWorkshopState called only for workshop. Local count setting default4; 2/3/4 select with restart confirmation. Independent snapshot/score, early workshop render branch, hide old navigation/practice/target-char semantics. Progress is collected reference count / references length.
- IDs retained #workshop-tiles/#workshop-word/#workshop-submit/#workshop-clear/#workshop-undo/#workshop-collection. Add #workshop-count select aria-label 每盘词数, #workshop-remaining count text, #workshop-teacher panel with #workshop-accept 教师判对 and #workshop-reject 返回重试. Optional details #workshop-references for teacher reference word list. Collection data-source and title/text source cue.
- Pending leaves center intact, disables editing/submission. Accept/reject call resolve with exact pending token. Transitions capture old palette/selection, update logical state exactly once, render effect, then finish without advancing question. Finish on switch synchronously; stale async completion cannot affect another mode/new batch. New round cancels effects. Count changes can roll back if confirmation declined.
- Scene stable slot positions and holes after removal; support 32 glyphs (4x8) with adaptive rack size/scale and usable hit targets. Gentle initial drop into tray. Teacher approval creates teal stamp AND returns original blocks; reference success consumes; rejection returns. Caption source distinction, latest8 physical stamps if >8 plus all records in ledger. Collection animation must align latest8 end slot. Keep focus visible, keyboard Enter/Space native, mobile fallback.

## Root validation / release

- [x] Baseline unit checks; browser RED for batch flow before implementation.
- [x] Rules and UI implemented in separate owners; verify outputs.
- [x] Rewrite workshop browser scenarios for shared tray, reference consume, teacher pending/accept/reject/duplicate, team switching, mode isolation, count restart, empty pool, max palette, GPU loss/recovery and dimensions. Keep flip/train suites unchanged.
- [x] Fresh independent review (Astra High per Superpowers); resolve important findings; actual UI screenshots and both decision branches.
- [ ] Full tests/build/diff check. Commit scoped files; merge latest main safely preserving others; push/deploy same site, verify live assets and flow.

Requested routes offset0; actual execution model metadata is UNVERIFIED unless tool returns it. Root owns docs/tests/release. No overlapping file writers or concurrent Playwright servers on same port. Use PLAYWRIGHT_PORT=5185 for this worktree and preview5186; old5176 is other work and must not be stopped.

## Validation evidence

Baseline84unit tests passed. New state TDD observed11 expected failures; final77unit tests passed across8 files (13 workshop tests replace20 per-question tests). Full integration browser batch:92passed/1failed; the singlefailure measured viewport position after automatic page scroll, corrected to tray-relative coordinates without weakening the fixed-slot requirement. Focused recheck passed. A separate real projector regression failed at submit bottom826.89px on720px screen; compact layout fixed it. Finalworkshop18/18passed, original3affectedintegration tests passed; other76 flip/train tests passed in fullbatch. Final mobile-only width correction retested with max32 viewport case. Independent review traced core and actual acceptance/rejection/mode/final-fusion, found no important defects; mobileprogresswrap corrected. Build passed with existingThree chunk-size advisory, no threshold changes. Screenshots1280/1920/390 stored in ignoredlocal evidence. Existing trackedtrain screenshot outputs restored aftertests.
