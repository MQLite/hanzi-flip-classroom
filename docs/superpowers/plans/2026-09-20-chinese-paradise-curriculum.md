# 新版《中文乐园》题库扩充

> Execution: implement inline in the current session using superpowers:executing-plans and test-driven-development. User approved the newest-series approach and A/B game grouping in the conversation.

**Goal:** 接入出版社现行《中文乐园》课本1–3的36课、108个汉字教学条目，并支持1A–3B阶段、单课及累计复习。

**Architecture:** 教材目录与教学例题独立放在 curriculum.js。保留原有48题与个人题库；新安装使用合并后的默认题库，已有浏览器提供只追加缺失教材题的入口。兼容版本1备份，教材归属作为可选字段校验并导入导出。课堂沿用原有抽题、快照、评分与复习逻辑。

**Tech Stack:** Vite, JavaScript, Vitest, Playwright, Hanzi Writer.

**Spec:** 本次对话中已确认：采用新版《中文乐园》前三册；A/B为游戏分组，分别对应每册第1–6课及第7–12课，不冒称出版社分册。

## Constraints and review focus

- 字表取自出版社官方教学大纲的Chinese Characters栏，不把课文全部出现的字或词汇数当作字表。
- 拼音、组词、例句为本项目配编，明确区分官方范围与配编内容。
- 不自动覆盖、恢复或清空任何已保存题库；添加缺失教材题不覆盖老师改过的题，写入失败可重试。
- 同字跨课保留归属，同轮去重；教材累计复习允许跨册，原年级模式不混入教材。
- 课次筛选取消重开时恢复原选择；编辑汉字清除教材归属，不能将新字误标为官方字表。
- 空题库、旧备份、元数据不全、重复教材条目、保存失败均有明确结果。

## Task 1: 官方目录和教材题目

Files: src/curriculum.js, tests/curriculum.test.js, docs/curriculum-sources.md.

- [x] 写测试并运行：36课、108条、99个不同字；按阶段、本课、截至本课（跨册）筛选；旧题不混入。
- [x] 实现 COURSES、TEXTBOOK_QUESTIONS、filterCurriculum(questions, {stage, lesson, scope})、curriculumLabel(question)、mergeTextbookQuestions(questions)。重复合并幂等，按教材/册/课/字识别已有题，保留已有内容。
- [x] 核对字表、读音语境、例句，记录ISBN及官方教学大纲链接。

```js
expect(TEXTBOOK_QUESTIONS).toHaveLength(108)
expect(new Set(TEXTBOOK_QUESTIONS.map(q => q.character)).size).toBe(99)
expect(filterCurriculum(TEXTBOOK_QUESTIONS, {stage:'1A', lesson:1, scope:'lesson'}).map(q=>q.character)).toEqual(['一','二','三'])
```

## Task 2: 保存与课堂兼容

Files: src/storage.js, src/core.js, tests/storage.test.js, tests/core.test.js.

- [x] 写失败测试：教材跨课同字可保存、重复同课字拒绝、非法教材归属拒绝、备份往返、无年级筛选的跨册抽题及去重。
- [x] 校验可选 textbook/book/lesson 字段；教材身份参与重复判定。保持schemaVersion=1及无归属的旧题验证规则。
- [x] grade未传时抽取所有已筛选题，显式传入时沿用年级验证。
- [x] 运行 npm test，确认原存储失败保护和本轮快照测试通过。

## Task 3: 课堂、管理和本地笔顺

Files: src/main.js, src/editor.js, src/styles.css, scripts/prepare-strokes.mjs, tests/ui.spec.js, README.md, THIRD_PARTY_NOTICES.md.

- [x] 浏览器测试：阶段切换、本课3字、跨册累计复习、取消筛选切换、旧库追加保留个人内容、编辑后教材归属与导出一致。
- [x] 课堂新增题库来源、阶段、课次、范围选择；教材说明与当前范围可见。原年级筛选用于个人/通用题库。
- [x] 管理器显示教材归属、支持按阶段过滤及追加缺失题；保留原有导入整体替换语义，恢复默认数量动态显示。
- [x] 笔顺脚本覆盖合并默认题库的所有不同汉字；仅在题目声明笔画数时比较。
- [x] npm run prepare:strokes；npm test；npm run test:ui；npm run build。检查桌面与窄屏截图，检查git diff，无自动发布。

## Verification record

- 28 unit tests and 34 browser tests passed; production build succeeded.
- Independent review verified all 36 source rows and local stroke resources. Its unreadable-bank overwrite finding was reproduced with a failing browser test, then fixed by gating additions until successful load or explicit replacement recovery.
- Browser tests now run on a dedicated 5175 development server: the existing 5174 server was serving an old production preview.
- Projector overflow caused by inherited column layout on new control labels was corrected without reducing teaching text sizes.
- Changes remain in the current local checkout; no deployment was performed.
