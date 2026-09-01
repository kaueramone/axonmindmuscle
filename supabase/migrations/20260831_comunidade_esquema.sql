-- ============================================================================
-- Comunidade: o esquema completo, de uma vez
--
-- A entrega e por fatias, mas o esquema nao: acrescentar seguidores ou
-- respostas a uma tabela ja com conteudo publico obriga a reescrever historico
-- alheio, e isso nao se faz duas vezes. Fica aqui tudo o que a comunidade vai
-- precisar, mesmo o que a interface ainda nao mostra.
--
-- Duas regras atravessam o ficheiro inteiro:
--   1. Nada e apagado. Um post apagado leva deleted_at e sai das leituras; o
--      fio de respostas por baixo dele continua a fazer sentido.
--   2. O que da poder nao vem do cliente. Contadores, fixar, esconder e a
--      autoria sao reescritos por gatilho para quem nao e admin, como ja se
--      faz em profiles - os tipos de TypeScript desaparecem na compilacao e
--      um pedido forjado ao PostgREST escreve o que quiser.
-- ============================================================================


-- 1. Identidade publica ------------------------------------------------------
-- Um @ e obrigatorio para mencoes e para o URL de um perfil. O display_name
-- nao serve: nao e unico e muda quando a pessoa quer.

alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists follower_count integer not null default 0;
alter table public.profiles add column if not exists following_count integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_handle_formato'
  ) then
    alter table public.profiles
      add constraint profiles_handle_formato
      check (handle is null or handle ~ '^[a-z0-9_]{3,20}$');
  end if;
end $$;

create unique index if not exists profiles_handle_unico
  on public.profiles (lower(handle));

create index if not exists profiles_presenca
  on public.profiles (last_seen_at desc)
  where last_seen_at is not null;

