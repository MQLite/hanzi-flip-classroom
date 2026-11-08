# 笔画很忙触屏描写与拼图排版

## User requirements and priority

1. Correct 撇折 so 撇 is piě (third tone), including the same ambiguity in other stroke names where applicable.
2. Keep dragging and add a selectable touch/stylus/mouse tracing mode in 笔画很忙. A correct finished stroke immediately speaks its name; a completed character receives a score compared with the canonical character. Use the same selected-lesson characters and normative order as the existing game.
3. 汉字拼图 has components on the left, assembly/合一合 in the middle, composed characters on the right, and new-component English introductions below the entire row.
4. Only after these are complete, simplify the witch aftermath/antidote screen to retain “哎呀，中毒啦！”, “请读出解药句子”, the actual selected lesson sentence (the screenshot's example is “你好！”), and functional button labels. Do not replace all lesson sentences by the example.

The user explicitly prioritized 1–3 before 4. No witch files are to change in the first delivery. All implementation is authorized; production publishing is a separate release boundary.

## Handwriting behavior

Default input remains dragging. Two visible buttons, 拖动笔画 and 触屏描写, switch input. Each keeps separate in-page progress for the selected lesson. New lesson/round resets both through the existing confirmation flow. Personal banks and saved content are untouched.

The large SVG田字格 retains the white canonical glyph. Students draw with one finger, stylus or mouse, lifting after each complete stroke. A start marker and brighter next-stroke shadow guide canonical order. Pointer capture handles the stroke leaving the grid; cancellation, multitouch, page hiding, blur, mode/lesson changes and teardown never count a partial stroke.

Use existing reviewed local glyph paths and ordered medians, with no recognition service or student-data upload. The pure matcher compares resampled ordered paths, start/end locations, reference coverage, relative length, and meaningful terminal direction. Reject taps/scribbles, backwards strokes, partial strokes and strokes at the wrong position/order. Incorrect attempts do not advance or speak. Correct strokes retain the student's trace and play the reviewed stroke-name clip exactly once.

The displayed 0–100 score is “描写相似度参考分”, based on accepted strokes' shape, position and relative length. It is a practice comparison, not a calligraphy certification. Speed and retries do not reduce the score. A character score appears immediately on completion and remains visible until navigation; the final character's score is not hidden by automatic review. Provide undo, rewrite-current-character, previous/next navigation, mute, per-character score history, and optional lesson stroke review/preview. Rewriting replaces that character's result without duplicating completion.

## Architecture

Keep the existing drag reducer intact. A separate immutable handwriting reducer exposes compatible index/placed/progress/completed/review fields plus per-character traces and scores. The construction view mounts a focused pointer-pad renderer and disposes it on every context change. The main integration snapshots both sessions and the chosen input mode.

Extract the puzzle renderer into its own module so layout work and handwriting integration have independent file ownership. Keep existing selectors, lesson scope, multiset matching, discovery/no answer leak, component data, English introductions and collection semantics. Desktop has three explicit columns; narrow screens stack in the same order. Existing async glyph helper is supplied to the module, preserving stale-load protection.

Explicit Mandarin phoneme overrides in the reproducible Windows audio generator correct 撇, rather than changing displayed names or relying on homophones. Version audio URLs so old cached clips do not survive the release.

## Acceptance

Literal geometry tests and all 3,795 recorded canonical strokes must pass the matcher; near traces score below canonical traces, wrong direction/order/location/partial/degenerate traces reject. Test undo/rewrite/navigation/completion and independent mode sessions. Browser tests must draw real pointer paths (including touch/pen), confirm audio only after correct strokes, verify score display and session preservation, cancel interrupted input, and exercise delayed loads, scaling, mobile and projector layouts. Puzzle tests measure actual left/middle/right/below geometry and successful discovery with repeated components. Existing drag, new games, pinyin, witch and bank regression checks remain green. One final fresh-context whole-change review precedes release authorization.
