import {createPrizeRecordStore, prizeBalance, PRIZE_RECORD_KEY} from './prize-record-store.js';
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
  const toggle = node('button', 'Prize Record');
  toggle.id = 'open-prize-record';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'prize-record');
  toggle.setAttribute('aria-expanded', 'false');
  app.querySelector('.site-header nav').prepend(toggle);
  const panel = node('dialog', undefined, 'prize-panel');
  panel.id = 'prize-record';
  panel.tabIndex = -1;
  panel.setAttribute('aria-labelledby', 'prize-record-title');
  panel.innerHTML = `
    <header class="prize-heading">
      <div><h2 id="prize-record-title">Prize Record</h2><p>集满 10 个章，换一份小礼物。</p></div>
      <button type="button" id="close-prize-record" aria-label="收起集章表">×</button>
    </header>
    <div class="prize-body">
      <p class="prize-storage-note">自动保存在当前浏览器</p>
      <p id="prize-warning" class="prize-warning" role="alert" hidden></p>
      <div id="prize-class-controls" class="prize-class-controls" hidden>
        <label for="prize-class">班级</label>
        <select id="prize-class" aria-label="集章班级"></select>
        <details class="prize-class-tools"><summary>班级管理</summary>
          <button type="button" data-action="rename-class">修改班级名</button>
          <button type="button" data-action="remove-class" class="prize-delete">删除班级</button>
        </details>
      </div>
      <details id="prize-new-class"><summary>添加班级</summary>
        <form id="prize-class-form">
          <label for="prize-class-name">班级名称</label>
          <input id="prize-class-name" name="class-name" required placeholder="例如：周六下午班" autocomplete="off">
          <button type="submit" class="primary">添加班级</button>
        </form>
      </details>
      <details id="prize-new-students" hidden><summary>添加学生</summary>
      <form id="prize-student-form">
        <label for="prize-student-names">学生姓名</label>
        <textarea id="prize-student-names" name="student-names" rows="2" required placeholder="每行一个姓名，也可用逗号分隔"></textarea>
        <button type="submit">添加学生</button>
      </form></details>
      <div id="prize-roster-tools" class="prize-roster-tools" hidden>
        <p id="prize-roster-count"></p>
        <input type="search" id="prize-search" aria-label="查找学生" placeholder="查找学生" autocomplete="off">
      </div>
      <div id="prize-students" class="prize-students"></div>
      <p id="prize-message" class="prize-message" role="status" aria-live="polite"></p>
    </div>`;
  shell.append(panel);
  const find = selector => panel.querySelector(selector);
  const classSelect = find('#prize-class');
  const namesInput = find('#prize-student-names');
  const classInput = find('#prize-class-name');
  const search = find('#prize-search');
  const students = find('#prize-students');
  const message = find('#prize-message');
  const wide = window.matchMedia('(min-width: 1200px)');
  let home = false;
  let homeExpanded = true;
  let busy = false;

  function currentClass() {
    const {record} = store.get();
    return record.classes.find(group => group.id === record.selectedClassId);
  }

  function button(text, action, studentId) {
    const result = node('button', text);
    result.type = 'button';
    result.dataset.action = action;
    if (studentId) result.dataset.studentId = studentId;
    return result;
  }

  function studentCard(student) {
    const {stamps, gifts} = prizeBalance(student);
    const card = node('article', undefined, 'prize-student');
    card.dataset.studentId = student.id;
    card.setAttribute('aria-label', student.name + '的集章记录');
    const heading = node('div', undefined, 'prize-student-heading');
    heading.append(node('h3', student.name), node('strong', stamps + ' 个章', 'prize-balance'));
    const marks = node('div', undefined, 'prize-stamps');
    marks.setAttribute('role', 'img');
    marks.setAttribute('aria-label', `已积攒 ${stamps} 个章，满 10 个可兑换礼物`);
    for (let index = 0; index < 10; index++) {
      const mark = node('span', index < stamps ? '棒' : '', index < stamps ? 'prize-stamp is-filled' : 'prize-stamp');
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
    if (gifts) card.append(node('p', `已兑换 ${gifts} 份礼物`, 'prize-gifts'));
    const details = node('details', undefined, 'prize-student-details');
    details.append(node('summary', '记录与管理'));
    if (student.history.length) {
      const history = node('ol', undefined, 'prize-history');
      for (const event of [...student.history].reverse()) {
        const entry = node('li');
        const time = node('time', dateFormat.format(new Date(event.at)));
        time.dateTime = event.at;
        entry.append(node('span', reasonLabels[event.kind]), time);
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
      students.append(node('p', '先添加班级，再填写学生姓名。', 'prize-empty'));
      return;
    }
    const matching = group.students.filter(student => student.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()));
    for (const student of matching) {
      const card = studentCard(student);
      card.querySelector('details').open = openIds.has(student.id);
      students.append(card);
    }
    if (!matching.length) students.append(node('p', group.students.length ? '没有找到这个姓名。' : '添加学生后，就可以盖章啦。', 'prize-empty'));
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
    find('#prize-roster-count').textContent = `${group?.students.length ?? 0} 位同学`;
    find('#prize-warning').textContent = warning;
    find('#prize-warning').hidden = !warning;
    renderStudents();
  }

  async function update(action, success) {
    if (busy) return false;
    busy = true;
    panel.setAttribute('aria-busy', 'true');
    try {
      await store.update(action);
      message.textContent = success;
      return true;
    } catch (error) {
      message.textContent = error.message;
      return false;
    } finally {
      busy = false;
      panel.removeAttribute('aria-busy');
    }
  }

  function close() {
    if (home && wide.matches) homeExpanded = false;
    panel.close();
    toggle.focus({preventScroll:true});
  }

  function show() {
    if (home && wide.matches) homeExpanded = true;
    panel.classList.toggle('is-docked', home && wide.matches);
    shell.classList.toggle('prize-open', home && wide.matches);
    if (home && wide.matches) {
      const previous = document.activeElement;
      panel.show();
      if (previous && previous !== document.body) previous.focus({preventScroll:true});
      else panel.focus({preventScroll:true});
      shell.classList.add('prize-open');
    } else panel.showModal();
    toggle.setAttribute('aria-expanded', 'true');
  }

  toggle.addEventListener('click', () => panel.open ? close() : show());
  find('#close-prize-record').addEventListener('click', close);
  panel.addEventListener('close', () => {
    if (panel.open) return;
    shell.classList.remove('prize-open');
    toggle.setAttribute('aria-expanded', 'false');
  });
  panel.addEventListener('click', event => {
    if (event.target === panel && !panel.classList.contains('is-docked')) {
      const box = panel.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    }
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
    if (type === 'homework' || type === 'participation') {
      action.type = 'award';
      action.kind = type;
      notice = `${student.name} · ${reasonLabels[type]} +1`;
    } else if (type.startsWith('rename-')) {
      const name = window.prompt(type === 'rename-class' ? '班级名称' : '学生姓名', student?.name ?? group.name);
      if (name === null) return;
      action.name = name;
    } else if (type.startsWith('remove-')) {
      const label = student?.name ?? group.name;
      if (!window.confirm(`删除「${label}」及其集章记录？`)) return;
    } else if (type === 'redeem') {
      notice = `${student.name} 已兑换 1 份礼物。`;
    } else if (type === 'undo') notice = '已撤回上次记录。';
    update(action, notice);
  });
  window.addEventListener('storage', event => {
    if (event.key === PRIZE_RECORD_KEY || event.key === null) store.refresh();
  });
  wide.addEventListener('change', () => {
    if (!home || !panel.open) return;
    panel.close();
    show();
  });
  store.subscribe(render);
  render(store.get());
  return {
    setHome(visible) {
      home = visible;
      shell.classList.toggle('prize-home', visible);
      if (panel.open) panel.close();
      if (visible && wide.matches && homeExpanded) show();
    },
  };
}