-- Gera um @ a partir do nome. Sem a extensao unaccent para nao acrescentar
-- dependencias: os acentos do portugues sao poucos e cabem num translate.
create or replace function public.gerar_handle(p_nome text, p_id uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_base   text;
  v_tenta  text;
  v_n      integer := 0;
begin
  v_base := lower(coalesce(p_nome, ''));
  v_base := translate(v_base,
    'áàâãäéèêëíìîïóòôõöúùûüçñ',
    'aaaaaeeeeiiiiooooouuuucn');
  v_base := regexp_replace(v_base, '[^a-z0-9]', '', 'g');
  v_base := left(v_base, 16);

  -- Sem nome utilizavel, o @ sai do proprio id: unico por construcao e sem
  -- revelar nada sobre a pessoa.
  if char_length(v_base) < 3 then
    v_base := 'axon' || left(replace(p_id::text, '-', ''), 8);
  end if;

  v_tenta := v_base;
  loop
    exit when not exists (
      select 1 from public.profiles p where lower(p.handle) = v_tenta
    );
    v_n := v_n + 1;
    v_tenta := left(v_base, 16) || v_n::text;
  end loop;

  return v_tenta;
end;
$$;

revoke all on function public.gerar_handle(text, uuid) from public, anon, authenticated;

update public.profiles
   set handle = public.gerar_handle(display_name, id)
 where handle is null;

create or replace function public.set_profile_handle()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.handle is null then
    new.handle := public.gerar_handle(new.display_name, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists set_profile_handle on public.profiles;
create trigger set_profile_handle
  before insert on public.profiles
  for each row execute function public.set_profile_handle();


-- 2. Posts -------------------------------------------------------------------
-- Uma tabela so para post, resposta e republicacao. Sao a mesma coisa com
-- ligacoes diferentes, e separa-las obrigaria a unir tres consultas para
-- desenhar um unico feed.

create table if not exists public.posts (
  id                 uuid primary key default gen_random_uuid(),
  author_id          uuid not null references public.profiles(id) on delete cascade,
  body               text not null default '',

  -- reply_to e o pai directo; root_id e o primeiro post do fio. Guardar os
  -- dois permite desenhar um fio inteiro com uma consulta em vez de subir a
  -- arvore um nivel de cada vez.
  reply_to           uuid references public.posts(id) on delete cascade,
  root_id            uuid references public.posts(id) on delete cascade,
  repost_of          uuid references public.posts(id) on delete cascade,

  -- A ligacao ao treino que deu origem ao post. Fica a null quando a sessao
  -- for apagada: o texto ja publicado nao desaparece por causa disso.
  workout_session_id uuid references public.workout_sessions(id) on delete set null,

  like_count         integer not null default 0,
  reply_count        integer not null default 0,
  repost_count       integer not null default 0,

  is_pinned          boolean not null default false,
  hidden_at          timestamptz,
  hidden_by          uuid references public.profiles(id) on delete set null,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),

  -- Uma republicacao sem comentario nao tem corpo; tudo o resto tem de ter.
  constraint posts_corpo check (
    (repost_of is not null and char_length(body) <= 280)
    or (repost_of is null and char_length(btrim(body)) between 1 and 280)
  ),
  constraint posts_nao_responde_a_si check (reply_to is null or reply_to <> id)
);

-- O feed le sempre pela mesma ordem e sempre com os mesmos filtros. O indice
-- parcial deixa de fora o que nunca aparece, e e o que evita que o feed va
-- ficando lento a medida que se acumulam posts apagados.
create index if not exists posts_cronologico
  on public.posts (created_at desc)
  where deleted_at is null and hidden_at is null;

create index if not exists posts_por_autor
  on public.posts (author_id, created_at desc)
  where deleted_at is null and hidden_at is null;

create index if not exists posts_do_fio
  on public.posts (root_id, created_at)
  where deleted_at is null and hidden_at is null;

create index if not exists posts_respostas
  on public.posts (reply_to, created_at)
  where reply_to is not null;

-- Republicar duas vezes o mesmo post e sempre engano.
create unique index if not exists posts_republicacao_unica
  on public.posts (author_id, repost_of)
  where repost_of is not null and deleted_at is null;

-- root_id nunca vem do cliente: e deduzido do pai.
create or replace function public.set_post_root()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_pai_root uuid;
begin
  if new.reply_to is null then
    new.root_id := null;
  else
    select coalesce(p.root_id, p.id) into v_pai_root
      from public.posts p where p.id = new.reply_to;
    new.root_id := v_pai_root;
  end if;
  return new;
end;
$$;

drop trigger if exists set_post_root on public.posts;
create trigger set_post_root
  before insert on public.posts
  for each row execute function public.set_post_root();


-- 3. Gostos, seguidores, mencoes, notificacoes, denuncias --------------------

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_por_pessoa on public.post_likes (user_id);

create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_nao_a_si check (follower_id <> following_id)
);

create index if not exists follows_seguidores on public.follows (following_id);

-- As mencoes sao extraidas do texto no servidor e guardadas: procurar '@nome'
-- dentro do corpo a cada leitura seria varrer a tabela toda.
create table if not exists public.post_mentions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create index if not exists post_mentions_por_pessoa on public.post_mentions (user_id);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete cascade,
  tipo       text not null,
  post_id    uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at    timestamptz,
  constraint notifications_tipo check (
    tipo in ('gosto', 'resposta', 'mencao', 'republicacao', 'seguidor')
  )
);

create index if not exists notifications_por_ler
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create table if not exists public.post_reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  motivo      text not null,
  nota        text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  constraint post_reports_motivo check (
    motivo in ('spam', 'abuso', 'perigoso', 'outro')
  ),
  -- Denunciar duas vezes o mesmo post nao acrescenta informacao nenhuma a
  -- quem modera, e e a forma mais facil de inundar a fila.
  unique (post_id, reporter_id)
);

create index if not exists post_reports_por_resolver
  on public.post_reports (created_at desc)
  where resolved_at is null;


-- 4. Contadores --------------------------------------------------------------
-- Contar em cada leitura obrigaria a um count() por post desenhado no ecra. Os
-- contadores vivem na linha e sao mantidos por gatilho - nunca escritos pelo
-- cliente, que e o que a guarda do bloco 5 garante.

