import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildFilterCSS,
  buildBaseBWFilterCSS,
  PRESETS,
  getPreset,
  applyAdjustPixels,
} from "../lib/filters.ts";
import { DEFAULT_ADJUST } from "../lib/types.ts";

test("default adjust produces no filter", () => {
  assert.equal(buildFilterCSS(DEFAULT_ADJUST), "none");
});

test("filter string only includes changed dimensions", () => {
  const css = buildFilterCSS({ ...DEFAULT_ADJUST, brightness: 120, blur: 2 });
  assert.equal(css, "brightness(1.2) blur(2px)");
});

test("grayscale and hue are emitted correctly", () => {
  const css = buildFilterCSS({ ...DEFAULT_ADJUST, grayscale: 100, hue: -8 });
  assert.match(css, /grayscale\(1\)/);
  assert.match(css, /hue-rotate\(-8deg\)/);
});

test("base BW filter always forces full grayscale and drops sepia", () => {
  const css = buildBaseBWFilterCSS({ ...DEFAULT_ADJUST, sepia: 80, contrast: 130 });
  assert.match(css, /grayscale\(1\)/);
  assert.doesNotMatch(css, /sepia/);
  assert.match(css, /contrast\(1\.3\)/);
});

test("every preset has a unique id and a valid adjust", () => {
  const ids = new Set(PRESETS.map((p) => p.id));
  assert.equal(ids.size, PRESETS.length);
  for (const p of PRESETS) {
    assert.ok(typeof p.name === "string" && p.name.length > 0);
    assert.ok(p.adjust.brightness >= 0);
  }
});

test("getPreset resolves known and unknown ids", () => {
  assert.equal(getPreset("noir")?.name, "Noir");
  assert.equal(getPreset("nope"), undefined);
});

test("applyAdjustPixels grayscale makes channels equal (the Safari path)", () => {
  const d = new Uint8ClampedArray([200, 50, 20, 255]);
  applyAdjustPixels(d, { ...DEFAULT_ADJUST, grayscale: 100 });
  assert.equal(d[0], d[1]);
  assert.equal(d[1], d[2]);
  assert.ok(d[0] > 50 && d[0] < 130); // luminance of the pixel
});

test("applyAdjustPixels brightness scales up, default is a no-op", () => {
  const same = new Uint8ClampedArray([100, 120, 140, 255]);
  applyAdjustPixels(same, DEFAULT_ADJUST);
  assert.deepEqual([...same], [100, 120, 140, 255]);
  const up = new Uint8ClampedArray([100, 100, 100, 255]);
  applyAdjustPixels(up, { ...DEFAULT_ADJUST, brightness: 150 });
  assert.equal(up[0], 150);
});

test("applyAdjustPixels clamps to 0..255", () => {
  const d = new Uint8ClampedArray([250, 250, 250, 255]);
  applyAdjustPixels(d, { ...DEFAULT_ADJUST, brightness: 200 });
  assert.equal(d[0], 255);
});
