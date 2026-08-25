import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createHistory,
  push,
  replace,
  undo,
  redo,
  canUndo,
  canRedo,
} from "../lib/history.ts";

test("push records undo steps and clears redo", () => {
  let h = createHistory(0);
  h = push(h, 1);
  h = push(h, 2);
  assert.equal(h.present, 2);
  assert.equal(canUndo(h), true);
  assert.equal(canRedo(h), false);
});

test("undo and redo move through the timeline", () => {
  let h = createHistory("a");
  h = push(h, "b");
  h = push(h, "c");
  h = undo(h);
  assert.equal(h.present, "b");
  h = undo(h);
  assert.equal(h.present, "a");
  assert.equal(canUndo(h), false);
  h = redo(h);
  assert.equal(h.present, "b");
});

test("push after undo drops the redo branch", () => {
  let h = createHistory(0);
  h = push(h, 1);
  h = undo(h);
  h = push(h, 9);
  assert.equal(h.present, 9);
  assert.equal(canRedo(h), false);
});

test("replace changes present without an undo step", () => {
  let h = createHistory(0);
  h = push(h, 1);
  const before = h.past.length;
  h = replace(h, 5);
  assert.equal(h.present, 5);
  assert.equal(h.past.length, before);
});

test("history respects its limit", () => {
  let h = createHistory(0, 3);
  for (let i = 1; i <= 10; i++) h = push(h, i);
  assert.ok(h.past.length <= 3);
  assert.equal(h.present, 10);
});
