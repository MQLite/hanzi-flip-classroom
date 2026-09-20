import "./styles.css";
import './sentence-train.css';
import {createTrainView} from './sentence-train.js';
import {resolveTrainQuestion} from './sentence-train-data.js';
import {createTrainSession,toggleTrainTile,undoTrainTile,clearTrainSelection,checkTrainAnswer,acceptTrainAnswer,revealTrainAnswer,markTrainPractice,nextTrainQuestion,previousTrainQuestion,startTrainPractice,finishTrainDeparture,getTrainScores} from './sentence-train-core.js';
import { DEFAULT_QUESTIONS } from "./data.js";
import { coursesForTextbook, TEXTBOOK_ID, PARADISE_ID, PARADISE_QUESTIONS, STAGES, TEXTBOOK_QUESTIONS, filterCurriculum, curriculumLabel, mergeAllTextbookQuestions as mergeTextbookQuestions } from './curriculum.js';
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
import './workshop.css';
import { createWorkshopState, toggleWorkshopTile, undoWorkshopTile, clearWorkshopSelection, submitWorkshopWord, collectedWords, buildWordAnswers } from './workshop-core.js';
import { createWorkshopView } from './workshop.js';
import { createWorkshopScene } from './workshop-scene.js';

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
<dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-heading"><h2 id="help-title">欢迎来到汉字奇遇岛</h2><button class="close-dialog icon-button" aria-label="关闭帮助">×</button></div><ol class="help-steps"><li>选择年级，认读屏幕上的汉字。</li><li>翻牌揭晓拼音、组词和例句。</li><li>选中小组，再点“答对了”，就会沿踏石走到下一座小岛，自动换字；想巩固的字点“再练一次”。每字只结算一次。</li><li>一轮结束后，带着需要巩固的字再出发。</li></ol><p>跳过的字记为未作答；回看不会重复加分。多音字按照本题例句判断，其他读音也可能正确。</p><p>题库自动保存在此设备的此浏览器中，请定期导出备份。课堂得分、小组和进度不会在刷新后恢复。</p><p>年级是难度建议，不对应特定教材。打开面板或输入文字时，课堂快捷键会暂停。</p><p>立体显示不流畅时，可随时切换“简化显示”，本轮进度保留。</p></dialog>`;
const $ = (s) => document.querySelector(s);
$('.lesson-heading').insertAdjacentHTML('beforeend', '<nav class="game-modes" aria-label="游戏模式"><button id="mode-flip" aria-pressed="true">识字翻翻乐</button><button id="mode-workshop" aria-pressed="false">组词小工坊</button><button id="mode-train" aria-pressed="false">句子小火车</button></nav>');
$('#scene').insertAdjacentHTML('afterend', '<div id="workshop" hidden></div><div id="sentence-train" hidden></div>');
$('.practice-box').insertAdjacentHTML('beforebegin', '<div id="workshop-collection-panel" hidden><h4>收集到的词语 <span>✦</span></h4><div id="workshop-collection" aria-live="polite"></div></div>');
$('#help-dialog').insertAdjacentHTML('beforeend', '<p>活字组词工坊：备选栏中有参考词所需的活字，也有干扰字。按顺序点选 2–8 个活字，点击“融合印版”。与本题参考词匹配时，活字融合成一块印版、记 1 星并自动进入下一题；未匹配时活字散落归位，可以重试。点选已选活字可放回，也可撤回或清空。两种模式分别保留进度、小组和排字；刷新后课堂进度重置。</p>');
$('.practice-box').insertAdjacentHTML('beforebegin', '<div class="train-ledger-panel" hidden><h4>旅程记录</h4><div id="train-ledger" aria-live="polite"></div></div>');
$('#help-dialog').insertAdjacentHTML('beforeend', '<p>句子小火车：点击词语车厢，从左到右排列句子。全部接齐后发车；未命中可调整或由老师判对。看过参考句后须由老师判对才计分。再练一次只加入明确标记的句子；跳过的句子不算错。三种游戏独立保存本页进度，刷新重置。题库中的“句子小火车设置”可用 / 分隔词语，内置涵盖汉语乐园 1A–3B 各课配编句。</p>');
const allDefaults = [...DEFAULT_QUESTIONS, ...TEXTBOOK_QUESTIONS, ...PARADISE_QUESTIONS];
$('.teacher-badge').textContent = '汉语乐园 · 1A–3B';
$('.lesson-toolbar').insertAdjacentHTML('afterbegin', `<label class="curriculum-field">题库<select id="bank-source" aria-label="题库来源"><option value="paradise">汉语乐园（1A–3B）</option><option value="textbook">中文乐园（新版）</option><option value="personal">个人 / 通用题库</option></select></label><label class="curriculum-field textbook-field">阶段<select id="stage" aria-label="学习阶段">${STAGES.map(s=>`<option>${s}</option>`).join('')}</select></label><label class="curriculum-field textbook-field">范围<select id="scope" aria-label="练习范围"><option value="stage">整个阶段</option><option value="lesson">本课</option><option value="cumulative">截至本课累计</option></select></label><label class="curriculum-field textbook-field">课次<select id="lesson" aria-label="选择课次"></select></label>`);
$('.lesson-toolbar').insertAdjacentHTML('afterend', '<p id="curriculum-note" class="curriculum-note"></p><div id="textbook-notice" class="notice" hidden><span></span><button id="add-textbook">补充教材题库</button></div>');
$('#help-dialog .help-steps li').textContent = '选择教材阶段和练习范围，或切换到个人 / 通用题库按年级练习。';
$('#help-dialog').insertAdjacentHTML('beforeend', '<p>《汉语乐园》按原书1A–3B分册：A为第1–6课，B为第7–12课。题目覆盖核心词汇中的汉字及学写字栏目；参考词优先采用本课教材词，补充例词和例句为配编。与新版题库分开选择。</p><p>新版《中文乐园》课本1–3：A为第1–6课，B为第7–12课。A/B是游戏学习阶段，不是出版社分册。教材字表按官方教学大纲；组词、读音语境和例句由本项目配编，可由老师修改。</p>');
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
  defaultQuestions: allDefaults,
});
let load = store.load(),
  bankLoaded = load.ok,
  bank = load.ok ? load.bank : { schemaVersion: 1, questions: [] },
  grade = 1,
  teamNames = ["向日葵组", "小树苗组"],
  selectedTeam = "team-1",
  showPinyin = true,
  extensionOpen = false,
  strokeCleanup = null;