create or replace function public.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;

    -- Gostar do proprio post nao notifica ninguem.
    insert into public.notifications (user_id, actor_id, tipo, post_id)
    select p.author_id, new.user_id, 'gosto', p.id
      from public.posts p
     where p.id = new.post_id and p.author_id <> new.user_id;

  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists sync_like_count on public.post_likes;
create trigger sync_like_count
  after insert or delete on public.post_likes
  for each row execute function public.sync_like_count();

create or replace function public.sync_post_counts()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.reply_to is not null then
      update public.posts set reply_count = reply_count + 1 where id = new.reply_to;
      insert into public.notifications (user_id, actor_id, tipo, post_id)
      select p.author_id, new.author_id, 'resposta', new.id
        from public.posts p
       where p.id = new.reply_to and p.author_id <> new.author_id;
    end if;
    if new.repost_of is not null then
      update public.posts set repost_count = repost_count + 1 where id = new.repost_of;
      insert into public.notifications (user_id, actor_id, tipo, post_id)
      select p.author_id, new.author_id, 'republicacao', new.id
        from public.posts p
       where p.id = new.repost_of and p.author_id <> new.author_id;
    end if;

  -- Apagar e um UPDATE, nao um DELETE. Sem este ramo, um fio ficava a anunciar
  -- respostas que ja nao aparecem a ninguem.
  elsif tg_op = 'UPDATE' and old.deleted_at is null and new.deleted_at is not null then
    if new.reply_to is not null then
      update public.posts set reply_count = greatest(0, reply_count - 1) where id = new.reply_to;
    end if;
    if new.repost_of is not null then
      update public.posts set repost_count = greatest(0, repost_count - 1) where id = new.repost_of;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists sync_post_counts on public.posts;
create trigger sync_post_counts
  after insert or update on public.posts
  for each row execute function public.sync_post_counts();

create or replace function public.sync_follow_counts()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set follower_count  = follower_count  + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    insert into public.notifications (user_id, actor_id, tipo)
    values (new.following_id, new.follower_id, 'seguidor');
  elsif tg_op = 'DELETE' then
    update public.profiles set follower_count  = greatest(0, follower_count  - 1) where id = old.following_id;
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
  end if;
  return null;
end;
$$;

drop trigger if exists sync_follow_counts on public.follows;
create trigger sync_follow_counts
  after insert or delete on public.follows
  for each row execute function public.sync_follow_counts();

create or replace function public.notify_mention()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.notifications (user_id, actor_id, tipo, post_id)
  select new.user_id, p.author_id, 'mencao', p.id
    from public.posts p
   where p.id = new.post_id and p.author_id <> new.user_id;
  return null;
end;
$$;

drop trigger if exists notify_mention on public.post_mentions;
create trigger notify_mention
  after insert on public.post_mentions
  for each row execute function public.notify_mention();


-- 5. A guarda das colunas privilegiadas --------------------------------------
-- O mesmo molde de guard_profile_insert: para quem nao e admin, as colunas de
-- poder sao REESCRITAS em vez de recusadas. Recusar daria um erro que ensina
-- ao atacante exactamente o que tentar a seguir; reescrever nao diz nada e o
-- pedido segue sem efeito nenhum.

create or replace function public.guard_post_columns()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Sem sessao e trabalho do proprio sistema (gatilhos, service_role).
  if v_uid is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.author_id    := v_uid;
    new.like_count   := 0;
    new.reply_count  := 0;
    new.repost_count := 0;
    new.is_pinned    := false;
    new.hidden_at    := null;
    new.hidden_by    := null;
    new.deleted_at   := null;
    new.created_at   := now();
  else
    -- Numa edicao so uma coisa e do autor: apagar. Tudo o resto volta ao que
    -- estava, incluindo o corpo - um post publicado nao se reescreve.
    new.author_id          := old.author_id;
    new.body               := old.body;
    new.reply_to           := old.reply_to;
    new.root_id            := old.root_id;
    new.repost_of          := old.repost_of;
    new.workout_session_id := old.workout_session_id;
    new.like_count         := old.like_count;
    new.reply_count        := old.reply_count;
    new.repost_count       := old.repost_count;
    new.is_pinned          := old.is_pinned;
    new.hidden_at          := old.hidden_at;
    new.hidden_by          := old.hidden_by;
    new.created_at         := old.created_at;
    if old.deleted_at is not null then
      new.deleted_at := old.deleted_at;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_post_columns() from public, anon, authenticated;

