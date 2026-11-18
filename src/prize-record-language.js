import {ruby, gloss} from './ruby.js';

const PREFERENCE_KEY = 'hanzi-flip.prize-record-display.v1';
const COPY = {
  '奖励记录': ['Jiǎnglì jìlù', 'Prize Record'],
  '集满 10 个章，换一份小礼物。': ['Jí mǎn 10 gè zhāng, huàn yí fèn xiǎo lǐwù.', 'Collect 10 stamps to receive a small gift.'],
  '关闭': ['Guānbì', 'Close'],
  '自动保存在当前浏览器': ['Zìdòng bǎocún zài dāngqián liúlǎnqì', 'Saved automatically in this browser'],
  '班级': ['Bānjí', 'Class'],
  '班级管理': ['Bānjí guǎnlǐ', 'Manage class'],
  '修改班级名': ['Xiūgǎi bānjí míng', 'Rename class'],
  '删除班级': ['Shānchú bānjí', 'Delete class'],
  '添加班级': ['Tiānjiā bānjí', 'Add class'],
  '班级名称': ['Bānjí míngchēng', 'Class name'],
  '例如周六下午班': ['Lìrú zhōuliù xiàwǔ bān', 'For example, Saturday afternoon class'],
  '添加学生': ['Tiānjiā xuésheng', 'Add students'],
  '学生姓名': ['Xuésheng xìngmíng', 'Student names'],
  '每行一个姓名，也可用逗号分隔。': ['Měi háng yí ge xìngmíng, yě kě yòng dòuhào fēngé.', 'Enter one name per line, or separate names with commas.'],
  '查找学生': ['Cházhǎo xuésheng', 'Find a student'],
  '{count} 位同学': ['{count} wèi tóngxué', '{count} student{plural}'],
  '{count} 个章': ['{count} gè zhāng', '{count} stamp{plural}'],
  '作业 +1': ['Zuòyè +1', 'Homework +1'],
  '表现 +1': ['Biǎoxiàn +1', 'Class participation +1'],
  '兑换 1 份礼物': ['Duìhuàn 1 fèn lǐwù', 'Redeem 1 gift'],
  '已兑换 {count} 份礼物': ['Yǐ duìhuàn {count} fèn lǐwù', '{count} gift{plural} redeemed'],
  '记录与管理': ['Jìlù yǔ guǎnlǐ', 'History and settings'],
  '完成作业': ['Wánchéng zuòyè', 'Homework completed'],
  '课堂表现': ['Kètáng biǎoxiàn', 'Class participation'],
  '兑换礼物': ['Duìhuàn lǐwù', 'Gift redeemed'],
  '撤回上次兑换': ['Chèhuí shàng cì duìhuàn', 'Undo last redemption'],
  '撤回上次盖章': ['Chèhuí shàng cì gàizhāng', 'Undo last stamp'],
  '修改姓名': ['Xiūgǎi xìngmíng', 'Edit name'],
  '删除学生': ['Shānchú xuésheng', 'Delete student'],
  '先添加班级，再填写学生姓名。': ['Xiān tiānjiā bānjí, zài tiánxiě xuésheng xìngmíng.', 'Add a class, then enter the student names.'],
  '没有找到这个姓名。': ['Méiyǒu zhǎodào zhè ge xìngmíng.', 'No matching name found.'],
  '添加学生后，就可以盖章啦。': ['Tiānjiā xuésheng hòu, jiù kěyǐ gàizhāng la.', 'Add students to start collecting stamps.'],
  '班级已保存。': ['Bānjí yǐ bǎocún.', 'Class saved.'],
  '学生姓名已保存。': ['Xuésheng xìngmíng yǐ bǎocún.', 'Student names saved.'],
  '记录已更新。': ['Jìlù yǐ gēngxīn.', 'Record updated.'],
  '{name} · 完成作业 +1': ['{name} · wánchéng zuòyè +1', '{name} · Homework +1'],
  '{name} · 课堂表现 +1': ['{name} · kètáng biǎoxiàn +1', '{name} · Class participation +1'],
  '{name} 已兑换 1 份礼物。': ['{name} yǐ duìhuàn 1 fèn lǐwù.', '{name} redeemed 1 gift.'],
  '已撤回上次记录。': ['Yǐ chèhuí shàng cì jìlù.', 'Last action undone.'],
  '删除「{name}」及其集章记录？': ['Shānchú “{name}” jí qí jízhāng jìlù?', 'Delete “{name}” and its stamp records?'],
  '拼音': ['Pīnyīn', 'Pinyin'],
  '请填写名称。': ['Qǐng tiánxiě míngchēng.', 'Please enter a name.'],
  '班级已变更，请重新选择。': ['Bānjí yǐ biàngēng, qǐng chóngxīn xuǎnzé.', 'The class has changed. Please select it again.'],
  '请填写学生姓名。': ['Qǐng tiánxiě xuésheng xìngmíng.', 'Please enter student names.'],
  '学生记录已变更，请重新选择。': ['Xuésheng jìlù yǐ biàngēng, qǐng chóngxīn xuǎnzé.', 'The student record has changed. Please select it again.'],
  '请选择盖章原因。': ['Qǐng xuǎnzé gàizhāng yuányīn.', 'Please select a reason for the stamp.'],
  '集满 10 个章后可以兑换礼物。': ['Jí mǎn 10 gè zhāng hòu kěyǐ duìhuàn lǐwù.', 'Collect 10 stamps before redeeming a gift.'],
  '无法识别这项操作。': ['Wúfǎ shíbié zhè xiàng cāozuò.', 'This action could not be recognized.'],
  '记录未能保存，请重试。': ['Jìlù wèi néng bǎocún, qǐng chóngshì.', 'The record could not be saved. Please try again.'],
  '已存记录无法读取，新增操作暂存在本页。': ['Yǐ cún jìlù wúfǎ dúqǔ, xīnzēng cāozuò zàn cún zài běn yè.', 'Saved records could not be read. New actions are kept temporarily on this page.'],
  '浏览器未能保存，记录暂存在本页。': ['Liúlǎnqì wèi néng bǎocún, jìlù zàn cún zài běn yè.', 'The browser could not save the records. They are kept temporarily on this page.'],
};
function fill(text, values) {
  const replacements = {...values, plural:values.count === 1 ? '' : 's'};
  return text.replace(/\{(\w+)\}/gu, (_, key) => String(replacements[key] ?? ''));
}

