import { test } from "node:test";
import assert from "node:assert/strict";
import { hexToRgba, luminance, readableInk } from "../lib/color.ts";

test("hexToRgba expands shorthand and applies alpha", () => {
  assert.equal(hexToRgba("#fff", 0.5), "rgba(255,255,255,0.5)");
  assert.equal(hexToRgba("#000000"), "rgba(0,0,0,1)");
});

test("hexToRgba clamps alpha and rejects garbage", () => {
  assert.equal(hexToRgba("#00ff00", 2), "rgba(0,255,0,1)");
  assert.equal(hexToRgba("nope"), "rgba(0,0,0,1)");
});

test("luminance orders dark below light", () => {
  assert.ok(luminance("#000000") < luminance("#808080"));
  assert.ok(luminance("#808080") < luminance("#ffffff"));
});

test("readableInk picks contrasting ink", () => {
  assert.equal(readableInk("#ffffff"), "#0d0d0f");
  assert.equal(readableInk("#000000"), "#ffffff");
});
