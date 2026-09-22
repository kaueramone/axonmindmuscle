const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

const source = ts.transpileModule(
  readFileSync(resolve(__dirname, "../src/lib/routines/actions.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

// Exercise authorization and failure handling without touching production data.
function setup({ user = { id: "owner" }, rows, fail = false } = {}) {
  rows ??= [{ id: "routine", user_id: "owner", name: "Terça 25/8/3026", archived_at: null }];
  let clients = 0;
  const invalidations = [];
  const client = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      assert.equal(table, "routines");
      const filters = [];
      let changes;
      return {
        update(value) { changes = value; return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        is(key, value) { filters.push([key, value]); return this; },
        select() { return this; },
        async maybeSingle() {
          if (fail) return { data: null, error: { message: "unavailable" } };
          const row = rows.find((r) => filters.every(([key, value]) => r[key] === value));
          if (row) Object.assign(row, changes);
          return { data: row ? { id: row.id } : null, error: null };
        },
      };
    },
  };
  const exports = {};
  new Function("require", "exports", source)((name) => {
    if (name === "next/cache") return { revalidatePath: (...args) => invalidations.push(args) };
    if (name === "@/lib/supabase/server") return { createClient: async () => { clients++; return client; } };
    throw new Error(`Unexpected dependency: ${name}`);
  }, exports);
  return { rename: exports.renameRoutineAction, rows, invalidations, clients: () => clients };
}

test("renames own routine, trims whitespace and invalidates dependent pages", async () => {
  const s = setup();
  assert.equal((await s.rename("routine", "  Terça 25/8/2026  ")).ok, true);
  assert.equal(s.rows[0].name, "Terça 25/8/2026");
  assert.deepEqual(s.invalidations, [["/", "layout"]]);
});

test("rejects empty, oversized and non-string names before accessing the database", async () => {
  const s = setup();
  for (const name of ["", "   ", "x".repeat(61), null, 3026]) {
    assert.equal((await s.rename("routine", name)).ok, false);
  }
  assert.equal(s.clients(), 0);
  assert.equal(s.rows[0].name, "Terça 25/8/3026");
});

test("accepts a 60-character name", async () => {
  const s = setup();
  assert.equal((await s.rename("routine", "x".repeat(60))).ok, true);
});

test("requires a signed-in user", async () => {
  const s = setup({ user: null });
  assert.equal((await s.rename("routine", "Pernas")).ok, false);
  assert.equal(s.rows[0].name, "Terça 25/8/3026");
  assert.equal(s.invalidations.length, 0);
});

test("does not rename someone else's routine or report success", async () => {
  const s = setup({ user: { id: "other" } });
  assert.equal((await s.rename("routine", "Pernas")).ok, false);
  assert.equal(s.rows[0].name, "Terça 25/8/3026");
  assert.equal(s.invalidations.length, 0);
});

test("does not rename archived or missing routines", async () => {
  const s = setup();
  s.rows[0].archived_at = "2026-09-22T10:00:00Z";
  for (const id of ["routine", "missing"]) {
    assert.equal((await s.rename(id, "Pernas")).ok, false);
  }
  assert.equal(s.rows[0].name, "Terça 25/8/3026");
  assert.equal(s.invalidations.length, 0);
});

test("does not report success when the database rejects the update", async () => {
  const s = setup({ fail: true });
  assert.equal((await s.rename("routine", "Pernas")).ok, false);
  assert.equal(s.rows[0].name, "Terça 25/8/3026");
  assert.equal(s.invalidations.length, 0);
});
