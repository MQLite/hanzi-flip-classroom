# Witch Poison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, task by task. Steps use checkbox syntax for tracking.

**Goal:** Add the user-approved student-hides-poison reading game with per-round elimination and next-round restoration.

**Architecture:** A pure immutable state machine owns players, secret card IDs and round transitions. A small adapter reuses the existing same-lesson vocabulary. A DOM view handles setup/covers/cards/roster; main owns mode snapshots and privacy interruption hooks.

**Tech Stack:** Existing Vite, vanilla JavaScript/CSS, Vitest and Playwright; no dependencies or bank-schema changes.

**Spec:** docs/superpowers/specs/2026-11-08-witch-poison-design.md (flow explicitly approved).

## Global Constraints

- 1–2 poisons; 2–16 unique cards with at least one safe card; 2–30 named students with one witch excluded from reading.
- Card selection and teacher reveal are separate. An eliminated reader cannot act again this round; next round restores everyone.
- Only hide can reveal secret selections; public stages have no secret-card attributes/labels/styles. Mode/focus/page interruptions cover the hide phase.
- Preserve all existing modes, content, local banks, flags, sounds and exploration links; use single-lesson words and optional known pinyin.

## Review Focus

- Last active reader is poisoned before every poison has been found: round must end, no stuck turn.
- Double reveal or queued click from a past turn: a card and a student must be settled at most once.
- Returning from a hidden tab/mode/dialog must not expose the setup markings.
- Invalid/duplicate names, insufficient words and two-poison selection limits must be explained without data loss.
- Mode snapshots, touch/keyboard controls and short projector/mobile layouts must remain usable.

### Task 1: Round rules and lesson pool

**Files:** Create src/poison-core.js, src/poison-vocabulary.js, tests/poison.test.js.

**Interfaces:** createPoisonState({words,playerNames,witchIndex,poisonCount,round=1,random}); beginPoisonHiding(state); togglePoisonWord(state,id); sealPoison(state); beginPoisonReading(state); selectPoisonReader(state,id); selectPoisonCard(state,id); cancelPoisonCard(state); revealPoisonCard(state); coverPoisonSecrets(state); nextPoisonRound(state). State exposes phase, words, players, witchId, poisonCount, poisonIds, used/results/outIds, currentPlayerId, pendingId, feedback, round. getPoisonPool(selection,bankQuestions) returns {words,label,note}.

- [ ] Write failing tests for validation, private phases, reveal gating, count limits, attribution, elimination/turn skipping, completion, double action, next round, immutability and exact lesson pools; run RED.
- [ ] Implement pure transitions and the same-lesson adapter; run GREEN and full unit suite; commit.

### Task 2: Setup, secret covers and mode integration

**Files:** Create src/poison.js, src/poison.css, tests/poison/ui.spec.js; modify src/main.js, README.md.

**Interfaces:** createPoisonView(host,dispatch).update({state,pool,selectedIds,setup,showPinyin,error}); actions: choose-word, setup, start, hide, card, seal, read, reader, reveal, cancel, next-round, prepare. Main uses all state actions, stores independent snapshots, forces book scope to lesson, and calls coverPoisonSecrets on interruptions.

- [ ] Add failing browser scenarios for close-eyes → hide → sealed public board → teacher reveal → elimination/next round, secret cleanup, source/old-mode isolation, mobile and touch; observe RED.
- [ ] Implement readable green/beige/purple cards and roster, setup validation, focus-preserving native buttons and explicit reveal control; integrate mode and interruption hooks.
- [ ] Run new browser scenarios, targeted existing-mode regressions, all unit tests and production-path build; inspect screenshots.
- [ ] Request one fresh whole-branch review, fix material findings with regression checks, commit and publish via existing Pages workflow. Verify live game and clean status.
