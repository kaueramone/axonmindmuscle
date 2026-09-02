-- Perfil público, privacidade por omissão e partilha do treino.
--
-- Decisões do Kaue a 2 Set 2026: as publicações e os seguidores são sempre
-- visíveis; estatísticas, registos e prontidão são PRIVADOS por omissão e
-- cada um tem o seu interruptor; "perfil privado" esconde tudo menos o nome
-- e o avatar. A academia fica guardada desde já (texto livre), a página da
-- academia só nasce com densidade. O avatar pode ser gerado em vez de foto.
--
-- Uma descoberta pelo caminho: a tabela `profiles` só era legível pelo
-- próprio e pelo administrador. O feed pedia os perfis dos autores e recebia
-- só o seu — os outros apareciam como "—". Não se resolve abrindo a tabela
-- (tem peso, altura, nascimento, cliente do Stripe, consentimento): resolve-se
-- com uma vista que expõe as colunas públicas e mais nenhuma.

-- 1. Colunas ----------------------------------------------------------------

alter table public.profiles
  add column if not exists is_private     boolean not null default false,
  add column if not exists show_stats     boolean not null default false,
  add column if not exists show_records   boolean not null default false,
  add column if not exists show_readiness boolean not null default false,
  add column if not exists gym            text,
  add column if not exists bio            text,
  add column if not exists avatar_kind    text not null default 'photo',
  add column if not exists avatar_seed    text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_gym_tamanho') then
    alter table public.profiles add constraint profiles_gym_tamanho
      check (gym is null or char_length(gym) between 1 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_bio_tamanho') then
    alter table public.profiles add constraint profiles_bio_tamanho
      check (bio is null or char_length(bio) <= 160);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_kind') then
    alter table public.profiles add constraint profiles_avatar_kind
      check (avatar_kind in ('photo', 'generated'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_seed') then
    alter table public.profiles add constraint profiles_avatar_seed
      check (avatar_seed is null or avatar_seed ~ '^[a-z0-9-]{1,40}$');
  end if;
end $$;

comment on column public.profiles.is_private is 'Perfil privado: a página pública mostra só nome e avatar.';
comment on column public.profiles.gym is 'Academia, texto livre. Alimenta a futura página da academia; medir densidade antes de a construir.';

-- Índice para contar densidade por academia, quando chegar a altura.
create index if not exists profiles_por_gym on public.profiles (lower(gym)) where gym is not null;

-- 2. Vista pública dos perfis ---------------------------------------------
-- Só o que qualquer membro pode ver de qualquer outro. Corre com os
-- privilégios do dono (postgres) para passar por cima do RLS de `profiles`,
-- e é por isso que a lista de colunas é curta e explícita.

create or replace view public.perfis_publicos
with (security_invoker = false) as
  select
    id,
    handle,
    display_name,
    avatar_url,
    avatar_kind,
    avatar_seed,
    is_private,
    follower_count,
    following_count,
    created_at
  from public.profiles
  where deletion_requested_at is null;

revoke all on public.perfis_publicos from public, anon;
grant select on public.perfis_publicos to authenticated;

-- 3. Partilha do treino -------------------------------------------------------
-- O post guarda uma cópia do resumo escolhido no momento de publicar. Não
-- depende da sessão (que pode ser apagada depois) e nunca mostra mais do que
-- a pessoa marcou.

alter table public.posts
  add column if not exists workout_summary jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'posts_workout_summary') then
    alter table public.posts add constraint posts_workout_summary
      check (
        workout_summary is null
        or (jsonb_typeof(workout_summary) = 'object' and pg_column_size(workout_summary) <= 8192)
      );
  end if;
end $$;

-- Um treino partilhado sem legenda é uma publicação legítima, como a foto.
alter table public.posts drop constraint if exists posts_corpo;
alter table public.posts add constraint posts_corpo check (
  char_length(body) <= 280
  and (
    repost_of is not null
    or media_path is not null
    or workout_summary is not null
    or char_length(btrim(body)) >= 1
  )
);

-- O resumo de uma sessão, calculado no servidor a partir das séries de quem
-- chama. Os "registos" são cargas acima do melhor anterior nesse exercício —
-- só conta como recorde o que bate um recorde que já existia.
create or replace function public.resumo_sessao(p_session uuid)
returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  with s as (
    select * from public.workout_sessions
     where id = p_session and user_id = auth.uid()
  ),
  sets as (
    select * from public.workout_sets
     where session_id = p_session and user_id = auth.uid()
  ),
  por_ex as (
    select
      exercise_id,
      exercise_name,
      count(*)::int as n,
      max(weight_kg) as best_w,
      (array_agg(reps order by weight_kg desc nulls last, reps desc nulls last))[1] as best_reps,
      sum(coalesce(weight_kg, 0) * coalesce(reps, 0)) as volume,
      sum(coalesce(duration_s, 0))::int as duration_s
    from sets
    group by exercise_id, exercise_name
  ),
  anteriores as (
    select w.exercise_id, w.exercise_name, max(w.weight_kg) as prev_best
      from public.workout_sets w, s
     where w.user_id = auth.uid()
       and w.session_id <> s.id
       and w.completed_at < s.started_at
     group by w.exercise_id, w.exercise_name
  )
  select jsonb_build_object(
    'v', 1,
    'duration_min',
      (select greatest(1, round(extract(epoch from (coalesce(ended_at, now()) - started_at)) / 60))::int from s),
    'volume_kg', (select round(coalesce(sum(volume), 0))::int from por_ex),
    'sets', (select coalesce(sum(n), 0)::int from por_ex),
    'exercises',
      (select coalesce(jsonb_agg(jsonb_build_object(
          'name', exercise_name,
          'sets', n,
          'best_weight_kg', best_w,
          'best_reps', best_reps,
          'duration_s', duration_s
        ) order by exercise_name), '[]'::jsonb) from por_ex),
    'records',
      (select coalesce(jsonb_agg(jsonb_build_object(
          'name', p.exercise_name,
          'weight_kg', p.best_w,
          'reps', p.best_reps
        ) order by p.exercise_name), '[]'::jsonb)
         from por_ex p
         join anteriores a
           on a.exercise_id is not distinct from p.exercise_id
          and a.exercise_name = p.exercise_name
        where p.best_w is not null and a.prev_best is not null and p.best_w > a.prev_best),
    'readiness',
      (select jsonb_build_object('score', r.score, 'state', r.state)
         from public.readiness_checkins r, s, public.profiles pr
        where r.user_id = auth.uid()
          and pr.id = auth.uid()
          and r.local_date = (s.started_at at time zone pr.timezone)::date
        limit 1)
  )
  from s;
$$;

revoke all on function public.resumo_sessao(uuid) from public, anon;
grant execute on function public.resumo_sessao(uuid) to authenticated;

-- 4. A página de perfil -----------------------------------------------------
-- Uma função que devolve exatamente o que o visitante pode ver, decidido
-- aqui e não no ecrã. As tabelas de treino nunca ficam legíveis a terceiros:
-- é esta função, com privilégios do dono, que lê por eles o que os
-- interruptores permitem. O próprio dono vê tudo, com os interruptores ao
-- lado, para saber o que os outros vêem.

create or replace function public.perfil_publico(p_handle text)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_viewer uuid := auth.uid();
  v_p public.profiles%rowtype;
  v_dono boolean;
  v_out jsonb;
  v_hoje date;
begin
  if v_viewer is null then
    raise exception 'not authenticated';
  end if;

  select * into v_p
    from public.profiles
   where lower(handle) = lower(p_handle)
     and deletion_requested_at is null;
  if not found then
    return null;
  end if;

  v_dono := v_p.id = v_viewer;

  v_out := jsonb_build_object(
    'id', v_p.id,
    'handle', v_p.handle,
    'name', v_p.display_name,
    'avatar_url', v_p.avatar_url,
    'avatar_kind', v_p.avatar_kind,
    'avatar_seed', v_p.avatar_seed,
    'is_private', v_p.is_private,
    'is_me', v_dono,
    'follower_count', v_p.follower_count,
    'following_count', v_p.following_count,
    'is_following', exists (
      select 1 from public.follows f
       where f.follower_id = v_viewer and f.following_id = v_p.id
    ),
    'member_since', v_p.created_at,
    'show_stats', v_p.show_stats,
    'show_records', v_p.show_records,
    'show_readiness', v_p.show_readiness
  );

  -- Privado: nome e avatar, e mais nada. Nem a bio, nem a academia.
  if v_p.is_private and not v_dono then
    return v_out || jsonb_build_object('hidden', true);
  end if;

  v_out := v_out || jsonb_build_object('gym', v_p.gym, 'bio', v_p.bio, 'hidden', false);

  if v_p.show_stats or v_dono then
    v_out := v_out || jsonb_build_object('stats', (
      select jsonb_build_object(
        'sessions', count(*) filter (where w.ended_at is not null),
        'weeks_active', count(distinct date_trunc('week', w.started_at at time zone v_p.timezone)),
        'sessions_30d', count(*) filter (where w.ended_at is not null and w.started_at >= now() - interval '30 days'),
        'volume_kg', coalesce((
          select round(sum(coalesce(x.weight_kg, 0) * coalesce(x.reps, 0)))::int
            from public.workout_sets x where x.user_id = v_p.id
        ), 0),
        'last_session', max(w.started_at)
      )
      from public.workout_sessions w
      where w.user_id = v_p.id
    ));
  end if;

  if v_p.show_records or v_dono then
    v_out := v_out || jsonb_build_object('records', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'name', m.exercise_name, 'weight_kg', m.weight_kg, 'reps', m.reps
        ) order by m.weight_kg desc), '[]'::jsonb)
      from (
        select d.* from (
          select distinct on (x.exercise_id, x.exercise_name)
                 x.exercise_name, x.weight_kg, x.reps
            from public.workout_sets x
           where x.user_id = v_p.id and x.weight_kg is not null
           order by x.exercise_id, x.exercise_name, x.weight_kg desc, x.reps desc nulls last
        ) d
        order by d.weight_kg desc
        limit 8
      ) m
    ));
  end if;

  if v_p.show_readiness or v_dono then
    v_hoje := (now() at time zone v_p.timezone)::date;
    v_out := v_out || jsonb_build_object('readiness', (
      select jsonb_build_object('score', r.score, 'state', r.state)
        from public.readiness_checkins r
       where r.user_id = v_p.id and r.local_date = v_hoje
       limit 1
    ));
  end if;

  return v_out;
end;
$$;

revoke all on function public.perfil_publico(text) from public, anon;
grant execute on function public.perfil_publico(text) to authenticated;

-- 5. Densidade por academia, para decidir quando construir a página ---------

create or replace function public.admin_academias()
returns table (gym text, membros bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select p.gym, count(*) as membros
    from public.profiles p
   where p.gym is not null and public.is_admin()
   group by p.gym
   order by membros desc, p.gym;
$$;

revoke all on function public.admin_academias() from public, anon;
grant execute on function public.admin_academias() to authenticated;
