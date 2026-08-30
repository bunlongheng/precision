import { test, expect, type Page } from "@playwright/test";

// A colorful test photo generated in-page, so the suite needs no fixture files.
async function makePhoto(page: Page): Promise<string> {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 900;
    c.height = 700;
    const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, 900, 700);
    g.addColorStop(0, "#ff5a3c");
    g.addColorStop(0.5, "#7a2ff2");
    g.addColorStop(1, "#00c2ff");
    x.fillStyle = g;
    x.fillRect(0, 0, 900, 700);
    x.fillStyle = "#ffd23f";
    x.beginPath();
    x.arc(300, 280, 130, 0, 7);
    x.fill();
    return c.toDataURL("image/png");
  });
  const path = "/tmp/precision-e2e-photo.png";
  const fs = await import("node:fs");
  fs.writeFileSync(path, Buffer.from(dataUrl.split(",")[1], "base64"));
  return path;
}

async function openEditorWithPhoto(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  const photo = await makePhoto(page);
  await page.getByText("New project").click();
  await page.locator('input[type="file"]').setInputFiles(photo);
  await expect(page.locator("canvas").first()).toBeVisible();
  return { errors };
}

test("home shows the workspace and a new-project entry", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("New project")).toBeVisible();
  await expect(page.locator("text=PRECISION").first()).toBeVisible();
});

test("dropping a photo opens the editor with the adjust panel", async ({ page }) => {
  await openEditorWithPhoto(page);
  await expect(page.getByText("FILTERS")).toBeVisible();
  await expect(page.getByRole("button", { name: "Noir" })).toBeVisible();
});

test("applying a filter and painting the color-splash brush does not error", async ({ page }) => {
  const { errors } = await openEditorWithPhoto(page);
  await page.getByRole("button", { name: "Noir" }).click();
  await page.getByRole("button", { name: "Color splash" }).click();
  await expect(page.getByText("Color splash")).toBeVisible();

  const box = await page.locator("canvas").first().boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx - 120, cy);
    await page.mouse.down();
    for (let i = 0; i <= 8; i++) await page.mouse.move(cx - 120 + i * 26, cy + Math.sin(i) * 18);
    await page.mouse.up();
  }
  await expect(page.getByRole("button", { name: "Undo stroke" })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("adding a text layer surfaces the text styling panel", async ({ page }) => {
  await openEditorWithPhoto(page);
  await page.getByRole("button", { name: "Add text" }).click();
  const box = await page.locator("canvas").first().boundingBox();
  if (box) await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await expect(page.getByText("FONT")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bold" })).toBeVisible();
});

test("blur brush exposes the blur styles and strength", async ({ page }) => {
  const { errors } = await openEditorWithPhoto(page);
  await page.getByRole("button", { name: "Blur", exact: true }).click();
  await expect(page.getByText("Blur style")).toBeVisible();
  await expect(page.getByRole("button", { name: "Secure" })).toBeVisible();

  // paint a blur stroke and confirm no runtime errors
  const box = await page.locator("canvas").first().boundingBox();
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx - 80, cy);
    await page.mouse.down();
    for (let i = 0; i <= 6; i++) await page.mouse.move(cx - 80 + i * 24, cy);
    await page.mouse.up();
  }
  await expect(page.getByRole("button", { name: "Undo stroke" })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("rotate & crop bakes a square without errors", async ({ page }) => {
  const { errors } = await openEditorWithPhoto(page);
  await page.getByRole("button", { name: "Rotate & crop" }).click();
  await expect(page.getByText("ROTATE & CROP")).toBeVisible();
  await page.getByRole("button", { name: "Rotate right" }).click();
  await page.getByRole("button", { name: "1:1", exact: true }).click();
  await page.getByRole("button", { name: "Apply crop" }).click();

  // Overlay closes and the editor still shows the canvas; the crop is now square.
  await expect(page.getByText("ROTATE & CROP")).toHaveCount(0);
  const box = await page.locator("canvas").first().boundingBox();
  expect(box).not.toBeNull();
  if (box) expect(Math.abs(box.width - box.height)).toBeLessThan(4);
  expect(errors).toEqual([]);
});
