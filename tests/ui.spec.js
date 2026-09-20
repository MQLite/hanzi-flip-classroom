import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("classroom reveal, one settlement, back navigation and review", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { name: "汉字奇遇岛" })).toBeVisible();
  await expect(page.locator("#progress")).toHaveText("01 / 08");
  await page.getByRole("button", { name: "翻牌揭晓", exact: true }).click();
  await page.getByRole("button", { name: "答对了", exact: true }).click();
  await expect(page.locator('[data-score="team-1"]')).toHaveText("1");
  await expect(
    page.getByRole("button", { name: "答对了", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "下一字", exact: true }).click();
  await page.getByRole("button", { name: "上一字", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "答对了", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "下一字", exact: true }).click();
  // Global reveal applies outside buttons; Space on Next activates Next natively.
  await page.locator("#scene").click();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "再练一次", exact: true }).click();
  for (let i = 0; i < 7; i++)
    await page.getByRole("button", { name: "下一字", exact: true }).click();
  await expect(page.getByText("这一轮，真棒！")).toBeVisible();
  await page.getByRole("button", { name: "开始复习", exact: true }).click();
  await expect(page.locator("#progress")).toHaveText("01 / 01");
});
test("teacher settings and keyboard isolation", async ({ page }) => {
  await page.getByRole("button", { name: "小组设置" }).click();
  await page.getByLabel("小组数量").selectOption("4");
  await page.getByLabel("第 1 组名称").fill("向日葵");
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "应用并开始新一轮" }).click();
  await expect(page.locator(".team")).toHaveCount(4);
  await expect(page.locator(".team").first()).toContainText("向日葵");
  await expect(
    page.getByRole("button", { name: "翻牌揭晓", exact: true }),
  ).toBeEnabled();
});
test("valid edit persists and invalid draft never replaces saved record", async ({
  page,
}) => {
  await page.getByRole("button", { name: "题库管理", exact: true }).click();
  await page.locator(".question-row").first().click();
  await page.getByLabel("例句", { exact: true }).fill("这是课堂保存测试。");
  await expect(page.locator("#save-status")).toContainText("已保存");
  await page.getByLabel("例句", { exact: true }).fill("");
  await expect(page.locator("#save-status")).toContainText("草稿");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "关闭题库" }).click();
  await page.reload();
  await page.getByRole("button", { name: "题库管理", exact: true }).click();
  await page.locator(".question-row").first().click();
  await expect(page.getByLabel("例句", { exact: true })).toHaveValue(
    "这是课堂保存测试。",
  );
});
test("import preview cancel and deliberate empty bank survive reload", async ({
  page,
}) => {
  await page.getByRole("button", { name: "题库管理", exact: true }).click();
  const file = {
    name: "empty.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, questions: [] })),
  };
  await page.locator("#import-file").setInputFiles(file);
  await expect(page.locator("#import-preview")).toContainText("共 0 题");
  await page.getByRole("button", { name: "取消替换" }).click();
  await expect(page.locator(".question-row")).toHaveCount(156);
  await page.locator("#import-file").setInputFiles(file);
  await page.getByRole("button", { name: "确认替换题库" }).click();
  await expect(page.locator(".question-row")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("当前范围还没有题目")).toBeVisible();
});
test("local stroke controls and user-selected simplified mode", async ({
  page,
}) => {
  await page.getByRole("button", { name: "翻牌揭晓", exact: true }).click();
  await page.getByRole("button", { name: "拓展学习", exact: true }).click();
  await expect(page.locator("#stroke-target svg")).toBeVisible();
  await page.getByRole("button", { name: "逐笔", exact: true }).click();
  await expect(page.locator("#stroke-status")).toContainText("第 1 笔");
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.getByRole("button", { name: "简化显示", exact: true }).click();
  await expect(page.locator("#scene")).toHaveAttribute("data-mode", "simple");
  await expect(page.locator("#progress")).toHaveText("01 / 08");
});
test("projector and mobile layouts keep content within viewport width", async ({
  page,
}) => {
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [1280, 720],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    const size = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    expect(size.width).toBeLessThanOrEqual(width);
    if (width > 1000) expect(size.height).toBeLessThanOrEqual(height);
  }
});
test("real WebGL context loss preserves the active classroom", async ({
  page,
}) => {
  await expect(page.locator("#scene")).toHaveAttribute("data-mode", "webgl");
  expect(
    await page
      .locator("#scene canvas")
      .evaluate((canvas) => !!canvas.getContext("webgl2")),
  ).toBe(true);
  await page.getByRole("button", { name: "翻牌揭晓", exact: true }).click();
  await page.getByRole("button", { name: "答对了", exact: true }).click();
  await page
    .locator("#scene canvas")
    .evaluate((canvas) =>
      canvas
        .getContext("webgl2")
        .getExtension("WEBGL_lose_context")
        .loseContext(),
    );
  await expect(page.locator("#scene")).toHaveAttribute("data-mode", "simple");
  await expect(page.locator('[data-score="team-1"]')).toHaveText("1");
});
test("new question, metadata clear, and snapshot isolation", async ({
  page,
}) => {
  const character = await page.locator(".hanzi").textContent();
  await page.getByRole("button", { name: "题库管理", exact: true }).click();
  await page.getByLabel("搜索汉字").fill(character);
  await page.locator(".question-row").first().click();
  await page.getByLabel("汉字", { exact: true }).fill("龘");
  await expect(page.getByLabel("部首（可选）")).toHaveValue("");
  await expect(page.getByLabel("笔画数（可选）")).toHaveValue("");
  await page.getByRole("button", { name: "关闭题库" }).click();
  await expect(page.locator(".hanzi")).toHaveText(character);
  await page.getByRole("button", { name: "题库管理", exact: true }).click();
  await page.getByRole("button", { name: "新增题目" }).click();
  await page.getByLabel("汉字", { exact: true }).fill("田");
  await page.getByLabel("拼音", { exact: true }).fill("tián");
  await page.getByLabel("组词一").fill("田地");
  await page.getByLabel("组词二").fill("水田");
  await page.getByLabel("例句", { exact: true }).fill("田地里长着庄稼。");
  await expect(page.locator("#save-status")).toContainText("已保存");
  await page.getByRole("button", { name: "关闭题库" }).click();
  await page.reload();
  await page.getByRole("button", { name: "题库管理", exact: true }).click();
  await page.getByLabel("搜索汉字").fill("田");
  await expect(page.locator(".question-row")).toHaveCount(1);
});
test("failed import retains original bank and offers export and retry outside form", async ({
  page,
}) => {
  await page.getByRole("button", { name: "题库管理", exact: true }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Quota", "QuotaExceededError");
    };
  });
  await page.locator("#import-file").setInputFiles({
    name: "empty.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":1,"questions":[]}'),
  });
  await page.getByRole("button", { name: "确认替换题库" }).click();
  await expect(page.locator(".question-row")).toHaveCount(156);
  await expect(
    page.getByRole("button", { name: "导出待保存题库" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "重试保存" })).toBeVisible();
});
test("grade change cancel preserves progress and grade defaults update hints", async ({
  page,
}) => {
  await page.getByLabel("题库来源").selectOption("personal");
  await page.getByRole("button", { name: "翻牌揭晓", exact: true }).click();
  page.once("dialog", (d) => d.dismiss());
  await page.getByLabel("选择年级").selectOption("3");
  await expect(page.getByLabel("选择年级")).toHaveValue("1");
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("选择年级").selectOption("3");
  await expect(page.locator(".pinyin")).toHaveCount(0);
  await expect(page.locator("#progress")).toHaveText("01 / 08");
});