drop trigger if exists guard_post_columns on public.posts;
create trigger guard_post_columns
  before insert or update on public.posts
  for each row execute function public.guard_post_columns();


-- 6. Quem pode publicar ------------------------------------------------------
-- A regra de negocio - ler e de todos, escrever e do PRO - vive aqui e nao
-- espalhada pelas politicas. Muda-se num sitio quando o cliente decidir abrir
-- ou fechar a escrita.

create or replace function public.pode_publicar()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce((
    select p.plan = 'pro' or p.role = 'admin'
      from public.profiles p
     where p.id = auth.uid()
  ), false);
$$;

grant execute on function public.pode_publicar() to authenticated;


-- 7. RLS ---------------------------------------------------------------------

alter table public.posts          enable row level security;
alter table public.post_likes     enable row level security;
alter table public.follows        enable row level security;
alter table public.post_mentions  enable row level security;
alter table public.notifications  enable row level security;
alter table public.post_reports   enable row level security;

-- Posts: toda a gente com sessao le o que esta publicado. O autor continua a
-- ver o que apagou (senao o ecra dele muda por baixo dos pes) e o admin ve o
-- que escondeu, que e a unica forma de rever uma decisao de moderacao.
drop policy if exists posts_ler on public.posts;
create policy posts_ler on public.posts
  for select to authenticated
  using (
    (deleted_at is null and hidden_at is null)
    or author_id = (select auth.uid())
    or public.is_admin()
  );

drop policy if exists posts_publicar on public.posts;
create policy posts_publicar on public.posts
  for insert to authenticated
  with check (author_id = (select auth.uid()) and public.pode_publicar());

drop policy if exists posts_apagar_proprio on public.posts;
create policy posts_apagar_proprio on public.posts
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists posts_moderar on public.posts;
create policy posts_moderar on public.posts
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Sem politica de DELETE, de proposito: nada sai da tabela. Um post apagado
-- pelo autor e um post escondido por moderacao tem de continuar a existir para
-- as respostas por baixo dele fazerem sentido, e para haver o que rever.

-- Gostar e seguir ficam abertos a toda a gente, incluindo o plano gratuito.
-- Quem nao pode escrever precisa de ter alguma coisa para fazer, senao a
-- comunidade e um jornal e nao uma comunidade.
drop policy if exists post_likes_ler on public.post_likes;
create policy post_likes_ler on public.post_likes
  for select to authenticated using (true);

drop policy if exists post_likes_proprio on public.post_likes;
create policy post_likes_proprio on public.post_likes
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists post_likes_retirar on public.post_likes;
create policy post_likes_retirar on public.post_likes
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists follows_ler on public.follows;
create policy follows_ler on public.follows
  for select to authenticated using (true);

drop policy if exists follows_seguir on public.follows;
create policy follows_seguir on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));

drop policy if exists follows_deixar on public.follows;
create policy follows_deixar on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

-- As mencoes sao escritas pela accao que publica o post, no servidor, e nunca
-- pelo cliente: senao qualquer pessoa se mencionava a si propria em todos os
-- posts alheios para aparecer nas notificacoes de toda a gente.
drop policy if exists post_mentions_ler on public.post_mentions;
create policy post_mentions_ler on public.post_mentions
  for select to authenticated using (true);

drop policy if exists post_mentions_do_autor on public.post_mentions;
create policy post_mentions_do_autor on public.post_mentions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.posts p
       where p.id = post_id and p.author_id = (select auth.uid())
    )
  );

-- Notificacoes: so as proprias, e so para as marcar como lidas. Sao criadas
-- pelos gatilhos, que correm como security definer e passam ao lado do RLS.
drop policy if exists notifications_proprias on public.notifications;
create policy notifications_proprias on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists notifications_marcar_lidas on public.notifications;
create policy notifications_marcar_lidas on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists post_reports_denunciar on public.post_reports;
create policy post_reports_denunciar on public.post_reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

