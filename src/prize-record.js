import {createPrizeRecordStore, prizeBalance, PRIZE_RECORD_KEY} from './prize-record-store.js';
import {createPrizeLanguage} from './prize-record-language.js';
import './prize-record.css';

const reasonLabels = {homework:'完成作业', participation:'课堂表现', redeem:'兑换礼物'};
const dateFormat = new Intl.DateTimeFormat('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'});
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};

export function mountPrizeRecord(app) {
  const store = createPrizeRecordStore();
  const shell = node('div', undefined, 'prize-shell');
  const main = app.querySelector('main');
  main.before(shell);
  shell.append(main);
  const toggle = node('button');
  const toggleText = node('span');
  toggleText.dataset.prizeHideEnglish = 'true';
  toggle.append('Prize Record · ', toggleText);
  toggle.setAttribute('aria-label', 'Prize Record · 奖励记录');
  toggle.id = 'open-prize-record';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'prize-record');
  toggle.setAttribute('aria-expanded', 'false');
  app.querySelector('.site-header nav').prepend(toggle);
  const panel = node('dialog', undefined, 'prize-panel');
  panel.id = 'prize-record';
  panel.tabIndex = -1;
  panel.setAttribute('aria-label', 'Prize Record · 奖励记录');
  panel.innerHTML = `
    <header class="prize-heading">
      <div><span class="prize-title-en" lang="en">Prize Record</span><h2 id="prize-record-title" data-prize-text="奖励记录"></h2>
        <p data-prize-text="集满 10 个章，换一份小礼物。"></p></div>
      <button type="button" id="close-prize-record" data-prize-text="关闭"></button>
    </header>
    <div class="prize-body">
      <aside class="prize-classroom-tools">
      <p class="prize-storage-note" data-prize-text="自动保存在当前浏览器"></p>
      <p id="prize-warning" class="prize-warning" role="alert" hidden></p>
      <div id="prize-class-controls" class="prize-class-controls" hidden>
        <label for="prize-class" data-prize-text="班级"></label>
        <select id="prize-class" aria-label="集章班级"></select>
        <details class="prize-class-tools"><summary data-prize-text="班级管理"></summary>
          <button type="button" data-action="rename-class" data-prize-text="修改班级名"></button>
          <button type="button" data-action="remove-class" class="prize-delete" data-prize-text="删除班级"></button>
        </details>
      </div>
      <details id="prize-new-class"><summary data-prize-text="添加班级"></summary>
        <form id="prize-class-form">
          <label for="prize-class-name" data-prize-text="班级名称"></label>
          <input id="prize-class-name" name="class-name" aria-label="班级名称" required autocomplete="off">
          <small class="prize-field-hint" data-prize-text="例如周六下午班"></small>
          <button type="submit" class="primary" data-prize-text="添加班级"></button>
        </form>
      </details>
      <details id="prize-new-students" hidden><summary data-prize-text="添加学生"></summary>
      <form id="prize-student-form">
        <label for="prize-student-names" data-prize-text="学生姓名"></label>
        <textarea id="prize-student-names" name="student-names" aria-label="学生姓名" rows="2" required aria-describedby="prize-name-hint"></textarea>
        <small id="prize-name-hint" class="prize-field-hint" data-prize-text="每行一个姓名，也可用逗号分隔。"></small>
        <button type="submit" data-prize-text="添加学生"></button>
      </form></details></aside>
      <section class="prize-roster">
      <div id="prize-roster-tools" class="prize-roster-tools" hidden>
        <p id="prize-roster-count"></p>
        <div><label for="prize-search" data-prize-text="查找学生"></label>
          <input type="search" id="prize-search" aria-label="查找学生" autocomplete="off"></div>
      </div>
      <div id="prize-students" class="prize-students"></div>
      <p id="prize-message" class="prize-message" role="status" aria-live="polite"></p>
      </section>
    </div>
    <footer class="prize-language-options">
      <label><input id="prize-show-pinyin" type="checkbox" aria-label="奖励记录拼音"><span data-prize-text="拼音"></span></label>
      <label><input id="prize-show-english" type="checkbox" aria-label="奖励记录英语"><span lang="en">English</span></label>
    </footer>`;
  shell.append(panel);
  const language = createPrizeLanguage(panel);
  language.set(toggleText, '奖励记录');
  const find = selector => panel.querySelector(selector);
  const classSelect = find('#prize-class');
  const namesInput = find('#prize-student-names');
  const classInput = find('#prize-class-name');
  const search = find('#prize-search');
  const students = find('#prize-students');
  const message = find('#prize-message');
  let busy = false;

  function currentClass() {
    const {record} = store.get();
    return record.classes.find(group => group.id === record.selectedClassId);
  }

  function button(text, action, studentId) {
    const result = copy('button', text);
    result.type = 'button';
    result.dataset.action = action;
    if (studentId) result.dataset.studentId = studentId;
    return result;
  }

  function copy(tag, text, className, values) {
    return language.set(node(tag, undefined, className), text, values);
  }

  function studentCard(student) {
    const {stamps, gifts} = prizeBalance(student);
    const card = node('article', undefined, 'prize-student');
    card.dataset.studentId = student.id;
    card.setAttribute('aria-label', student.name + '的集章记录');
    const heading = node('div', undefined, 'prize-student-heading');
    heading.append(node('h3', student.name), copy('strong', '{count} 个章', 'prize-balance', {count:stamps}));
    const marks = node('div', undefined, 'prize-stamps');
    marks.setAttribute('role', 'img');
    marks.setAttribute('aria-label', `已积攒 ${stamps} 个章，满 10 个可兑换礼物`);
    for (let index = 0; index < 10; index++) {
      const mark = node('span', index < stamps ? '★' : '', index < stamps ? 'prize-stamp is-filled' : 'prize-stamp');
      mark.setAttribute('aria-hidden', 'true');
      marks.append(mark);
    }
    const actions = node('div', undefined, 'prize-stamp-actions');
    actions.append(button('作业 +1', 'homework', student.id), button('表现 +1', 'participation', student.id));
    card.append(heading, marks, actions);
    if (stamps >= 10) {
      const redeem = button('兑换 1 份礼物', 'redeem', student.id);
      redeem.className = 'prize-redeem';
      card.append(redeem);
    }
    if (gifts) card.append(copy('p', '已兑换 {count} 份礼物', 'prize-gifts', {count:gifts}));
    const details = node('details', undefined, 'prize-student-details');
    details.append(copy('summary', '记录与管理'));
    if (student.history.length) {
      const history = node('ol', undefined, 'prize-history');
      for (const event of [...student.history].reverse()) {
        const entry = node('li');
        const time = node('time', dateFormat.format(new Date(event.at)));
        time.dateTime = event.at;
        entry.append(copy('span', reasonLabels[event.kind]), time);
        history.append(entry);
      }
      const undo = button(student.history.at(-1).kind === 'redeem' ? '撤回上次兑换' : '撤回上次盖章', 'undo', student.id);
      details.append(undo, history);
    }
    const manage = node('div', undefined, 'prize-manage-student');
    const remove = button('删除学生', 'remove-student', student.id);
    remove.className = 'prize-delete';
    manage.append(button('修改姓名', 'rename-student', student.id), remove);
    details.append(manage);
    card.append(details);
    return card;
  }

  function renderStudents() {
    const group = currentClass();
    const openIds = new Set([...students.querySelectorAll('.prize-student:has(details[open])')].map(card => card.dataset.studentId));
    const focused = students.contains(document.activeElement) ? {...document.activeElement.dataset} : null;
    students.replaceChildren();
    if (!group) {
      students.append(copy('p', '先添加班级，再填写学生姓名。', 'prize-empty'));
      return;
    }
    const matching = group.students.filter(student => student.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()));
    for (const student of matching) {
      const card = studentCard(student);
      card.querySelector('details').open = openIds.has(student.id);
      students.append(card);
    }
    if (!matching.length) students.append(copy('p', group.students.length ? '没有找到这个姓名。' : '添加学生后，就可以盖章啦。', 'prize-empty'));
    if (focused) {
      const target = [...students.querySelectorAll('button')].find(item => item.dataset.action === focused.action && item.dataset.studentId === focused.studentId);
      target?.focus({preventScroll:true});
    }
  }

  function render({record, warning}) {
    const group = currentClass();
    const options = record.classes.map(item => {
      const option = node('option', item.name);
      option.value = item.id;
      return option;
    });
    classSelect.replaceChildren(...options);
    classSelect.value = record.selectedClassId;
    find('#prize-class-controls').hidden = !group;
    find('#prize-new-class').open = !record.classes.length || find('#prize-new-class').open;
    find('#prize-new-students').hidden = !group;
    if (group && !group.students.length) find('#prize-new-students').open = true;
    find('#prize-roster-tools').hidden = !group?.students.length;
    language.set(find('#prize-roster-count'), '{count} 位同学', {count:group?.students.length ?? 0});
    language.set(find('#prize-warning'), warning);
    find('#prize-warning').hidden = !warning;
    renderStudents();
  }

  async function update(action, success, values = {}) {
    if (busy) return false;
    busy = true;
    panel.setAttribute('aria-busy', 'true');
    try {
      await store.update(action);
      language.set(message, success, values);
      return true;
    } catch (error) {
      language.set(message, error.message);
      return false;
    } finally {
      busy = false;
      panel.removeAttribute('aria-busy');
    }
  }

  function close() {
    panel.close();
    toggle.focus({preventScroll:true});
  }

  function show() {
    panel.showModal();
    toggle.setAttribute('aria-expanded', 'true');
  }

  toggle.addEventListener('click', () => panel.open ? close() : show());
  find('#close-prize-record').addEventListener('click', close);
  panel.addEventListener('close', () => {
    if (panel.open) return;
    toggle.setAttribute('aria-expanded', 'false');
  });
  panel.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.repeat && event.target.closest('button') && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  });
  classSelect.addEventListener('change', () => {
    search.value = '';
    update({type:'select-class', classId:classSelect.value}, '');
  });
  find('#prize-class-form').addEventListener('submit', async event => {
    event.preventDefault();
    search.value = '';
    if (await update({type:'add-class', name:classInput.value}, '班级已保存。')) {
      classInput.value = '';
      find('#prize-new-class').open = false;
      namesInput.focus({preventScroll:true});
    }
  });
  find('#prize-student-form').addEventListener('submit', async event => {
    event.preventDefault();
    search.value = '';
    if (await update({type:'add-students', classId:currentClass()?.id, names:namesInput.value}, '学生姓名已保存。')) {
      namesInput.value = '';
      find('#prize-new-students').open = false;
    }
  });
  search.addEventListener('input', renderStudents);
  panel.addEventListener('click', event => {
    const control = event.target.closest('[data-action]');
    if (!control || busy) return;
    const group = currentClass();
    if (!group) return;
    const student = group.students.find(item => item.id === control.dataset.studentId);
    const type = control.dataset.action;
    const action = {type, classId:group.id, studentId:student?.id};
    let notice = '记录已更新。';
    const values = {name:student?.name ?? group.name};
    if (type === 'homework' || type === 'participation') {
      action.type = 'award';
      action.kind = type;
      notice = type === 'homework' ? '{name} · 完成作业 +1' : '{name} · 课堂表现 +1';
    } else if (type.startsWith('rename-')) {
      const name = window.prompt(language.prompt(type === 'rename-class' ? '班级名称' : '学生姓名'), values.name);
      if (name === null) return;
      action.name = name;
    } else if (type.startsWith('remove-')) {
      if (!window.confirm(language.prompt('删除「{name}」及其集章记录？', values))) return;
    } else if (type === 'redeem') {
      notice = '{name} 已兑换 1 份礼物。';
    } else if (type === 'undo') notice = '已撤回上次记录。';
    update(action, notice, values);
  });
  window.addEventListener('storage', event => {
    if (event.key === PRIZE_RECORD_KEY || event.key === null) store.refresh();
  });
  for (const [id, key] of [['prize-show-pinyin', 'pinyin'], ['prize-show-english', 'english']]) {
    const input = find('#' + id);
    input.checked = language.get()[key];
    input.addEventListener('change', () => {
      language.change(key, input.checked);
      language.set(toggleText, '奖励记录');
    });
  }
  store.subscribe(render);
  render(store.get());
  return {
    setHome() {
      if (panel.open) panel.close();
    },
  };
}
