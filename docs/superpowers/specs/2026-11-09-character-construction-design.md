# 汉字拼图与笔画很忙

## Accepted classroom behavior

The user requested two games in the existing site, preserving every current game and question bank. The user selected discovery puzzles (parts only, no target preview) and mandatory canonical stroke order. Implementation is authorized; publishing this update is a separate release boundary.

Navigation: 识字翻翻乐 → 汉字拼图 → 笔画很忙 → existing games in their current order. URL modes are `puzzle` and `strokes`. Both games always use the selected lesson, or the selected personal-bank grade, irrespective of the ordinary cumulative/stage flip-card scope.

Puzzle: reusable component cards can be selected with multiplicity, removed, and checked as a combination. Only matching current-lesson characters are revealed. Equivalent multiset combinations may reveal multiple valid characters; repeated checking never duplicates a collection. Independent characters and uncertain decompositions are not invented. The collection uses exact glyph stroke subsets to show how the parts combine. Each lesson offers concise English introductions for new components; a personal bank offers this-round introductions without claiming historical first occurrence.

Strokes: a large 田字格 shows the whole character as a white shadow. Selecting a stroke plays its Mandarin name. The teacher drags the named stroke to the correct next position after a student names it; clicking a type and then its target is an accessible equivalent. Correct type, canonical order and location are required. Selection alone never writes a stroke. Wrong placement does not progress. Undo, character navigation, restart and mute are available. Completing the lesson offers a replayable basic/common stroke review and preview.

## Data and correctness

Use GF0013-2009 and GF0014-2009 for independent characters, component boundaries and names. Do not confuse radicals, components, independent characters and strokes. Compound components may be used and identified as such. Do not invent etymology or phonetic explanations.

Stroke names follow the MOE 2013 calligraphy guideline appendix and applicable GF2001 fold names; order follows GF0023-2020. All recorded curriculum characters have locally hosted HanziWriter SVG geometry. Reconcile exact-name ambiguities against shape and contextual components, rather than trusting a third-party numeric five-category match. Record sources, pinned revisions, overrides and licensing in reproducible data. Unsupported future/custom characters receive an explicit coverage message.

Audio is locally generated Mandarin voice recordings, served as ordinary static assets. Only one clip plays at a time; stop on game change, reset, hidden page and teardown. Geometry loads are cached and stale loads cannot change another lesson/round.

## Layout and compatibility

Use native SVG with exact stroke paths, large readable cards and a large square 田字格. Desktop projector and narrow screens must keep controls usable without horizontal page overflow. Preserve the three existing optional-pinyin modes and their defaults, existing 3D building/maze behavior, all curriculum content, storage schema and personal edits. No cloud-bank or other-worktree changes.

## Acceptance

Meaningful reducer tests cover discovery/no target leakage, multiplicity, valid alternate answers, deduplication, wrong order/type/location, undo and completion. Data validation covers all source records, complete/disjoint component partitions, protected characters, canonical numeric sequences, exact-name overrides and audio assets. Browser tests cover lesson changes, mode snapshots, real pointer placement, actual audio decoding, completion/review, projector/narrow layout, old-game pinyin defaults and storage preservation. A fresh final review precedes release approval.
