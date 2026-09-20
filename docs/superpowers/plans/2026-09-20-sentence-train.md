# 句子小火车 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 在已有课堂中交付可操作的 3D 词语排序火车及可编辑的教材句子题。

**Architecture:** 纯数据解析和轮次状态与 Three.js/DOM 分离，火车轮次保留现有 session 的基本字段，新增排列与检查状态。原识字、组词和岛屿行走代码保持各自行为。UI 通过独立控制器接入模式、筛选、计分及题库编辑。

**Tech Stack:** JavaScript modules, Three.js, Vite, Vitest, Playwright; Node.js 22.12+.

**Spec:** `docs/superpowers/specs/2026-09-20-sentence-train-design.md`

## Global Constraints

- 3–7 节车厢，每节 1–6 个汉字，正文最多 28 字；句尾仅 。？！。
- 全部 36 课每课至少两条关联记录，每册至少八个不同可用句。
- 每题最多一星，错误保留排列；揭晓后自动检查不计分，教师可接受合理排列。
- 三种模式进度独立；刷新重置课堂状态，题库持久化；沿用 schemaVersion 1 的可选字段扩展。
- 1920×1080、1280×720、390×844 可用；支持键盘、减少动态效果、无 WebGL。
- 用户已通过设计并明确授权按 Route 自动实现，后续阶段自行推进；不推送或部署。

## Review Focus

1. 编辑无关字段不丢失手动切分；编辑例句使旧内置映射失效（Task 1/3）。
2. 重复词语仍是两节独立车厢，答案比较按序列而非 ID（Task 1）。
3. 发车过程中切模式、重开、页面隐藏后不会重复得分或越过下一题（Task 2/3）。
4. 原有岛屿前进动画和工坊计分在新增第三模式后仍可用（Task 3）。
5. 390px 屏幕七节长车厢与题库对话框输入焦点不会使整页溢出或触发快捷键（Task 2/3）。

## Task 1: 数据、教材内容、状态与存储（Sol High）

**Files:** Create `src/sentence-train-content.js`, `src/sentence-train-data.js`, `src/sentence-train-core.js`, `tests/sentence-train.test.js`, `tests/sentence-train-data.test.js`; modify `src/storage.js` and relevant storage tests.

**Interfaces:** `resolveTrainQuestion(question)` returns copied question with `train:{tokens,punctuation,alternatives}` or null; `validateSentenceTrain(value,sentence)` returns `{ok,errors}`. Content exports `SENTENCE_TRAIN_CONTENT`. Core exports `createTrainSession({questions,teamNames,random,limit})`, `toggleTrainTile(session,id)`, `undoTrainTile(session)`, `clearTrainSelection(session)`, `checkTrainAnswer(session,{teamId})`, `acceptTrainAnswer(session,{teamId})`, `revealTrainAnswer(session)`, `markTrainPractice(session)`, `nextTrainQuestion(session)`, `previousTrainQuestion(session)`, `startTrainPractice(session)`, `finishTrainDeparture(session,token)`, `getTrainScores(session)`, `getTrainCurrent(session)`.

All mutations return new sessions. Session has `questions,teams,currentIndex,phase,mode,judgments,revealed` and per-question `palettes,selections,checks`; palette items `{id,text}`. `departure` is null or a unique token object; finalization validates token identity. Checks are null or `match`/`mismatch`; selection changes clear checks. Judgments include `outcome,teamId,sentence,source` for correct answers. `getTrainCurrent` returns question or null. UI obtains chosen tokens from palette IDs. Notify UI owner of any interface refinements before edits.

- [ ] Write focused tests for all spec data constraints, 36-course coverage, old-bank compatibility, optional-field validation, copy isolation, duplicate words, check/reveal/teacher scoring, stale departure, navigation and practice.
- [ ] Run `npm test -- tests/sentence-train.test.js tests/sentence-train-data.test.js tests/storage.test.js`; observe missing-feature failures before implementation.
- [ ] Implement explicit content map, validation and session state. Reuse curriculum filtering externally; core deduplicates resolved reference sentences. Validation shape example:

```js
expect(validateSentenceTrain({tokens:['老师','在','看书'],punctuation:'。',alternatives:[]}, '老师在看书。').ok).toBe(true)
expect(resolveTrainQuestion({...source, sentence:'老师在写字。'})).toBeNull()
```

- [ ] Run targeted tests and `npm test`; commit only Task 1 files. Report API and test evidence to controller.

## Task 2: 三维车站与可访问界面（Astra High）

