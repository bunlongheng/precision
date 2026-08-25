import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clamp,
  fitContain,
  fitCover,
  capSize,
  rotatePoint,
  hitRect,
  screenToDoc,
} from "../lib/geometry.ts";

test("clamp bounds a value", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(99, 0, 10), 10);
});

test("fitContain centers and preserves aspect", () => {
  const r = fitContain(200, 100, 100, 100); // wide image in square box
  assert.equal(r.w, 100);
  assert.equal(r.h, 50);
  assert.equal(r.y, 25);
  assert.equal(r.x, 0);
});

test("fitCover fills and overflows", () => {
  const r = fitCover(200, 100, 100, 100);
  assert.equal(r.h, 100);
  assert.equal(r.w, 200);
  assert.equal(r.x, -50);
});

test("capSize shrinks oversize photos and keeps aspect", () => {
  const r = capSize(6000, 3000, 2048);
  assert.equal(r.w, 2048);
  assert.equal(r.h, 1024);
});

test("capSize leaves small images untouched", () => {
  const r = capSize(800, 600, 2048);
  assert.deepEqual(r, { w: 800, h: 600 });
});

test("rotatePoint by 90deg around origin", () => {
  const p = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, 90);
  assert.ok(Math.abs(p.x - 0) < 1e-9);
  assert.ok(Math.abs(p.y - 1) < 1e-9);
});

test("hitRect respects rotation", () => {
  const rect = { x: 0, y: 0, w: 100, h: 20 };
  assert.equal(hitRect({ x: 90, y: 10 }, rect, 0), true);
  // After rotating the rect 90deg, a point far along the old x-axis misses.
  assert.equal(hitRect({ x: 90, y: 10 }, rect, 90), false);
});

test("screenToDoc inverts the contain fit", () => {
  const stage = { x: 0, y: 0, w: 200, h: 200 };
  // 100x100 doc centered in a 200x200 stage renders at scale 2, no offset.
  const p = screenToDoc({ x: 100, y: 100 }, stage, 100, 100);
  assert.ok(Math.abs(p.x - 50) < 1e-9);
  assert.ok(Math.abs(p.y - 50) < 1e-9);
});
