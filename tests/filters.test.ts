import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildFilterCSS,
  buildBaseBWFilterCSS,
  PRESETS,
  getPreset,
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