**Files:** Create `src/sentence-train.js`, `src/sentence-train-scene.js`, `src/sentence-train.css`, `tests/sentence-train-ui.spec.js`; modify Playwright matching to include the new UI suite.

**Interfaces:** Consume Task 1 state. View exposes update/dispose and dispatches tile/undo/clear/check/accept/reveal/practice/navigation intents. Scene exposes update, setActive, setSimple, animateDeparture, cancelAnimation, dispose; owns rendering only. Controller may combine view and scene lifecycle in an additional `src/sentence-train-controller.js` to avoid bloating main.js.

- [ ] Add browser assertions against user-visible controls before UI implementation:

```js
await page.getByRole('button',{name:'句子小火车',exact:true}).click()
await expect(page.getByRole('button',{name:'发车',exact:true})).toBeDisabled()
```

- [ ] Confirm new mode test fails on the baseline. Build real wheel/body/coupler meshes with canvas word textures; candidate selection and train movement reflect shared state, with semantic buttons and keyboard fallback.
- [ ] Use a left-facing engine and left-to-right tokens, local narrow-screen track scrolling, stable palette positions and a journey ledger. Add actual animation completion/cancellation guarantees and reduced-motion/no-WebGL paths.
- [ ] Verify screenshot sizes, control reachability, text readability, keyboard behavior, failure retaining order, scene fallback and departure. Keep visuals within existing project palette. Commit owned files after the integrated test passes.

## Task 3: 课堂与题库编辑集成（Astra High）

**Files:** Modify `src/main.js`, `src/editor.js`, narrowly scoped `src/styles.css` if necessary, `tests/sentence-train-ui.spec.js`, `README.md`.

**Interfaces:** Task 1 resolve/validate/core functions and Task 2 view/controller. Current mode dispatch must use train state for scores/practice/restart/navigation while old modes continue using their existing core. Save mode-specific snapshots including selection and team names. Optional editor fields round-trip in `sentenceTrain` without changing original source IDs.

- [ ] Add meaningful browser coverage for mode preservation, old game journeys, form persistence, changed-sentence stale mapping, teacher acceptance after reveal, departure switching, and focus isolation.
- [ ] Implement the third mode, current-filter question resolution, train captions/help, hidden single-character pinyin and extension controls; provide empty-state editor entry and actual round counts.
- [ ] Add editor foldout with `/`-separated tokens, punctuation and alternative lines. Apply shared validation before persistence; allow clearing manual fields; retain fields when editing unrelated inputs.
- [ ] Run `npm test`, `npm run test:ui` on isolated `PLAYWRIGHT_PORT=5186`, and `npm run build`. Fix in-scope failures with targeted regression evidence. Update README with gameplay, question count, customization and state limits. Commit owned files.

## Task 4: 独立验收与本地交付（Sol High code review; Astra High visual review）

**Files:** Read full diff against `57aee16`; update this plan completion boxes and `docs/codex/sentence-train/HANDOFF.md` with evidence.

- [ ] Fresh-context reviewer reads original spec, current diff and direct test evidence; inspect Review Focus conditions, report actionable findings with severity/file/line.
- [ ] Return material findings to corresponding implementer, reproduce with tests, fix and rerun affected checks; request scoped review when required.
- [ ] Verify final Git state, full test/build summaries and screenshot artifacts; start a localhost preview on a free fixed port and open it for the user.
- [ ] Keep branch and worktree for user inspection, report commit, evidence and local preview URL. No push, deployment or merge is authorized by Route automation alone.

## Routing and execution record

Task ID `sentence-train`; Route policy 2.3; RouteOffset 0 (default); execution host local Windows. Native create_worktree returned `Not a git repository` because the task is rooted at D:/Repository. Manual fallback uses the existing sibling-worktree convention at D:/Repository/hanzi-sentence-train, branch feat/sentence-train, baseline 57aee16. Baseline: `npm ci` succeeded, `npm test` 53/53 passed.

Task 1 NormalRoute/RequestedRoute/ExecutionTarget `gpt-5.6-sol high`. Tasks 2–3 `gpt-6-astra high`. Independent code review `gpt-5.6-sol high`; visual review `gpt-6-astra high`. AdjustmentResult UNCHANGED. ActualRoute recorded from agent runtime metadata if exposed, otherwise UNVERIFIED. Root planning/coordination ActualRoute UNVERIFIED; no live switch claimed.

Tasks 1 and 2 can proceed concurrently under the fixed interface contract and separate file ownership; Task 3 waits for the data/state contract to be verified. Controller handles baseline, verification orchestration, documents and review. Route's explicit automatic-execution authorization supersedes routine plan approval pauses. Subagents receive fresh minimal context, not full conversation history.
