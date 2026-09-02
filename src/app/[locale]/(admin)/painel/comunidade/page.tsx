import { ReportsQueue, type PostDenunciado } from "@/components/admin/reports-queue";
import { Card } from "@/components/ui/surface";
import { requireAdmin } from "@/lib/admin/guard";
import { BUCKET_MURAL } from "@/lib/community/shared";
import { assertLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

/**
 * Fila de moderação: as denúncias em aberto, agrupadas por post. O
 * administrador lê a tabela inteira (política `post_reports_ler`) e todos os
 * posts, escondidos incluídos (`posts_ler`) — é o único sítio onde isso é
 * suposto acontecer.
 */
export default async function AdminCommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const { supabase } = await requireAdmin(locale);

  const [{ data: denuncias }, { data: academias }] = await Promise.all([
    supabase
      .from("post_reports")
      .select("id, post_id, reporter_id, motivo, nota, created_at")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.rpc("admin_academias"),
  ]);

  const postIds = [...new Set((denuncias ?? []).map((d) => d.post_id))];
  const reporterIds = [...new Set((denuncias ?? []).map((d) => d.reporter_id))];

  const { data: posts } = postIds.length
    ? await supabase
        .from("posts")
        .select(
          "id, body, created_at, author_id, media_preview_path, workout_session_id, workout_summary, hidden_at, deleted_at",
        )
        .in("id", postIds)
    : { data: [] };

  const pessoaIds = [...new Set([...reporterIds, ...(posts ?? []).map((p) => p.author_id)])];
  const { data: pessoas } = pessoaIds.length
    ? await supabase.from("profiles").select("id, display_name, handle").in("id", pessoaIds)
    : { data: [] };
  const nome = new Map((pessoas ?? []).map((p) => [p.id, p]));
  const rotulo = (id: string) => {
    const p = nome.get(id);
    return p?.display_name?.trim() || (p?.handle ? `@${p.handle}` : id.slice(0, 8));
  };

  const publico = (caminho: string) =>
    supabase.storage.from(BUCKET_MURAL).getPublicUrl(caminho).data.publicUrl;

  const fila: PostDenunciado[] = (posts ?? [])
    .map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.created_at,
      autor: rotulo(p.author_id),
      autorHandle: nome.get(p.author_id)?.handle ?? null,
      imagemUrl: p.media_preview_path ? publico(p.media_preview_path) : null,
      temTreino: p.workout_session_id != null || p.workout_summary != null,
      escondido: p.hidden_at != null,
      apagadoPeloAutor: p.deleted_at != null,
      denuncias: (denuncias ?? [])
        .filter((d) => d.post_id === p.id)
        .map((d) => ({
          motivo: d.motivo,
          nota: d.nota,
          quando: d.created_at,
          quem: rotulo(d.reporter_id),
        })),
    }))
    .sort((a, b) => b.denuncias.length - a.denuncias.length);

  return (
    <div className="flex flex-col gap-8">
      <ReportsQueue posts={fila} />

      {/* Densidade por academia: a página da academia só se constrói quando
          uma delas passar dos 10 membros. Este é o número que decide. */}
      <Card className="flex flex-col gap-3">
        <h2 className="label-brand text-fg-subtle">Academias</h2>
        {!academias || academias.length === 0 ? (
          <p className="text-callout text-fg-muted">
            Ninguém preencheu a academia ainda. A página da academia entra quando uma tiver 10
            ou mais membros.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline">
            {academias.map((a) => (
              <li key={a.gym} className="flex items-baseline justify-between gap-3 py-2">
                <span className="text-callout text-fg">{a.gym}</span>
                <span className="data-mono text-subhead text-fg-muted tabular-nums">
                  {a.membros} {Number(a.membros) === 1 ? "membro" : "membros"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
