#!/usr/bin/env node
/**
 * Importa o catálogo de exercícios do wger para a base de dados da AXON.
 *
 * Os dados do wger são publicados sob CC-BY-SA 4.0. Ao importá-los:
 *   1. o crédito ao wger tem de estar visível na aplicação — já está no
 *      rodapé do seletor de exercícios e na página de créditos;
 *   2. a tabela de exercícios da AXON passa a ser uma obra derivada e tem
 *      de ficar disponível nos mesmos termos a quem a pedir.
 * Cada linha importada guarda a licença e a atribuição na própria tabela.
 *
 * Correr a partir da raiz do projeto:
 *
 *   SUPABASE_SERVICE_ROLE_KEY=<chave> node scripts/import-wger.mjs
 *
 * A chave de serviço está em Supabase → Project Settings → API Keys.
 * Nunca a metas no .env.local nem no repositório: é usada só aqui.
 */

const WGER = "https://wger.de/api/v2";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ujgbyvbizhkhzogroshk.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error(
    "Falta SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Uso: SUPABASE_SERVICE_ROLE_KEY=<chave> node scripts/import-wger.mjs",
  );
  process.exit(1);
}

/* ------------------------------------------------------------------
   Mapas do wger para o nosso domínio
   ------------------------------------------------------------------ */

/** Categorias do wger (id → grupo muscular da AXON). */
const CATEGORIAS = {
  8: "biceps", // Arms
  9: "quadriceps", // Legs
  10: "abdomen", // Abs
  11: "peito", // Chest
  12: "costas", // Back
  13: "ombros", // Shoulders
  14: "gemeos", // Calves
};

/** Músculos do wger (id → grupo muscular da AXON). */
const MUSCULOS = {
  1: "biceps",
  2: "antebraco",
  3: "biceps",
  4: "peito",
  5: "triceps",
  6: "abdomen",
  7: "gemeos",
  8: "gluteos",
  9: "costas",
  10: "quadriceps",
  11: "gluteos",
  12: "costas",
  13: "ombros",
  14: "costas",
  15: "isquiotibiais",
  16: "abdomen",
  17: "isquiotibiais",
};

/** Idiomas do wger que nos interessam (id → locale da AXON). */
const IDIOMAS = { 12: "pt-pt", 21: "pt-br" };

const EQUIPAMENTO = {
  1: "barra",
  3: "halteres",
  7: "peso-corporal",
  8: "banco",
  9: "maquina",
  10: "polia",
};

/* ------------------------------------------------------------------
   Utilitários
   ------------------------------------------------------------------ */

function slugify(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function wgerGet(caminho) {
  const resposta = await fetch(`${WGER}${caminho}`, {
    headers: { accept: "application/json", "user-agent": "axon-mind-muscle/1.0" },
  });
  if (!resposta.ok) {
    throw new Error(`wger ${caminho} devolveu ${resposta.status}`);
  }
  return resposta.json();
}

/** Percorre todas as páginas de um endpoint paginado do wger. */
async function wgerTodos(caminho, limite = 100) {
  const itens = [];
  let url = `${caminho}${caminho.includes("?") ? "&" : "?"}limit=${limite}`;

  while (url) {
    const pagina = await wgerGet(url);
    itens.push(...pagina.results);
    url = pagina.next ? pagina.next.replace(WGER, "") : null;
    process.stdout.write(`\r  ${itens.length} exercícios lidos…`);
  }
  process.stdout.write("\n");
  return itens;
}

async function supabase(caminho, opcoes = {}) {
  const resposta = await fetch(`${SUPABASE_URL}/rest/v1${caminho}`, {
    ...opcoes,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
      ...opcoes.headers,
    },
  });
  if (!resposta.ok) {
    throw new Error(`supabase ${caminho}: ${resposta.status} ${await resposta.text()}`);
  }
  return resposta.status === 204 ? null : resposta.json();
}

