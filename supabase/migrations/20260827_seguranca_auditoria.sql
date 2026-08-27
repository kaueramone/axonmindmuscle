-- ============================================================================
-- Auditoria de seguranca — 27 de Agosto de 2026
--
-- Quatro coisas, todas na mesma direcao: cada camada deixa de depender de
-- outra estar de pe. Nenhuma delas altera dados existentes.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Limite de pedidos, guardado na propria base
--
-- A exportacao varre as tabelas todas da pessoa e comprime; o relatorio desenha
-- um PDF de ate 24 meses. Sem teto, uma sessao autenticada em ciclo transforma
-- as duas em faturas de computacao. Isto vive em Postgres e nao em memoria
-- porque cada pedido na Vercel pode cair noutra instancia: um contador em
-- memoria conta ate um e recomeca.
-- ----------------------------------------------------------------------------

create table if not exists public.rate_limits (
  bucket        text primary key,
  contador      integer not null default 0,
  janela_inicio timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- Sem politicas: nem `anon` nem `authenticated` lhe tocam. So a funcao abaixo,
-- que corre como dona da tabela, e a `service_role`.

revoke all on public.rate_limits from anon, authenticated;

comment on table public.rate_limits is
  'Contadores de limite de pedidos. Escrita exclusiva de consume_rate_limit().';


-- Os limites vivem AQUI DENTRO e nao nos argumentos. Se viessem de fora, quem
-- chamasse a funcao pelo REST escolhia o seu proprio teto — e a unica coisa que
-- o chamador escolhe e o nome da acao. O balde tambem e derivado de auth.uid()
-- por dentro: sem isso, um utilizador podia gastar a quota de outro.
create or replace function public.consume_rate_limit(p_acao text)
returns table (permitido boolean, repetir_em integer)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_limite    integer;
  v_janela_s  integer;
  v_bucket    text;
  v_contador  integer;
  v_inicio    timestamptz;
begin
  if v_uid is null then
    raise exception 'sem sessao';
  end if;

  case p_acao
    when 'exportar'  then v_limite := 6;  v_janela_s := 3600;
    when 'relatorio' then v_limite := 12; v_janela_s := 3600;
    else raise exception 'acao desconhecida: %', p_acao;
  end case;

  v_bucket := p_acao || ':' || v_uid::text;

  insert into public.rate_limits as r (bucket, contador, janela_inicio)
  values (v_bucket, 1, now())
  on conflict (bucket) do update
    set contador = case
          when r.janela_inicio < now() - make_interval(secs => v_janela_s) then 1
          else r.contador + 1
        end,
        janela_inicio = case
          when r.janela_inicio < now() - make_interval(secs => v_janela_s) then now()
          else r.janela_inicio
        end
  returning r.contador, r.janela_inicio into v_contador, v_inicio;

  if v_contador > v_limite then
    return query select
      false,
      greatest(1, ceil(extract(epoch from (v_inicio + make_interval(secs => v_janela_s) - now())))::integer);
  else
    return query select true, 0;
  end if;
end;
$$;

revoke all on function public.consume_rate_limit(text) from public, anon;
grant execute on function public.consume_rate_limit(text) to authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 2. `leads`: fechar a porta de escrita anonima que ninguem usa
--
-- A politica aceitava qualquer insercao de qualquer visitante — `with check
-- (true)` — e nenhum formulario do produto escreve nesta tabela. Um endpoint de
-- escrita aberto sem consumidor e so superficie. As restricoes ficam ja postas
-- para quando o formulario existir; nesse dia reponha-se a politica comentada
-- no fim deste bloco e a validacao ja esta feita.
-- ----------------------------------------------------------------------------

drop policy if exists leads_insert_public on public.leads;

alter table public.leads
  drop constraint if exists leads_email_valido;
alter table public.leads
  add constraint leads_email_valido
  check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' and length(email) <= 254);

alter table public.leads
  drop constraint if exists leads_source_conhecida;
alter table public.leads
  add constraint leads_source_conhecida
  check (source in ('lp', 'landing', 'rodape', 'planos'));

create unique index if not exists leads_email_unico on public.leads (lower(email));

-- Para reabrir a captacao publica, com a validacao ja acima:
--
--   create policy leads_insert_public on public.leads
--     for insert to anon, authenticated with check (true);
--
-- Recomendado: por o Turnstile no formulario antes de reabrir.


-- ----------------------------------------------------------------------------
-- 3. A guarda de `profiles` passa a cobrir tambem o INSERT
--
-- `guard_profile_role` era BEFORE UPDATE. Hoje nao ha caminho de exploracao —
-- a linha e criada pelo gatilho do registo e o INSERT seguinte colide na chave
-- primaria — mas isso e uma propriedade acidental de outra coisa. Se um dia
-- aparecer um DELETE em profiles, a porta abria sozinha.
-- ----------------------------------------------------------------------------

create or replace function public.guard_profile_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  -- O gatilho do registo corre sem sessao: e esse que tem de poder semear a
  -- linha. Quem chega com sessao so cria o seu proprio perfil, e cria-o raso.
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin() then
    new.role              := 'member'::public.user_role;
    new.plan              := 'free'::public.user_plan;
    new.pro_granted_at    := null;
    new.pro_granted_by    := null;
    new.stripe_customer_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_insert on public.profiles;
create trigger guard_profile_insert
  before insert on public.profiles
  for each row execute function public.guard_profile_insert();


-- ----------------------------------------------------------------------------
-- 4. `routines` e `routine_exercises`: `public` passa a `authenticated`
--
-- As duas politicas estavam abertas ao papel `public`, que inclui o visitante
-- anonimo. Na pratica ninguem passava — a condicao compara com auth.uid(), que
-- vem nulo — mas o papel certo diz o que se quer, e nao depende de a condicao
-- continuar escrita assim.
-- ----------------------------------------------------------------------------

drop policy if exists routines_own on public.routines;
create policy routines_own on public.routines
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists routine_exercises_own on public.routine_exercises;
create policy routine_exercises_own on public.routine_exercises
  for all to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid())
  ));