let selection = {source: bank.questions.some(q=>q.textbook === PARADISE_ID) ? 'paradise' : bank.questions.some(q=>q.textbook === TEXTBOOK_ID) ? 'textbook' : 'personal', stage:'1A', scope:'stage', lesson:1};
let gameMode = 'flip', workshopState = null;
function currentSession() {
  const questions = selection.source !== 'personal'
    ? filterCurriculum(bank.questions, {...selection, textbook: selection.source === 'paradise' ? PARADISE_ID : TEXTBOOK_ID})
    : bank.questions.filter(q=>!q.textbook);
  if(gameMode === 'train') return createTrainSession({questions: questions.filter(q=>selection.source!=='personal'||q.grade===grade).map(resolveTrainQuestion).filter(Boolean),teamNames});
  return createSession({questions, grade: selection.source === 'personal' ? grade : undefined, teamNames});
}
function refreshTextbookNotice() {
  const missing = mergeTextbookQuestions(bank.questions).length - bank.questions.length;
  $('#textbook-notice').hidden = !bankLoaded || missing === 0;
  $('#textbook-notice span').textContent = `可补充 ${missing} 道教材题（含《汉语乐园》1A–3B），保留已有题目和修改。`;
}
function syncSelection() {
  $('#bank-source').value = selection.source;
  $('#stage').value = selection.stage;
  $('#scope').value = selection.scope;
  $('#lesson').replaceChildren(...coursesForTextbook(selection.source === 'paradise' ? PARADISE_ID : TEXTBOOK_ID).filter(c=>c.stage===selection.stage).map(c=>{
    const option = document.createElement('option');
    option.value = c.lesson;
    option.textContent = `第${c.lesson}课 ${c.title}`;
    return option;
  }));
  $('#lesson').value = selection.lesson;
  $('#lesson').disabled = selection.scope === 'stage';
  $('.grade-label').hidden = selection.source !== 'personal';
  document.querySelectorAll('.textbook-field').forEach(e=>e.hidden=selection.source === 'personal');
  $('#curriculum-note').textContent = selection.source !== 'personal'
    ? selection.source === 'paradise'
      ? `《汉语乐园》${selection.stage} · 原书分册及课次 · ${selection.scope === 'cumulative' ? `1A第1课至${selection.stage}第${selection.lesson}课` : selection.scope === 'lesson' ? `第${selection.lesson}课` : '全册'} · 核心词汇识字与学写字 · 例句为配编`
      : `《中文乐园》课本1–3 · A/B为游戏分组（A：第1–6课，B：第7–12课） · ${selection.scope === 'cumulative' ? `课本1第1课至课本${selection.stage[0]}第${selection.lesson}课` : selection.scope === 'lesson' ? `${selection.stage} 第${selection.lesson}课` : `${selection.stage} 全阶段`} · 例词例句为配编`
    : '个人 / 通用题库 · 年级为难度建议';
  refreshTextbookNotice();
}
let session = currentSession();
const modeSnapshots = {};
syncSelection();
const editor = createEditor({
  store,
  getBank: () => bank,
  canEdit: () => bankLoaded,
  onBank: (value) => {
    bank = value;
    bankLoaded = true;
    $("#storage-alert").hidden = true;
    refreshTextbookNotice();
  },
  defaults: allDefaults,
  notify,
});
const scene = createClassroomScene($("#scene"), $("#card-face"), (message) => {
  notify(message);
  if (gameMode === 'flip') {
    $("#simplify").textContent = "立体显示";
    $("#simplify").setAttribute("aria-pressed", "true");
  }
});
let flipTransition = null;
let workshopTransition = null, workshopFeedback = '';
const workshopView = createWorkshopView($('#workshop'), tileId => {
  if(workshopTransition) return;
  workshopFeedback = '';
  workshopState = toggleWorkshopTile(workshopState, session, tileId);
  renderWorkshop();
}, submitWord, () => {
  if(workshopTransition) return;
  workshopState = undoWorkshopTile(workshopState, session); workshopFeedback = ''; renderWorkshop();
}, () => {
  if(workshopTransition) return;
  workshopState = clearWorkshopSelection(workshopState, session); workshopFeedback = ''; renderWorkshop();
});
$('#desk-ledger-slot').append($('#workshop-collection-panel'));
let workshopScene;
const trainView = createTrainView($('#sentence-train'), trainIntent, message=>{notify(message);if(gameMode==='train')syncSimpleControl()});
function activeScene() { return gameMode === 'train' ? trainView.scene : gameMode === 'workshop' ? workshopScene : scene; }
function syncSimpleControl() {
  const simple = $(gameMode === 'train' ? '#train-scene' : gameMode === 'workshop' ? '#workshop-scene' : '#scene').dataset.mode === 'simple';
  $('#simplify').textContent = simple ? '立体显示' : '简化显示';
  $('#simplify').setAttribute('aria-pressed', String(simple));
}
function switchMode(mode) {
  if (mode === gameMode) return;
  if (gameMode === 'train' && session.departure) finishDeparture(session.departure);
  if (gameMode === 'flip' && flipTransition) finishFlipTransition(flipTransition);
  if(gameMode === 'workshop' && workshopTransition) finishWorkshopTransition(workshopTransition);
  modeSnapshots[gameMode] = { session, grade, teamNames: [...teamNames], selectedTeam, showPinyin, selection: {...selection}, extensionOpen, workshopState };
  activeScene()?.setActive(false);
  const saved = modeSnapshots[mode];
  gameMode = mode;
  if (saved) ({ session, grade, teamNames, selectedTeam, showPinyin, selection, extensionOpen, workshopState } = saved);
  else { session = currentSession(); selectedTeam = 'team-1'; extensionOpen = false; workshopState = createWorkshopState(session); }
  gameMode = mode;
  document.body.classList.toggle('workshop-mode', mode === 'workshop');
  document.body.classList.toggle('train-mode',mode === 'train');
  $('#sentence-train').hidden=mode!=='train';
  $('.train-ledger-panel').hidden=mode!=='train';
  $('#mode-train').setAttribute('aria-pressed',String(mode==='train'));
  $('.practice-box > span').textContent=mode==='train'?'还想再练的句子':'还想再认识的字';
  $('#back').setAttribute('aria-label',mode==='train'?'上一句':'上一字');$('#back span').textContent=mode==='train'?'上一句':'上一字';
  $('#next').setAttribute('aria-label',mode==='train'?'下一句':'下一字');$('#next span').textContent=mode==='train'?'下一句':'下一字';
  $('#scene').hidden = mode !== 'flip';
  $('#workshop').hidden = mode !== 'workshop';
  $('#workshop-collection-panel').hidden = mode !== 'workshop';
  $('#mode-flip').setAttribute('aria-pressed',String(mode === 'flip'));
  $('#mode-workshop').setAttribute('aria-pressed',String(mode === 'workshop'));
  $('.lesson-heading h2').textContent = mode === 'train' ? '句子小火车' : mode === 'workshop' ? '组词小工坊' : '识字翻翻乐';
  $('.lesson-heading > p').textContent = mode === 'train' ? '接车厢 · 排句子 · 快乐出发' : mode === 'workshop' ? '挑活字 · 排词语 · 融合木质印版' : '看一看 · 读一读 · 说一说';
  $('#reveal').textContent = mode === 'workshop' ? '揭晓参考词' : '翻牌揭晓';
  $('#reveal').setAttribute('aria-label',mode === 'workshop' ? '揭晓参考词' : '翻牌揭晓');
  const shortcutLabel = $('footer > span');
  shortcutLabel.replaceChildren();
  shortcutLabel.append(el('kbd','空格'), document.createTextNode(mode === 'train' ? ' 发车　/　' : mode === 'workshop' ? ' 融合印版　/　' : ' 翻牌　/　'), el('kbd','←'), document.createTextNode(' '), el('kbd','→'), document.createTextNode(mode === 'train' ? ' 切换句子' : ' 切换汉字'));
  $('#grade').value = grade; $('#pinyin').checked = showPinyin;
  if (mode === 'workshop') {
    $('.classroom').append($('.game-controls'));
    workshopScene ??= createWorkshopScene($('#workshop-scene'), message => { notify(message); if(gameMode === 'workshop') syncSimpleControl(); });
  } else $('.classroom').after($('.game-controls'));
  syncSelection(); render(); activeScene()?.setActive(true); syncSimpleControl();
}
$('#mode-flip').onclick = () => switchMode('flip');
$('#mode-workshop').onclick = () => switchMode('workshop');
$('#mode-train').onclick = () => switchMode('train');

