-- Attribution is immutable. A sale is one referred account's first paid PRO
-- invoice. Payouts record quantities only; they do not transfer money.
begin;

create table public.affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create table public.affiliate_visits (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index affiliate_visits_expiry on public.affiliate_visits(expires_at);
create table public.affiliate_payouts (
  id uuid primary key, -- request UUID: retrying the same payment is a no-op
  affiliate_id uuid not null references public.affiliates(id),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create table public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id),
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  converted_at timestamptz,
  invoice_id text unique,
  subscription_id text,
  payout_id uuid references public.affiliate_payouts(id),
  check ((converted_at is null) = (invoice_id is null)),
  check (payout_id is null or converted_at is not null)
);
create index affiliate_referrals_history on public.affiliate_referrals(affiliate_id, created_at desc);
create index affiliate_referrals_pending on public.affiliate_referrals(affiliate_id, converted_at, id)
  where converted_at is not null and payout_id is null;
create index affiliate_payouts_history on public.affiliate_payouts(affiliate_id, created_at desc);

alter table public.affiliates enable row level security;
alter table public.affiliate_visits enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_payouts enable row level security;
revoke all on public.affiliates, public.affiliate_visits, public.affiliate_referrals, public.affiliate_payouts from anon, authenticated;
grant all on public.affiliates, public.affiliate_visits, public.affiliate_referrals, public.affiliate_payouts to service_role;
grant select on public.affiliates to authenticated;
create policy affiliates_read on public.affiliates for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Keep the quantities for reconciliation when an account is deleted, without
-- retaining the affiliate's display name or leaving an apparently active link.
create function public.affiliate_deleted_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id is null then
    new.name := 'Conta removida';
    new.enabled := false;
  end if;
  return new;
end;
$$;
create trigger affiliate_owner_deleted before update of user_id on public.affiliates
  for each row execute function public.affiliate_deleted_owner();