test('curriculum stage, lesson, cumulative selection and cancellation', async ({ page }) => {
  await expect(page.getByLabel('题库来源')).toHaveValue('textbook');
  await expect(page.locator('#curriculum-note')).toContainText('A/B为游戏分组');
  await page.getByLabel('练习范围').selectOption('lesson');
  await expect(page.locator('#progress')).toHaveText('01 / 03');
  expect(['一','二','三']).toContain(await page.locator('.hanzi').textContent());
  await page.getByRole('button', {name:'翻牌揭晓', exact:true}).click();
  page.once('dialog', d=>d.dismiss());
  await page.getByLabel('学习阶段', {exact:true}).selectOption('3B');
  await expect(page.getByLabel('学习阶段', {exact:true})).toHaveValue('1A');
  await expect(page.locator('#progress')).toHaveText('01 / 03');
  page.once('dialog', d=>d.accept());
  await page.getByLabel('学习阶段', {exact:true}).selectOption('3B');
  await expect(page.getByLabel('选择课次')).toHaveValue('7');
  expect(['相','机','板']).toContain(await page.locator('.hanzi').textContent());
  await page.getByLabel('练习范围').selectOption('cumulative');
  await expect(page.locator('#progress')).toHaveText('01 / 08');
  await expect(page.locator('#curriculum-note')).toContainText('课本1第1课至课本3第7课');
});