/* ------------------------------------------------------------------
   Importação
   ------------------------------------------------------------------ */

console.log("A ler o catálogo do wger…");
const base = await wgerTodos("/exercisebaseinfo/");
console.log(`${base.length} exercícios recebidos.\n`);

const exercicios = [];
const traducoes = [];
let semTraducaoPt = 0;

for (const item of base) {
  const categoria = CATEGORIAS[item.category?.id];
  if (!categoria) continue;

  // Só importamos exercícios com nome em português — o resto não serve.
  const nomes = {};
  for (const traducao of item.translations ?? []) {
    const locale = IDIOMAS[traducao.language];
    if (locale && traducao.name?.trim()) {
      nomes[locale] = {
        name: traducao.name.trim().slice(0, 120),
        description: (traducao.description ?? "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 800) || null,
      };
    }
  }

  if (!nomes["pt-pt"] && !nomes["pt-br"]) {
    semTraducaoPt += 1;
    continue;
  }

  // Se só houver uma variante de português, serve as duas.
  nomes["pt-pt"] ??= nomes["pt-br"];
  nomes["pt-br"] ??= nomes["pt-pt"];

  const primarios = [
    ...new Set((item.muscles ?? []).map((m) => MUSCULOS[m.id]).filter(Boolean)),
  ];
  const secundarios = [
    ...new Set(
      (item.muscles_secondary ?? []).map((m) => MUSCULOS[m.id]).filter(Boolean),
    ),
  ].filter((m) => !primarios.includes(m));

  const slug = `wger-${slugify(nomes["pt-pt"].name)}-${item.id}`;

  exercicios.push({
    slug,
    category: categoria,
    primary_muscles: primarios.length ? primarios : [categoria],
    secondary_muscles: secundarios,
    equipment: EQUIPAMENTO[item.equipment?.[0]?.id] ?? null,
    source: "wger",
    source_id: String(item.id),
    license: "CC-BY-SA-4.0",
    attribution: "wger Workout Manager — wger.de",
    is_active: true,
  });

  traducoes.push({ slug, nomes });
}

console.log(`${exercicios.length} exercícios com nome em português.`);
console.log(`${semTraducaoPt} ignorados por não terem tradução portuguesa.\n`);

if (exercicios.length === 0) {
  console.log("Nada a importar. A sair.");
  process.exit(0);
}

console.log("A gravar o catálogo…");
const LOTE = 200;
const idsPorSlug = new Map();

for (let i = 0; i < exercicios.length; i += LOTE) {
  const lote = exercicios.slice(i, i + LOTE);
  const gravados = await supabase("/exercises?on_conflict=slug", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(lote),
  });
  for (const linha of gravados) idsPorSlug.set(linha.slug, linha.id);
  process.stdout.write(`\r  ${idsPorSlug.size}/${exercicios.length}`);
}
process.stdout.write("\n");

console.log("A gravar as traduções…");
const linhasTraducao = [];
for (const { slug, nomes } of traducoes) {
  const id = idsPorSlug.get(slug);
  if (!id) continue;
  for (const [locale, valor] of Object.entries(nomes)) {
    linhasTraducao.push({
      exercise_id: id,
      locale,
      name: valor.name,
      description: valor.description,
    });
  }
}

for (let i = 0; i < linhasTraducao.length; i += LOTE) {
  await supabase("/exercise_translations?on_conflict=exercise_id,locale", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(linhasTraducao.slice(i, i + LOTE)),
  });
  process.stdout.write(`\r  ${Math.min(i + LOTE, linhasTraducao.length)}/${linhasTraducao.length}`);
}
process.stdout.write("\n");

console.log(
  `\nImportação concluída: ${idsPorSlug.size} exercícios, ${linhasTraducao.length} traduções.`,
);
console.log(
  "Os registos ficaram marcados com licença CC-BY-SA-4.0 e atribuição ao wger.",
);