drop policy if exists post_reports_ler on public.post_reports;
create policy post_reports_ler on public.post_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());

drop policy if exists post_reports_resolver on public.post_reports;
create policy post_reports_resolver on public.post_reports
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- 8. Limites de escrita ------------------------------------------------------
-- Os tectos ficam no servidor porque o cliente nao e sitio para os guardar.
-- Publicar e o mais apertado: 20 por hora chega a qualquer pessoa real e nao
-- chega a um script.

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
    when 'exportar'  then v_limite := 6;   v_janela_s := 3600;
    when 'relatorio' then v_limite := 12;  v_janela_s := 3600;
    when 'publicar'  then v_limite := 20;  v_janela_s := 3600;
    when 'reagir'    then v_limite := 200; v_janela_s := 3600;
    when 'seguir'    then v_limite := 100; v_janela_s := 3600;
    when 'denunciar' then v_limite := 20;  v_janela_s := 3600;
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


-- 9. Presenca ----------------------------------------------------------------
-- "Online agora" por marca de tempo e nao por websocket: a aplicacao funciona
-- sem rede por desenho, e uma ligacao permanente aberta em cada separador
-- custa dinheiro e parte no primeiro tunel de metro.

create or replace function public.tocar_presenca()
returns void
language sql
security definer
set search_path to ''
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

grant execute on function public.tocar_presenca() to authenticated;

-- Devolve so a contagem. Uma lista de quem esta online diria a toda a gente a
-- que horas cada pessoa treina, que nao e coisa que se anuncie.
create or replace function public.comunidade_online()
returns integer
language sql
stable
security definer
set search_path to ''
as $$
  select count(*)::integer
    from public.profiles p
   where p.last_seen_at > now() - interval '5 minutes';
$$;

grant execute on function public.comunidade_online() to authenticated;


-- 10. As colunas sociais de profiles tambem sao territorio do servidor -------
-- profiles_update_own deixa cada pessoa escrever na sua propria linha, e agora
-- essa linha tem contadores. Sem esta guarda, um PATCH a /rest/v1/profiles com
-- {"follower_count": 99999} dava a qualquer pessoa a aparencia de audiencia -
-- exactamente o buraco que a coluna plan ja tinha destapado uma vez.

create or replace function public.guard_profile_social()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  new.follower_count  := old.follower_count;
  new.following_count := old.following_count;

  return new;
end;
$$;

revoke all on function public.guard_profile_social() from public, anon, authenticated;

drop trigger if exists guard_profile_social on public.profiles;
create trigger guard_profile_social
  before update on public.profiles
  for each row execute function public.guard_profile_social();


-- 11. Uma funcao de gatilho nao e uma API ------------------------------------
-- O PostgREST publica tudo o que vive no schema public, por isso cada gatilho
-- criado aqui em cima passou tambem a existir em /rest/v1/rpc/. Chamados fora
-- de um gatilho rebentam, mas nao ha razao para estarem ao alcance de ninguem.

revoke all on function public.set_post_root() from public, anon, authenticated;
revoke all on function public.set_profile_handle() from public, anon, authenticated;
revoke all on function public.sync_like_count() from public, anon, authenticated;
revoke all on function public.sync_post_counts() from public, anon, authenticated;
revoke all on function public.sync_follow_counts() from public, anon, authenticated;
revoke all on function public.notify_mention() from public, anon, authenticated;

-- Estas sao API, mas so com sessao: a contagem de quem esta online e
-- informacao sobre a base de utilizadores e nao se da a quem passa na rua.
revoke all on function public.pode_publicar() from public, anon;
revoke all on function public.tocar_presenca() from public, anon;
revoke all on function public.comunidade_online() from public, anon;
grant execute on function public.pode_publicar() to authenticated;
grant execute on function public.tocar_presenca() to authenticated;
grant execute on function public.comunidade_online() to authenticated;