-- Service-only: issued by the referral route, not chosen by the browser.
create function public.affiliate_visit(p_code text, p_existing uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_affiliate uuid;
begin
  select v.id into v_id from public.affiliate_visits v
    join public.affiliates a on a.id = v.affiliate_id
    where v.id = p_existing and v.expires_at > now() and a.enabled and a.user_id is not null;
  if v_id is not null then return v_id; end if;
  select id into v_affiliate from public.affiliates
    where code = p_code and enabled and user_id is not null;
  if v_affiliate is null then return null; end if;
  insert into public.affiliate_visits(affiliate_id) values (v_affiliate) returning id into v_id;
  return v_id;
end;
$$;

-- user.created_at must follow the visit: logging into an existing account
-- through a referral link must never claim that account.
create function public.affiliate_attach(p_user uuid, p_visit uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.affiliate_referrals(affiliate_id, user_id, created_at)
    select a.id, u.id, u.created_at from auth.users u
    join public.affiliate_visits v on v.id = p_visit
    join public.affiliates a on a.id = v.affiliate_id
    where u.id = p_user and u.created_at >= v.created_at
      and u.created_at < v.expires_at and a.enabled
      and a.user_id is not null and a.user_id <> u.id
    on conflict (user_id) do nothing;
end;
$$;

-- Email signup attribution happens in the signup transaction, so confirming
-- email on another device or after the cookie expires does not lose it.
create function public.affiliate_on_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_token text := new.raw_user_meta_data ->> 'affiliate_visit';
begin
  if v_token ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    perform public.affiliate_attach(new.id, v_token::uuid);
  end if;
  return new;
end;
$$;
create trigger affiliate_signup after insert on auth.users
  for each row execute function public.affiliate_on_signup();

-- Called only after a verified Stripe paid invoice. Renewals/replays do not
-- add sales. Out-of-order delivery may correct the first invoice/date, without
-- changing a payout that has already been recorded.
create function public.affiliate_convert(p_user uuid, p_invoice text, p_subscription text, p_paid_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_invoice is null or p_subscription is null or p_paid_at is null then
    raise exception 'invalid conversion';
  end if;
  update public.affiliate_referrals set converted_at = p_paid_at,
    invoice_id = p_invoice, subscription_id = p_subscription
    where user_id = p_user and (converted_at is null or p_paid_at < converted_at)
      and created_at <= p_paid_at;
end;
$$;

create function public.admin_enable_affiliate(p_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_name text; v_id uuid;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'forbidden'; end if;
  select u.id, coalesce(nullif(p.display_name, ''), u.email) into v_user, v_name
    from auth.users u join public.profiles p on p.id = u.id
    where lower(u.email) = lower(trim(p_email));
  if v_user is null then raise exception 'account_not_found'; end if;
  insert into public.affiliates(user_id, name, created_by) values(v_user, v_name, auth.uid())
    on conflict(user_id) do update set enabled = true returning id into v_id;
  return v_id;
end;
$$;

create function public.admin_set_affiliate(p_affiliate uuid, p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'forbidden'; end if;
  update public.affiliates set enabled = p_enabled where id = p_affiliate;
  if not found then raise exception 'affiliate_not_found'; end if;
end;
$$;

create function public.admin_pay_affiliate(p_affiliate uuid, p_quantity integer, p_request uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_existing public.affiliate_payouts; v_ids uuid[];
begin
  if not coalesce(public.is_admin(), false) then raise exception 'forbidden'; end if;
  if p_quantity is null or p_quantity < 1 or p_request is null then raise exception 'invalid_quantity'; end if;
  -- Serialize payouts for this affiliate. All selections and updates are in
  -- this transaction: no counters can become negative under concurrent admins.
  perform 1 from public.affiliates where id = p_affiliate for update;
  if not found then raise exception 'affiliate_not_found'; end if;
  select * into v_existing from public.affiliate_payouts where id = p_request;
  if found then
    if v_existing.affiliate_id <> p_affiliate or v_existing.quantity <> p_quantity then
      raise exception 'request_conflict';
    end if;
    return v_existing.id;
  end if;
  select array_agg(s.id) into v_ids from (
    select id from public.affiliate_referrals
    where affiliate_id = p_affiliate and converted_at is not null and payout_id is null
    order by converted_at, id limit p_quantity for update
  ) s;
  if coalesce(cardinality(v_ids), 0) <> p_quantity then raise exception 'insufficient_pending'; end if;
  insert into public.affiliate_payouts(id, affiliate_id, quantity, created_by)
    values(p_request, p_affiliate, p_quantity, auth.uid());
  update public.affiliate_referrals set payout_id = p_request where id = any(v_ids);
  return p_request;
end;
$$;

create function public.affiliate_dashboard(p_affiliate uuid default null, p_ref_page integer default 0, p_pay_page integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_affiliate public.affiliates; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  select * into v_affiliate from public.affiliates
    where (p_affiliate is null and user_id = auth.uid()) or id = p_affiliate;
  if not found then return null; end if;
  if v_affiliate.user_id is distinct from auth.uid() and not coalesce(public.is_admin(), false) then
    raise exception 'forbidden';
  end if;
  select jsonb_build_object(
    'id', v_affiliate.id, 'name', v_affiliate.name, 'code', v_affiliate.code, 'enabled', v_affiliate.enabled,
    'signups', count(*), 'sales', count(*) filter(where converted_at is not null),
    'pending', count(*) filter(where converted_at is not null and payout_id is null),
    'paid', count(*) filter(where payout_id is not null)
  ) into v_result from public.affiliate_referrals where affiliate_id = v_affiliate.id;
  return v_result || jsonb_build_object(
    'referrals', coalesce((select jsonb_agg(to_jsonb(r)) from (
      select id, created_at, converted_at, (payout_id is not null) as paid
      from public.affiliate_referrals where affiliate_id = v_affiliate.id
      order by created_at desc, id limit 25 offset greatest(0, least(coalesce(p_ref_page, 0), 100000)) * 25
    ) r), '[]'::jsonb),
    'payoutCount', (select count(*) from public.affiliate_payouts where affiliate_id = v_affiliate.id),
    'payouts', coalesce((select jsonb_agg(to_jsonb(p)) from (
      select id, quantity, created_at from public.affiliate_payouts where affiliate_id = v_affiliate.id
      order by created_at desc, id limit 25 offset greatest(0, least(coalesce(p_pay_page, 0), 100000)) * 25
    ) p), '[]'::jsonb)
  );
end;
$$;

create function public.admin_affiliates(p_page integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'forbidden'; end if;
  return jsonb_build_object('total', (select count(*) from public.affiliates), 'items',
    coalesce((select jsonb_agg(to_jsonb(a)) from (
      select a.id, a.name, a.code, a.enabled, u.email,
        count(r.id) as signups, count(r.converted_at) as sales,
        count(r.id) filter(where r.converted_at is not null and r.payout_id is null) as pending,
        count(r.payout_id) as paid
      from public.affiliates a left join auth.users u on u.id = a.user_id
      left join public.affiliate_referrals r on r.affiliate_id = a.id
      group by a.id, u.email order by a.created_at desc, a.id
      limit 25 offset greatest(0, least(coalesce(p_page, 0), 100000)) * 25
    ) a), '[]'::jsonb));
end;
$$;

revoke all on function public.affiliate_deleted_owner(), public.affiliate_visit(text, uuid), public.affiliate_attach(uuid, uuid),
  public.affiliate_on_signup(), public.affiliate_convert(uuid, text, text, timestamptz),
  public.admin_enable_affiliate(text), public.admin_set_affiliate(uuid, boolean),
  public.admin_pay_affiliate(uuid, integer, uuid), public.affiliate_dashboard(uuid, integer, integer),
  public.admin_affiliates(integer) from public, anon, authenticated;
grant execute on function public.affiliate_visit(text, uuid), public.affiliate_attach(uuid, uuid),
  public.affiliate_convert(uuid, text, text, timestamptz) to service_role;
grant execute on function public.admin_enable_affiliate(text), public.admin_set_affiliate(uuid, boolean),
  public.admin_pay_affiliate(uuid, integer, uuid), public.affiliate_dashboard(uuid, integer, integer),
  public.admin_affiliates(integer) to authenticated;

notify pgrst, 'reload schema';
commit;
