import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";

const directory = "docs/codex/hanzi-flip/evidence";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const errors = [],
  externalRequests = [],
  captures = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("request", (request) => {
  if (!request.url().startsWith("http://127.0.0.1:5174"))
    externalRequests.push(request.url());
});
await page.goto("http://127.0.0.1:5174");
await page.locator(".hanzi").waitFor();
async function capture(name, width, height) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
  captures.push({
    name,
    viewport: { width, height },
    metrics: await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      pageHeight: document.documentElement.scrollHeight,
      webgl2: !!document.querySelector("#scene canvas")?.getContext("webgl2"),
      controlsBottom: document
        .querySelector(".game-controls")
        .getBoundingClientRect().bottom,
    })),
  });
}
await capture("classroom-1440", 1440, 900);
await page.locator("#reveal").click();
await capture("classroom-1440-reveal", 1440, 900);
await capture("classroom-1920", 1920, 1080);
await capture("classroom-mobile", 390, 844);
page.once("dialog", (dialog) => dialog.accept());
await page.locator("#stage").selectOption("3B");
await page.locator("#reveal").click();
await capture("classroom-1280-reveal", 1280, 720);
await page.locator("#extension-toggle").click();
await page.locator("#stroke-target svg").waitFor();
await page.getByRole("button", { name: "逐笔", exact: true }).click();
await capture("classroom-strokes", 1440, 900);
await page.locator("#extension-toggle").click();
await page.locator("#open-bank").click();
await page.locator(".question-row").first().click();
await capture("question-editor", 1440, 900);
await writeFile(
  `${directory}/browser-evidence.json`,
  JSON.stringify({ errors, externalRequests, captures }, null, 2),
);
console.log(JSON.stringify({ errors, externalRequests, captures }, null, 2));
await browser.close();
