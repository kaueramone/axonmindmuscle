-- Apagar todos os registos de um exercício ("resetar o recorde").
--
-- Pedido do cliente, e também o direito ao apagamento: a pessoa escolhe um
-- exercício e todas as séries dela nesse exercício desaparecem — de vez. As
-- sessões que ficam sem nenhuma série vão atrás, senão o histórico ganha
-- treinos vazios. O "nada é apagado" da comunidade não se aplica aqui: isto
-- são dados de treino da própria pessoa, sem terceiros que os tenham visto.
--
-- As duas funções correm como quem chama (security invoker): as políticas de
-- RLS já permitem apagar as próprias séries e sessões, e a função só as
-- agrupa numa transação.
--
-- As séries identificam o exercício por `exercise_id` quando vêm do catálogo
-- e só por `exercise_name` quando são exercícios livres. A chave de
-- agrupamento é a mesma nas duas funções, para o que se lista ser exatamente
-- o que se apaga.

create or replace function public.exercise_history_summary()
returns table (
  exercise_id uuid,
  exercise_name text,
  sets bigint,
  sessions bigint,
  best_weight_kg numeric,
  best_reps integer,
  last_date date
)
language sql
security invoker
set search_path = ''
stable
as $$
  with base as (
    select
      s.exercise_id,
      s.exercise_name,
      s.session_id,
      s.weight_kg,
      s.reps,
      (s.completed_at at time zone coalesce(p.timezone, 'Europe/Lisbon'))::date as local_date
    from public.workout_sets s
    join public.profiles p on p.id = s.user_id
    where s.user_id = auth.uid()
  ),
  melhor as (
    -- A melhor marca é a carga mais alta; em empate, as repetições mais altas
    -- com essa carga. É a definição de recorde que a pessoa reconhece.
    select distinct on (exercise_id, exercise_name)
      exercise_id, exercise_name, weight_kg, reps
    from base
    where weight_kg is not null
    order by exercise_id, exercise_name, weight_kg desc, reps desc nulls last
  )
  select
    b.exercise_id,
    b.exercise_name,
    count(*) as sets,
    count(distinct b.session_id) as sessions,
    m.weight_kg as best_weight_kg,
    m.reps as best_reps,
    max(b.local_date) as last_date
  from base b
  left join melhor m
    on m.exercise_id is not distinct from b.exercise_id
   and m.exercise_name = b.exercise_name
  group by b.exercise_id, b.exercise_name, m.weight_kg, m.reps
  order by max(b.local_date) desc, b.exercise_name;
$$;

create or replace function public.apagar_registos_exercicio(
  p_exercise_id uuid,
  p_exercise_name text
)
returns table (sets_apagados integer, sessoes_apagadas integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_sets integer;
  v_sessoes integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_exercise_id is null and coalesce(p_exercise_name, '') = '' then
    raise exception 'exercise required';
  end if;

  delete from public.workout_sets s
   where s.user_id = auth.uid()
     and s.exercise_id is not distinct from p_exercise_id
     and s.exercise_name = p_exercise_name;
  get diagnostics v_sets = row_count;

  -- Só sessões já terminadas: uma sessão a decorrer ainda vai receber séries.
  delete from public.workout_sessions w
   where w.user_id = auth.uid()
     and w.ended_at is not null
     and not exists (
       select 1 from public.workout_sets s where s.session_id = w.id
     );
  get diagnostics v_sessoes = row_count;

  return query select v_sets, v_sessoes;
end;
$$;

revoke all on function public.exercise_history_summary() from public, anon;
revoke all on function public.apagar_registos_exercicio(uuid, text) from public, anon;
grant execute on function public.exercise_history_summary() to authenticated;
grant execute on function public.apagar_registos_exercicio(uuid, text) to authenticated;
