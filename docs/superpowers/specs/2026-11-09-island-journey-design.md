# 汉字奇遇岛：顺序闯关与课堂精简

## Authorized order

Group A (touch handwriting, piě pronunciation and puzzle layout) is implemented, independently reviewed and verified at367ba23. Continue B (witch copy), C (game order and mole limit), then D (island journey). The user is sleeping and asked for all work to continue. Complete the whole requested result, then verify one consolidated release. Preserve all question banks, prior games and Group A behavior.

## B: Minimal witch aftermath

Keep visible “哎呀，中毒啦！” on poisoning, “请读出解药句子” and the actual selected sentence while reading, plus functional button text. “你好！” in the screenshot is an example, not a replacement for other lessons. Remove redundant aftermath heading, round summary, poison-word explanation, source/page captions, narrative footnotes and decorative visible text. Keep witch/empty-bottle/bad-grin artwork and transformation/rescue mechanics. The antidote choice remains immediate and accessible; its dialog may have a nonvisual accessible name. After rescue, use the restored-face visual and functional navigation without extra narration.

## C: Ordered games and finite mole rounds

Exact game order: flip识字翻翻乐, mole打地鼠, maze汉字迷宫, puzzle汉字拼图, strokes笔画很忙, workshop组词小工坊, poison女巫的毒药, building汉字建筑师, sudoku汉字数独, train句子小火车, explore情景探索. Keep existing IDs and direct URLs.

Every mole round contains at most9 distinct words from the selected lesson/type. Smaller pools use their real count; do not add out-of-lesson words. “再玩一轮” samples again from the full lesson pool. Existing teacher confirmation, scoring, mute/pinyin and interruptions still work.

## D: Optional lesson island journey

One island per game, numbered in the exact order above. A persistent “小岛地图” entry opens the map for the selected lesson. Cards support independent play; a separate start/continue action begins sequential challenges. Standalone play remains usable and does not silently count toward an active journey. Leaving a journey for independent play pauses it; resuming returns to the next unfinished applicable island.

Use native game completion, not an unconditional “pass” button: flip/train round complete; mole round complete with hits settled; maze exit complete; puzzle all current targets found; strokes all current characters complete in either selected input mode; workshop selected batch complete; poison antidote used or skipped after poisoning; building restored after challenge, or built if no rescue sentence exists; sudoku completed. A stage-end “下一岛” action advances; do not force a student into the next game.

Keep the same textbook/stage/lesson (or personal grade) across stages. A map may skip exploration when no scenario exists. Other modes that genuinely have no usable lesson content also show a clear skip reason rather than fabricated vocabulary, sentences or component splits. At least one available stage must be completed before a lesson can be celebrated.

Persist only journey progress in a separate versioned browser key, never in the question-bank record. Track lesson identity, run identity, completed stage IDs and active/paused state. Handle corrupt/blocked storage without breaking the games. Refreshing a stage may restart its game round, while prior completed islands remain recorded when storage works. Prevent stale callbacks or an exploration from another lesson/run from awarding progress.

Configured exploration pages keep their current standalone behavior. Journey launch links carry the current run context; only native scenario completion reports an exploration pass. Provide a return-to-map route for that same lesson. Do not award an exploration merely because its catalog page or an old unrelated save was opened.

## Celebration

After all applicable islands for one lesson are passed, show full-viewport fireworks for10seconds with large “太牛啦”. Use canvas/SVG with no WebGL dependency. Start once per journey run, never on repeated renders, snapshots or refresh. A close control allows the teacher to dismiss it; otherwise it closes after10seconds. Respect reduced-motion preference with a static celebration for the same duration. Stop animation frames/timers on close/teardown/page exit; block underlying game keyboard controls during the overlay.

## Validation

Test native completion signals and unavailable-mode reasons, progression identity and replay guards, mole<=9 and new-round behavior, exact navigation order, independent mode vs journey snapshots, lesson switching/reset confirmation, blocked/corrupt storage, configured/unconfigured exploration, actual ten-second celebration and reduced motion, and projector/mobile usability. Existing4obsolete2Dbuilding assertions are known baseline maintenance issues; report separately. A fresh whole-change review covers B–D and integration with A before release.
