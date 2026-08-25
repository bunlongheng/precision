// A tiny bounded undo/redo stack. Pure and generic so it is trivially testable
// and reusable for the editor document snapshots.

export type History<T> = {
  past: T[];
  present: T;
  future: T[];
  limit: number;
};

export function createHistory<T>(present: T, limit = 60): History<T> {
  return { past: [], present, future: [], limit };
}

/** Commit a new present, pushing the old one onto the undo stack. */
export function push<T>(h: History<T>, next: T): History<T> {
  const past = [...h.past, h.present];
  if (past.length > h.limit) past.shift();
  return { ...h, past, present: next, future: [] };
}

/** Replace the present without creating an undo step (for transient drags). */
export function replace<T>(h: History<T>, next: T): History<T> {
  return { ...h, present: next };
}

export function canUndo<T>(h: History<T>): boolean {
  return h.past.length > 0;
}

export function canRedo<T>(h: History<T>): boolean {
  return h.future.length > 0;
}

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  const past = [...h.past];
  const present = past.pop() as T;
  return { ...h, past, present, future: [h.present, ...h.future] };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  const [present, ...future] = h.future;
  return { ...h, past: [...h.past, h.present], present, future };
}