-- 12. A guarda estava a comer os contadores ----------------------------------
-- Apanhado a testar, antes de sair daqui: `guard_post_columns` corria tambem
-- BEFORE UPDATE e repunha like_count ao valor anterior para quem nao e admin.
-- So que quem faz esse UPDATE e o proprio gatilho dos contadores, e nessa
-- altura auth.uid() ainda e o utilizador - `security definer` troca o dono da
-- funcao, nao a sessao. Cada gosto era contado e imediatamente descontado.
-- Todos os numeros do mural nasciam a zero, sem erro nenhum a dizer porque.
--
-- A licao: uma guarda por gatilho nao distingue o utilizador do sistema. Nos
-- posts a defesa passa a ser de privilegio e nao de logica - o papel
-- authenticated deixa de poder escrever em qualquer coluna a nao ser
-- deleted_at, e os gatilhos, que correm como dono da tabela, nem a veem.

revoke update on public.posts from authenticated;
grant update (deleted_at) on public.posts to authenticated;

create or replace function public.guard_post_columns()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or public.is_admin() then return new; end if;
  new.author_id := v_uid;
  new.like_count := 0;
  new.reply_count := 0;
  new.repost_count := 0;
  new.is_pinned := false;
  new.hidden_at := null;
  new.hidden_by := null;
  new.deleted_at := null;
  new.created_at := now();
  return new;
end;
$$;
revoke all on function public.guard_post_columns() from public, anon, authenticated;

drop trigger if exists guard_post_columns on public.posts;
create trigger guard_post_columns before insert on public.posts
  for each row execute function public.guard_post_columns();

-- Apagar e definitivo: sem isto, a unica coluna que o autor pode escrever
-- servia tambem para ressuscitar um post ja retirado.
create or replace function public.guard_post_undelete()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if old.deleted_at is not null then new.deleted_at := old.deleted_at; end if;
  return new;
end;
$$;
revoke all on function public.guard_post_undelete() from public, anon, authenticated;

drop trigger if exists guard_post_undelete on public.posts;
create trigger guard_post_undelete before update on public.posts
  for each row execute function public.guard_post_undelete();

-- Em profiles a mesma barreira sairia cara: vinte colunas listadas uma a uma
-- para proteger duas, e a primeira que fosse esquecida deixava de poder ser
-- gravada pelo ecra do perfil. A guarda fica, mas passa a saber quando o
-- UPDATE e do proprio sistema, por uma bandeira local a transaccao que o
-- gatilho apaga logo a seguir ao UPDATE que a acendeu.
create or replace function public.sync_follow_counts()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  perform set_config('axon.contadores', 'on', true);
  if tg_op = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    perform set_config('axon.contadores', 'off', true);
    insert into public.notifications (user_id, actor_id, tipo)
    values (new.following_id, new.follower_id, 'seguidor');
  elsif tg_op = 'DELETE' then
    update public.profiles set follower_count = greatest(0, follower_count - 1) where id = old.following_id;
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    perform set_config('axon.contadores', 'off', true);
  end if;
  return null;
end;
$$;
revoke all on function public.sync_follow_counts() from public, anon, authenticated;

create or replace function public.guard_profile_social()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if coalesce(current_setting('axon.contadores', true), 'off') = 'on' then
    return new;
  end if;
  if auth.uid() is null or public.is_admin() then return new; end if;
  new.follower_count := old.follower_count;
  new.following_count := old.following_count;
  return new;
end;
$$;
revoke all on function public.guard_profile_social() from public, anon, authenticated;

-- Esconder um post deixou de ser possivel por PostgREST, e ainda bem: passa a
-- ser um pedido com nome, que verifica o papel e deixa rasto de quem decidiu.
create or replace function public.admin_ocultar_post(p_post uuid, p_esconder boolean)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_admin() then
    raise exception 'sem permissao';
  end if;
  update public.posts
     set hidden_at = case when p_esconder then now() else null end,
         hidden_by = case when p_esconder then auth.uid() else null end
   where id = p_post;
end;
$$;
revoke all on function public.admin_ocultar_post(uuid, boolean) from public, anon;
grant execute on function public.admin_ocultar_post(uuid, boolean) to authenticated;