function pronounce(chinese, reading) {
  const phrases = chinese.match(/[^，。！？；]+[，。！？；]?/gu) ?? [chinese];
  const readings = reading.match(/[^,.!?;]+[,.!?;]?/gu) ?? [reading];
  if (phrases.length !== readings.length || phrases.length === 1) return ruby(chinese, reading);
  const fragment = document.createDocumentFragment();
  phrases.forEach((phrase, index) => fragment.append(ruby(phrase, readings[index].trim())));
  return fragment;
}

export function createPrizeLanguage(root) {
  let preferences = {pinyin:false, english:false};
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCE_KEY));
    if (saved) preferences = {pinyin:saved.pinyin === true, english:saved.english === true};
  } catch { /* Display options remain usable when storage is unavailable. */ }

  function paint(element) {
    const source = element.dataset.prizeText;
    const values = JSON.parse(element.dataset.prizeValues ?? '{}');
    const chinese = fill(source, values);
    const [reading, english] = COPY[source] ?? [];
    element.replaceChildren(preferences.pinyin && reading ? pronounce(chinese, fill(reading, values)) : chinese);
    if (preferences.english && english && !element.hasAttribute('data-prize-hide-english')) element.append(gloss(fill(english, values)));
    if (element.matches('button, summary')) element.setAttribute('aria-label', chinese);
  }

  for (const element of root.querySelectorAll('[data-prize-text]')) paint(element);
  return {
    get: () => ({...preferences}),
    set(element, source, values = {}) {
      element.dataset.prizeText = source;
      element.dataset.prizeValues = JSON.stringify(values);
      paint(element);
      return element;
    },
    change(key, enabled) {
      preferences[key] = enabled;
      try { localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences)); } catch { /* Keep the choice for this page. */ }
      for (const element of root.querySelectorAll('[data-prize-text]')) paint(element);
    },
    prompt(source, values = {}) {
      const [reading, english] = COPY[source] ?? [];
      return [
        preferences.pinyin && reading ? fill(reading, values) : '',
        fill(source, values),
        preferences.english && english ? fill(english, values) : '',
      ].filter(Boolean).join('\n');
    },
  };
}
