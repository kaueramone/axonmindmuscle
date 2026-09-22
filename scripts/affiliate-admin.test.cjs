const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

function load(file, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(resolve(__dirname, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  new Function("require", "exports", source)((name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected import: ${name}`);
  }, exports);
  return exports;
}

const { affiliateOverview } = load("../src/lib/affiliates/overview.ts");
test("overview totals include affiliates beyond the displayed page", async () => {
  const items = Array.from({ length: 51 }, (_, n) => ({
    id: String(n), enabled: n % 2 === 0, signups: 10, sales: 6, pending: 4, paid: 2,
  }));
  const requests = [];
  const result = await affiliateOverview(async (page) => {
    requests.push(page);
    return { total: items.length, items: items.slice(page * 25, (page + 1) * 25) };
  }, 1);
  assert.deepEqual(result.totals, { affiliates: 51, active: 26, signups: 510, sales: 306, pending: 204, paid: 102 });
  assert.equal(result.list.items.length, 25);
  assert.equal(result.list.items[0].id, "25");
  assert.deepEqual(requests.sort(), [0, 1, 2]);
});
test("overview does not show partial totals when another page fails", async () => {
  await assert.rejects(affiliateOverview(async page => {
    if (page > 0) throw new Error("database unavailable");
    return { total: 26, items: [] };
  }, 0), /database unavailable/);
});
test("empty overview has zero counters", async () => {
  const result = await affiliateOverview(async () => ({ total: 0, items: [] }), 0);
  assert.equal(result.totals.pending, 0);
  assert.equal(result.totals.affiliates, 0);
});

const userId = "11111111-1111-4111-8111-111111111111";
function setup(isAdmin, accountError = null) {
  const calls = [], invalidations = [];
  const shared = load("../src/lib/affiliates/shared.ts");
  const actions = load("../src/lib/affiliates/actions.ts", {
    "./shared": shared,
    "next/cache": { revalidatePath: (...args) => invalidations.push(args) },
    "@/lib/supabase/server": { createClient: async () => ({ rpc: async (name, args) => {
      calls.push({ name, args });
      return name === "is_admin" ? { data: isAdmin, error: null } : { data: "affiliate-id", error: null };
    } }) },
    "@/lib/supabase/admin": { createAdminClient: () => ({ auth: { admin: { getUserById: async id => {
      calls.push({ name: "getUserById", id });
      return { data: { user: { email: "selected@example.invalid" } }, error: accountError };
    } } } }) },
  });
  return { ...actions, calls, invalidations };
}
test("only an admin can resolve an account and enable its affiliation", async () => {
  const denied = setup(false);
  assert.equal((await denied.enableUserAffiliate(userId)).ok, false);
  assert.deepEqual(denied.calls.map(c => c.name), ["is_admin"]);
  const allowed = setup(true);
  assert.equal((await allowed.enableUserAffiliate(userId)).ok, true);
  assert.deepEqual(allowed.calls.map(c => c.name), ["is_admin", "getUserById", "admin_enable_affiliate"]);
  assert.equal(allowed.calls[1].id, userId);
  assert.equal(allowed.calls[2].args.p_email, "selected@example.invalid");
  assert.equal(allowed.invalidations.length, 1);
});
test("invalid or unavailable accounts cannot be enabled", async () => {
  const invalid = setup(true);
  assert.equal((await invalid.enableUserAffiliate("invalid")).ok, false);
  assert.equal(invalid.calls.length, 0);
  const missing = setup(true, { message: "missing" });
  assert.equal((await missing.enableUserAffiliate(userId)).ok, false);
  assert.equal(missing.calls.length, 2);
  assert.equal(missing.invalidations.length, 0);
});
