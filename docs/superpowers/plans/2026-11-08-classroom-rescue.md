# Classroom Rescue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, task by task. Steps use checkbox syntax for tracking.

**Goal:** Add optional lesson-sentence antidotes first, then ship the four-building reading and rescue game.

**Architecture:** Shared read-only lesson-sentence adapter, immutable per-game state transitions, native DOM/CSS/SVG views, existing main mode snapshots. Sequential releases in user-requested order.

**Tech Stack:** Existing Vite, JavaScript/CSS, SVG, Vitest and Playwright; no dependencies.

**Spec:** docs/superpowers/specs/2026-11-08-classroom-rescue-design.md (user's latest explicit feature request).

## Global Constraints

- Keep first-poison immediate end, no elimination, optional antidote, teacher confirms oral reading.
- Use exact current lesson's existing sentences; textbook sources use curated train excerpts, no invented textbook content.
- Preserve old games, independent progress, personal bank and schema. No network services or speech recognition.
- Buildings: 房、桥、塔、楼; 1–16 selected words, default at most12; draw and confirm separately; one hidden random danger per challenge.
- Collapsed building cannot draw/check; read lesson sentence to restore. Missing sentence permits construction only.

## Review Focus

- Optional/absent sentences and stale selections must not produce cross-lesson content or dead ends.
- Repeated confirmations and mode switches must not add parts, skip rescue or reveal danger.
- Word/sentence snapshots must not mutate saved banks and must reset when lesson changes.
- All four shapes must remain recognizable, long words/sentences readable, mobile controls usable.
- Reduced motion and native keyboard/touch must finish the same flows without timers.

### Task 1: Lesson sentences and optional poison antidote

**Files:** Create src/lesson-sentences.js, tests/lesson-sentences.test.js; modify poison core/view/CSS/vocabulary/main, poison tests, README.

**Interfaces:** getLessonSentences(selection,questions): [{id,sentence,source}]; poison state adds antidote:null|{id,sentence,source}, antidoteStatus; beginPoisonAntidote(state), finishPoisonAntidote(state). View intents antidote,rescue,change-lesson and antidote-choice. Main snapshots selected sentence ID.

- [ ] Test exact lesson/curated source and empty personal data; optional, premature, duplicate, reset antidote actions; observe RED.
- [ ] Implement adapter/snapshot/rules and selectable sentence; completion shows optional read-and-confirm rescue and other-course button.
- [ ] Browser test optional skip/rescue, new round, other lesson, no-sentence fallback and unchanged bank; run unit/browser/build, commit, deploy and verify online.

### Task 2: Building rules and progressive scene

**Files:** Create src/building-core.js, src/building.js, src/building-art.js, src/building.css, tests/building.test.js, tests/building/ui.spec.js; modify main/README.

**Interfaces:** createBuildingState({words,structure,sentence,random}); drawBuildingWord(state); confirmBuildingWord(state); beginBuildingChallenge(state,{random}); restoreBuilding(state). State phase(build,built,challenge,collapsed,restored), words, structure, sentence, builtIds, checkedIds, challengeWords, dangerId, pendingId. createBuildingView(host,dispatch).update({state,pool,selectedIds,structure,sentenceId,showPinyin}); actions choose-word,structure,sentence,start,draw,confirm,challenge,restore,prepare,change-lesson.

- [ ] Test input/snapshot, four types, draw/confirm gating, one-use parts, all-built transition, safe/danger challenges, disabled collapsed actions, exact sentence restore, no-sentence construction and immutable reset; observe RED.
- [ ] Implement pure transitions, four recognizable SVG shapes, progressive parts, collapse/restore effects, setup/card/teacher controls and mode snapshots without old shortcuts.
- [ ] Browser test all shapes, whole build/challenge/rescue, mode/lesson isolation, sentence provenance, empty data, mobile/touch/keyboard/reduced motion; inspect screenshots, run relevant old regressions, all units and production build.
- [ ] Fresh whole-change review, fix material findings, deploy and verify live. Preserve other worktrees.
