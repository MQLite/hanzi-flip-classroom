import "./styles.css";
import { DEFAULT_QUESTIONS } from "./data.js";
import {
  createSession,
  getCurrentQuestion,
  revealCurrent,
  markCurrent,
  navigateNext,
  navigateBack,
  getScores,
  getPracticeQuestions,
  startPractice,
} from "./core.js";
import { createQuestionBankStore } from "./storage.js";
import { createClassroomScene } from "./scene.js";
import { createEditor, downloadText } from "./editor.js";
import { mountStrokes } from "./strokes.js";

const app = document.querySelector("#app");
app.innerHTML = `<header class="site-header"><a class="brand" href="./" aria-label="汉字奇遇岛首页"><span class="brand-mark">字<span></span></span><div><h1>汉字奇遇岛</h1><p>每一个汉字，都是一次小小的发现。</p></div></a><nav aria-label="教师工具"><span class="teacher-badge">教师课堂 · 1–4 年级</span><button id="open-bank">题库管理</button><button id="open-help">使用帮助</button><button id="fullscreen" class="icon-button" aria-label="全屏显示">⛶</button></nav></header>
<main><div class="lesson-heading"><div><span class="eyebrow">LET'S DISCOVER CHINESE</span><h2>识字翻翻乐<span class="title-dot"></span></h2></div><p>看一看 · 读一读 · 说一说</p></div>
<section class="lesson-toolbar" aria-label="课堂设置"><label class="grade-label">今天学什么<select id="grade" aria-label="选择年级"><option value="1">一年级</option><option value="2">二年级</option><option value="3">三年级</option><option value="4">四年级</option></select></label><span id="round-caption">每轮 8 个新发现</span><label class="switch-label"><input type="checkbox" id="pinyin" checked><span class="switch"></span>拼音提示</label><button id="restart">↻ 开始新一轮</button></section>
<div id="storage-alert" class="notice" hidden role="alert"></div>
<div class="classroom"><section class="play-area" aria-label="汉字课堂"><div class="stage-top"><span id="mode-label">今日探索</span><div><span id="progress">01 / 08</span><span class="progress-dots" id="progress-dots"></span></div></div><div id="scene"><div class="stage-orbit orbit-one"></div><div class="stage-orbit orbit-two"></div><span class="stage-spark spark-one">✦</span><span class="stage-spark spark-two">✧</span><div id="card-face" aria-live="polite"></div><div class="scene-caption"><span class="small-line"></span>大声读出你的发现<span class="small-line"></span></div></div><div class="stage-bottom"><span id="judgment-note">先读一读，再揭晓答案</span><button id="simplify" class="text-button" aria-pressed="false">简化显示</button></div></section>
<aside class="score-panel"><div class="score-heading"><div><span class="eyebrow">GROW TOGETHER</span><h3>一起收集小星星</h3></div><span class="outline-star">☆</span></div><p class="muted">先选作答小组，答对收获 1 颗星。</p><div id="teams"></div><button id="team-settings" class="text-button">小组设置</button><div class="practice-box"><span>还想再认识的字</span><div id="practice-list">每一次练习，都会更熟悉。</div></div><div class="teacher-tip"><span class="tip-dot"></span><p>让每个孩子都有开口的机会。<br>读音或组词，都值得一次尝试。</p></div></aside></div>
<section class="game-controls" aria-label="答题操作"><button id="back" aria-label="上一字">← <span>上一字</span></button><div class="answer-controls"><button id="reveal" class="primary">翻牌揭晓 <kbd>空格</kbd></button><button id="correct" class="primary" hidden>答对了</button><button id="practice" class="secondary" hidden>再练一次</button></div><button id="next" aria-label="下一字"><span>下一字</span> →</button></section>
<div class="extension-row"><button id="extension-toggle" class="text-button" hidden aria-expanded="false">拓展学习</button><span id="extension-hint" hidden>一起看看汉字是怎样写成的</span></div><section id="extension" hidden aria-label="拓展学习"></section>
<footer><span><kbd>空格</kbd> 翻牌 <span class="footer-divider">/</span> <kbd>←</kbd> <kbd>→</kbd> 切换汉字</span><span>给汉字一点好奇心，让学习多一点欢喜。</span></footer></main><div id="toast" role="status"></div>
<dialog id="settings-dialog" aria-labelledby="settings-title"><div class="dialog-heading"><div><span class="eyebrow">OUR LITTLE TEAMS</span><h2 id="settings-title">为小组起个名字</h2></div><button class="close-dialog icon-button" aria-label="关闭小组设置">×</button></div><p>应用设置会开始新一轮，清空本轮得分。</p><label>小组数量<select id="team-count"><option value="2">2 个小组</option><option value="3">3 个小组</option><option value="4">4 个小组</option></select></label><div id="team-fields"></div><button id="apply-teams" class="primary">应用并开始新一轮</button></dialog>
<dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-heading"><h2 id="help-title">欢迎来到汉字奇遇岛</h2><button class="close-dialog icon-button" aria-label="关闭帮助">×</button></div><ol class="help-steps"><li>选择年级，认读屏幕上的汉字。</li><li>翻牌揭晓拼音、组词和例句。</li><li>选中小组，再点“答对了”；想巩固的字点“再练一次”。每字只结算一次。</li><li>一轮结束后，带着需要巩固的字再出发。</li></ol><p>跳过的字记为未作答；回看不会重复加分。多音字按照本题例句判断，其他读音也可能正确。</p><p>题库自动保存在此设备的此浏览器中，请定期导出备份。课堂得分、小组和进度不会在刷新后恢复。</p><p>年级是难度建议，不对应特定教材。打开面板或输入文字时，课堂快捷键会暂停。</p><p>立体显示不流畅时，可随时切换“简化显示”，本轮进度保留。</p></dialog>`;
const $ = (s) => document.querySelector(s);
let toastTimer;
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4300);
}
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
}
const store = createQuestionBankStore({
  storage,
  defaultQuestions: DEFAULT_QUESTIONS,
});
let load = store.load(),
  bank = load.ok ? load.bank : { schemaVersion: 1, questions: [] },
  grade = 1,
  teamNames = ["向日葵组", "小树苗组"],
  selectedTeam = "team-1",
  showPinyin = true,
  extensionOpen = false,
  strokeCleanup = null;
