const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

function load(file) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(resolve(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("exports", source)(exports);
  return exports;
}
const { selectRoutine, buildRoutinePlan } = load("src/lib/routines/plan.ts");
const { isoWeekday } = load("src/lib/workout/periods.ts");

test("Monday's routine is selected using the user's day, with explicit and free overrides", () => {
  const routines = [{ id: "monday", weekdays: [1, 4] }, { id: "tuesday", weekdays: [2] }];
  const instant = new Date("2026-09-28T00:30:00Z");
  assert.equal(selectRoutine(routines, undefined, isoWeekday(instant, "Europe/Lisbon"), false).id, "monday");
  assert.equal(selectRoutine(routines, undefined, isoWeekday(instant, "America/Sao_Paulo"), false), null);
  assert.equal(selectRoutine(routines, "tuesday", 1, false).id, "tuesday");
  assert.equal(selectRoutine(routines, "foreign", 1, false), null);
  assert.equal(selectRoutine(routines, undefined, 1, true), null);
});

test("saved exercise order, sets, repetitions and exact timed duration reach the workout", () => {
  const exercises = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
  const rows = [
    { exercise_id: "a", position: 2, target_sets: 3, target_reps: 12, target_duration_s: null },
    { exercise_id: "b", position: 1, target_sets: 1, target_reps: null, target_duration_s: 90 },
    { exercise_id: "inactive", position: 0, target_sets: 2, target_reps: 8, target_duration_s: null },
  ];
  const plan = buildRoutinePlan({ id: "monday", name: "Segunda" }, rows, exercises);
  assert.deepEqual(plan.entries.map((entry) => entry.exercise.id), ["b", "a"]);
  assert.equal(plan.entries[0].durationS, 90);
  assert.equal(plan.entries[1].sets, 3);
  assert.equal(plan.entries[1].reps, 12);
  assert.equal(rows[0].exercise_id, "a", "input is not mutated");
  assert.deepEqual(buildRoutinePlan({ id: "empty", name: "Empty" }, [], exercises).entries, []);
});

test("offline cache keeps each routine and free workout separate", async () => {
  const cache = new Map([["/offline.html", new Response("offline")]]);
  let online = true;
  const caches = {
    open: async () => ({ put: async (key, response) => cache.set(key, response) }),
    match: async (key) => cache.get(key)?.clone(),
    delete: async () => true,
  };
  const fetch = async (request) => {
    if (!online) throw new Error("offline");
    return new Response(new URL(request.url).search);
  };
  const source = readFileSync(resolve(__dirname, "../public/sw.js"), "utf8");
  const navigate = new Function("self", "caches", "fetch", `${source}; return navegar;`)(
    { addEventListener() {} }, caches, fetch,
  );
  const visit = (query) => {
    const url = new URL(`https://test.invalid/pt-pt/treino${query}`);
    return navigate(new Request(url), url);
  };
  for (const query of ["?rotina=monday", "?rotina=tuesday", "?livre=1"]) await visit(query);
  online = false;
  for (const query of ["?rotina=monday", "?rotina=tuesday", "?livre=1"]) {
    assert.equal(await (await visit(query)).text(), query);
  }
  assert.equal(await (await visit("?rotina=unknown")).text(), "offline");
});
