# 建筑支撑与触屏描写校准

## 本次行为

- 建筑倒塌由实际接触与支撑范围决定；拆掉下层后，上方失去支撑的词砖局部落下，独立站稳的部分保留。安全自上而下拆完也能完成本轮，重点句子仍可复原。
- 触屏描写以笔画中心线为参考，放宽手指偏移、抖动和长短差异的容差；不按毛笔轮廓逐像素评分。反向短点、漏钩、缺折转和笔顺错误仍不推进或读音。
- 每次新完成一个字，实际参考分全屏显示，点击“关闭”或按 Escape 回到当前字；拖动笔画与回看旧成绩不弹出。
- 个人题库、教材内容、游戏顺序和小岛首页保留。

实现范围与资料依据见 [建筑模型](building-support.md) 和 [描写评分](handwriting-practice-scoring.md)。前者是简化积木模型，后者是课堂练习参考分。

## 验证记录

- `npx vitest run --maxWorkers=1 --no-isolate`：34 个文件、222 项通过。
- 独立代码复查及数据探针：3795 个规范笔画全部通过且为 100 分；整体纵向偏移 40 单位仍全部通过；3795 个反向规范笔画均被拒绝。发现的“澳”反向短点、“师”和“熊”漏钩均有先失败后通过的回归。
- 建筑规则覆盖四类建筑 × 四个外形 × 1–16 词，共 256 个组合的初始支撑、结束与复原。
- 发布构建：`VITE_BASE_PATH=/hanzi-flip-classroom/ npm run build` 通过。
- 真实生产预览：小岛首页、错误方向拦截、偏移描写实得 90 分、桌面/手机全屏弹分与关闭、局部下落/独立柱保留、平面切换、句子复原、安全拆完，均走通；页面脚本无异常，个人题库原始存储值未变。
- 全站浏览器覆盖 282 项：首次并行运行 270 项通过，12 项未通过；其中两项词砖用例仍假设旧随机危险规则，已改为实际支撑顺序，其余为 30 秒执行上限超时。只重跑这 12 项，单进程、90 秒上限，全部通过。两项火车动画分别需要 52.9 秒和 35.9 秒，未修改其产品代码。

浏览器全套命令：

```powershell
$env:PLAYWRIGHT_PORT='5189'
npx playwright test --workers=2 --grep-invert 'words construct the building, random danger' --output=test-results/final-support-writing
npx playwright test --last-failed --workers=1 --timeout=90000 --grep-invert 'words construct the building, random danger' --output=test-results/final-support-writing
```

排除项是此前已确认过时的四个旧二维建筑用例：它们要求固定 16 部件和随机危险词，与现行一词一砖、每课变体和实际支撑判断不一致。本次没有扩大排除范围；相应建筑行为由新的支撑、立体、词卡选择和投屏浏览器用例覆盖。
