import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";

test("affiliate database: attribution, access controls, first sale and partial payments", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text, created_at timestamptz default now(), raw_user_meta_data jsonb default '{}');
      create table public.profiles(id uuid primary key references auth.users(id) on delete cascade, display_name text, role text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      create function public.is_admin() returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
      grant usage on schema auth, public to anon, authenticated, service_role;
      grant execute on function auth.uid() to authenticated, service_role;
    `);
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/20260922_afiliados.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const q = async (sql, args = []) => (await db.query(sql, args)).rows;
    const value = async (sql, args = []) => (await q(sql, args))[0].value;
    const admin = randomUUID(),
      affiliate = randomUUID(),
      other = randomUUID();
    for (const [id, email, role] of [
      [admin, "admin@test.invalid", "admin"],
      [affiliate, "affiliate@test.invalid", "user"],
      [other, "other@test.invalid", "user"],
    ]) {
      await q(
        `insert into auth.users(id,email,created_at) values($1,$2,now()-interval '1 day')`,
        [id, email],
      );
      await q(`insert into profiles values($1,$2,$3)`, [id, email, role]);
    }
    const session = async (id, role = "authenticated") => {
      await db.exec("reset role");
      await q(`select set_config('request.jwt.claim.sub',$1,false)`, [
        id ?? "",
      ]);
      await db.exec(`set role ${role}`);
    };
    await session(other);
    await assert.rejects(
      q(`select admin_enable_affiliate('affiliate@test.invalid')`),
      /forbidden/,
    );
    await session(admin);
    const affiliateId = await value(
      `select admin_enable_affiliate('affiliate@test.invalid') as value`,
    );
    assert.equal(
      await value(
        `select admin_enable_affiliate('affiliate@test.invalid') as value`,
      ),
      affiliateId,
    );
    const code = (
      await q(`select code from affiliates where id=$1`, [affiliateId])
    )[0].code;
    const otherId = await value(
      `select admin_enable_affiliate('other@test.invalid') as value`,
    );
    await session(null, "service_role");
    assert.equal(
      await value(`select affiliate_visit('invalid') as value`),
      null,
    );
    const visit = await value(`select affiliate_visit($1) as value`, [code]);
    assert.equal(
      await value(`select affiliate_visit('other-code',$1) as value`, [visit]),
      visit,
    );
    // Existing accounts and self-referrals must not be captured.
    await q(`select affiliate_attach($1,$2)`, [affiliate, visit]);
    await q(`select affiliate_attach($1,$2)`, [other, visit]);
    await db.exec("reset role");
    assert.equal(
      await value("select count(*)::int as value from affiliate_referrals"),
      0,
    );
    const users = [];
    for (let i = 0; i < 21; i++) {
      const id = randomUUID();
      users.push(id);
      await q(
        `insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)`,
        [
          id,
          `person${i}@test.invalid`,
          JSON.stringify({ affiliate_visit: visit }),
        ],
      );
    }
    assert.equal(
      await value("select count(*)::int as value from affiliate_referrals"),
      21,
    );
    // Changing user metadata later does not reattribute accounts.
    await q(`update auth.users set raw_user_meta_data='{}' where id=$1`, [
      users[0],
    ]);
    const otherCode = (
      await q("select code from affiliates where id=$1", [otherId])
    )[0].code;
    await session(null, "service_role");
    const otherVisit = await value("select affiliate_visit($1) as value", [
      otherCode,
    ]);
    await q("select affiliate_attach($1,$2)", [users[0], otherVisit]);
    for (let i = 0; i < 20; i++) {
      await q(`select affiliate_convert($1,$2,$3,now())`, [
        users[i],
        `in_${i}`,
        `sub_${i}`,
      ]);
      await q(`select affiliate_convert($1,$2,$3,now())`, [
        users[i],
        `renewal_${i}`,
        `sub_${i}`,
      ]);
    }
    // A delayed older invoice corrects the date without creating a second sale.
    await q(`select affiliate_convert($1,'in_earliest','sub_0',
      (select created_at from affiliate_referrals where user_id=$1))`, [users[0]]);
    assert.equal(await value('select invoice_id as value from affiliate_referrals where user_id=$1', [users[0]]), 'in_earliest');
    await session(affiliate);
    let dashboard = await value("select affiliate_dashboard() as value");
    assert.equal(dashboard.signups, 21);
    assert.equal(dashboard.sales, 20);
    assert.equal(dashboard.pending, 20);
    assert.equal(dashboard.paid, 0);
    await assert.rejects(
      q("select affiliate_dashboard($1)", [otherId]),
      /forbidden/,
    );
    await assert.rejects(
      q(`select admin_pay_affiliate($1,10,$2)`, [affiliateId, randomUUID()]),
      /forbidden/,
    );
    await assert.rejects(
      q(`update affiliates set enabled=false`),
      /permission denied/,
    );
    await assert.rejects(
      q(`select * from affiliate_referrals`),
      /permission denied/,
    );
    await assert.rejects(
      q(`select affiliate_convert($1,'fake','fake',now())`, [users[20]]),
      /permission denied/,
    );
    await session(admin);
    const request = randomUUID();
    for (let i = 0; i < 2; i++)
      assert.equal(
        await value("select admin_pay_affiliate($1,10,$2) as value", [
          affiliateId,
          request,
        ]),
        request,
      );
    dashboard = await value("select affiliate_dashboard($1) as value", [
      affiliateId,
    ]);
    assert.equal(dashboard.pending, 10);
    assert.equal(dashboard.paid, 10);
    assert.equal(dashboard.payoutCount, 1);
    await assert.rejects(
      q("select admin_pay_affiliate($1,9,$2)", [affiliateId, request]),
      /request_conflict/,
    );
    for (const n of [0, -1, 11])
      await assert.rejects(
        q("select admin_pay_affiliate($1,$2,$3)", [
          affiliateId,
          n,
          randomUUID(),
        ]),
        /invalid_quantity|insufficient_pending/,
      );
    // Failed overpayments roll back; the first payout remains unchanged.
    dashboard = await value("select affiliate_dashboard($1) as value", [
      affiliateId,
    ]);
    assert.equal(dashboard.pending, 10);
    assert.equal(dashboard.payoutCount, 1);
    await q("select admin_set_affiliate($1,false)", [affiliateId]);
    await session(null, "service_role");
    assert.equal(
      await value("select affiliate_visit($1) as value", [code]),
      null,
    );
    await q(`select affiliate_convert($1,'in_last','sub_last',now())`, [
      users[20],
    ]);
    await session(affiliate);
    dashboard = await value("select affiliate_dashboard() as value");
    assert.equal(dashboard.pending, 11);
    assert.equal(dashboard.enabled, false);
    await db.exec("reset role");
    await q("delete from auth.users where id=$1", [users[0]]);
    await session(affiliate);
    dashboard = await value("select affiliate_dashboard() as value");
    assert.equal(dashboard.sales, 21);
    assert.equal(dashboard.paid, 10);
    // Expired visits cannot be used for a new signup.
    await session(admin);
    await q("select admin_set_affiliate($1,true)", [affiliateId]);
    await db.exec("reset role");
    await q(
      `update affiliate_visits set expires_at=now()-interval '1 second' where id=$1`,
      [visit],
    );
    await q(
      `insert into auth.users(id,email,raw_user_meta_data) values($1,'late@test.invalid',$2)`,
      [randomUUID(), JSON.stringify({ affiliate_visit: visit })],
    );
    assert.equal(
      await value("select count(*)::int as value from affiliate_referrals"),
      21,
    );
    // Concurrent payout requests cannot both consume the same remaining sales.
    await session(admin);
    const attempts = await Promise.allSettled([
      q("select admin_pay_affiliate($1,10,$2)", [affiliateId, randomUUID()]),
      q("select admin_pay_affiliate($1,10,$2)", [affiliateId, randomUUID()]),
    ]);
    assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
    dashboard = await value("select affiliate_dashboard($1) as value", [
      affiliateId,
    ]);
    assert.equal(dashboard.pending, 1);
    assert.equal(dashboard.paid, 20);
    await db.exec("reset role");
    await q("delete from auth.users where id=$1", [affiliate]);
    await session(admin);
    dashboard = await value("select affiliate_dashboard($1) as value", [
      affiliateId,
    ]);
    assert.equal(dashboard.name, "Conta removida");
    assert.equal(dashboard.enabled, false);
    assert.equal(dashboard.sales, 21);
    assert.equal(dashboard.paid, 20);
    await session(null, "anon");
    await assert.rejects(q("select admin_affiliates()"), /permission denied/);
    await assert.rejects(
      q("select affiliate_dashboard()"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});

function loadConversion(subscription, rpcError = null) {
  const source = ts.transpileModule(
    readFileSync(
      new URL("../src/lib/affiliates/conversion.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const exports = {},
    calls = [];
  new Function("require", "exports", "process", source)(
    (name) => {
      if (name === "server-only") return {};
      if (name === "@/lib/stripe/server")
        return {
          stripe: () => ({
            subscriptions: { retrieve: async () => subscription },
          }),
          priceIds: () => ({ month: "price_pro", year: "price_year" }),
        };
      throw Error(name);
    },
    exports,
    { env: { STRIPE_SECRET_KEY: "sk_live_test_fixture" } },
  );
  return {
    run: (invoice) =>
      exports.recordAffiliateInvoice(invoice, {
        rpc: async (name, args) => {
          calls.push({ name, args });
          return { error: rpcError };
        },
      }),
    calls,
  };
}

const invoice = {
  id: "in_1",
  status: "paid",
  amount_paid: 1000,
  livemode: true,
  parent: { subscription_details: { subscription: "sub_1" } },
  status_transitions: { paid_at: 1790071200 },
};
const subscription = {
  id: "sub_1",
  metadata: { user_id: "owner", plan: "pro" },
  items: { data: [{ price: { id: "price_pro" } }] },
};
test("only confirmed paid PRO invoices convert; zero invoices, test mode, unpaid and unrelated products do not", async () => {
  const s = loadConversion(subscription);
  for (const change of [
    { status: "open" },
    { amount_paid: 0 },
    { livemode: false },
    { parent: null },
  ])
    await s.run({ ...invoice, ...change });
  assert.equal(s.calls.length, 0);
  await s.run(invoice);
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].args.p_invoice, "in_1");
  const unrelated = loadConversion({
    ...subscription,
    metadata: { user_id: "owner" },
    items: { data: [{ price: { id: "other" } }] },
  });
  await unrelated.run(invoice);
  assert.equal(unrelated.calls.length, 0);
});
test("legacy invoice versions and database failure are handled without silent loss", async () => {
  const s = loadConversion(subscription);
  await s.run({ ...invoice, parent: null, subscription: "sub_1" });
  assert.equal(s.calls.length, 1);
  await assert.rejects(
    loadConversion(subscription, { message: "offline" }).run(invoice),
    /offline/,
  );
});
