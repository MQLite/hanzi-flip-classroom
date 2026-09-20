import { validateBank, previewImport, exportBank } from "./storage.js";

export function downloadText(
  text,
  prefix = "汉字题库",
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createEditor({ store, getBank, onBank, defaults, notify }) {
  const dialog = document.createElement("dialog");
  dialog.className = "editor-dialog";
  dialog.setAttribute("aria-label", "题库管理");
  dialog.innerHTML = `<div class="dialog-heading"><div><span class="eyebrow">TEACHER'S NOTEBOOK</span><h2>我的汉字题库</h2><p>有效修改自动保存 · 当前课堂继续使用开局时的题目</p></div><button id="close-editor" aria-label="关闭题库" class="icon-button">×</button></div>
  <div class="bank-toolbar"><button id="add-question" class="primary">＋ 新增题目</button><button id="export-bank">导出题库</button><label class="button">导入题库<input type="file" id="import-file" accept=".json,application/json" hidden></label><button id="restore-bank">恢复默认题库</button></div>
  <div id="import-preview" class="notice" hidden></div><div id="bank-feedback" role="status"></div>
  <div class="editor-layout"><aside><div class="bank-filters"><input id="bank-search" aria-label="搜索汉字" placeholder="搜索汉字、拼音、组词"><select id="bank-grade" aria-label="筛选年级"><option value="">全部年级</option><option value="1">一年级</option><option value="2">二年级</option><option value="3">三年级</option><option value="4">四年级</option></select></div><p id="bank-count" class="muted"></p><div id="question-list"></div></aside>
  <section><p id="editor-empty" class="empty-editor">选一个汉字，开始备课。<br>也可以新增自己的课堂例句。</p><form id="question-form" hidden><div class="form-grid"><label>年级<select name="grade"><option value="1">一年级</option><option value="2">二年级</option><option value="3">三年级</option><option value="4">四年级</option></select></label><label>汉字<input name="character" required></label><label>拼音<input name="pinyin" required placeholder="例如：shān"></label><label>组词一<input name="word1" required></label><label>组词二<input name="word2" required></label><label class="wide">例句<textarea name="sentence" required rows="2"></textarea></label><label>笔画数（可选）<input name="strokeCount" type="number" min="1" step="1"></label><label>部首（可选）<input name="radical"></label><label>字形结构（可选）<input name="structure"></label><label class="wide">偏旁说明（可选）<textarea name="components" rows="2"></textarea></label></div><p class="muted">格式校验不代替教学核对。多音字请在例句中明确读音语境。</p><p id="save-status" role="status"></p><div class="form-actions"><button id="retry-save" type="button" hidden>重试保存</button><button id="export-pending" type="button" hidden>导出待保存题库</button><button id="delete-question" type="button" class="danger">删除这道题</button></div></form></section></div>`;
  document.body.append(dialog);
  const $ = (s) => dialog.querySelector(s),
    form = $("#question-form");
  let selected = null,
    dirty = false,
    pending = null,
    pendingSuccess = null,
    importGeneration = 0;
  const recovery = document.createElement("div");
  recovery.className = "form-actions";
  $("#bank-feedback").after(recovery);
  recovery.append($("#retry-save"), $("#export-pending"));
  function mayLeave() {
    if (!dirty) return true;
    if (!confirm("这份草稿尚未保存。放弃草稿并继续吗？")) return false;
    // Accepted abandonment ends both an edit draft and any failed bank operation.
    reset();
    return true;
  }
  function invalidateImport() {
    importGeneration++;
    $("#import-preview").hidden = true;
    $("#import-preview").replaceChildren();
  }
  function list() {
    const search = $("#bank-search").value.trim().toLowerCase(),
      grade = $("#bank-grade").value;
    const items = getBank().questions.filter(
      (q) =>
        (!grade || q.grade === Number(grade)) &&
        [q.character, q.pinyin, ...q.words]
          .join(" ")
          .toLowerCase()
          .includes(search),
    );
    $("#bank-count").textContent =
      `显示 ${items.length} 题 · 题库共 ${getBank().questions.length} 题`;
    const parent = $("#question-list");
    parent.replaceChildren();
    for (const q of items) {
      const b = document.createElement("button");
      b.className = "question-row" + (q.id === selected ? " selected" : "");
      const char = document.createElement("strong");
      char.textContent = q.character;
      const text = document.createElement("span");
      text.textContent = `${q.pinyin} · ${q.grade} 年级`;
      b.append(char, text);
      b.onclick = () => {
        if (mayLeave()) edit(q);
      };
      parent.append(b);
    }
  }
  function edit(q) {
    invalidateImport();
    selected = q.id;
    dirty = false;
    pending = null;
    pendingSuccess = null;
    form.hidden = false;
    $("#editor-empty").hidden = true;
    for (const name of [
      "grade",
      "character",
      "pinyin",
      "sentence",
      "strokeCount",
      "radical",
      "structure",
      "components",
    ])
      form.elements[name].value = q[name] ?? "";
    form.elements.word1.value = q.words?.[0] ?? "";
    form.elements.word2.value = q.words?.[1] ?? "";
    $("#save-status").textContent = getBank().questions.some(
      (x) => x.id === q.id,
    )
      ? "已保存 · 修改后自动保存"
      : "新题草稿 · 填写完整后自动保存";
    $("#retry-save").hidden = true;
    $("#export-pending").hidden = true;
    list();
  }
  function reset() {
    invalidateImport();
    selected = null;
    dirty = false;
    pending = null;
    pendingSuccess = null;
    $("#retry-save").hidden = true;
    $("#export-pending").hidden = true;
    $("#save-status").textContent = "";
    $("#bank-feedback").textContent = "";
    form.reset();
    form.hidden = true;
    $("#editor-empty").hidden = false;
    list();
  }
  function saveBank(bank, success) {
    const result = store.save(bank);
    if (result.ok) {
      onBank(result.bank || bank);
      dirty = false;
      pending = null;
      pendingSuccess = null;
      $("#retry-save").hidden = true;
      $("#export-pending").hidden = true;
      success?.();
      list();
      return true;
    }
    pending = bank;
    pendingSuccess = success;
    dirty = true;
    $("#save-status").textContent =
      "尚未保存：本地写入失败。请重试或导出待保存题库。";
    $("#bank-feedback").textContent = "保存未成功，原题库仍保留。";
    $("#retry-save").hidden = false;
    $("#export-pending").hidden = false;
    if (!dialog.open) dialog.showModal();
    return false;
  }
  function collect() {
    const f = form.elements;
    const q = {
      id: selected,
      grade: Number(f.grade.value),
      character: f.character.value,
      pinyin: f.pinyin.value,
      words: [f.word1.value, f.word2.value],
      sentence: f.sentence.value,
    };
    for (const key of ["radical", "structure", "components"])
      if (f[key].value.trim()) q[key] = f[key].value;
    if (f.strokeCount.value !== "") q.strokeCount = Number(f.strokeCount.value);
    return q;
  }
  form.addEventListener("input", (event) => {
    dirty = true;
    if (event.target.name === "character") {
      for (const key of ["strokeCount", "radical", "structure", "components"])
        form.elements[key].value = "";
      const match = defaults.find(
        (q) => q.character === event.target.value.trim(),
      );
      if (match)
        for (const key of ["strokeCount", "radical", "structure", "components"])
          form.elements[key].value = match[key] ?? "";
    }
    const q = collect(),
      questions = getBank().questions.filter((x) => x.id !== selected);
    const oldIndex = getBank().questions.findIndex((x) => x.id === selected);
    questions.splice(oldIndex < 0 ? questions.length : oldIndex, 0, q);
    const result = validateBank({ schemaVersion: 1, questions });
    if (!result.ok) {
      pending = null;
      pendingSuccess = null;
      $("#retry-save").hidden = true;
      $("#export-pending").hidden = true;
      $("#save-status").textContent =
        "草稿未保存：" +
        result.errors
          .map((x) => x.message)
          .slice(0, 3)
          .join(" ");
      return;
    }
    saveBank(result.bank, () => {
      $("#save-status").textContent = "已保存 · 仅保存在此浏览器";
      $("#bank-feedback").textContent = "";
    });
  });
  form.onsubmit = (event) => event.preventDefault();
  $("#close-editor").onclick = () => {
    if (mayLeave()) {
      reset();
      dialog.close();
    }
  };
  dialog.addEventListener("cancel", (event) => {
    if (!mayLeave()) event.preventDefault();
    else reset();
  });
  $("#add-question").onclick = () => {
    if (mayLeave())
      edit({
        id: crypto.randomUUID(),
        grade: Number($("#bank-grade").value) || 1,
        words: [],
      });
  };
  $("#bank-search").oninput = list;
  $("#bank-grade").onchange = list;
  $("#export-bank").onclick = () => downloadText(exportBank(getBank()));
  $("#retry-save").onclick = () => {
    if (pending) {
      const success = pendingSuccess;
      saveBank(pending, () => {
        $("#save-status").textContent = "已保存";
        $("#bank-feedback").textContent = "已保存";
        success?.();
      });
    }
  };
  $("#export-pending").onclick = () => {
    if (pending) downloadText(exportBank(pending), "汉字题库-待保存");
  };
  $("#delete-question").onclick = () => {
    if (confirm("删除这道题？当前课堂中的题目不受影响。")) {
      const bank = {
        schemaVersion: 1,
        questions: getBank().questions.filter((q) => q.id !== selected),
      };
      saveBank(bank, reset);
    }
  };
  function restore() {
    if (!mayLeave()) return;
    if (
      !confirm(
        "恢复默认将替换全部个人修改。建议先点击“导出题库”备份。确定恢复 48 道默认题目吗？",
      )
    )
      return;
    saveBank({ schemaVersion: 1, questions: defaults }, () => {
      reset();
      $("#bank-feedback").textContent = "默认题库已恢复并保存。";
    });
  }
  $("#restore-bank").onclick = restore;
  $("#import-file").onchange = async (event) => {
    invalidateImport();
    const file = event.target.files[0];
    event.target.value = "";
    if (!file || !mayLeave()) return;
    const generation = importGeneration;
    try {
      const importText = await file.text();
      if (generation !== importGeneration) return;
      const result = previewImport(importText);
      if (!result.ok) {
        $("#bank-feedback").textContent =
          "导入未完成：" +
          [
            result.error.message,
            ...(result.error.details || []).map(
              (issue) => issue.path + "：" + issue.message,
            ),
          ]
            .filter(Boolean)
            .join(" ");
        return;
      }
      const box = $("#import-preview");
      box.hidden = false;
      box.replaceChildren();
      const p = document.createElement("p");
      p.textContent = `共 ${result.total} 题 · ${[1, 2, 3, 4].map((g) => `${g} 年级 ${result.countsByGrade[g] || 0} 题`).join(" / ")}。确认后替换整个题库；当前课堂不变。`;
      box.append(p);
      for (const [label, action] of [
        ["先导出当前题库", () => downloadText(exportBank(getBank()))],
        [
          "取消替换",
          () => {
            reset();
            $("#bank-feedback").textContent = "已取消替换，原题库不变。";
          },
        ],
        [
          "确认替换题库",
          () => {
            if (generation !== importGeneration) return;
            saveBank(result.bank, () => {
              reset();
              $("#bank-feedback").textContent = "导入成功，题库已保存。";
            });
          },
        ],
      ]) {
        const b = document.createElement("button");
        b.textContent = label;
        b.onclick = action;
        box.append(b);
      }
    } catch {
      if (generation !== importGeneration) return;
      $("#bank-feedback").textContent =
        "无法读取文件，请选择有效的 JSON 题库文件。";
    }
  };
  window.addEventListener("beforeunload", (event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  return {
    open() {
      list();
      dialog.showModal();
    },
    restore,
    hasDraft: () => dirty,
  };
}
