# Sentence train logic evidence

Task 1 implements the non-UI content, validation, session state, and schema-version-1 storage extension from `docs/superpowers/plans/2026-09-20-sentence-train.md`.

## Contract

- `resolveTrainQuestion(question)` returns an isolated question snapshot with `train: { tokens, punctuation, alternatives }`, or `null` when neither a valid manual definition nor an exact ID-and-sentence built-in mapping exists.
- Correct judgments are `{ outcome: 'correct', teamId, sentence, source }`, where `source` is `auto` or `teacher`. Practice and skipped judgments use `practice` and `unanswered` outcomes.
- `phase` remains `active` during departure. `departure` is the unique lock token; `finishTrainDeparture` advances only when passed that same object.
- Selections contain palette IDs. Repeated token text receives distinct IDs and answer comparison uses the selected text sequence.

## TDD and verification

- Red run: `npm test -- tests/sentence-train.test.js tests/sentence-train-data.test.js tests/storage.test.js` failed because the three new modules did not exist and storage did not validate or normalize `sentenceTrain`.
- Focused green run: 3 files, 38 tests passed.
- Full unit run before final verification: 8 files, 81 tests passed.
- Content audit: 72 records, 72 exact existing question IDs, zero invalid mappings; every one of the 36 Hanyu Paradise lessons has at least two records and each of the six stages has at least eight unique sentences.
- Build check succeeded with Vite; its existing Three.js chunk-size advisory remains non-fatal.

The requested Task 1 execution target was Sol High. The runtime does not expose verifiable model metadata here, so ActualRoute is `UNVERIFIED`.

## Independent review fix

- The reviewer reproduced that `createTrainSession({ limit: 9 })` could create a round above the eight-question maximum.
- Ruling: reject limits outside `0…8`, consistent with the constructor's existing validation of invalid limit values; silently capping a caller error would hide a broken integration.
- RED: `npm test -- tests/sentence-train.test.js` failed because `limit: 9` did not throw.
- GREEN: the same focused suite passed 13/13 after tightening the public range guard.