test('upgrading an old bank appends textbooks without replacing teacher work and persists', async ({page}) => {
  await page.evaluate(() => {
    localStorage.setItem('hanzi-flip.question-bank', JSON.stringify({schemaVersion:1, questions:[{
      id:'teacher-one', grade:1, character:'田', pinyin:'tián', words:['田地','水田'], sentence:'老师自己的例句。'
    }]}));
  });
  await page.reload();
  await expect(page.getByLabel('题库来源')).toHaveValue('personal');
  await page.getByRole('button', {name:'添加新版教材题库', exact:true}).click();
  await expect(page.getByLabel('题库来源')).toHaveValue('textbook');
  await page.reload();
  const bank = await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-flip.question-bank')));
  expect(bank.questions).toHaveLength(109);
  expect(bank.questions.find(q=>q.id==='teacher-one').sentence).toBe('老师自己的例句。');
  await page.getByRole('button', {name:'题库管理',exact:true}).click();
  await page.getByLabel('筛选学习阶段').selectOption('1A');
  await expect(page.locator('.question-row')).toHaveCount(18);
  await page.locator('.question-row').first().click();
  await page.getByLabel('例句', {exact:true}).fill('我有一个新书包。');
  await expect(page.locator('#question-origin')).toContainText('1A');
  await page.getByLabel('汉字', {exact:true}).fill('田');
  await expect(page.locator('#question-origin')).toContainText('个人');
  const edited = await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-flip.question-bank')).questions.find(q=>q.id==='cp2023-1-1-一'));
  expect(edited.textbook).toBeUndefined();
});

