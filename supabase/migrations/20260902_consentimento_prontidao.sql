-- Consentimento explícito para o questionário de prontidão.
--
-- O questionário guarda frequência cardíaca em repouso, horas e qualidade de
-- sono, dores e fadiga. É tratamento de dados de saúde no sentido do art. 9.º
-- do RGPD, e a base legal escolhida foi o consentimento explícito
-- (art. 9.º, n.º 2, alínea a). Isto obriga a três coisas que esta migração
-- garante na base de dados e não só no ecrã:
--
--   1. O consentimento fica registado com data, e só pode ser dado ou retirado
--      pelas funções abaixo — nunca por um UPDATE direto ao perfil.
--   2. Sem consentimento não entra nenhum registo de prontidão. A política de
--      INSERT/UPDATE verifica-o; um pedido forjado ao Supabase falha na mesma.
--   3. Retirar o consentimento apaga o histórico de prontidão na mesma
--      transação. Não há "desativar e manter os dados".
--
-- Quem já tinha registos antes desta migração não fica com o consentimento
-- preenchido: vê o pedido na próxima visita ao ecrã de prontidão. O histórico
-- antigo mantém-se até a pessoa aceitar (continua) ou retirar (apaga).

alter table public.profiles
  add column if not exists readiness_consent_at timestamptz;

comment on column public.profiles.readiness_consent_at is
  'Data em que a pessoa deu consentimento explícito ao questionário de prontidão (dados de saúde, art. 9.º RGPD). NULL = sem consentimento. Só muda pelas funções aceitar_/retirar_consentimento_prontidao.';

-- ---------------------------------------------------------------------------
-- Guarda: a coluna só muda dentro das funções de consentimento, sinalizadas
-- pela bandeira local à transação `axon.consentimento` (o mesmo mecanismo dos
-- contadores em profiles).
-- ---------------------------------------------------------------------------

create or replace function public.guard_readiness_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.readiness_consent_at is distinct from old.readiness_consent_at
     and auth.uid() is not null
     and coalesce(current_setting('axon.consentimento', true), '') <> '1' then
    raise exception 'readiness consent changes only through its functions';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_readiness_consent() from public, anon, authenticated;

drop trigger if exists guard_readiness_consent on public.profiles;
create trigger guard_readiness_consent
  before update on public.profiles
  for each row
  execute function public.guard_readiness_consent();

-- ---------------------------------------------------------------------------
-- Dar o consentimento. Idempotente: quem já consentiu mantém a data original,
-- porque é essa que prova quando foi dado.
-- ---------------------------------------------------------------------------

create or replace function public.aceitar_consentimento_prontidao()
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quando timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  perform set_config('axon.consentimento', '1', true);

  update public.profiles
     set readiness_consent_at = coalesce(readiness_consent_at, now())
   where id = auth.uid()
  returning readiness_consent_at into v_quando;

  return v_quando;
end;
$$;

-- ---------------------------------------------------------------------------
-- Retirar o consentimento: apaga o histórico e limpa a data, tudo ou nada.
-- Devolve quantos registos foram apagados, para o ecrã poder dizê-lo.
-- ---------------------------------------------------------------------------

create or replace function public.retirar_consentimento_prontidao()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_apagados integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from public.readiness_checkins where user_id = auth.uid();
  get diagnostics v_apagados = row_count;

  perform set_config('axon.consentimento', '1', true);

  update public.profiles
     set readiness_consent_at = null
   where id = auth.uid();

  return v_apagados;
end;
$$;

revoke all on function public.aceitar_consentimento_prontidao() from public, anon;
revoke all on function public.retirar_consentimento_prontidao() from public, anon;
grant execute on function public.aceitar_consentimento_prontidao() to authenticated;
grant execute on function public.retirar_consentimento_prontidao() to authenticated;

-- ---------------------------------------------------------------------------
-- Políticas: apagar os próprios registos passa a ser permitido (é o que a
-- retirada faz, e é o direito ao apagamento); escrever exige consentimento.
-- ---------------------------------------------------------------------------

drop policy if exists readiness_delete_own on public.readiness_checkins;
create policy readiness_delete_own
  on public.readiness_checkins
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists readiness_insert_own on public.readiness_checkins;
create policy readiness_insert_own
  on public.readiness_checkins
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid())
         and p.readiness_consent_at is not null
    )
  );

drop policy if exists readiness_update_own on public.readiness_checkins;
create policy readiness_update_own
  on public.readiness_checkins
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid())
         and p.readiness_consent_at is not null
    )
  );