function renderWorkshop() {
  if (gameMode !== 'workshop') return;
  const question = getCurrentQuestion(session), active = session.phase === 'active';
  const value = workshopTransition?.value ?? workshopState.drafts[session.currentIndex] ?? '';
  const judgment = session.judgments[session.currentIndex];
  const words = collectedWords(session,workshopState);
  const palette = workshopTransition?.palette ?? workshopState.palettes[session.currentIndex] ?? [];
  const selections = workshopTransition?.selections ?? workshopState.selections[session.currentIndex] ?? [];
  const hasAnswers = Boolean(question && buildWordAnswers(question).length);
  workshopView.update({ question: active ? question : null, phase: session.phase, value, palette: active ? palette : [], selections, showPinyin, locked: !active || Boolean(judgment) || !hasAnswers, busy:Boolean(workshopTransition), feedback:workshopFeedback, invalid:active&&!hasAnswers, statusNodes: [...$('#card-face').childNodes] });
  $('#correct').hidden = true;
  $('#reveal').hidden = true;
  $('#practice').hidden = !active;
  $('#practice').disabled = Boolean(judgment) || !active || Boolean(workshopTransition);
  $('#next').disabled = !active || Boolean(workshopTransition);
  $('#back').disabled = Boolean(workshopTransition) || (session.currentIndex <= 0 && session.phase !== 'complete');
  $('#workshop-collection').replaceChildren(...(words.length ? words.map(item => {
    const chip = el('span',item.word,'collected-word');
    chip.title = session.teams.find(team=>team.id === item.teamId)?.name ?? '';
    return chip;
  }) : [el('small','正确融合的木质印版会收进右侧成品架。')]));
  workshopScene?.update({palette: active ? palette : [], selections: active ? selections : [], records:workshopTransition?.outcome === 'correct' ? words.slice(0,-1) : words, character:question?.character??'', key: `${session.mode}:${session.currentIndex}:${question?.id}:${session.phase}`});
}
async function submitWord() {
  if (gameMode !== 'workshop' || workshopTransition || !buildWordAnswers(getCurrentQuestion(session)).length) return;
  const result = submitWorkshopWord(session,workshopState,{teamId:selectedTeam});
  if(result.outcome === 'ignored') return;
  const transition = {outcome:result.outcome,value:workshopState.drafts[session.currentIndex],palette:workshopState.palettes[session.currentIndex],selections:workshopState.selections[session.currentIndex]};
  workshopTransition = transition;
  workshopFeedback = result.outcome === 'correct' ? 'success' : 'failure';
  session = result.session; workshopState = result.state;
  render();
  await workshopScene?.animateResult({outcome:result.outcome,word:result.word,recordIndex:workshopState.records.length-1});
  finishWorkshopTransition(transition);
}
function finishWorkshopTransition(transition) {
  if(workshopTransition !== transition) return;
  workshopTransition = null;
  workshopScene?.cancelAnimation();
  if(transition.outcome === 'correct') { session = navigateNext(session); workshopFeedback = ''; }
  if(gameMode === 'workshop') render();
}
function finishDeparture(token){
  if(gameMode!=='train'||session.departure!==token)return;
  session=finishTrainDeparture(session,token);trainView.scene.cancelAnimation();render();
}
async function trainIntent(intent,id){
  if(gameMode!=='train')return;
  if(intent==='editor'){editor.open();return;}
  const actions={tile:()=>toggleTrainTile(session,id),undo:()=>undoTrainTile(session),clear:()=>clearTrainSelection(session),check:()=>checkTrainAnswer(session,{teamId:selectedTeam}),accept:()=>acceptTrainAnswer(session,{teamId:selectedTeam}),reveal:()=>revealTrainAnswer(session),review:()=>startTrainPractice(session)};
  if(!actions[intent])return;
  const old=session;session=actions[intent]();render();
  if(session.departure&&session.departure!==old.departure){const token=session.departure;await trainView.scene.animateDeparture();finishDeparture(token);}
}
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
          bankLoaded = true;
          box.hidden = true;
          syncSelection();
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
    (gameMode === 'train' && (session.selections.some(a=>a.length)||session.judgments.some(Boolean))) ||
    (gameMode === 'workshop' && workshopState?.drafts.some(value => value.length > 0)) ||
    session.currentIndex > 0 ||
    session.revealed.some(Boolean) ||
    session.phase === "complete"
  );
}
function mayRestart() {
  return !progressed() || confirm("开始新一轮会清空本轮得分和进度，继续吗？");
}
function newRound() {
  if(gameMode==='train') { session={...session,departure:null}; trainView.scene.cancelAnimation(); }
  flipTransition = null; scene.cancelJourney();
  workshopTransition = null; workshopFeedback = ''; workshopScene?.cancelAnimation();
  session = currentSession();
  if (gameMode === 'workshop') workshopState = createWorkshopState(session);
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
  document.body.classList.toggle('workshop-revealed', gameMode === 'workshop' && Boolean(revealed));
  $("#mode-label").textContent =
    session.mode === "practice" ? "再一次，小小的进步" : q?.textbook ? curriculumLabel(q) : "今日探索";
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
  const scores = gameMode==='train'?getTrainScores(session):getScores(session);
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
      ? practice.map((q) => el("span", gameMode==='train'?q.sentence:q.character, "practice-chip"))
      : [el("small", "每一次练习，都会更熟悉。")]),
  );
  if(gameMode==='train') {
    $('#round-caption').textContent=`本轮 ${session.questions.length} 句 · 最多 8 句`;
    $('#reveal').hidden=true;$('#correct').hidden=true;$('#practice').hidden=!active;
    $('#practice').disabled=Boolean(judgment)||Boolean(session.departure);
    $('#next').disabled=!active||Boolean(session.departure);$('#back').disabled=Boolean(session.departure)||(session.currentIndex<=0&&session.phase!=='complete');
    for(const id of ['#extension-toggle','#extension-hint','#extension'])$(id).hidden=true;
    strokeCleanup?.();strokeCleanup=null;
    $('#judgment-note').textContent=session.departure?'列车出发，前往下一站…':'先选作答小组 · 每句只记一颗星';
    const records=session.judgments.flatMap((j,index)=>j?.outcome==='correct'?[{...j,index}]:[]);
    $('#train-ledger').replaceChildren(...(records.length?records.map(j=>{const p=el('p',j.sentence);p.append(el('small',`${j.source==='teacher'?'教师接受':'参考匹配'} · ${session.teams.find(t=>t.id===j.teamId)?.name??''}`));return p}):[el('small','完成的句子，会在这里留下足迹。')]));
    trainView.update(session);return;
  }
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
        if (gameMode === 'workshop') workshopState = createWorkshopState(session);
        extensionOpen = false;
        render();
      };
      face.append(b);
    } else face.append(el("p", "带上好奇心，开始下一次探索吧。"));
  } else {
    face.className = "empty-card";
    face.append(
      el("span", "字", "empty-symbol"),
      el("h2", "当前范围还没有题目"),
      el("p", "添加几个汉字，就能开始新的探索。"),
    );
    const b = el("button", "添加课堂题目", "primary");
    b.onclick = () => editor.open();
    face.append(b);
  }
  scene.setCharacter(active ? q.character : null);
  $("#reveal").hidden = !active || revealed;
  $("#reveal").disabled = !active;
  $("#correct").hidden = !revealed;
  $("#practice").hidden = !revealed;
  $("#correct").disabled = Boolean(judgment) || Boolean(flipTransition);
  $("#practice").disabled = Boolean(judgment) || Boolean(flipTransition);
  $("#back").disabled =
    Boolean(flipTransition) || (session.currentIndex <= 0 && session.phase !== "complete");
  $("#next").disabled = !active || Boolean(flipTransition);
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
  if (flipTransition && gameMode === 'flip') $('#judgment-note').textContent = flipTransition.final ? '答对了！这一轮的小岛探索完成。' : '答对了！沿着踏石，前往下一座小岛…';
  $("#extension-toggle").hidden = !revealed || gameMode === 'workshop';
  $("#extension-hint").hidden = !revealed || gameMode === 'workshop';
  $("#extension-toggle").setAttribute(
    "aria-expanded",
    String(extensionOpen && revealed),
  );
  strokeCleanup?.();
  strokeCleanup = null;
  $("#extension").replaceChildren();
  $("#extension").hidden = !extensionOpen || !revealed || gameMode === 'workshop';
  if (extensionOpen && revealed && gameMode === 'flip')
    strokeCleanup = mountStrokes($("#extension"), q);
  if(gameMode === 'workshop') {
    if(!judgment) $('#judgment-note').textContent = active ? '按顺序选择活字 · 正确融合得 1 星并自动换题' : '每一份好奇，都值得一颗星';
    renderWorkshop();
  }
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
  if (flipTransition) return;
  if (session.phase !== "active" || session.revealed[session.currentIndex])
    return;
  session = revealCurrent(session);
  render();
  if (gameMode === 'flip') scene.flip();
}
function next() {
  if(gameMode==='train'){session=nextTrainQuestion(session);render();return;}
  if (flipTransition) return;
  if(gameMode === 'workshop' && workshopTransition) return;
  workshopFeedback = '';
  const updated = navigateNext(session);
  if (updated !== session) {
    session = updated;
    extensionOpen = false;
    render();
  }
}
function back() {
  if(gameMode==='train'){session=previousTrainQuestion(session);render();return;}
  if (flipTransition) return;
  if(gameMode === 'workshop' && workshopTransition) return;
  workshopFeedback = '';
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
async function answerCorrect() {
  if (gameMode === 'workshop') { submitWord(); return; }
  if (flipTransition) return;
  const updated = markCurrent(session, {outcome:'correct', teamId:selectedTeam});
  if (updated === session) return;
  session = updated;
  const transition = {final:session.currentIndex === session.questions.length - 1};
  flipTransition = transition;
  extensionOpen = false;
  render();
  await scene.travelToNextIsland(transition);
  finishFlipTransition(transition);
}
function finishFlipTransition(transition) {
  if (flipTransition !== transition) return;
  flipTransition = null;
  scene.cancelJourney();
  session = navigateNext(session);
  extensionOpen = false;
  if (gameMode === 'flip') render();
}
$("#correct").onclick = answerCorrect;
$("#practice").onclick = () => {
  if(gameMode==='train'){session=markTrainPractice(session);render();return;}
  if (flipTransition) return;
  if(gameMode === 'workshop' && workshopTransition) return;
  if (gameMode === 'workshop') session = revealCurrent(session);
  session = markCurrent(session, { outcome: "practice" });
  render();
};
$("#restart").onclick = () => {
  if (mayRestart()) newRound();
};
for (const [id, key] of [['bank-source','source'],['stage','stage'],['scope','scope'],['lesson','lesson']]) {
  $(`#${id}`).onchange = event => {
    if (!mayRestart()) { syncSelection(); return; }
    selection = {...selection, [key]:key === 'lesson' ? Number(event.target.value) : event.target.value};
    if (key === 'stage') selection.lesson = selection.stage.endsWith('A') ? 1 : 7;
    if (key === 'stage' || key === 'source') {
      showPinyin = (selection.source !== 'personal' ? Number(selection.stage[0]) : grade) <= 2;
      $('#pinyin').checked = showPinyin;
    }
    syncSelection();
    newRound();
  };
}
$('#add-textbook').onclick = () => {
  if (!mayRestart()) return;
  editor.addTextbook(() => {
    selection.source = 'paradise';
    syncSelection();
    newRound();
  });
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
  const host = $(gameMode === 'train' ? '#train-scene' : gameMode === 'workshop' ? '#workshop-scene' : '#scene');
  activeScene()?.setSimple(host.dataset.mode !== 'simple');
  syncSimpleControl();
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
    event.repeat || event.isComposing || event.keyCode === 229 ||
    document.querySelector("dialog[open]") ||
    event.target.closest('input,textarea,select,[contenteditable="true"]')
  )
    return;
  if (event.code === "Space") {
    if (event.target.closest('button,a')) return;
    event.preventDefault();
    if(gameMode==='train') trainIntent('check'); else if (gameMode === 'workshop') submitWord(); else reveal();
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
