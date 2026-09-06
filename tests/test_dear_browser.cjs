/* Run after quarto render site. Requires Playwright; BROWSER_EXECUTABLE is optional. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const D = require("../site/assets/skill-practice-apps.js");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "tmp/dear-browser");
fs.mkdirSync(output, { recursive: true });
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let route = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/^\/project\//, "/");
  if (route.endsWith("/")) route += "index.html";
  const file = path.resolve(root, "site/_site", "." + route);
  if (!file.startsWith(path.join(root, "site/_site") + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});
const rows = [];
let browser;
(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const context = await browser.newContext({ reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(`${message.text()} ${message.location().url}`); });
  async function noOverflow(label) {
    const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(sizes.scroll <= sizes.viewport + 1, `${label}: overflow ${JSON.stringify(sizes)}`);
  }
  for (const width of [390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["learn/interpersonal-effectiveness/dear-man.html", "learn/distress-tolerance/tipp.html"]) {
      await page.goto(`${origin}/project/${route}`);
      await page.waitForFunction(() => !!document.querySelector(".bs-learn-left-sidebar-toggle"));
      const toggle = page.locator(".bs-learn-left-sidebar-toggle");
      const article = page.locator("main#quarto-document-content");
      if (width >= 992) {
        const before = await article.boundingBox();
        await toggle.click();
        const after = await article.boundingBox();
        assert.ok(Math.abs(before.x - after.x) < 1 && Math.abs(before.width - after.width) < 1, `${route} shifted at ${width}: ${JSON.stringify({before, after})}`);
        assert.equal(await page.locator("#quarto-sidebar").evaluate(el => el.inert), true);
        assert.match(await toggle.innerText(), /Show Lessons/);
        await page.setViewportSize({ width: 390, height: 900 });
        assert.equal(await page.locator("#quarto-sidebar").evaluate(el => el.inert), false);
        assert.equal(await toggle.isVisible(), false);
        await page.setViewportSize({ width, height: 900 });
        await toggle.focus(); await page.keyboard.press("Enter");
        const restored = await article.boundingBox();
        assert.ok(Math.abs(before.x - restored.x) < 1);
      } else assert.equal(await toggle.isVisible(), false);
      await noOverflow(`${route} ${width}`);
      if (route.includes("dear-man")) {
        const figure = page.locator('img[src*="communication-styles-triangle"]');
        await figure.scrollIntoViewIfNeeded();
        const box = await figure.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
        await page.screenshot({ path: path.join(output, `learn-figure-${width}.png`) });
      }
      rows.push({ route, width, result: "article position/width, controls and overflow passed" });
    }
    for (const id of ["dear-man", "dear-give", "dear-fast"]) {
      await page.goto(`${origin}/project/tool-finder/${id}/`);
      await page.locator("[data-dear-form]").waitFor();
      assert.equal(await page.getByRole("heading", { name: D.DEAR_DEFINITIONS[id].title, exact: true }).count(), 1);
      assert.equal(await page.locator("[data-skill-progress-floating]").count(), 0);
      const fields = D.normalizeDearState(id).fields;
      for (const key of Object.keys(fields)) {
        const field = page.locator(`[name="${key}"]`);
        assert.ok(await field.getAttribute("placeholder"));
        await field.fill(`${key} example`);
      }
      await page.getByRole("button", { name: "Combine DEAR into final script" }).click();
      assert.equal(await page.locator('[name="finalScript"]').inputValue(), "describe example express example assert example reinforce example");
      await page.locator('[name="finalScript"]').fill("My own edited final script <&>");
      const area = page.locator("[data-skill-progress-final]");
      await area.locator("summary").click();
      assert.ok(await area.getAttribute("open") !== null);
      await noOverflow(`${id} ${width} save open`);
      await page.screenshot({ path: path.join(output, `${id}-save-${width}.png`) });
      if (width === 1280) {
        const downloaded = page.waitForEvent("download");
        await area.getByRole("button", { name: "Save progress (.md)", exact: true }).click();
        const download = await downloaded;
        const saved = path.join(output, `${id}.md`); await download.saveAs(saved);
        const markdown = fs.readFileSync(saved, "utf8");
        for (const key of Object.keys(fields).filter(k => k !== "finalScript")) assert.ok(markdown.includes(`${key} example`));
        assert.ok(markdown.includes("My own edited final script"));
        await page.locator('[name="situation"]').fill("changed after export");
        await area.locator('input[type="file"]').setInputFiles(saved);
        await page.waitForFunction(() => document.querySelector('[name="situation"]').value === "situation example");
        assert.equal(await page.locator('[name="finalScript"]').inputValue(), "My own edited final script <&>");
        const docxEvent = page.waitForEvent("download");
        await area.getByRole("button", { name: "Export DOCX", exact: true }).click();
        await (await docxEvent).saveAs(path.join(output, `${id}.docx`));
        await page.evaluate(() => { window.print = () => { window.__printed = document.querySelector(".skill-progress-print").textContent; }; });
        await area.getByRole("button", { name: "Print / Save as PDF", exact: true }).click();
        assert.match(await page.evaluate(() => window.__printed), /My own edited final script/);
        await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
        await page.waitForTimeout(550);
        await page.reload();
        await page.locator("[data-dear-form]").waitFor();
        await area.locator("summary").click();
        await area.getByRole("button", { name: "Restore browser progress" }).click();
        assert.equal(await page.locator('[name="finalScript"]').inputValue(), "My own edited final script <&>");
        if (id === "dear-man") {
          await page.getByText("Need ideas?", { exact: true }).click();
          await page.getByRole("button", { name: "Copy Prompt" }).click();
          await page.waitForFunction(() => document.querySelector("[data-dear-copy-status]").textContent.includes("copied"));
          assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n"), D.DEAR_PROMPT);
        }
      }
      rows.push({ route: id, width, result: "fields, script, bottom disclosure, overflow passed" });
    }
  }
  for (const id of ["pros-and-cons", "interpersonal-troubleshooting", "dime-game", "ask-or-say-no", "emotions", "thought-record", "values"]) {
    await page.goto(`${origin}/project/tool-finder/${id}/`);
    await page.locator("[data-skill-progress-final]").waitFor();
    await page.locator("[data-skill-progress-final] > summary").click();
    await page.getByRole("button", { name: "Export DOCX", exact: true }).waitFor();
    assert.equal(await page.locator("[data-skill-progress-floating]").count(), 0);
    await noOverflow(id);
    rows.push({ route: id, width: 1440, result: "shared bottom save controls and overflow passed" });
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(rows, null, 2));
  console.log(`PASS: ${rows.length} rendered route/width checks; Markdown/browser restore, DOCX, print, clipboard; zero page errors.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server.close(); });
