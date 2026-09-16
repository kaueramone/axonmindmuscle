-- Professor AXON: limite de pedidos.
--
-- Cada pergunta ao Professor é uma chamada paga à API da Anthropic. O plano
-- PRO promete "sem limite de perguntas", e para uma pessoa é isso mesmo: 40
-- por hora é mais do que alguém consegue ler e escrever. O teto existe para o
-- ciclo automático, o separador esquecido a repetir pedidos e a conta roubada,
-- que batem nele em minutos.
--
-- A função é recriada inteira com a nova ação: os tetos vivem dentro dela por
-- desenho (ver 20260827_seguranca_auditoria.sql), para que quem chame o RPC
-- diretamente não escolha o seu próprio limite. Nada mais muda.
--
-- Até esta migração ser aplicada, a rota /api/professor continua a funcionar:
-- o RPC devolve "acao desconhecida", o servidor regista o erro e deixa passar
-- (falha aberta, como nas exportações). O que falta nesse intervalo é só o teto.

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
    when 'professor' then v_limite := 40;  v_janela_s := 3600;
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
