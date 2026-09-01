-- ============================================================================
-- Fotografia no mural
--
-- As transformacoes de imagem do Supabase sao do plano pago e o projeto esta
-- no gratuito, por isso nao ha redimensionamento no servidor. Sobem duas
-- variantes ja feitas no telemovel: a do feed e a que abre ao toque. Mostrar
-- a grande em cada cartao gastava os 5 GB de trafego do mes numa tarde.
--
-- As colunas do video ja vao aqui - media_kind e media_duration_s - para o
-- video entrar sem nova migracao a uma tabela que ate la ja tem conteudo
-- publico de outras pessoas.
-- ============================================================================

alter table public.posts add column if not exists media_kind text;
alter table public.posts add column if not exists media_path text;
alter table public.posts add column if not exists media_preview_path text;
alter table public.posts add column if not exists media_width integer;
alter table public.posts add column if not exists media_height integer;
alter table public.posts add column if not exists media_duration_s integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'posts_media_kind') then
    alter table public.posts add constraint posts_media_kind
      check (media_kind is null or media_kind in ('image', 'video'));
  end if;

  -- Ou tem media completa, ou nao tem media nenhuma. Meia linha preenchida
  -- daria um cartao com moldura e nada la dentro.
  if not exists (select 1 from pg_constraint where conname = 'posts_media_completa') then
    alter table public.posts add constraint posts_media_completa
      check (
        (media_kind is null and media_path is null and media_preview_path is null)
        or (media_kind is not null and media_path is not null
            and media_preview_path is not null
            and media_width is not null and media_height is not null)
      );
  end if;
end $$;

-- Uma fotografia sem legenda e uma publicacao legitima; a regra antiga exigia
-- texto sempre. Passa a exigir texto OU media.
alter table public.posts drop constraint if exists posts_corpo;
alter table public.posts add constraint posts_corpo check (
  char_length(body) <= 280
  and (
    repost_of is not null
    or media_path is not null
    or char_length(btrim(body)) >= 1
  )
);

-- 8 MB por ficheiro e folga larga: depois da compressao no telemovel a
-- variante do feed anda nos 200 KB e a grande nos 600 KB. O limite existe
-- para apanhar um erro de codigo, nao para caber uma fotografia real.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mural', 'mural', true, 8388608, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists mural_public_read on storage.objects;
create policy mural_public_read on storage.objects
  for select using (bucket_id = 'mural');

drop policy if exists mural_insert_own on storage.objects;
create policy mural_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'mural'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists mural_delete_own on storage.objects;
create policy mural_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'mural'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

-- Sem UPDATE de proposito: cada publicacao escreve num caminho novo com id
-- proprio. Deixar reescrever um caminho ja publicado permitiria trocar a
-- imagem por baixo de um post que outra pessoa ja viu, aprovou ou denunciou.

-- O caminho tem de ser da propria pessoa. A tabela de posts nao sabe nada
-- sobre o balde, por isso a regra vive na politica: sem ela, um pedido
-- forjado publicava um post a apontar para a pasta de outro utilizador.
drop policy if exists posts_publicar on public.posts;
create policy posts_publicar on public.posts
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.pode_publicar()
    and (media_path is null or media_path like (select auth.uid())::text || '/%')
    and (media_preview_path is null or media_preview_path like (select auth.uid())::text || '/%')
  );
