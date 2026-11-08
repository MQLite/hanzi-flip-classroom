# 汉字拼图：选择、组合、揭晓

桌面将三个操作区依次排在同一行：左侧选部件，中间放入部件并“合一合”，右侧展示成功拼出的字与本课收集。英文部件介绍移到整行下方，默认收起。850px 及以下按相同顺序纵向排列。大量部件在左侧区域内滚动，部件字形保持可读大小。

`src/component-puzzle.js` 导出：

```js
renderComponentPuzzle(root, {state, pool, onAction, renderGlyph});
```

调用方在每次更新时清空 `root`；该方法追加 `.component-puzzle`。状态与题库由调用方提供，模块不改动题库，也不计算匹配规则。事件依次调用 `onAction('part', id)`、`onAction('remove', index)`、`onAction('check', null)`。

`renderGlyph(host, character, indices, {fit=false, parts=null}={})` 由调用方提供，并负责异步请求、旧渲染失效与卸载管理。该模块沿用真实部件例字的笔画索引；成功结果传入完整分拆以着色。只渲染 `state.revealed` 中的答案，初始右栏仅显示问号。

集成时在 `construction.css` 后导入 `component-puzzle.css`，并将原 `renderPuzzle(state, pool)` 的实现替换为：

```js
renderComponentPuzzle(root, {state, pool, onAction:action, renderGlyph:glyph});
```

所有新增样式限定在 `.component-puzzle` 内，保留 `.parts-palette`、`.parts-tray`、`.puzzle-reveal`、`.puzzle-collected`、`.component-introductions` 和现有按钮无障碍名称。独体字保护、暂不出题提示、资料缺失提示、资料依据、本课完成反馈均保留。

验证使用真实的构字数据与状态函数；独立页面为 `tests/puzzle-layout/fixture.html`。新增浏览器测试先在旧界面上于 1280 和 1920 宽度失败，失败点为部件区与组合区未按列分开；替换实现后通过。测试覆盖：

- 1280×720 与 1920×1080 的三栏边界、结果在视口内、英文介绍位于整行下方。
- 无目标提前揭晓、重复木部件、重复发现不重复收集、相同部件组合的叶／古同时揭晓、删除部件与完成反馈。
- 英文介绍、独体字与缺失资料说明、教学资料依据、仅含整体字的空状态。
- 长部件列表局部滚动、390px 手机顺序与无横向溢出，以及练习前后原题库与课次池内容未改变。

本次验证：

```powershell
$env:PLAYWRIGHT_PORT='5191'
npx playwright test tests/puzzle-layout/ui.spec.js --workers=1 --output=tmp/puzzle-layout-results
npm test
```

单元测试 31 个文件、197 项通过。浏览器测试 7 项通过；独立夹具不代替调用方对完整网站页头与课堂设置所占空间的集成检查。
