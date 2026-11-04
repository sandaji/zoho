/**
 * Turns the { before, after } snapshot stored on an audit row into a readable
 * list of field changes (old value -> new value).
 */
export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

// Bookkeeping columns that change on every write and say nothing about the business event.
const NOISE = new Set(["updatedAt", "updated_at"]);

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function computeFieldChanges(action: string, changes: unknown): FieldChange[] {
  const c = (changes ?? {}) as { before?: Record<string, unknown> | null; after?: Record<string, unknown> | null };
  const before = c.before ?? null;
  const after = c.after ?? null;
  const out: FieldChange[] = [];

  if (action === "CREATE" && after) {
    for (const [k, v] of Object.entries(after)) {
      if (NOISE.has(k) || v === null || v === undefined) continue;
      out.push({ field: k, from: null, to: v });
    }
    return out;
  }
  if (action === "DELETE" && before) {
    for (const [k, v] of Object.entries(before)) {
      if (NOISE.has(k) || v === null || v === undefined) continue;
      out.push({ field: k, from: v, to: null });
    }
    return out;
  }
  if (before && after) {
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (NOISE.has(k)) continue;
      if (!same(before[k], after[k])) out.push({ field: k, from: before[k] ?? null, to: after[k] ?? null });
    }
  }
  return out;
}
