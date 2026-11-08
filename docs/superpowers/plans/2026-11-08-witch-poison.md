# Witch Poison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, task by task. Steps use checkbox syntax for tracking.

**Goal:** Add the approved student-hides-poison reading game: any poison shows a magical effect and ends this round; everyone plays again with a new witch.

**Architecture:** Pure immutable round state, existing single-lesson vocabulary adapter, native DOM/CSS view, main-owned mode snapshots and privacy interruption hooks.

**Tech Stack:** Existing Vite, JavaScript/CSS, Vitest and Playwright. No new dependencies or bank changes.

**Spec:** docs/superpowers/specs/2026-11-08-witch-poison-design.md (latest flow explicitly approved).

## Global Constraints

- 1–2 poisons; 2–16 unique cards and at least one safe card. No roster or elimination state.
- Selection and teacher reveal are separate. Any poison immediately completes the round, including two-poison rounds.
- Secret markings exist only during hide; interruptions cover the hide phase. Public stages expose only revealed outcomes.
- Next round clears secret/used/pending state and prompts a new witch; preserve words and poison count.
- Keep all existing games, content, fonts, flags, sounds and bank persistence. Words stay within current lesson.

## Review Focus

- A first poison in a two-poison round must end immediately, and repeated reveal must do nothing.
- Teacher can correct/re-read before reveal without changing secret poison selection.
- Returning from a tab/mode/dialog must not reveal secret markings.
- Too few words, invalid count and maximum selection need clear feedback.
- Snapshots, touch/keyboard controls and short projector/mobile layouts must work.

### Task 1: Round rules and lesson pool

**Files:** Create src/poison-core.js, src/poison-vocabulary.js, tests/poison.test.js.

**Interfaces:** createPoisonState({words,poisonCount,round=1,random}); beginPoisonHiding(state); togglePoisonWord(state,id); sealPoison(state); beginPoisonReading(state); selectPoisonCard(state,id); cancelPoisonCard(state); revealPoisonCard(state); coverPoisonSecrets(state); nextPoisonRound(state). State: phase, words, poisonCount, poisonIds, results[{cardId,poison}], pendingId, feedback, round. getPoisonPool(selection,bankQuestions): {words,label,note}.

- [ ] Write failing tests for validation, phases, poison count, reveal gating, first-poison completion, double actions, next round, privacy covering, immutability and exact lesson pools; observe RED.
- [ ] Implement pure transitions and vocabulary adapter; run GREEN/full unit suite; commit.

### Task 2: Covers, cards, effects and mode integration

**Files:** Create src/poison.js, src/poison.css, tests/poison/ui.spec.js; modify src/main.js, README.md.

**Interfaces:** createPoisonView(host,dispatch).update({state,pool,selectedIds,poisonCount,showPinyin}); intents choose-word, count, start, hide, card, seal, read, reveal, cancel, next-round, prepare. Main owns state, snapshots, lesson scope and coverPoisonSecrets hooks.

- [ ] Add failing browser cases for secret setup, no public hints, separate reveal, magical end state, new witch reset, interruptions, source/old-mode isolation, mobile and touch; observe RED.
- [ ] Implement readable green/beige/purple cards, explicit teacher controls and reduced-motion effects; integrate without old-game shortcut interference.
- [ ] Run browser regressions, all units, production build and screenshot inspection.
- [ ] Fresh whole-branch review; fix material findings, commit, publish through Pages and verify live.
