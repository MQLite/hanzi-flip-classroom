import "./styles.css";
import {GAME_ORDER} from './game-order.js';
import {createIslandJourney} from './lesson-journey.js';
import {getJourneyAvailability,journeyQuestions} from './island-journey-data.js';
import {scenarioJourneyUrl} from './island-exploration.js';
import {showLessonCelebration} from './lesson-celebration.js';
import './sentence-train.css';
import {createTrainView} from './sentence-train.js';
import {mergeTrainQuestionPools,resolveTrainQuestion} from './sentence-train-data.js';
import {createTrainSession,toggleTrainTile,undoTrainTile,clearTrainSelection,checkTrainAnswer,acceptTrainAnswer,revealTrainAnswer,markTrainPractice,nextTrainQuestion,previousTrainQuestion,startTrainPractice,finishTrainDeparture,getTrainScores} from './sentence-train-core.js';
import { DEFAULT_QUESTIONS } from "./data.js";
import { coursesForTextbook, TEXTBOOK_ID, PARADISE_ID, PARADISE_QUESTIONS, STAGES, TEXTBOOK_QUESTIONS, ZHONGWEN_ID, ZHONGWEN_NAME, ZHONGWEN_QUESTIONS, ZHONGWEN_BOOK_LABELS, stagesForTextbook, textbookForSource, filterCurriculum, curriculumLabel, mergeAllTextbookQuestions as mergeTextbookQuestions } from './curriculum.js';
import { renderZhongwenVocabulary } from './zhongwen-vocabulary.js';
import { getZhongwenTrainQuestions, zhongwenTrainLabel } from './zhongwen-train.js';
import { getParadiseTrainQuestions, paradiseTrainLabel } from './paradise-train.js';
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
import { createWorkshopState, continueWorkshopBatch, remainingWorkshopWords, toggleWorkshopTile, undoWorkshopTile, clearWorkshopSelection, submitWorkshopWord, resolveWorkshopWord, collectedWords, getWorkshopScores } from './workshop-core.js';
import { createWorkshopView } from './workshop.js';
import { createWorkshopScene } from './workshop-scene.js';
import './sudoku.css';
import {createSudokuView} from './sudoku.js';
import {getSudokuCandidates} from './sudoku-vocabulary.js';
import {explorationStages,explorationCourses,matchingExplorations,renderExplorations} from './exploration.js';
import './mole.css';
import {createMoleView} from './mole.js';
import {getMolePool} from './mole-vocabulary.js';
import {createMoleState,hitMole,settleMole,finishMoleHits} from './mole-core.js';
import './poison.css';
import './building.css';
import './maze.css';
import './reading-pinyin.css';
import {createMazeView} from './maze.js';
import {createMazeState,selectMazeCell,confirmMazeStep,cancelMazeStep} from './maze-core.js';
import {createBuildingView} from './building.js';
import {lessonAppearance} from './lesson-appearance.js';
import {createBuildingState,drawBuildingWord,confirmBuildingWord,beginBuildingChallenge,restoreBuilding,chooseBuildingChallengeWord} from './building-core.js';
import {createPoisonView} from './poison.js';
import {getPoisonPool} from './poison-vocabulary.js';
import {readPoisonCard,skipPoisonAntidote} from './poison-core.js';
import {createPoisonState,beginPoisonHiding,togglePoisonWord,sealPoison,beginPoisonReading,selectPoisonCard,cancelPoisonCard,revealPoisonCard,coverPoisonSecrets,nextPoisonRound,beginPoisonAntidote,finishPoisonAntidote} from './poison-core.js';
import {createSudokuState,collectSudokuWord,placeSudokuWord,clearSudokuCell,undoSudoku,getSudokuProgress} from './sudoku-core.js';
import './construction.css';
import {getConstructionPool} from './construction-data.js';
import {createConstructionView} from './construction-view.js';
import {createPuzzleState,selectPuzzlePart,removePuzzlePart,checkPuzzle,createStrokeState,placeStroke,undoStroke,nextStrokeCharacter} from './construction-core.js';
import {createHandwritingState,submitHandwritingStroke,undoHandwritingStroke,rewriteHandwritingCharacter,navigateHandwriting} from './handwriting-core.js';

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
<dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-heading"><h2 id="help-title">欢迎来到汉字奇遇岛</h2><button class="close-dialog icon-button" aria-label="关闭帮助">×</button></div><ol class="help-steps"><li>选择年级，认读屏幕上的汉字。</li><li>翻牌揭晓汉字、拼音和词语；句子练习请使用“句子小火车”。</li><li>选中小组，再点“答对了”，就会沿踏石走到下一座小岛，自动换字；想巩固的字点“再练一次”。每字只结算一次。</li><li>一轮结束后，带着需要巩固的字再出发。</li></ol><p>跳过的字记为未作答；回看不会重复加分。多音字以本题拼音为参考，老师可结合词语判断其他读音。</p><p>题库自动保存在此设备的此浏览器中，请定期导出备份。课堂得分、小组和进度不会在刷新后恢复。</p><p>年级是难度建议，不对应特定教材。打开面板或输入文字时，课堂快捷键会暂停。</p><p>立体显示不流畅时，可随时切换“简化显示”，本轮进度保留。</p></dialog>`;
const $ = (s) => document.querySelector(s);
$('.lesson-heading').insertAdjacentHTML('beforeend', '<nav class="game-modes" aria-label="游戏模式"><button id="mode-flip" aria-pressed="true">识字翻翻乐</button><button id="mode-workshop" aria-pressed="false">组词小工坊</button><button id="mode-train" aria-pressed="false">句子小火车</button><button id="mode-sudoku" aria-pressed="false">汉字数独</button><button id="mode-explore" aria-pressed="false">情景探索</button><button id="mode-mole" aria-pressed="false">打地鼠</button><button id="mode-poison" aria-pressed="false">女巫的毒药</button></nav>');
$('.play-area').insertAdjacentHTML('beforeend','<div id="witch-poison" hidden></div>');
$('.game-modes').insertAdjacentHTML('beforeend','<button id="mode-building" aria-pressed="false">汉字建筑师</button>');
$('.play-area').insertAdjacentHTML('beforeend','<div id="hanzi-building" hidden></div>');
$('.game-modes').insertAdjacentHTML('beforeend','<button id="mode-maze" aria-pressed="false">汉字迷宫</button>');
$('#mode-flip').insertAdjacentHTML('afterend','<button id="mode-puzzle" aria-pressed="false">汉字拼图</button><button id="mode-strokes" aria-pressed="false">笔画很忙</button>');
for(const game of GAME_ORDER)$('.game-modes').append($('#mode-'+game.id));
$('.play-area').insertAdjacentHTML('beforeend','<div id="hanzi-construction" hidden></div>');
$('.play-area').insertAdjacentHTML('beforeend','<div id="hanzi-maze" hidden></div>');
$('.play-area').insertAdjacentHTML('beforeend','<div id="reading-pinyin-dock" class="reading-pinyin-dock" hidden></div>');
const optionalPinyinModes=new Set(['building','maze','poison']);
function syncPinyinLocation(){
  const local=optionalPinyinModes.has(gameMode),dock=$('#reading-pinyin-dock'),label=$('#pinyin').closest('label'),parent=local?dock:$('.lesson-toolbar');dock.hidden=!local;
  if(label.parentElement!==parent){if(local)parent.append(label);else $('#restart').before(label);}
}
$('.lesson-toolbar').insertAdjacentHTML('afterend','<nav id="activity-flow" class="activity-flow" aria-label="本课活动衔接" hidden><span>本课三项活动</span><button id="activity-building">1 · 搭建挑战</button><i>→</i><button id="activity-poison">2 · 女巫毒药</button><i>→</i><button id="activity-maze">3 · 汉字迷宫</button></nav>');
$('.classroom').insertAdjacentHTML('afterend','<section id="exploration-catalog" aria-label="本课情景探索" hidden></section>');
$('#scene').insertAdjacentHTML('afterend', '<div id="workshop" hidden></div><div id="sentence-train" hidden></div><div id="sudoku" hidden></div><div id="mole" hidden></div>');
$('.practice-box').insertAdjacentHTML('beforebegin', '<div id="workshop-collection-panel" hidden><h4>收集到的词语 <span>✦</span></h4><div id="workshop-collection" aria-live="polite"></div></div>');
$('#help-dialog').insertAdjacentHTML('beforeend', '<p>活字组词工坊：每盘随机选择 2–4 个参考词，默认 4 个，拆成一盘共享活字。按顺序点选 2–8 字，点击“融合印版”。匹配参考词时收走对应活字、记 1 星；其他词请老师判断。教师判对收集青绿色印版并归还活字，返回重试则归还活字且不记分。每个词只能得星一次。教师判断记给提交时的小组，切换模式保留待判词和进度；新一轮或刷新会清空。</p>');
$('.practice-box').insertAdjacentHTML('beforebegin', '<div class="train-ledger-panel" hidden><h4>旅程记录</h4><div id="train-ledger" aria-live="polite"></div></div>');
$('#help-dialog').insertAdjacentHTML('beforeend', '<p>句子小火车：点击词语车厢，从左到右排列句子。全部接齐后发车；未命中可调整或由老师判对。看过参考句后须由老师判对才计分。再练一次只加入明确标记的句子；跳过的句子不算错。三种游戏独立保存本页进度，刷新重置。题库中的“句子小火车设置”可用 / 分隔词语。每句支持2–7节车厢；《中文》第一、二册选用课文及阅读重点句，显示栏目、篇名和教材页码，部分短句摘自分句并统一句尾标点。《汉语乐园》1A–3B选用课本对话、歌曲和故事原句，老师手工切分句仍可练习；1A第3课仅作数字认读。</p>');
const allDefaults = [...DEFAULT_QUESTIONS, ...TEXTBOOK_QUESTIONS, ...PARADISE_QUESTIONS, ...ZHONGWEN_QUESTIONS];
$('#help-dialog').insertAdjacentHTML('beforeend','<p>情景探索：按教材、册数、课次选择。中文（暨南大学版）第一册第3课可跟猫咪读线索、找钥匙、逃出密室。第五册第9课可探索《古诗二首》。汉语乐园 2A 第2课可读线索、猜城市。</p>');
$('.teacher-badge').textContent = '汉语乐园 · 1A–3B';
$('.lesson-toolbar').insertAdjacentHTML('afterbegin', `<label class="curriculum-field">题库<select id="bank-source" aria-label="题库来源"><option value="paradise">汉语乐园（1A–3B）</option><option value="textbook">中文乐园（新版）</option><option value="zhongwen">${ZHONGWEN_NAME}</option><option value="personal">个人 / 通用题库</option></select></label><label class="curriculum-field textbook-field"><span id="stage-label">阶段</span><select id="stage" aria-label="学习阶段">${STAGES.map(s=>`<option>${s}</option>`).join('')}</select></label><label class="curriculum-field textbook-field">范围<select id="scope" aria-label="练习范围"><option value="stage">整个阶段</option><option value="lesson">本课</option><option value="cumulative">截至本课累计</option></select></label><label class="curriculum-field textbook-field">课次<select id="lesson" aria-label="选择课次"></select></label>`);
$('.lesson-toolbar').insertAdjacentHTML('afterend', '<p id="curriculum-note" class="curriculum-note"></p><div id="textbook-notice" class="notice" hidden><span></span><button id="add-textbook">补充教材题库</button></div>');
$('#textbook-notice').insertAdjacentHTML('afterend', '<details id="zhongwen-vocabulary" class="zhongwen-vocabulary" hidden><summary>教材生字与词语</summary><p class="muted">按教材栏目和原顺序列出。组词工坊使用完整词表中的2–8字词语与短语；单字在识字翻翻乐练习。</p><div id="zhongwen-vocabulary-content"></div></details>');
document.body.insertAdjacentHTML('beforeend', '<dialog id="paradise-vocabulary-dialog" class="textbook-vocabulary-dialog" aria-labelledby="paradise-vocabulary-title"><div class="dialog-heading"><h2 id="paradise-vocabulary-title">汉语乐园教材词语</h2><button id="close-paradise-vocabulary" class="icon-button" aria-label="关闭教材词语">×</button></div><p class="muted">1A、1B按课本New Words词表收录，另标出正文核心复习词。辅助例词不混入教材词库；单字保留供识字翻牌，2–8字教材词语进入组词工坊。</p><div id="paradise-vocabulary-content"></div></dialog>');
$('#close-paradise-vocabulary').onclick = () => $('#paradise-vocabulary-dialog').close();
$('#help-dialog').insertAdjacentHTML('beforeend', '<p>《中文》暨南大学版为独立教材系列，后续第三册、第四册等均归入同一系列。目前已收录第一、二册，按整册及原课次选择，收录每课全部生字、词语和“读一读”，展开“教材生字与词语”可核对原序及教材页码。识字卡的两个例词和简单例句是辅助教学内容；组词工坊使用独立保存的完整教材词表。旧题库可点击“补充教材题库”，只追加缺失题目，保留已有题目及个人修改。</p>');
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
let cardStrokeKey = null, cardStrokeView = null, cardStrokeCleanup = null;
let selection = {source: bank.questions.some(q=>q.textbook === PARADISE_ID) ? 'paradise' : bank.questions.some(q=>q.textbook === TEXTBOOK_ID) ? 'textbook' : bank.questions.some(q=>q.textbook === ZHONGWEN_ID) ? 'zhongwen' : 'personal', stage:'1A', scope:'stage', lesson:1};
if (selection.source === 'zhongwen') selection.stage = '1';
let gameMode = 'flip', workshopState = null, workshopCount = 4, workshopRound = 0, homeMode=false,gameHasBeenShown=false;
let sudokuState=null,sudokuPool=null,sudokuSelectedIds=[];
let moleState=null,molePool=null,moleType='mixed';
let poisonState=null,poisonPool=null,poisonSelectedIds=[],poisonCount=1,poisonAntidoteId='';
let poisonSoundEnabled=true;
$('.lesson-toolbar').insertAdjacentHTML('beforeend','<label id="poison-sound-label" hidden><input id="poison-sound" type="checkbox" checked> 中毒与解救音效</label>');
$('#poison-sound').onchange=event=>{poisonSoundEnabled=event.target.checked;render();};
let buildingState=null,buildingPool=null,buildingSelectedIds=[],buildingStructure='house',buildingSentenceId='';
let mazeState=null,mazePool=null;
let constructionPool=null,puzzleState=null,strokeState=null,handwritingState=null,strokeInputMode='drag';
const isConstruction=mode=>mode==='puzzle'||mode==='strokes';
function prepareConstruction(){
  if(selection.source!=='personal')selection={...selection,scope:'lesson'};
  constructionPool=getConstructionPool(selection,bank.questions,grade);
  if(gameMode==='puzzle')puzzleState=createPuzzleState(constructionPool.puzzles);
  else {strokeState=createStrokeState(constructionPool.characters);handwritingState=createHandwritingState(constructionPool.characters);}
}
$('#help-dialog').insertAdjacentHTML('beforeend','<p>汉字拼图：先只给部件，学生发现能组成的本课汉字；同一部件可多选，点“合一合”后才揭晓。独体字不强拆，尚不确定的分拆不出题。展开“本课新部件”可看英文介绍。笔画很忙：学生说名称，老师选笔听读音，再拖到大田字格的白色字影位置；也可选笔后点位置，或用键盘聚焦字影后回车。两种练习共用“笔顺提示”开关，上新课时可看编号和箭头，复习时可关闭。按规范笔顺逐笔完成，支持撤回和关闭读音；触屏描写写完一字会全屏显示描写参考分，关闭后继续；课末可进入基础笔画复习与预习。切换游戏保留本页进度，刷新重置。两个游戏使用当前课次，不改变个人题库。</p>');
function prepareMaze(){
  if(selection.source!=='personal')selection={...selection,scope:'lesson'};
  const pool=getMolePool({...selection,grade,type:'characters'},bank.questions);
  mazePool={...pool,words:pool.words.map(word=>({...word,id:word.id.replace('mole/','maze/')}))};mazeState=null;
}
$('#help-dialog').insertAdjacentHTML('beforeend','<p>汉字迷宫：每课变换通路，同课“再走一张”也会换路线。先观察立体墙和岔路，再选上下左右相邻的汉字。学生认读，老师点击“读对了，前进一步”，小人才迈步走一格；读错先重读，死路可以退回来。小人抵达出口后跳跃挥手、飞出彩纸庆祝，结束后可选下一课。可切换平面，减少动态效果时静态显示。汉字来自本课，会重复出现。活动导航按“搭建挑战 → 女巫毒药 → 汉字迷宫”携带当前教材课次；原导航保留各自本页进度。</p>');
function prepareBuilding(){
  if(selection.source!=='personal')selection={...selection,scope:'lesson'};
  const pool=getPoisonPool({...selection,grade},bank.questions);
  buildingPool={...pool,words:pool.words.map(word=>({...word,id:word.id.replace(/^poison\//u,'building/')}))};
  buildingSelectedIds=buildingPool.words.slice(0,12).map(word=>word.id);buildingSentenceId=buildingPool.sentences[0]?.id??'';buildingState=null;
}
$('#help-dialog').insertAdjacentHTML('beforeend','<p>汉字建筑师：每课可选房、桥、塔、楼，以及1–16个本课字词；四类建筑各有不同款式，换课变外形。每个词写在对应词砖上，学生朗读后老师确认，词砖逐块落下。搭好后从右侧挑词朗读，老师点卡；安全词会移走对应砖块和词卡，失去支撑的词砖会带动上方部分落下，仍有支撑的部分保留；从上往下安全拆完也能完成本轮。读出本课重点句子，老师确认后全部词砖飞回复原，再继续女巫活动。没有重点句子的课仍可搭建并进入下一活动。</p>');
$('#help-dialog').insertAdjacentHTML('beforeend','<p>女巫解药为可选环节：准备时选择本课重点句子，变身后点击“使用解药”，学生朗读，再由老师点击“读完了，解救成功”。可以跳过解药直接换小女巫，也可以点击“选择其他课”更换教材或课次。</p>');
$('#help-dialog').insertAdjacentHTML('beforeend','<p>女巫的毒药：选本课2–16张词卡和1–2个毒药，其他同学闭眼，小女巫秘密点选。藏好后睁眼，学生先读，老师点刚读过的词卡，立即给结果。安全卡变灰；读中毒药词时，女巫拿着空药瓶现身坏笑，同时出现烟雾、青蛙变身和卡通音效，结束本轮并询问是否使用解药。可读本课句子解救，也可跳过后进入迷宫。音效可关闭，所有同学仍可继续参加。离开藏毒画面先遮挡秘密选择。</p>');
function preparePoison(){
  if(selection.source!=='personal')selection={...selection,scope:'lesson'};
  poisonPool=getPoisonPool({...selection,grade},bank.questions);
  poisonAntidoteId=poisonPool.sentences[0]?.id??'';
  poisonSelectedIds=poisonPool.words.slice(0,12).map(word=>word.id);poisonState=null;
}
$('.lesson-toolbar').insertAdjacentHTML('beforeend','<label id="mole-content-label" hidden>练习内容<select id="mole-content" aria-label="打地鼠练习内容"><option value="mixed">生字＋词语</option><option value="characters">只练生字</option><option value="words">只练词语</option></select></label>');
$('#help-dialog').insertAdjacentHTML('beforeend','<p>打地鼠：使用当前课次已收录的生字和词语，也可只练生字或词语。每轮最多9个不同词，学生读对后老师点击对应地鼠，挥锤、加一星，读完可再玩一轮；没有倒计时，不会自动消失。所有词读对后播放庆祝特效。可开启拼音提示，每词仅计一次分，切换游戏保留本页进度。</p>');
function prepareMole(){
  moleView.cancelAnimations();
  if(selection.source!=='personal')selection={...selection,scope:'lesson'};
  molePool=getMolePool({...selection,grade,type:moleType},bank.questions);
  moleState=createMoleState({words:molePool.words,teamNames});
}
$('#help-dialog').insertAdjacentHTML('beforeend','<p>汉字数独：选本课9个不同词，先从9×9棋盘拖出任一种形式，或点棋盘再点右侧整理，系统补全汉字、拼音及合适配图。集齐9词后，从右侧拖入空格，或先点词卡再点空格。每行、每列、每个3×3宫各有9词，简单关每处留1–2空。原有线索始终保留，词卡可重复使用。每格只得1星，撤回和重填不重复得分。方向键移动棋盘焦点，回车选择，Delete清空选中格。四个游戏独立保留本页进度，刷新重置。</p>');
function prepareSudoku(){
  sudokuView.cancelDrag();
  if(selection.source!=='personal')selection.scope='lesson';
  sudokuPool=getSudokuCandidates({...selection,grade},bank.questions);
  sudokuSelectedIds=sudokuPool.words.slice(0,9).map(word=>word.id);
  sudokuState=null;
}
$('.lesson-toolbar').insertAdjacentHTML('beforeend', '<label id="workshop-count-label" hidden>每盘词数<select id="workshop-count" aria-label="每盘词数"><option value="2">2 个词</option><option value="3">3 个词</option><option value="4" selected>4 个词</option></select></label>');
function currentSession() {
  if(gameMode==='sudoku'||gameMode==='explore'||gameMode==='mole'||gameMode==='poison'||gameMode==='building'||gameMode==='maze')return createSession({questions:[],teamNames});
  const questions = selection.source !== 'personal'
    ? filterCurriculum(bank.questions, {...selection, textbook: textbookForSource(selection.source)})
    : bank.questions.filter(q=>!q.textbook);
  if(gameMode === 'train') {
    const curated = selection.source === 'zhongwen' ? getZhongwenTrainQuestions(selection) : selection.source === 'paradise' ? getParadiseTrainQuestions(selection) : [];
    const editable = questions.filter(q=>selection.source!=='personal'||q.grade===grade).map(resolveTrainQuestion).filter(Boolean);
    return createTrainSession({questions: mergeTrainQuestionPools(curated, editable),teamNames});
  }
  if(gameMode === 'workshop') {
    const scoped=questions.filter(q=>selection.source!=='personal'||q.grade===grade);
    const snapshot=Object.freeze(scoped.map(q=>Object.freeze({...q,words:Object.freeze([...(q.words??[])])})));
    const base=createSession({questions:[],teamNames});
    return Object.freeze({...base,phase:snapshot.length?'active':'empty',questions:snapshot,currentIndex:snapshot.length?0:-1,revealed:Object.freeze(snapshot.map(()=>false)),judgments:Object.freeze(snapshot.map(()=>null))});
  }
  return createSession({questions, grade: selection.source === 'personal' ? grade : undefined, teamNames});
}
function refreshTextbookNotice() {
  const missing = mergeTextbookQuestions(bank.questions).length - bank.questions.length;
  $('#textbook-notice').hidden = !bankLoaded || missing === 0;
  $('#textbook-notice span').textContent = `可补充 ${missing} 道教材题（含《中文》第一、二册及《汉语乐园》1A–3B），保留已有题目和修改。`;
}
function syncSelection() {
  $('#grade').value=String(grade);
  $('#bank-source').value = selection.source;
  const textbook = textbookForSource(selection.source);
  const zhongwen = selection.source === 'zhongwen';
  const explore=gameMode==='explore',browseAll=homeMode||explore;
  $('#stage').replaceChildren(...(browseAll?explorationStages(textbook):stagesForTextbook(textbook)).map(stage => {
    const option = document.createElement('option');
    option.value = stage;
    option.textContent = zhongwen ? ZHONGWEN_BOOK_LABELS[stage] : stage;
    return option;
  }));
  $('#stage-label').textContent = zhongwen||homeMode ? '册数' : '阶段';
  $('#stage').setAttribute('aria-label', zhongwen||homeMode ? '选择册数' : '学习阶段');
  $('#scope option[value="stage"]').textContent = zhongwen ? '全册' : '整个阶段';
  $('#stage').value = selection.stage;
  $('#scope').value = selection.scope;
  $('#lesson').replaceChildren(...(browseAll?explorationCourses(textbook):coursesForTextbook(textbook)).filter(c=>c.stage===selection.stage).map(c=>{
    const option = document.createElement('option');
    option.value = c.lesson;
    option.textContent = `第${c.lesson}课 ${c.title}`;
    return option;
  }));
  $('#lesson').value = selection.lesson;
  $('#lesson').disabled = !browseAll && selection.scope === 'stage';
  $('.grade-label').hidden = !homeMode&&explore || selection.source !== 'personal';
  document.querySelectorAll('.textbook-field').forEach(e=>e.hidden=selection.source === 'personal');
  if(isConstruction(gameMode)||gameMode==='sudoku'||gameMode==='mole'||gameMode==='poison'||gameMode==='building'||gameMode==='maze'||explore)$('#scope').closest('label').hidden=true;
  $('#curriculum-note').textContent = selection.source !== 'personal'
    ? zhongwen
      ? `《中文》（暨南大学华文学院 · 第三版）${ZHONGWEN_BOOK_LABELS[selection.stage]} · ${selection.scope === 'cumulative' ? `第一册第1课至${ZHONGWEN_BOOK_LABELS[selection.stage]}第${selection.lesson}课` : selection.scope === 'lesson' ? `第${selection.lesson}课` : '全册'} · ${gameMode === 'train' ? '课文与阅读重点句' : '全部生字与教材词语'}`
      : selection.source === 'paradise'
      ? `《汉语乐园》${selection.stage} · 原书分册及课次 · ${selection.scope === 'cumulative' ? `1A第1课至${selection.stage}第${selection.lesson}课` : selection.scope === 'lesson' ? `第${selection.lesson}课` : '全册'} · ${gameMode === 'train' ? '课本对话、歌曲与故事重点句' : '核心词汇识字与学写字'}`
      : `《中文乐园》课本1–3 · A/B为游戏分组（A：第1–6课，B：第7–12课） · ${selection.scope === 'cumulative' ? `课本1第1课至课本${selection.stage[0]}第${selection.lesson}课` : selection.scope === 'lesson' ? `${selection.stage} 第${selection.lesson}课` : `${selection.stage} 全阶段`} · 例词例句为配编`
    : '个人 / 通用题库 · 年级为难度建议';
  if (selection.source === 'paradise' && selection.stage.startsWith('1')) {
    const viewWords = el('button','查看教材词语','text-button');
    viewWords.id = 'open-paradise-vocabulary';
    viewWords.onclick = () => {
      concealPoison();
      const keys = new Set(filterCurriculum(PARADISE_QUESTIONS, {...selection, textbook: PARADISE_ID}).map(q => `${q.book}/${q.lesson}`));
      const courses = coursesForTextbook(PARADISE_ID).filter(c => keys.has(`${c.book}/${c.lesson}`));
      renderZhongwenVocabulary($('#paradise-vocabulary-content'), courses, {paradise:true});
      $('#paradise-vocabulary-dialog').showModal();
    };
    $('#curriculum-note').append(viewWords);
  }
  $('.teacher-badge').textContent = zhongwen ? `${ZHONGWEN_NAME} · ${ZHONGWEN_BOOK_LABELS[selection.stage]}` : selection.source === 'paradise' ? '汉语乐园 · 1A–3B' : selection.source === 'textbook' ? '中文乐园（新版）' : '教师课堂 · 个人题库';
  $('#zhongwen-vocabulary').hidden = !zhongwen || explore || gameMode === 'puzzle' || gameMode === 'mole' || gameMode === 'poison' || gameMode === 'building' || gameMode === 'maze' || gameMode === 'train' || gameMode === 'sudoku';
  if (zhongwen&&!explore&&gameMode!=='mole') {
    const keys = new Set(filterCurriculum(ZHONGWEN_QUESTIONS, {...selection, textbook: ZHONGWEN_ID}).map(q => `${q.book}/${q.lesson}`));
    const courses = coursesForTextbook(ZHONGWEN_ID).filter(c => keys.has(`${c.book}/${c.lesson}`));
    $('#zhongwen-vocabulary summary').textContent = `教材生字与词语 · ${courses.length}课`;
    renderZhongwenVocabulary($('#zhongwen-vocabulary-content'), courses);
  }
  refreshTextbookNotice();
  if(explore){
    $('#textbook-notice').hidden=true;
    $('#curriculum-note').textContent=zhongwen?`${ZHONGWEN_NAME} · ${ZHONGWEN_BOOK_LABELS[selection.stage]} · 第${selection.lesson}课 · 情景探索`:'按教材与课次选择情景；其他内容将逐步补充。';
  }
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
    if(homeMode)journey.refresh();
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
}, decideWorkshopWord);
$('#desk-ledger-slot').append($('#workshop-collection-panel'));
let workshopScene;
const trainView = createTrainView($('#sentence-train'), trainIntent, message=>{notify(message);if(gameMode==='train')syncSimpleControl()});
const sudokuView=createSudokuView($('#sudoku'),sudokuIntent);
const moleView=createMoleView($('#mole'),moleIntent);
const poisonView=createPoisonView($('#witch-poison'),poisonIntent);
const buildingView=createBuildingView($('#hanzi-building'),buildingIntent);
const mazeView=createMazeView($('#hanzi-maze'),mazeIntent);
const constructionView=createConstructionView($('#hanzi-construction'),{onAction:constructionIntent});
constructionView.setVisible(false);
let journeyContextCache;
function journeyContext(){
 const course=selection.source==='personal'?{source:'personal',stage:'',lesson:1,grade}:{source:selection.source,stage:selection.stage,lesson:selection.lesson,grade};
 const key=JSON.stringify(course);
 if(journeyContextCache?.key===key&&journeyContextCache.questions===bank.questions)return journeyContextCache.value;
 const availability=getJourneyAvailability({...selection,scope:'lesson'},bank,grade);
 const content=JSON.stringify([journeyQuestions(selection,bank.questions,grade),availability.map(a=>a.available)]);
 let hash=2166136261;for(let i=0;i<content.length;i++)hash=Math.imul(hash^content.charCodeAt(i),16777619);
 course.revision=(hash>>>0).toString(36);
 const courseLabel=selection.source==='personal'?`个人题库 · ${grade}年级`:`${selection.source==='zhongwen'?ZHONGWEN_NAME:selection.source==='paradise'?'汉语乐园':'中文乐园'} · ${selection.stage} · 第${selection.lesson}课`;
 const value={course,availability,courseLabel};journeyContextCache={key,questions:bank.questions,value};return value;
}
const journey=createIslandJourney({getContext:journeyContext,onConceal:concealPoison,canLaunch:mayRestart,onCelebrate:()=>showLessonCelebration(),onHomeChange(visible){
 homeMode=visible;document.body.classList.toggle('island-home-mode',visible);
 if(visible){
  if(gameMode==='train'&&session.departure)finishDeparture(session.departure);
  if(gameMode==='flip'&&flipTransition)finishFlipTransition(flipTransition);
  if(gameMode==='workshop'&&workshopTransition)finishWorkshopTransition(workshopTransition);
  if(gameMode==='mole'){moleView.cancelAnimations();moleState=finishMoleHits(moleState);}
  if(gameHasBeenShown)modeSnapshots[gameMode]=snapshotMode();
  sudokuView.cancelDrag();constructionView.setVisible(false);activeScene()?.setActive(false);selection={...selection,scope:'lesson'};
 }else{constructionView.setVisible(isConstruction(gameMode));activeScene()?.setActive(true);}
 $('#bank-source').parentElement.firstChild.textContent=visible?'教材':'题库';
 syncSelection();render();window.scrollTo({top:0,left:0,behavior:'instant'});
},onLaunch(mode,course,{independent=false}={}){
 grade=course.grade;switchMode(mode,{...course,scope:'lesson'},true);
 if(independent){const url=new URL(location.href);url.searchParams.delete('journey');url.searchParams.set('mode',mode);history.replaceState(null,'',url);}
}});
function constructionIntent(intent,value){
  if(!isConstruction(gameMode))return;
  if(gameMode==='strokes'&&intent==='input-mode'){if(['drag','write'].includes(value))strokeInputMode=value;render();return;}
  if(gameMode==='puzzle'){
    if(intent==='part')puzzleState=selectPuzzlePart(puzzleState,value);
    else if(intent==='remove')puzzleState=removePuzzlePart(puzzleState,value);
    else if(intent==='check')puzzleState=checkPuzzle(puzzleState);
  }else if(strokeInputMode==='write'){
    if(intent==='trace')handwritingState=submitHandwritingStroke(handwritingState,value.points,value.geometry);
    else if(intent==='undo')handwritingState=undoHandwritingStroke(handwritingState);
    else if(intent==='rewrite')handwritingState=rewriteHandwritingCharacter(handwritingState);
    else if(intent==='next')handwritingState=navigateHandwriting(handwritingState,value);
    else if(intent==='review')handwritingState={...handwritingState,review:Boolean(value),feedback:'ready',lastName:null};
  }else{
    if(intent==='place')strokeState=placeStroke(strokeState,value,value.geometry);
    else if(intent==='undo')strokeState=undoStroke(strokeState);
    else if(intent==='next')strokeState=nextStrokeCharacter(strokeState,value);
    else if(intent==='review')strokeState={...strokeState,review:Boolean(value),feedback:'ready'};
  }
  render();
}
function mazeIntent(intent,value){
  if(gameMode!=='maze')return;
  if(intent==='next-activity'){goActivity('building');$(selection.source==='personal'?'#grade':'#lesson').focus();notify('请先在上方选择下一课，再开始新一组活动。');return;}
  if(intent==='previous-activity'){goActivity('poison');return;}
  if(intent==='start'||intent==='restart'){
    if(!mazePool.words.length||(intent==='restart'&&!mayRestart()))return;const look=lessonAppearance(selection,grade);mazeState=createMazeState({words:mazePool.words,layoutKey:look.key,layoutVariant:look.variant,previousGrid:mazeState?.grid});
  }else if(mazeState){const actions={cell:()=>selectMazeCell(mazeState,value),confirm:()=>confirmMazeStep(mazeState),cancel:()=>cancelMazeStep(mazeState)};if(!actions[intent])return;mazeState=actions[intent]();}
  render();
}
function buildingIntent(intent,value){
  if(gameMode!=='building')return;
  if(intent==='next-activity'){goActivity('poison');return;}
  if(intent==='choose-word'){
    if(buildingSelectedIds.includes(value))buildingSelectedIds=buildingSelectedIds.filter(id=>id!==value);
    else if(buildingSelectedIds.length<16)buildingSelectedIds=[...buildingSelectedIds,value];
    else{notify('每轮最多16个词，请先取消一个再替换。');return;}
  }else if(intent==='structure')buildingStructure=value;
  else if(intent==='sentence')buildingSentenceId=value;
  else if(intent==='start'){
    if(!buildingSelectedIds.length)return;
    buildingState=createBuildingState({words:buildingSelectedIds.map(id=>buildingPool.words.find(w=>w.id===id)),structure:buildingStructure,sentence:buildingPool.sentences.find(s=>s.id===buildingSentenceId),variant:lessonAppearance(selection,grade).variant});
  }else if(intent==='prepare'||intent==='change-lesson'){
    if(!mayRestart())return;buildingState=null;
    if(intent==='change-lesson'){prepareBuilding();syncSelection();render();$(selection.source==='personal'?'#grade':'#lesson').focus();notify('请在上方选择其他课次或教材。');return;}
  }else if(buildingState){
    if(intent==='challenge-card'){buildingState=chooseBuildingChallengeWord(buildingState,value);render();return;}
    const actions={draw:drawBuildingWord,confirm:confirmBuildingWord,challenge:beginBuildingChallenge,restore:restoreBuilding};if(!actions[intent])return;
    buildingState=actions[intent](buildingState);
  }
  render();
}
function concealPoison(){
  if(gameMode!=='poison'||!poisonState)return;
  const next=coverPoisonSecrets(poisonState);if(next!==poisonState){poisonState=next;render();}
}
function poisonIntent(intent,value){
  if(gameMode!=='poison')return;
  if(intent==='next-activity'){goActivity('maze');return;}
  if(intent==='choose-word'){
    if(poisonSelectedIds.includes(value))poisonSelectedIds=poisonSelectedIds.filter(id=>id!==value);
    else if(poisonSelectedIds.length<16)poisonSelectedIds=[...poisonSelectedIds,value];
    else{notify('每轮最多16张词卡，请先取消一张再替换。');return;}
  }else if(intent==='count')poisonCount=value;
  else if(intent==='antidote-choice')poisonAntidoteId=value;
  else if(intent==='change-lesson'){
    preparePoison();syncSelection();render();$('#lesson').focus();notify('请在上方选择其他课次或教材。');return;
  }
  else if(intent==='start'){
    if(poisonSelectedIds.length<2||poisonSelectedIds.length<=poisonCount)return;
    poisonState=createPoisonState({words:poisonSelectedIds.map(id=>poisonPool.words.find(w=>w.id===id)),poisonCount,antidote:poisonPool.sentences.find(s=>s.id===poisonAntidoteId)});
  }else if(intent==='prepare'){
    if(!mayRestart())return;poisonState=null;
  }else if(poisonState){
    const actions={hide:()=>beginPoisonHiding(poisonState),card:()=>poisonState.phase==='hide'?togglePoisonWord(poisonState,value):readPoisonCard(poisonState,value),seal:()=>sealPoison(poisonState),read:()=>beginPoisonReading(poisonState),'next-round':()=>nextPoisonRound(poisonState),antidote:()=>beginPoisonAntidote(poisonState),rescue:()=>finishPoisonAntidote(poisonState),'skip-antidote':()=>skipPoisonAntidote(poisonState)};
    if(!actions[intent])return;poisonState=actions[intent]();
  }
  render();
}
window.addEventListener('blur',concealPoison);
document.addEventListener('visibilitychange',()=>{if(document.hidden)concealPoison();});
function moleIntent(intent,value){
  if(gameMode!=='mole')return;
  if(intent==='restart'){newRound();return;}
  const next=intent==='hit'?hitMole(moleState,{...value,teamId:selectedTeam}):settleMole(moleState,value.slot,value.wordId);
  if(next===moleState)return;
  moleState=window.matchMedia('(prefers-reduced-motion: reduce)').matches?finishMoleHits(next):next;
  render();
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&gameMode==='mole'){moleView.cancelAnimations();moleState=finishMoleHits(moleState);render();}
});
function sudokuIntent(intent,value){
  if(gameMode!=='sudoku')return;
  if(intent==='choose-word'){
    if(sudokuSelectedIds.includes(value))sudokuSelectedIds=sudokuSelectedIds.filter(id=>id!==value);
    else if(sudokuSelectedIds.length<9)sudokuSelectedIds=[...sudokuSelectedIds,value];
    else {notify('已选9词，请先取消一个再替换。');return;}
  }else if(intent==='start'){
    if(sudokuSelectedIds.length!==9)return;
    sudokuState=createSudokuState({words:sudokuSelectedIds.map(id=>sudokuPool.words.find(word=>word.id===id)),teamNames});
  }else if(intent==='lesson'){
    if(!mayRestart())return;
    selection={...selection,lesson:value,scope:'lesson'};prepareSudoku();syncSelection();
  }else if(intent==='prepare'){
    if(!mayRestart())return;
    sudokuView.cancelDrag();sudokuState=null;
  }else if(sudokuState){
    if(intent==='collect')sudokuState=collectSudokuWord(sudokuState,value);
    else if(intent==='place')sudokuState=placeSudokuWord(sudokuState,{...value,teamId:selectedTeam});
    else if(intent==='clear')sudokuState=clearSudokuCell(sudokuState,value);
    else if(intent==='undo')sudokuState=undoSudoku(sudokuState);
  }
  render();
}
function activeScene() { return isConstruction(gameMode)?null:gameMode==='building'?buildingView.scene:gameMode==='poison'?poisonView.scene:gameMode==='maze'?mazeView.scene:gameMode==='sudoku'||gameMode==='explore'||gameMode==='mole'?null:gameMode === 'train' ? trainView.scene : gameMode === 'workshop' ? workshopScene : scene; }
function syncSimpleControl() {
  if(isConstruction(gameMode)){$('#simplify').hidden=true;return;}
  $('#simplify').hidden=gameMode==='sudoku'||gameMode==='explore'||gameMode==='mole'||gameMode==='poison'||gameMode==='building'||gameMode==='maze';
  if(gameMode==='sudoku'||gameMode==='explore'||gameMode==='mole'||gameMode==='poison'||gameMode==='building'||gameMode==='maze')return;
  const simple = $(gameMode === 'train' ? '#train-scene' : gameMode === 'workshop' ? '#workshop-scene' : '#scene').dataset.mode === 'simple';
  $('#simplify').textContent = simple ? '立体显示' : '简化显示';
  $('#simplify').setAttribute('aria-pressed', String(simple));
}
function snapshotMode(){return { session, grade, teamNames: [...teamNames], selectedTeam, showPinyin, selection: {...selection}, extensionOpen, workshopState, sudokuState,sudokuPool,sudokuSelectedIds:[...sudokuSelectedIds],moleState,molePool,moleType,poisonState,poisonPool,poisonSelectedIds:[...poisonSelectedIds],poisonCount,poisonAntidoteId,buildingState,buildingPool,buildingSelectedIds:[...buildingSelectedIds],buildingStructure,buildingSentenceId,mazeState,mazePool,constructionPool,puzzleState,strokeState,handwritingState,strokeInputMode };}
function goActivity(mode){if(mode===gameMode||!mayRestart())return;switchMode(mode,{...selection,scope:'lesson'});}
function switchMode(mode, linkedSelection, journeyTransfer=false) {
  if (mode === gameMode&&!journeyTransfer) return;
  if(!journeyTransfer)journey.pause();
  concealPoison();
  if (gameMode === 'train' && session.departure) finishDeparture(session.departure);
  if (gameMode === 'flip' && flipTransition) finishFlipTransition(flipTransition);
  if(gameMode === 'workshop' && workshopTransition) finishWorkshopTransition(workshopTransition);
  if(gameMode==='mole'){moleView.cancelAnimations();moleState=finishMoleHits(moleState);}
  sudokuView.cancelDrag();
  constructionView.setVisible(false);
  if(!homeMode&&gameHasBeenShown)modeSnapshots[gameMode]=snapshotMode();
  activeScene()?.setActive(false);
  const carried=linkedSelection&&(journeyTransfer||['building','poison','maze'].includes(mode)),saved=carried?null:modeSnapshots[mode];
  gameMode = mode;
  if(carried)selection={...linkedSelection,scope:'lesson'};
  if (saved) ({ session, grade, teamNames, selectedTeam, showPinyin, selection, extensionOpen, workshopState,sudokuState,sudokuPool,sudokuSelectedIds,moleState,molePool,moleType,poisonState,poisonPool,poisonSelectedIds,poisonCount,poisonAntidoteId,buildingState,buildingPool,buildingSelectedIds,buildingStructure,buildingSentenceId,mazeState,mazePool,constructionPool,puzzleState,strokeState,handwritingState,strokeInputMode } = saved);
  else {
    if(mode==='explore'){
      selection=linkedSelection??(matchingExplorations(selection).length?selection:{source:'zhongwen',stage:'5',scope:'lesson',lesson:9});
    }else{
      const textbook=textbookForSource(selection.source),stages=stagesForTextbook(textbook);
      if(!stages.includes(selection.stage)){
        const stage=stages[0],lesson=coursesForTextbook(textbook).find(c=>c.stage===stage)?.lesson??1;
        selection={...selection,stage,lesson,scope:'lesson'};
        showPinyin=Number(stage[0])<=2;
      }
    }
    session=currentSession();selectedTeam='team-1';extensionOpen=false;
    workshopState=mode==='workshop'?createWorkshopState(session,{wordCount:workshopCount}):null;
    if(mode==='workshop')workshopRound++;
  }
  if(mode==='sudoku'&&!saved)prepareSudoku();
  if(mode==='mole'&&!saved){showPinyin=false;prepareMole();}
  if(mode==='poison'&&!saved)preparePoison();
  if(mode==='building'&&!saved)prepareBuilding();
  if(mode==='maze'&&!saved)prepareMaze();
  if(isConstruction(mode)&&!saved)prepareConstruction();
  if(!saved&&optionalPinyinModes.has(mode))showPinyin=false;
  gameMode = mode;
  document.body.classList.toggle('workshop-mode', mode === 'workshop');
  document.body.classList.toggle('train-mode',mode === 'train');
  document.body.classList.toggle('sudoku-mode',mode === 'sudoku');
  document.body.classList.toggle('explore-mode',mode === 'explore');
  document.body.classList.toggle('mole-mode',mode === 'mole');
  document.body.classList.toggle('poison-mode',mode === 'poison');
  document.body.classList.toggle('building-mode',mode === 'building');
  document.body.classList.toggle('maze-mode',mode === 'maze');
  document.body.classList.toggle('construction-mode',isConstruction(mode));
  $('#hanzi-construction').hidden=!isConstruction(mode);constructionView.setVisible(isConstruction(mode));
  $('#mode-puzzle').setAttribute('aria-pressed',String(mode==='puzzle'));$('#mode-strokes').setAttribute('aria-pressed',String(mode==='strokes'));
  $('#hanzi-maze').hidden=mode!=='maze';$('#mode-maze').setAttribute('aria-pressed',String(mode==='maze'));
  $('#hanzi-building').hidden=mode!=='building';$('#mode-building').setAttribute('aria-pressed',String(mode==='building'));
  $('#witch-poison').hidden=mode!=='poison';$('#mode-poison').setAttribute('aria-pressed',String(mode==='poison'));
  $('#poison-sound-label').hidden=mode!=='poison';$('#poison-sound').checked=poisonSoundEnabled;
  $('#mole').hidden=mode!=='mole';$('#mole-content-label').hidden=mode!=='mole';$('#mole-content').value=moleType;
  $('#mode-mole').setAttribute('aria-pressed',String(mode==='mole'));
  $('.classroom').hidden=mode==='explore';
  $('#exploration-catalog').hidden=mode!=='explore';
  $('#restart').hidden=mode==='explore';
  $('#mode-explore').setAttribute('aria-pressed',String(mode==='explore'));
  $('#sudoku').hidden=mode!=='sudoku';
  $('#mode-sudoku').setAttribute('aria-pressed',String(mode==='sudoku'));
  $('#sentence-train').hidden=mode!=='train';
  $('.train-ledger-panel').hidden=mode!=='train';
  $('#mode-train').setAttribute('aria-pressed',String(mode==='train'));
  $('.practice-box > span').textContent=mode==='train'?'还想再练的句子':'还想再认识的字';
  $('#back').setAttribute('aria-label',mode==='train'?'上一句':'上一字');$('#back span').textContent=mode==='train'?'上一句':'上一字';
  $('#next').setAttribute('aria-label',mode==='train'?'下一句':'下一字');$('#next span').textContent=mode==='train'?'下一句':'下一字';
  $('#scene').hidden = mode !== 'flip';
  $('#workshop').hidden = mode !== 'workshop';
  $('#workshop-collection-panel').hidden = mode !== 'workshop';
  $('#workshop-count-label').hidden = mode !== 'workshop';
  $('.game-controls').hidden = isConstruction(mode) || mode === 'workshop' || mode === 'sudoku' || mode === 'explore' || mode === 'mole' || mode === 'poison' || mode === 'building' || mode === 'maze';
  $('#mode-flip').setAttribute('aria-pressed',String(mode === 'flip'));
  $('#mode-workshop').setAttribute('aria-pressed',String(mode === 'workshop'));
  $('.lesson-heading h2').textContent = mode==='puzzle'?'汉字拼图':mode==='strokes'?'笔画很忙':mode==='maze'?'汉字迷宫':mode==='building'?'汉字建筑师':mode==='poison'?'女巫的毒药':mode==='mole'?'打地鼠':mode==='explore'?'情景探索':mode==='sudoku'?'汉字数独':mode === 'train' ? '句子小火车' : mode === 'workshop' ? '组词小工坊' : '识字翻翻乐';
  $('.lesson-heading > p').textContent = mode==='maze'?'观察路线 · 认字前进 · 找到出口':mode==='building'?'读词搭建 · 随机挑战 · 读句复原':mode==='poison'?'闭眼藏毒 · 大声读词 · 魔法变身':mode==='mole'?'读生字 · 认词语 · 快乐挥锤':mode==='explore'?'观察情景 · 寻找线索 · 读懂中文':mode==='sudoku'?'认词整理 · 九宫格填空':mode === 'train' ? '接车厢 · 排句子 · 快乐出发' : mode === 'workshop' ? '挑活字 · 排词语 · 融合木质印版' : '看一看 · 读一读 · 说一说';
  if(isConstruction(mode))$('.lesson-heading > p').textContent=mode==='puzzle'?'观察部件 · 发现汉字':'听笔画 · 按笔顺 · 写汉字';
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
$('#mode-puzzle').onclick = () => switchMode('puzzle');
$('#mode-strokes').onclick = () => switchMode('strokes');
$('#mode-workshop').onclick = () => switchMode('workshop');
$('#mode-train').onclick = () => switchMode('train');
$('#mode-sudoku').onclick = () => switchMode('sudoku');
$('#mode-explore').onclick = () => switchMode('explore');
$('#mode-mole').onclick = () => switchMode('mole');
$('#mode-poison').onclick = () => switchMode('poison');
$('#mode-building').onclick = () => switchMode('building');
$('#mode-maze').onclick = () => switchMode('maze');
for(const mode of ['building','poison','maze'])$('#activity-'+mode).onclick=()=>goActivity(mode);

function renderWorkshop() {
  if (gameMode !== 'workshop') return;
  const {phase,references,totalSlots,pending}=workshopState;
  const active=phase==='active', words=collectedWords(session,workshopState);
  const completed=references.filter(word=>words.some(item=>item.source==='reference'&&item.word===word)).length;
  const remaining=remainingWorkshopWords(session,workshopState);
  const teacherTotal=words.filter(item=>item.source==='teacher').length;
  const value=workshopTransition?.value??workshopState.draft;
  const palette=workshopTransition?.palette??workshopState.palette;
  const selections=workshopTransition?.selections??workshopState.selections;
  const statusNodes=[];
  const textbookWords = selection.source === 'zhongwen' || (selection.source === 'paradise' && selection.stage.startsWith('1'));
  if(phase==='empty') {
    if (textbookWords && session.questions.length) {
      statusNodes.push(el('h2','本课是单字认读'),el('p','本课教材词项均为单字，请用识字翻翻乐认读，或选择其他课次练习组词。'));
      const reading=el('button','去识字翻翻乐','primary');reading.onclick=()=>switchMode('flip');statusNodes.push(reading);
    } else {
      statusNodes.push(el('h2','当前范围暂无有效参考词'),el('p',textbookWords ? '请先点击上方“补充教材题库”，再开始新一轮。' : '在题库中添加 2–8 字的参考词，再开始新一轮。'));
      const edit=el('button','修改题库','primary');edit.onclick=()=>editor.open();statusNodes.push(edit);
    }
  } else if(phase==='complete') {
    statusNodes.push(el('h2','这一盘，全部完成！'),el('p',`本盘完成 ${references.length} 个参考词，累计收集 ${words.length} 个词，其中 ${teacherTotal} 个由教师认可。`));
    if(remaining.length) {
      const nextBatch=el('button','继续下一盘','primary');nextBatch.onclick=continueWorkshopRound;statusNodes.push(nextBatch);
    } else statusNodes.push(el('p','本课/阶段的参考词已全部完成。'));
  }
  $('#mode-label').textContent='共享字盘 · 参考词进度';
  $('#progress').textContent=`${String(completed).padStart(2,'0')} / ${String(references.length).padStart(2,'0')}`;
  $('#round-caption').textContent=references.length<workshopCount?`本盘 ${references.length} 个词 · 当前范围可用参考词不足 ${workshopCount} 个`:`本盘 ${references.length} 个参考词 · 共用一盘活字`;
  $('#progress-dots').replaceChildren(...references.map((_,i)=>el('i','',i<completed?'filled':'')));
  $('#workshop-count').value=String(workshopCount);
  workshopView.update({phase:workshopTransition?'active':phase,value,palette,totalSlots,selections,references,pending,pendingTeam:session.teams.find(t=>t.id===pending?.teamId)?.name??'',locked:!active||Boolean(pending),busy:Boolean(workshopTransition),feedback:workshopFeedback,statusNodes});
  for(const id of ['#correct','#reveal','#practice','#extension-toggle','#extension-hint','#extension'])$(id).hidden=true;
  $('#next').disabled=true;$('#back').disabled=true;
  $('#judgment-note').textContent=pending?'教师判对记给提交时的小组；返回重试不扣分':'参考匹配收走活字 · 教师认可保留活字 · 每个词只记一次星';
  $('#workshop-collection').replaceChildren(...(words.length?words.map(item=>{
    const chip=el('span',item.word,'collected-word');
    chip.dataset.source=item.source;
    const source=item.source==='teacher'?'教师认可':'参考匹配';
    chip.title=`${source} · ${session.teams.find(team=>team.id===item.teamId)?.name??''}`;
    chip.append(el('small',source));return chip;
  }):[el('small','参考词是木色印版，教师认可词是青绿色印版。')]));
  workshopScene?.update({palette,selections,totalSlots,records:workshopTransition?.outcome==='correct'?words.slice(0,-1):words,character:'词',key:workshopRound});
}
async function applyWorkshopResult(result) {
  if(result.outcome==='ignored')return;
  const old=workshopState;
  session=result.session;workshopState=result.state;
  if(result.outcome==='pending'){workshopFeedback='';render();return;}
  const transition={outcome:result.outcome,value:old.draft,palette:old.palette,selections:old.selections};
  workshopTransition=transition;
  workshopFeedback=result.outcome==='duplicate'?'duplicate':result.outcome==='correct'?(result.source==='teacher'?'teacher':'success'):'failure';
  render();
  await workshopScene?.animateResult({outcome:result.outcome==='duplicate'?'incorrect':result.outcome,word:result.word,source:result.source,returnTiles:result.returnTiles,recordIndex:workshopState.records.length-1});
  finishWorkshopTransition(transition);
}
function continueWorkshopRound() {
  if(gameMode!=='workshop'||workshopTransition)return;
  const next=continueWorkshopBatch(session,workshopState);
  if(next===workshopState)return;
  workshopState=next;
  workshopFeedback='';
  workshopRound++;
  workshopScene?.cancelAnimation();
  render();
}
function submitWord() {
  if(gameMode!=='workshop'||workshopTransition||workshopState.pending)return;
  return applyWorkshopResult(submitWorkshopWord(session,workshopState,{teamId:selectedTeam}));
}
function decideWorkshopWord(accepted,pending) {
  if(gameMode!=='workshop'||workshopTransition||!pending)return;
  return applyWorkshopResult(resolveWorkshopWord(session,workshopState,{accepted,pending}));
}
function finishWorkshopTransition(transition) {
  if(workshopTransition!==transition)return;
  workshopTransition=null;
  workshopScene?.cancelAnimation();
  if(gameMode==='workshop')render();
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
  if(gameMode==='puzzle')return Boolean(puzzleState?.selected.length||puzzleState?.found.length);
  if(gameMode==='strokes')return Boolean(strokeState?.progress.some(Boolean)||handwritingState?.progress.some(Boolean)||handwritingState?.lastAttempt.length);
  return (
    (gameMode==='poison'&&poisonState?.phase!=='complete'&&Boolean(poisonState?.poisonIds.length||poisonState?.results.length)) ||
    (gameMode==='maze'&&mazeState?.phase==='play'&&Boolean(mazeState.steps||mazeState.pendingIndex!==null)) ||
    (gameMode==='building'&&['build','challenge','collapsed'].includes(buildingState?.phase)&&Boolean(buildingState?.builtIds.length||buildingState?.pendingId)) ||
    (gameMode==='mole'&&Boolean(moleState?.hits.length)) ||
    (gameMode==='sudoku'&&Boolean(sudokuState?.collected.length)) ||
    (gameMode === 'train' && (session.selections.some(a=>a.length)||session.judgments.some(Boolean))) ||
    (gameMode === 'workshop' && (workshopState?.draft.length || workshopState?.records.length || workshopState?.pending)) ||
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
  if(gameMode==='sudoku'){prepareSudoku();syncSelection();}
  if(gameMode==='mole'){prepareMole();syncSelection();}
  if(gameMode==='poison'){preparePoison();syncSelection();}
  if(gameMode==='building'){prepareBuilding();syncSelection();}
  if(gameMode==='maze'){prepareMaze();syncSelection();}
  if(isConstruction(gameMode)){prepareConstruction();syncSelection();}
  if (gameMode === 'workshop') { workshopState = createWorkshopState(session,{wordCount:workshopCount}); workshopRound++; }
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
  if(homeMode){journey.sync(gameMode,{});return;}
  gameHasBeenShown=true;
  journey.sync(gameMode,{session,moleState,mazeState,puzzleState,strokeState,handwritingState,strokeInputMode,workshopState,workshopTransition,poisonState,buildingState,sudokuState});
  if(journey.isActive())$('#scope').closest('label').hidden=true;
  syncPinyinLocation();
  $('#activity-flow').hidden=!['building','poison','maze'].includes(gameMode);for(const mode of ['building','poison','maze'])$('#activity-'+mode).setAttribute('aria-current',mode===gameMode?'step':'false');
  $('#pinyin').closest('label').hidden=gameMode!=='train'&&gameMode!=='mole'&&gameMode!=='poison'&&gameMode!=='building'&&gameMode!=='maze';
  if(isConstruction(gameMode)){
    strokeCleanup?.();strokeCleanup=null;cardStrokeCleanup?.();cardStrokeCleanup=null;cardStrokeKey=null;cardStrokeView=null;$('#card-face').replaceChildren();
    for(const id of ['#extension-toggle','#extension-hint','#extension'])$(id).hidden=true;
    $('#round-caption').textContent=gameMode==='puzzle'?'本课部件 · 自己发现汉字':'本课生字 · 规范笔顺';
    $('footer > span').textContent=gameMode==='puzzle'?'先选部件，再合一合；每个汉字只收集一次。':strokeInputMode==='write'?'按笔顺逐笔描写，写完一字可看全屏参考分。':'学生说名称，老师拖笔画；按笔顺完成后进入总复习。';
    constructionView.update({mode:gameMode,state:gameMode==='puzzle'?puzzleState:strokeInputMode==='write'?handwritingState:strokeState,pool:constructionPool,inputMode:strokeInputMode});return;
  }
  if(gameMode==='explore'){
    strokeCleanup?.();strokeCleanup=null;
    cardStrokeCleanup?.();cardStrokeCleanup=null;cardStrokeKey=null;cardStrokeView=null;
    for(const id of ['#extension-toggle','#extension-hint','#extension'])$(id).hidden=true;
    $('#round-caption').textContent='观察 · 阅读 · 推理';
    $('footer > span').textContent='情景进度自动保存在当前浏览器，可随时继续。';
    renderExplorations($('#exploration-catalog'),selection,{urlForScenario:s=>scenarioJourneyUrl(s,journey.getState())});return;
  }
  const q = getCurrentQuestion(session),
    active = session.phase === "active",
    revealed = active && session.revealed[session.currentIndex],
    judgment = active && session.judgments[session.currentIndex];
  document.body.classList.toggle('workshop-revealed', gameMode === 'workshop' && Boolean(revealed));
  $("#mode-label").textContent =
    session.mode === "practice" ? "再一次，小小的进步" : q?.trainSource ? (q.textbook === PARADISE_ID ? paradiseTrainLabel(q) : zhongwenTrainLabel(q)) : q?.textbook ? curriculumLabel(q) : "今日探索";
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
  const scores = gameMode==='mole'?(moleState?.scores??{}):gameMode==='sudoku'?(sudokuState?.scores??{}):gameMode==='train'?getTrainScores(session):gameMode==='workshop'?getWorkshopScores(session,workshopState):getScores(session);
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
  $('#pinyin').closest('label').hidden = gameMode !== 'train'&&gameMode!=='mole'&&gameMode!=='poison'&&gameMode!=='building'&&gameMode!=='maze';
  if(gameMode==='maze'){
    strokeCleanup?.();strokeCleanup=null;cardStrokeCleanup?.();cardStrokeCleanup=null;cardStrokeKey=null;cardStrokeView=null;$('#card-face').replaceChildren();
    for(const id of ['#extension-toggle','#extension-hint','#extension'])$(id).hidden=true;
    $('#round-caption').textContent='观察岔路 · 读字前进';mazeView.update({state:mazeState,pool:mazePool,showPinyin});return;
  }
  if(gameMode==='building'){
    strokeCleanup?.();strokeCleanup=null;cardStrokeCleanup?.();cardStrokeCleanup=null;cardStrokeKey=null;cardStrokeView=null;
    $('#card-face').replaceChildren();for(const id of ['#extension-toggle','#extension-hint','#extension'])$(id).hidden=true;
    $('#round-caption').textContent='本课字词 · 搭建与拯救';
    buildingView.update({state:buildingState,pool:buildingPool,selectedIds:buildingSelectedIds,structure:buildingStructure,sentenceId:buildingSentenceId,showPinyin,variant:lessonAppearance(selection,grade).variant});return;
  }
  if(gameMode==='poison'){
    strokeCleanup?.();strokeCleanup=null;cardStrokeCleanup?.();cardStrokeCleanup=null;cardStrokeKey=null;cardStrokeView=null;
    $('#card-face').replaceChildren();for(const id of ['#extension-toggle','#extension-hint','#extension'])$(id).hidden=true;
    $('#round-caption').textContent='本课词卡 · '+poisonCount+'个毒药';
    poisonView.update({state:poisonState,pool:poisonPool,selectedIds:poisonSelectedIds,poisonCount,antidoteId:poisonAntidoteId,soundEnabled:poisonSoundEnabled,showPinyin});return;
  }
  if(gameMode==='mole'){
    strokeCleanup?.();strokeCleanup=null;cardStrokeCleanup?.();cardStrokeCleanup=null;cardStrokeKey=null;cardStrokeView=null;
    for(const id of ['#extension-toggle','#extension-hint','#extension'])$(id).hidden=true;
    $('#mode-label').textContent=molePool.label;$('#progress').textContent=`${moleState.hits.length} / ${moleState.words.length}`;
    $('#round-caption').textContent=`本课 ${moleState.words.length} 个生字与词语`;
    $('footer > span').textContent='学生读对，老师点选挥锤；每个字词只计一次分。';
    moleView.update({state:moleState,showPinyin,note:molePool.note,type:moleType});return;
  }
  if(gameMode==='sudoku'){
    strokeCleanup?.();strokeCleanup=null;
    cardStrokeCleanup?.();cardStrokeCleanup=null;cardStrokeKey=null;cardStrokeView=null;
    $('#card-face').replaceChildren();
    for(const id of ['#extension-toggle','#extension-hint','#extension'])$(id).hidden=true;
    $('#mode-label').textContent=sudokuPool.label;
    $('#progress').textContent=sudokuState?`${getSudokuProgress(sudokuState).filled} / ${getSudokuProgress(sudokuState).totalBlanks}`:'准备';
    $('#round-caption').textContent='简单关 · 9词 · 9×9';
    sudokuView.update({state:sudokuState,candidates:sudokuPool.words,selectedIds:sudokuSelectedIds,label:sudokuPool.label,note:sudokuPool.note,availableLessons:sudokuPool.availableLessons});
    return;
  }
  if(gameMode==='workshop') {
    strokeCleanup?.();strokeCleanup=null;
    cardStrokeCleanup?.();cardStrokeCleanup=null;cardStrokeKey=null;cardStrokeView=null;
    $('#card-face').replaceChildren();
    renderWorkshop();return;
  }
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
    const numberOnly = selection.source === 'paradise' && selection.stage === '1A' && selection.scope === 'lesson' && selection.lesson === 3;
    trainView.update(session, numberOnly ? {
      emptyMessage:'本课以数字认读为主，教材没有可供排句的完整句。可切换“识字翻翻乐”练习数字，或选择其他课。',
      emptyAction:{label:'选择其他课',run:()=>$('#lesson').focus()},
    } : undefined);return;
  }
  const face = $("#card-face");
  $('#pinyin').closest('label').hidden = gameMode !== 'train';
  const writingKey = active && revealed && gameMode === 'flip' ? JSON.stringify([q.id,q.character,q.strokeCount,q.radical]) : null;
  if (writingKey !== cardStrokeKey) {
    cardStrokeCleanup?.();
    cardStrokeCleanup = null; cardStrokeView = null; cardStrokeKey = writingKey;
  }
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
    if (revealed || (gameMode !== 'flip' && showPinyin)) face.append(el("div", q.pinyin, "pinyin"));
    if (writingKey) {
      if (!cardStrokeView) {
        cardStrokeView = el('div', undefined, 'hanzi hanzi-writing');
        cardStrokeView.id = 'card-strokes';
        cardStrokeCleanup = mountStrokes(cardStrokeView, q, {inline:true, autoplay:true, delay:matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700});
      }
      face.append(cardStrokeView);
    } else face.append(el("div", q.character, "hanzi"));
    if (revealed) {
      const words = el("div", undefined, "words");
      q.words.forEach((word) => words.append(el("span", word)));
      face.append(words);
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
        if (gameMode === 'workshop') { workshopState = createWorkshopState(session,{wordCount:workshopCount}); workshopRound++; }
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
  scene.setCharacter(active && !writingKey ? q.character : null);
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
  if(gameMode==='workshop')return;
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
  if(gameMode==='workshop')return;
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
$('#workshop-count').onchange=event=>{
  if(!mayRestart()){event.target.value=String(workshopCount);return;}
  workshopCount=Number(event.target.value);newRound();
};
$('#mole-content').onchange=event=>{
  if(!mayRestart()){event.target.value=moleType;return;}
  moleType=event.target.value;newRound();
};
$("#restart").onclick = () => {
  if (mayRestart()) newRound();
};
for (const [id, key] of [['bank-source','source'],['stage','stage'],['scope','scope'],['lesson','lesson']]) {
  $(`#${id}`).onchange = event => {
    if (!homeMode&&!mayRestart()) { syncSelection(); return; }
    if(!homeMode)journey.pause();
    selection = {...selection, [key]:key === 'lesson' ? Number(event.target.value) : event.target.value};
    if (key === 'source') {
      selection.stage = (homeMode||gameMode==='explore'?explorationStages:stagesForTextbook)(textbookForSource(selection.source))[0];
      selection.lesson = (homeMode||gameMode==='explore'?explorationCourses:coursesForTextbook)(textbookForSource(selection.source)).find(c=>c.stage===selection.stage)?.lesson??1;
    }
    if (key === 'stage') selection.lesson = (homeMode||gameMode==='explore'?explorationCourses:coursesForTextbook)(textbookForSource(selection.source)).find(c=>c.stage===selection.stage)?.lesson??1;
    if ((key === 'stage' || key === 'source')&&!optionalPinyinModes.has(gameMode)) {
      showPinyin = (selection.source !== 'personal' ? Number(selection.stage[0]) : grade) <= 2;
      $('#pinyin').checked = showPinyin;
    }
    syncSelection();
    if(homeMode){journey.refresh();return;}
    newRound();
  };
}
$('#add-textbook').onclick = () => {
  if (!mayRestart()) return;
  editor.addTextbook(() => {
    if (selection.source === 'personal') selection = {...selection, source: 'paradise', stage: '1A', lesson: 1};
    syncSelection();
    newRound();
  });
};
$("#grade").onchange = (event) => {
  if(homeMode){grade=Number(event.target.value);syncSelection();journey.refresh();return;}
  if (!mayRestart()) {
    event.target.value = grade;
    return;
  }
  grade = Number(event.target.value);
  journey.pause();
  if(!optionalPinyinModes.has(gameMode))showPinyin = grade <= 2;
  $("#pinyin").checked = showPinyin;
  newRound();
};
$("#pinyin").onchange = (event) => {
  showPinyin = event.target.checked;
  render();
};
$("#open-bank").onclick = () => {concealPoison();editor.open();};
$("#open-help").onclick = () => {concealPoison();$("#help-dialog").showModal();};
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
  if(homeMode)return;
  if(isConstruction(gameMode))return;
  if(gameMode==='sudoku'||gameMode==='explore'||gameMode==='mole'||gameMode==='poison'||gameMode==='building'||gameMode==='maze')return;
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
const entryParams=new URLSearchParams(window.location.search);
const requestedMode=entryParams.get('mode');
const linkedSelection={source:entryParams.get('source'),stage:entryParams.get('stage'),scope:'lesson',lesson:Number(entryParams.get('lesson'))};
const linkedGrade=Number(entryParams.get('grade'));
const validLinked=['personal','textbook','paradise','zhongwen'].includes(linkedSelection.source)&&(linkedSelection.source==='personal'||explorationCourses(textbookForSource(linkedSelection.source)).some(c=>c.stage===linkedSelection.stage&&c.lesson===linkedSelection.lesson));
if(validLinked){selection=linkedSelection;if(linkedGrade>=1&&linkedGrade<=4)grade=linkedGrade;}
function openEntryGame(){
 if(requestedMode==='explore')switchMode('explore',validLinked?linkedSelection:undefined);
 else if(GAME_ORDER.some(g=>g.id===requestedMode)){if(validLinked)switchMode(requestedMode,selection,true);else if(requestedMode==='flip')render();else switchMode(requestedMode);}
 else journey.open();
}
if(entryParams.has('journey')){if(!journey.restore(entryParams.get('journey')))openEntryGame();}
else openEntryGame();
if(entryParams.get('islandMap')==='1')journey.open();
