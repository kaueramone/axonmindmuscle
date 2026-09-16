-- "Pernas" como grupo principal do catálogo.
--
-- Pedido do cliente (16 Set 2026): ao escolher o exercício e no painel
-- administrativo tem de existir "Pernas". Os músculos das pernas
-- (quadríceps, isquiotibiais, glúteos, gémeos) continuam a ser os valores dos
-- músculos principais e secundários; "pernas" é só categoria de catálogo. No
-- seletor de exercícios o filtro "Pernas" mostra também as categorias das
-- pernas já existentes, por isso nenhum exercício precisa de ser reclassificado.
--
-- ADD VALUE não pode correr dentro de uma transação com outras instruções
-- que usem o valor novo; correr esta linha sozinha no SQL editor.

alter type public.muscle_group add value if not exists 'pernas';