let session = createSession({ questions: bank.questions, grade, teamNames });
const editor = createEditor({
  store,
  getBank: () => bank,
  onBank: (value) => {
    bank = value;
    $("#storage-alert").hidden = true;
  },
  defaults: DEFAULT_QUESTIONS,
  notify,
});
const scene = createClassroomScene($("#scene"), $("#card-face"), (message) => {
  notify(message);
  $("#simplify").textContent = "立体显示";
  $("#simplify").setAttribute("aria-pressed", "true");
});
function storageAlert(result) {
  const box = $("#storage-alert");
  box.hidden = false;
  box.replaceChildren();
  const p = document.createElement("p");
  p.textContent =
    "题库暂时无法读取，原始数据未被覆盖。你可以重试、下载备份，或恢复默认题库。";
  box.append(p);
  for (const [label, action] of [
    [
      "重试读取",
      () => {
        load = store.load();
        if (load.ok) {
          bank = load.bank;
          box.hidden = true;
          newRound();
        } else notify("仍无法读取，请备份原始数据。");
      },
    ],
    [
      "下载原始备份",
      () => {
        const raw = result.raw ?? store.readRaw()?.raw;
        if (typeof raw === "string")
          downloadText(raw, "汉字题库-原始备份", "text/plain");
        else notify("目前无法读取原始内容，请保留浏览器数据后重试。");
      },
    ],
    ["恢复默认题库", () => editor.restore()],
  ]) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = action;
    box.append(b);
  }
}
if (!load.ok) storageAlert(load);
function progressed() {
  return (
    session.currentIndex > 0 ||
    session.revealed.some(Boolean) ||
    session.phase === "complete"
  );
}
function mayRestart() {
  return !progressed() || confirm("开始新一轮会清空本轮得分和进度，继续吗？");
}
function newRound() {
  session = createSession({ questions: bank.questions, grade, teamNames });
  selectedTeam = "team-1";
  extensionOpen = false;
  render();
}
function el(tag, text, className) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
}
function render() {
  const q = getCurrentQuestion(session),
    active = session.phase === "active",
    revealed = active && session.revealed[session.currentIndex],
    judgment = active && session.judgments[session.currentIndex];
  $("#mode-label").textContent =
    session.mode === "practice" ? "再一次，小小的进步" : "今日探索";
  $("#progress").textContent =
    session.phase === "empty"
      ? "00 / 00"
      : `${String(Math.min(session.currentIndex + 1, session.questions.length)).padStart(2, "0")} / ${String(session.questions.length).padStart(2, "0")}`;
  $("#round-caption").textContent =
    session.questions.length < 8
      ? `本轮 ${session.questions.length} 个字 · 按可用字数开始`
      : "每轮 8 个新发现";
  $("#progress-dots").replaceChildren(
    ...session.questions.map((_, i) =>
      el("i", "", i <= session.currentIndex ? "filled" : ""),
    ),
  );
  const scores = getScores(session);
  $("#teams").replaceChildren(
    ...session.teams.map((team, i) => {
      const b = el(
        "button",
        undefined,
        "team" + (selectedTeam === team.id ? " active" : ""),
      );
      b.setAttribute("aria-pressed", String(selectedTeam === team.id));
      const icon = el("span", i % 2 ? "芽" : "花", "team-icon");
      const name = el("span", team.name, "team-name");
      const score = el("strong", String(scores[team.id] || 0));
      score.dataset.score = team.id;
      b.append(icon, name, score, el("span", "★", "score-star"));
      b.onclick = () => {
        selectedTeam = team.id;
        renderTeamsOnly();
      };
      return b;
    }),
  );
  const practice = getPracticeQuestions(session);
  $("#practice-list").replaceChildren(
    ...(practice.length
      ? practice.map((q) => el("span", q.character, "practice-chip"))
      : [el("small", "每一次练习，都会更熟悉。")]),
  );
  const face = $("#card-face");
  face.className = revealed ? "revealed" : "";
  face.replaceChildren();
  if (active) {
    face.append(
      el(
        "span",
        revealed ? "认识你，真开心" : "这个字，你认识吗？",
        "card-eyebrow",
      ),
    );
    if (showPinyin || revealed) face.append(el("div", q.pinyin, "pinyin"));
    face.append(el("div", q.character, "hanzi"));
    if (revealed) {
      const words = el("div", undefined, "words");
      q.words.forEach((word) => words.append(el("span", word)));
      face.append(words, el("p", q.sentence, "sentence"));
    } else
      face.append(el("span", "读一读它的名字，说一个词语吧", "card-prompt"));
  } else if (session.phase === "complete") {
    face.className = "summary";
    face.append(
      el("span", "★", "summary-star"),
      el("h2", "这一轮，真棒！"),
      el("p", `一起认识了 ${session.questions.length} 个汉字`),
    );
    const results = el("div", undefined, "summary-scores");
    session.teams.forEach((t) =>
      results.append(el("p", `${t.name}  ·  ${scores[t.id] || 0} 颗星`)),
    );
    face.append(results);
    const unanswered = session.judgments.filter(
      (j) => j?.outcome === "unanswered",
    ).length;
    face.append(
      el("small", `${practice.length} 个字待巩固 · ${unanswered} 个字未作答`),
    );
    if (practice.length) {
      const b = el("button", "开始复习", "primary");
      b.onclick = () => {
        session = startPractice(session);
        extensionOpen = false;
        render();
      };
      face.append(b);
    } else face.append(el("p", "带上好奇心，开始下一次探索吧。"));
  } else {
    face.className = "empty-card";
    face.append(
      el("span", "字", "empty-symbol"),
      el("h2", "这个年级还没有题目"),
      el("p", "添加几个汉字，就能开始新的探索。"),
    );
    const b = el("button", "添加课堂题目", "primary");
    b.onclick = () => editor.open();
    face.append(b);
  }
  $("#reveal").hidden = !active || revealed;
  $("#reveal").disabled = !active;
  $("#correct").hidden = !revealed;
  $("#practice").hidden = !revealed;
  $("#correct").disabled = Boolean(judgment);
  $("#practice").disabled = Boolean(judgment);
  $("#back").disabled =
    session.currentIndex <= 0 && session.phase !== "complete";
  $("#next").disabled = !active;
  $("#judgment-note").textContent = judgment
    ? judgment.outcome === "correct"
      ? `已记分 · ${session.teams.find((t) => t.id === judgment.teamId)?.name} +1 ★`
      : judgment.outcome === "practice"
        ? "已加入本轮复习 · 再认识一次就更熟悉"
        : "这一字未作答 · 回看不再计分"
    : revealed
      ? "选中作答小组，为这一次尝试记录结果"
      : active
        ? "先读一读，再揭晓答案"
        : "每一份好奇，都值得一颗星";
  $("#extension-toggle").hidden = !revealed;
  $("#extension-hint").hidden = !revealed;
  $("#extension-toggle").setAttribute(
    "aria-expanded",
    String(extensionOpen && revealed),
  );
  strokeCleanup?.();
  strokeCleanup = null;
  $("#extension").replaceChildren();
  $("#extension").hidden = !extensionOpen || !revealed;
  if (extensionOpen && revealed)
    strokeCleanup = mountStrokes($("#extension"), q);
}
function renderTeamsOnly() {
  $("#teams")
    .querySelectorAll(".team")
    .forEach((b, i) => {
      const active = session.teams[i].id === selectedTeam;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
}
function reveal() {
  if (session.phase !== "active" || session.revealed[session.currentIndex])
    return;
  session = revealCurrent(session);
  render();
  scene.flip();
}
function next() {
  const updated = navigateNext(session);
  if (updated !== session) {
    session = updated;
    extensionOpen = false;
    render();
  }
}
function back() {
  const updated = navigateBack(session);
  if (updated !== session) {
    session = updated;
    extensionOpen = false;
    render();
  }
}
$("#reveal").setAttribute("aria-label", "翻牌揭晓");
$("#reveal").onclick = reveal;
$("#next").onclick = next;
$("#back").onclick = back;
$("#correct").onclick = () => {
  const updated = markCurrent(session, {
    outcome: "correct",
    teamId: selectedTeam,
  });
  if (updated !== session) {
    session = updated;
    render();
    scene.reward();
  }
};
$("#practice").onclick = () => {
  session = markCurrent(session, { outcome: "practice" });
  render();
};
$("#restart").onclick = () => {
  if (mayRestart()) newRound();
};
$("#grade").onchange = (event) => {
  if (!mayRestart()) {
    event.target.value = grade;
    return;
  }
  grade = Number(event.target.value);
  showPinyin = grade <= 2;
  $("#pinyin").checked = showPinyin;
  newRound();
};
$("#pinyin").onchange = (event) => {
  showPinyin = event.target.checked;
  render();
};
$("#open-bank").onclick = () => editor.open();
$("#open-help").onclick = () => $("#help-dialog").showModal();
document
  .querySelectorAll(".close-dialog")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
$("#fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
    else notify("此浏览器暂不支持全屏，可使用浏览器的放大功能。");
  } catch {
    notify("未能进入全屏，普通窗口也可以继续课堂。");
  }
};
$("#simplify").onclick = () => {
  const simple = $("#scene").dataset.mode !== "simple";
  scene.setSimple(simple);
  $("#simplify").setAttribute(
    "aria-pressed",
    String($("#scene").dataset.mode === "simple"),
  );
  $("#simplify").textContent =
    $("#scene").dataset.mode === "simple" ? "立体显示" : "简化显示";
};
$("#extension-toggle").onclick = () => {
  extensionOpen = !extensionOpen;
  render();
};
function teamFields() {
  const values = [...$("#team-fields").querySelectorAll("input")].map(
    (x) => x.value,
  );
  $("#team-fields").replaceChildren();
  for (let i = 0; i < Number($("#team-count").value); i++) {
    const label = el("label", `第 ${i + 1} 组名称`),
      input = el("input");
    input.value = values[i] ?? teamNames[i] ?? `第${i + 1}组`;
    input.maxLength = 14;
    label.append(input);
    $("#team-fields").append(label);
  }
}
$("#team-settings").onclick = () => {
  $("#team-count").value = teamNames.length;
  $("#team-fields").replaceChildren();
  teamFields();
  $("#settings-dialog").showModal();
};
$("#team-count").onchange = teamFields;
$("#apply-teams").onclick = () => {
  const names = [...$("#team-fields").querySelectorAll("input")].map(
    (input, i) => input.value.trim() || `第${i + 1}组`,
  );
  if (!mayRestart()) return;
  teamNames = names;
  $("#settings-dialog").close();
  newRound();
};
document.addEventListener("keydown", (event) => {
  if (
    event.repeat ||
    document.querySelector("dialog[open]") ||
    event.target.closest('input,textarea,select,[contenteditable="true"]')
  )
    return;
  if (event.code === "Space") {
    event.preventDefault();
    reveal();
  }
  if (event.code === "ArrowRight") {
    event.preventDefault();
    next();
  }
  if (event.code === "ArrowLeft") {
    event.preventDefault();
    back();
  }
});
render();
