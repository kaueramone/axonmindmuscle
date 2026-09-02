-- Plano semanal, medalhas e ranking de consistência.
--
-- Plano semanal: cada rotina pode ficar marcada para um ou mais dias da
-- semana (1 = segunda … 7 = domingo, como a ISO). É uma coluna na própria
-- rotina e não uma tabela nova: a política de RLS das rotinas já diz quem
-- pode escrever, e uma tabela de junção obrigava a repeti-la.
--
-- Medalhas e ranking: decisão do Kaue a 2 Set 2026 — reconhecimento por
-- CONSISTÊNCIA (sessões, semanas seguidas), nunca por carga. As medalhas são
-- calculadas a partir das sessões, sem tabela; o ranking é mensal, só entre
-- quem a pessoa segue, e só inclui quem ligou o interruptor.

-- 1. Dias da semana na rotina --------------------------------------------

alter table public.routines
  add column if not exists weekdays smallint[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'routines_weekdays_validos') then
    alter table public.routines add constraint routines_weekdays_validos
      check (
        coalesce(array_length(weekdays, 1), 0) <= 7
        and weekdays <@ array[1,2,3,4,5,6,7]::smallint[]
      );
  end if;
end $$;

comment on column public.routines.weekdays is
  'Dias da semana em que a rotina está planeada, 1 = segunda … 7 = domingo. Vazio = sem dia fixo.';

-- 2. Opt-in do ranking -------------------------------------------------------

alter table public.profiles
  add column if not exists ranking_opt_in boolean not null default false;

comment on column public.profiles.ranking_opt_in is
  'Aparecer no ranking mensal de consistência de quem me segue. Desligado por omissão.';

-- 3. Medalhas -------------------------------------------------------------------
-- Uma linha por medalha, com a data em que foi ganha (null = ainda não).
-- Calculado de cada vez: são poucas contas por pessoa e nunca há
-- inconsistência entre o que se ganhou e o que as sessões dizem.

create or replace function public.medalhas(p_user uuid default null)
returns table (chave text, ganha_em timestamptz, progresso integer, meta integer)
language sql
security definer
set search_path = ''
stable
as $$
  with alvo as (
    -- Só a própria pessoa, ou um perfil que mostra estatísticas.
    select p.id, p.timezone
      from public.profiles p
     where p.id = coalesce(p_user, auth.uid())
       and (p.id = auth.uid() or p.show_stats)
  ),
  sessoes as (
    select w.started_at,
           (w.started_at at time zone a.timezone)::date as dia,
           date_trunc('week', (w.started_at at time zone a.timezone))::date as semana
      from public.workout_sessions w
      join alvo a on a.id = w.user_id
     where w.ended_at is not null
       and exists (select 1 from public.workout_sets s where s.session_id = w.id)
  ),
  ordenadas as (
    select started_at, row_number() over (order by started_at) as n
      from sessoes
  ),
  semanas as (
    select distinct semana from sessoes
  ),
  -- Sequência de semanas consecutivas: cada semana recebe o número de semanas
  -- seguidas que terminam nela.
  sequencia as (
    select semana,
           semana - (row_number() over (order by semana) * 7)::int as grupo
      from semanas
  ),
  posicoes as (
    select semana, grupo, row_number() over (partition by grupo order by semana)::int as posicao
      from sequencia
  ),
  grupos as (
    select grupo, count(*)::int as tamanho
      from sequencia
     group by grupo
  ),
  partilhas as (
    select min(p.created_at) as primeira
      from public.posts p
      join alvo a on a.id = p.author_id
     where p.workout_summary is not null and p.deleted_at is null
  ),
  totais as (
    select (select count(*)::int from sessoes) as sessoes,
           (select coalesce(max(tamanho), 0) from grupos) as melhor_sequencia
  )
  , linhas as (
  select 'primeira_sessao'::text, (select started_at from ordenadas where n = 1), least(t.sessoes, 1), 1 from totais t
  union all
  select 'dez_sessoes', (select started_at from ordenadas where n = 10), least(t.sessoes, 10), 10 from totais t
  union all
  select 'cinquenta_sessoes', (select started_at from ordenadas where n = 50), least(t.sessoes, 50), 50 from totais t
  union all
  select 'cem_sessoes', (select started_at from ordenadas where n = 100), least(t.sessoes, 100), 100 from totais t
  union all
  select 'quatro_semanas',
         (select (min(semana) + 6)::timestamptz from posicoes where posicao = 4),
         least(t.melhor_sequencia, 4), 4 from totais t
  union all
  select 'doze_semanas',
         (select (min(semana) + 6)::timestamptz from posicoes where posicao = 12),
         least(t.melhor_sequencia, 12), 12 from totais t
  union all
  select 'primeira_partilha', (select primeira from partilhas),
         case when (select primeira from partilhas) is null then 0 else 1 end, 1
  )
  select * from linhas where exists (select 1 from alvo);
$$;

revoke all on function public.medalhas(uuid) from public, anon;
grant execute on function public.medalhas(uuid) to authenticated;

-- 4. Ranking mensal de consistência -----------------------------------------
-- Quem eu sigo (e eu), com sessões concluídas no mês corrente, só quem
-- ligou `ranking_opt_in`. Eu apareço sempre na minha própria lista, para ver
-- onde estou — mas só entro na lista dos outros se tiver ligado o interruptor.

create or replace function public.ranking_consistencia()
returns table (
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  avatar_kind text,
  avatar_seed text,
  sessoes integer,
  sou_eu boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  with eu as (
    select p.id, p.timezone from public.profiles p where p.id = auth.uid()
  ),
  candidatos as (
    select f.following_id as id
      from public.follows f
      join public.profiles p on p.id = f.following_id
     where f.follower_id = auth.uid()
       and p.ranking_opt_in
       and p.deletion_requested_at is null
    union
    select id from eu
  ),
  inicio as (
    select date_trunc('month', now() at time zone e.timezone) as mes from eu e
  ),
  contagem as (
    select c.id,
           count(w.id) filter (
             where w.ended_at is not null
               and (w.started_at at time zone p.timezone) >= (select mes from inicio)
               and exists (select 1 from public.workout_sets s where s.session_id = w.id)
           )::int as sessoes
      from candidatos c
      join public.profiles p on p.id = c.id
      left join public.workout_sessions w on w.user_id = c.id
     group by c.id
  )
  select p.id, p.handle, p.display_name, p.avatar_url, p.avatar_kind, p.avatar_seed,
         c.sessoes, p.id = auth.uid()
    from contagem c
    join public.profiles p on p.id = c.id
   where auth.uid() is not null
   order by c.sessoes desc, p.display_name nulls last
   limit 50;
$$;

revoke all on function public.ranking_consistencia() from public, anon;
grant execute on function public.ranking_consistencia() to authenticated;
