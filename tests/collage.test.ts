import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COLLAGE_LIST,
  templateCount,
  makeCells,
  reshapeCells,
  cellRect,
} from "../lib/collage.ts";

test("collage list is populated with named templates", () => {
  assert.ok(COLLAGE_LIST.length >= 6);
  const grid = COLLAGE_LIST.find((t) => t.id === "grid-2x2");
  assert.equal(grid?.name, "Grid 2x2");
  assert.equal(grid?.count, 4);
});

test("makeCells creates empty cells matching the template count", () => {
  const cells = makeCells("grid-2x2");
  assert.equal(cells.length, 4);
  assert.ok(cells.every((c) => c.src === null && c.scale === 1));
});

test("reshapeCells carries over filled images", () => {
  const prev = makeCells("side-by-side");
  prev[0].src = "a";
  prev[1].src = "b";
  const next = reshapeCells("grid-2x2", prev);
  assert.equal(next.length, 4);
  assert.equal(next[0].src, "a");
  assert.equal(next[1].src, "b");
  assert.equal(next[2].src, null);
});

test("templateCount matches template definitions", () => {
  assert.equal(templateCount("single"), 1);
  assert.equal(templateCount("triptych"), 3);
  assert.equal(templateCount("film-strip"), 4);
});

test("cellRect insets by the gap and stays inside the document", () => {
  const cells = makeCells("side-by-side");
  const left = cellRect(cells[0], 1000, 1000, 20);
  const right = cellRect(cells[1], 1000, 1000, 20);
  // Left cell starts at the full gap, right cell ends at width - gap.
  assert.equal(left.x, 20);
  assert.equal(right.x + right.w, 1000 - 20);
  // The two cells do not overlap.
  assert.ok(left.x + left.w <= right.x);
});
