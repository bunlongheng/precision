import { test } from "node:test";
import assert from "node:assert/strict";
import { rotatedDims, mapPoint, aspectRect } from "../lib/crop.ts";

test("rotatedDims swaps width/height on odd quarter-turns", () => {
  assert.deepEqual(rotatedDims(100, 60, 0), { w: 100, h: 60 });
  assert.deepEqual(rotatedDims(100, 60, 1), { w: 60, h: 100 });
  assert.deepEqual(rotatedDims(100, 60, 2), { w: 100, h: 60 });
  assert.deepEqual(rotatedDims(100, 60, 3), { w: 60, h: 100 });
});

test("mapPoint at quarter 0 with no crop is identity", () => {
  assert.deepEqual(mapPoint(10, 20, 100, 60, 0, { x: 0, y: 0, w: 100, h: 60 }), { x: 10, y: 20 });
});

test("mapPoint sends the top-left corner to the right corner when rotated 90 CW", () => {
  // W=100 H=60; after 90 CW the oriented space is 60x100.
  const full = { x: 0, y: 0, w: 60, h: 100 };
  assert.deepEqual(mapPoint(0, 0, 100, 60, 1, full), { x: 60, y: 0 }); // top-left -> top-right
  assert.deepEqual(mapPoint(100, 0, 100, 60, 1, full), { x: 60, y: 100 }); // top-right -> bottom-right
});

test("mapPoint applies the crop offset", () => {
  assert.deepEqual(mapPoint(50, 40, 100, 60, 0, { x: 10, y: 5, w: 20, h: 20 }), { x: 40, y: 35 });
});

test("aspectRect centers the largest matching rect and null fills the box", () => {
  assert.deepEqual(aspectRect(100, 60, null), { x: 0, y: 0, w: 100, h: 60 });
  // 1:1 in a 100x60 box -> 60x60 centered.
  assert.deepEqual(aspectRect(100, 60, 1), { x: 20, y: 0, w: 60, h: 60 });
  // 16:9 in a 100x60 box -> width-bound 100 x 56.25 centered.
  const wide = aspectRect(100, 60, 16 / 9);
  assert.equal(Math.round(wide.w), 100);
  assert.ok(wide.y > 0 && wide.x === 0);
});
