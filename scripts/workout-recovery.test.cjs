const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

function load(path, storage, client) {
  const source = ts.transpileModule(readFileSync(resolve(__dirname, "../src/lib/workout", path), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", "localStorage", "navigator", source)((name) => {
    if (name === "@/lib/supabase/client") return { createClient: () => client };
    if (name === "server-only") return {};
    if (name === "./draft") return load("draft.ts", storage);
    throw new Error(`Unexpected dependency ${name}`);
  }, exports, storage, { onLine: true });
  return exports;
}

function setup() {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  const tables = { workout_sessions: new Map(), workout_sets: new Map() };
  let offline = true;
  let loseResponse = false;
  const client = {
    from(table) {
      let op, row, options;
      const filters = [];
      const query = {
        upsert(value, opts) { op = "upsert"; row = { ...value }; options = opts; return this; },
        update(value) { op = "update"; row = value; return this; },
        delete() { op = "delete"; return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        abortSignal() { return this; },
        then(resolve) {
          if (offline) return Promise.resolve({ error: new Error("offline") }).then(resolve);
          if (op === "upsert") {
            assert.equal(options.ignoreDuplicates, true);
            if (table === "workout_sets" && !tables.workout_sessions.has(row.session_id)) {
              return Promise.resolve({ error: new Error("foreign key") }).then(resolve);
            }
            if (!tables[table].has(row.id)) tables[table].set(row.id, row);
          } else {
            assert.ok(filters.some(([k]) => k === "user_id"), "every mutation has an owner filter");
            for (const [id, value] of tables[table]) {
              if (filters.every(([k, v]) => value[k] === v)) {
                if (op === "delete") tables[table].delete(id);
                else Object.assign(value, row);
              }
            }
          }
          const error = loseResponse ? new Error("response lost after commit") : null;
          loseResponse = false;
          return Promise.resolve({ error }).then(resolve);
        },
      };
      return query;
    },
  };
  return {
    storage, tables, data,
    store: load("store.ts", storage, client), draft: load("draft.ts", storage),
    reload: () => load("store.ts", storage, client),
    online: () => { offline = false; }, loseResponse: () => { loseResponse = true; },
  };
}

function set(sessionId, userId = "owner") {
  return {
    session_id: sessionId, user_id: userId, exercise_id: null, exercise_name: "Agachamento",
    position: 1, weight_kg: 25, reps: 8, rir: 2, duration_s: null, intensity_zone: null,
    tempo_eccentric_s: 3, tempo_pause_s: 1, tempo_concentric_s: 1, rest_seconds: null,
  };
}

test("draft survives a new browser session with unfinished form, rest and counters", () => {
  const s = setup();
  const draft = {
    ...s.draft.emptyDraft("owner"), sessionId: "session", step: "logging",
    exercise: { id: "exercise", name: "Agachamento", tracking: "reps" },
    weight: "27.5", actualReps: 7, timerElapsed: 65, metronomeElapsed: 35,
    restEndsAt: Date.now() + 60000, logged: [{ exercise: "Agachamento", reps: 8, weight: 25, volume: 200 }],
  };
  s.draft.writeDraft(draft);
  assert.deepEqual(load("draft.ts", s.storage).readDraft("owner"), draft);
  assert.equal(s.draft.readDraft("other"), null);
  s.draft.clearDraft("owner");
  assert.equal(s.draft.readDraft("owner"), null);
});

test("invalid or mismatched drafts never break recovery", () => {
  const s = setup();
  for (const value of ["{", "null", "{}", JSON.stringify({ ...s.draft.emptyDraft("other"), userId: "other" })]) {
    s.storage.setItem("axon-treino-em-curso-v1:owner", value);
    assert.equal(s.draft.readDraft("owner"), null);
  }
});

test("offline start, sets and finish survive reload and sync in order without reopening", async () => {
  const s = setup();
  const { id } = await s.store.startSession("owner", "routine");
  await s.store.logSet(set(id));
  await s.store.endSession(id, "owner");
  await s.store.flushQueue("owner");
  assert.equal(s.store.isSessionClosed(id, "owner"), true);
  assert.equal(s.tables.workout_sessions.size, 0);
  s.online();
  const reloaded = s.reload();
  await reloaded.flushQueue("owner");
  assert.equal(s.tables.workout_sessions.get(id).routine_id, "routine");
  assert.ok(s.tables.workout_sessions.get(id).ended_at);
  assert.equal(s.tables.workout_sets.size, 1);
  assert.equal(reloaded.pendingCount("owner"), 0);
  await reloaded.flushQueue("owner");
  assert.equal(s.tables.workout_sets.size, 1);
  assert.equal(reloaded.isSessionClosed(id, "owner"), true);
  await assert.rejects(reloaded.logSet(set(id)), /closed/);
});

test("lost server response and simultaneous flushes do not duplicate sessions or sets", async () => {
  const s = setup();
  const { id } = await s.store.startSession("owner");
  await s.store.flushQueue("owner");
  s.online(); s.loseResponse();
  await s.store.flushQueue("owner");
  assert.equal(s.tables.workout_sessions.size, 1);
  await s.store.flushQueue("owner");
  s.loseResponse();
  await s.store.logSet(set(id));
  await s.store.flushQueue("owner");
  assert.equal(s.tables.workout_sets.size, 1);
  await Promise.all([s.store.flushQueue("owner"), s.store.flushQueue("owner")]);
  assert.equal(s.tables.workout_sessions.size, 1);
  assert.equal(s.tables.workout_sets.size, 1);
  assert.equal(s.store.pendingCount("owner"), 0);
});

test("discard removes only this workout and its sets, including offline writes", async () => {
  const s = setup();
  const { id } = await s.store.startSession("owner");
  const other = await s.store.startSession("other");
  await s.store.logSet(set(id));
  await s.store.logSet(set(other.id, "other"));
  await s.store.discardSession(id, "owner");
  await s.store.flushQueue("owner");
  s.online();
  const reloaded = s.reload();
  await reloaded.flushQueue("owner");
  assert.equal(s.tables.workout_sessions.size, 0);
  assert.equal(s.tables.workout_sets.size, 0);
  assert.equal(reloaded.pendingCount("other"), 1, "other user's queue remains untouched");
  await reloaded.flushQueue("other");
  assert.equal(s.tables.workout_sessions.size, 1);
  assert.equal(s.tables.workout_sets.size, 1);
  assert.ok(s.tables.workout_sessions.has(other.id));
});

test("storage failure is surfaced instead of pretending progress was saved", async () => {
  const s = setup();
  s.storage.setItem = () => { throw new Error("storage full"); };
  assert.throws(() => s.draft.writeDraft(s.draft.emptyDraft("owner")), /storage full/);
  await assert.rejects(s.store.startSession("owner"), /storage full/);
  await assert.rejects(s.store.endSession("session", "owner"), /storage full/);
});

test("server fallback recovers the original session, routine and complete set history", async () => {
  const s = setup();
  const calls = [];
  const client = { from(table) {
    const filters = [];
    calls.push({ table, filters });
    const query = {
      select() { return this; }, eq(k, v) { filters.push([k, v]); return this; },
      is(k, v) { filters.push([k, v]); return this; }, order() { return this; }, limit() { return this; },
      async maybeSingle() { return { data: { id: "session", routine_id: "routine", started_at: "2026-09-28T10:00:00Z" } }; },
      then(resolve) { return Promise.resolve({ data: [
        { exercise_name: "Agachamento", weight_kg: 25, reps: 8, duration_s: null, position: 1 },
        { exercise_name: "Corrida", weight_kg: null, reps: null, duration_s: 60, position: 2 },
      ], error: null }).then(resolve); },
    };
    return query;
  } };
  const draft = await load("recovery.ts", s.storage).loadOpenWorkout(client, "owner");
  assert.equal(draft.sessionId, "session");
  assert.equal(draft.routineId, "routine");
  assert.equal(draft.startedAt, Date.parse("2026-09-28T10:00:00Z"));
  assert.equal(draft.logged[0].volume, 200);
  assert.equal(draft.logged[1].duration, 60);
  assert.equal(draft.logged.length, 2);
  assert.ok(calls.every((c) => c.filters.some(([k, v]) => k === "user_id" && v === "owner")));
  assert.ok(calls[1].filters.some(([k, v]) => k === "session_id" && v === "session"));
});
