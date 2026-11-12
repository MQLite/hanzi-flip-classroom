import {GAME_ORDER} from './game-order.js';
import {filterCurriculum,textbookForSource} from './curriculum.js';
import {getMolePool} from './mole-vocabulary.js';
import {getPoisonChallengePool} from './poison-vocabulary.js';
import {getConstructionPool} from './construction-data.js';
import {getSudokuCandidates} from './sudoku-vocabulary.js';
import {matchingExplorations} from './exploration.js';
import {createWorkshopState} from './workshop-core.js';
import {getZhongwenTrainQuestions} from './zhongwen-train.js';
import {getParadiseTrainQuestions} from './paradise-train.js';
import {resolveTrainQuestion} from './sentence-train-data.js';
export function journeyQuestions(selection,questions,grade=1){
 return selection.source==='personal'?questions.filter(q=>!q.textbook&&q.grade===grade):filterCurriculum(questions,{...selection,scope:'lesson',textbook:textbookForSource(selection.source)});
}
export function getJourneyAvailability(selection,bank,grade=1){
 const questions=Array.isArray(bank)?bank:bank.questions,scope={...selection,grade,scope:'lesson'};
 const scoped=journeyQuestions(scope,questions,grade),mixed=getMolePool({...scope,type:'mixed'},questions),chars=getMolePool({...scope,type:'characters'},questions),construction=getConstructionPool(scope,questions,grade);
 const train=[...(selection.source==='zhongwen'?getZhongwenTrainQuestions(scope):selection.source==='paradise'?getParadiseTrainQuestions(scope):[]),...scoped.map(resolveTrainQuestion).filter(Boolean)];
 const poison=getPoisonChallengePool(scope,questions);
 const flags={flip:scoped.length>0,mole:mixed.words.length>0,maze:chars.words.length>0,puzzle:construction.puzzles.length>0,strokes:construction.characters.length>0,
  workshop:createWorkshopState({questions:scoped},{random:()=>.5}).phase!=='empty',poison:poison.words.length>=2&&poison.translations.length>=2,building:mixed.words.length>0,sudoku:getSudokuCandidates(scope,questions).words.length>=9,train:train.length>0,explore:matchingExplorations(scope).length>0};
 const reasons={puzzle:'本课暂无可科学拆分的合体字',strokes:'本课暂无已核对笔画数据',poison:poison.words.length<2?'本课不足2个生字':'本课不足2个可翻译的词语',sudoku:'本课不足9个数独字词',train:'本课暂无句子练习',explore:'本课暂未设置情景探索'};
 return GAME_ORDER.map(g=>({...g,available:flags[g.id],reason:flags[g.id]?'':reasons[g.id]??'本课暂无相应字词'}));
}
export function isJourneyStageComplete(mode,m={}){
 switch(mode){
 case 'flip':return m.session?.phase==='complete';
 case 'mole':return m.moleState?.phase==='complete'&&!m.moleState.holes?.some(h=>h?.status==='hit');
 case 'maze':return m.mazeState?.phase==='complete';
 case 'puzzle':return Boolean(m.puzzleState?.targets.length&&m.puzzleState.targets.every(t=>m.puzzleState.found.includes(t.character)));
 case 'strokes':{const s=m.strokeInputMode==='write'?m.handwritingState:m.strokeState;return Boolean(s?.characters.length&&s.characters.every(c=>s.completed.includes(c.character)));}
 case 'workshop':return m.workshopState?.phase==='complete'&&!m.workshopTransition;
 case 'poison':return m.poisonWon===true;
 case 'building':return ['restored','cleared'].includes(m.buildingState?.phase)||m.buildingState?.phase==='built'&&!m.buildingState.sentence;
 case 'sudoku':return m.sudokuState?.phase==='complete';
 case 'train':return m.session?.phase==='complete'&&!m.session.departure;
 case 'explore':return m.explorationComplete===true;
 default:return false;
 }
}