test('unreadable bank cannot be overwritten by appending textbooks or adding a question', async ({page}) => {
  await page.evaluate(()=>localStorage.setItem('hanzi-flip.question-bank', 'UNREADABLE ORIGINAL BANK'));
  await page.reload();
  await page.getByRole('button', {name:'题库管理',exact:true}).click();
  const append = page.getByRole('button', {name:'补充缺失教材题',exact:true});
  await append.evaluate(button=>button.click());
  expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe('UNREADABLE ORIGINAL BANK');
  await expect(append).toBeDisabled();
  await expect(page.getByRole('button', {name:'新增题目'})).toBeDisabled();
  page.once('dialog', dialog=>dialog.accept());
  await page.locator('#restore-bank').click();
  await expect(append).toBeEnabled();
  await expect(page.locator('.question-row')).toHaveCount(156);
});
test("four teams and revealed card fit projector view", async ({ page }) => {
  await page.getByRole("button", { name: "小组设置" }).click();
  await page.getByLabel("小组数量").selectOption("4");
  await page.getByRole("button", { name: "应用并开始新一轮" }).click();
  await page.getByRole("button", { name: "翻牌揭晓", exact: true }).click();
  for (const [width, height] of [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeLessThanOrEqual(height);
    await expect(
      page.getByRole("button", { name: "答对了", exact: true }),
    ).toBeInViewport();
  }
});
test("renderer initialization failure still supports flip and scoring", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith("webgl")
        ? null
        : original.call(this, type, ...args);
    };
  });
  await page.reload();
  await expect(page.locator("#scene")).toHaveAttribute("data-mode", "simple");
  await page.getByRole("button", { name: "翻牌揭晓", exact: true }).click();
  await page.getByRole("button", { name: "答对了", exact: true }).click();
  await expect(page.locator('[data-score="team-1"]')).toHaveText("1");
});
test("corrupt data is preserved and can be downloaded before restore", async ({
  page,
}) => {
  await page.evaluate(() =>
    localStorage.setItem("hanzi-flip.question-bank", "BROKEN RAW DATA"),
  );
  await page.reload();
  await expect(page.locator("#storage-alert")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载原始备份" }).click();
  await download;
  expect(
    await page.evaluate(() => localStorage.getItem("hanzi-flip.question-bank")),
  ).toBe("BROKEN RAW DATA");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "恢复默认题库", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("hanzi-flip.question-bank")),
  ).toBe("BROKEN RAW DATA");
});
test("missing and mismatched stroke data provide textual fallback", async ({
  page,
}) => {
  await page.getByLabel("题库来源").selectOption("personal");
  await page.route("**/strokes/*.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html></html>",
    }),
  );
  await page.getByRole("button", { name: "翻牌揭晓", exact: true }).click();
  await page.getByRole("button", { name: "拓展学习", exact: true }).click();
  await expect(page.locator("#stroke-status")).toContainText("暂无笔顺演示");
  await expect(page.locator("#stroke-target")).toHaveCount(0);
  await page.unroute("**/strokes/*.json");
  await page.route("**/strokes/*.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        strokes: ["a"],
        medians: [
          [
            [0, 0],
            [1, 1],
          ],
        ],
        radStrokes: [],
      }),
    }),
  );
  await page.getByRole("button", { name: "拓展学习", exact: true }).click();
  await page.getByRole("button", { name: "拓展学习", exact: true }).click();
  await expect(page.locator("#stroke-status")).toContainText("不一致");
  await expect(page.locator("#stroke-target")).toHaveCount(0);
});
test("invalid imported records identify their fields without changing bank", async ({
  page,
}) => {
  await page.getByRole("button", { name: "题库管理", exact: true }).click();
  await page.locator("#import-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        questions: [
          {
            id: "bad",
            grade: 1,
            character: "字",
            pinyin: "",
            words: ["字词", "汉字"],
            sentence: "这是汉字。",
          },
        ],
      }),
    ),
  });
  await expect(page.locator("#bank-feedback")).toContainText(
    "questions[0].pinyin",
  );
  await expect(page.locator(".question-row")).toHaveCount(156);
});
test("context loss keeps fallback when teacher attempts 3D again", async ({
  page,
}) => {
  await page
    .locator("#scene canvas")
    .evaluate((canvas) =>
      canvas
        .getContext("webgl2")
        .getExtension("WEBGL_lose_context")
        .loseContext(),
    );
  await expect(page.locator("#scene")).toHaveAttribute("data-mode", "simple");
  await expect(
    page.getByRole("button", { name: "立体显示", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "立体显示", exact: true }).click();
  await expect(page.locator("#scene")).toHaveAttribute("data-mode", "simple");
});
test("short projector learning text remains large after reveal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByLabel("题库来源").selectOption("personal");
  await page.getByLabel("选择年级").selectOption("4");
  await page.getByRole("button", { name: "翻牌揭晓", exact: true }).click();
  expect(
    await page
      .locator(".sentence")
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThanOrEqual(18);
  expect(
    await page
      .locator(".words span")
      .first()
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThanOrEqual(24);
  await expect(
    page.getByRole("button", { name: "答对了", exact: true }),
  ).toBeInViewport();
});
test("two-team revealed classroom has no projector page overflow", async ({
  page,
}) => {
  await page.getByRole("button", { name: "翻牌揭晓", exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(900);
});
test("a rejected second import invalidates the previous replacement preview", async ({
  page,
}) => {
  await page.locator("#open-bank").click();
  await page.locator("#import-file").setInputFiles({
    name: "empty.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":1,"questions":[]}'),
  });
  await expect(
    page.getByRole("button", { name: "确认替换题库" }),
  ).toBeVisible();
  await page.locator("#import-file").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{bad"),
  });
  await expect(page.locator("#bank-feedback")).toContainText("导入未完成");
  await expect(page.getByRole("button", { name: "确认替换题库" })).toHaveCount(
    0,
  );
  await expect(page.locator(".question-row")).toHaveCount(156);
});
test("late stroke data cannot append an earlier glyph to the current panel", async ({
  page,
}) => {
  let releaseFirst, firstDone;
  const finished = new Promise((resolve) => (firstDone = resolve));
  let requestCount = 0;
  await page.route("**/strokes/*.json", async (route) => {
    const response = await route.fetch();
    if (++requestCount === 1) {
      await new Promise((resolve) => (releaseFirst = resolve));
      await route.fulfill({ response }).catch(() => {});
      firstDone();
    } else await route.fulfill({ response });
  });
  await page.locator("#reveal").click();
  await page.locator("#extension-toggle").click();
  await expect.poll(() => requestCount).toBe(1);
  await page.locator("#next").click();
  await page.locator("#reveal").click();
  await page.locator("#extension-toggle").click();
  await expect(page.locator("#stroke-target")).toHaveCount(1);
  releaseFirst();
  await finished;
  // Wait for the released fetch and JSON continuation to run before counting diagrams.
  await page.waitForTimeout(100);
  await expect(page.locator("#stroke-target")).toHaveCount(1);
  await expect(page.locator(".stroke-controls")).toHaveCount(1);
});
test("retrying a failed deletion completes the deletion form transition", async ({
  page,
}) => {
  await page.locator("#open-bank").click();
  await page.locator(".question-row").first().click();
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new Error("blocked");
    };
  });
  page.once("dialog", (d) => d.accept());
  await page.locator("#delete-question").click();
  await page.evaluate(
    () => (Storage.prototype.setItem = window.originalSetItem),
  );
  await page.getByRole("button", { name: "重试保存" }).click();
  await expect(page.locator(".question-row")).toHaveCount(155);
  await expect(page.locator("#question-form")).toBeHidden();
  await page.locator("#close-editor").click();
  await page.reload();
  await page.locator("#open-bank").click();
  await expect(page.locator(".question-row")).toHaveCount(155);
});
test("switching to simplified mode at the edge of a flip keeps the face visible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await page.locator("#reveal").click();
  await page.waitForFunction(
    () => {
      const face = document.querySelector("#card-face");
      if (face.style.opacity === "0") {
        document.querySelector("#simplify").click();
        return true;
      }
      return false;
    },
    {},
    { polling: "raf" },
  );
  await expect(page.locator("#scene")).toHaveAttribute("data-mode", "simple");
  await expect(page.locator("#card-face")).toHaveCSS("opacity", "1");
});
test("an older asynchronous file read cannot revive its import preview", async ({
  page,
}) => {
  await page.locator("#open-bank").click();
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = async function () {
      const text = await original.call(this);
      if (this.name === "slow-empty.json")
        await new Promise((resolve) => (window.releaseImport = resolve));
      return text;
    };
  });
  await page.locator("#import-file").setInputFiles({
    name: "slow-empty.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":1,"questions":[]}'),
  });
  await page.waitForFunction(() => typeof window.releaseImport === "function");
  await page.locator("#import-file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{bad"),
  });
  await expect(page.locator("#bank-feedback")).toContainText("导入未完成");
  await page.evaluate(() => window.releaseImport());
  await page.waitForTimeout(100);
  await expect(page.getByRole("button", { name: "确认替换题库" })).toHaveCount(
    0,
  );
  await expect(page.locator(".question-row")).toHaveCount(156);
});
for (const action of [
  "invalid import",
  "close",
  "escape",
  "existing question",
  "new question",
  "restore cancelled",
  "cancel replacement",
]) {
  test(`accepted abandonment clears pending import recovery: ${action}`, async ({
    page,
  }) => {
    await page.locator("#open-bank").click();
    await page.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function () {
        throw new Error("blocked");
      };
    });
    await page
      .locator("#import-file")
      .setInputFiles({
        name: "empty.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"schemaVersion":1,"questions":[]}'),
      });
    await page.getByRole("button", { name: "确认替换题库" }).click();
    await expect(page.getByRole("button", { name: "重试保存" })).toBeVisible();
    await page.evaluate(
      () => (Storage.prototype.setItem = window.originalSetItem),
    );
    let confirmations = 0;
    const onDialog = (dialog) => {
      confirmations++;
      return confirmations === 1 ? dialog.accept() : dialog.dismiss();
    };
    page.on("dialog", onDialog);
    if (action === "invalid import")
      await page
        .locator("#import-file")
        .setInputFiles({
          name: "bad.json",
          mimeType: "application/json",
          buffer: Buffer.from("{bad"),
        });
    if (action === "close") await page.locator("#close-editor").click();
    if (action === "escape") await page.keyboard.press("Escape");
    if (action === "existing question")
      await page.locator(".question-row").first().click();
    if (action === "new question") await page.locator("#add-question").click();
    if (action === "restore cancelled")
      await page.locator("#restore-bank").click();
    if (action === "cancel replacement")
      await page.getByRole("button", { name: "取消替换" }).click();
    page.off("dialog", onDialog);
    if (action === "close" || action === "escape")
      await page.locator("#open-bank").click();
    await expect(page.locator("#retry-save")).toBeHidden();
    await expect(page.locator("#export-pending")).toBeHidden();
    // An abandoned pending action must be disarmed, not merely visually hidden.
    await page.locator("#retry-save").evaluate((button) => button.click());
    await expect(page.locator(".question-row")).toHaveCount(156);
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("hanzi-flip.question-bank")).questions
            .length,
      ),
    ).toBe(156);
    let prompted = false;
    page.once("dialog", async (dialog) => {
      prompted = true;
      await dialog.dismiss();
    });
    await page.locator("#close-editor").click();
    expect(prompted).toBe(false);
  });
}
test("declining abandonment preserves a failed import for deliberate retry", async ({
  page,
}) => {
  await page.locator("#open-bank").click();
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new Error("blocked");
    };
  });
  await page
    .locator("#import-file")
    .setInputFiles({
      name: "empty.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"schemaVersion":1,"questions":[]}'),
    });
  await page.getByRole("button", { name: "确认替换题库" }).click();
  await page.evaluate(
    () => (Storage.prototype.setItem = window.originalSetItem),
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .locator("#import-file")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from("{bad"),
    });
  await expect(page.getByRole("button", { name: "重试保存" })).toBeVisible();
  await page.getByRole("button", { name: "重试保存" }).click();
  await expect(page.locator(".question-row")).toHaveCount(0);
});
