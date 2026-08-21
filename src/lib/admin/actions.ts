"use server";

import { revalidatePath } from "next/cache";

import { locales } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";
import type {
  ExerciseMediaType,
  ExerciseTracking,
  MuscleGroup,
  UserRole,
} from "@/lib/supabase/types";

export type ExerciseTextos = {
  name: string;
  description: string;
  procedure: string;
  breathing: string;
  actionFeel: string;
};

export type ExercisePayload = {
  id: string | null;
  slug: string;
  category: MuscleGroup;
  equipment: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  isActive: boolean;
  tracking: ExerciseTracking;
  mediaUrl: string | null;
  mediaType: ExerciseMediaType | null;
  textos: Record<string, ExerciseTextos>;
};

type Resultado = { ok: true; id: string } | { ok: false; error: string };

/** Confirma o papel antes de escrever. O RLS repete a verificação na base. */
async function admin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, isAdmin: data?.role === "admin" };
}

function slugify(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function limpar(valor: string): string | null {
  const t = valor.trim();
  return t ? t : null;
}

export async function saveExerciseAction(payload: ExercisePayload): Promise<Resultado> {
  const { supabase, isAdmin, user } = await admin();
  if (!isAdmin || !user) return { ok: false, error: "Sem permissão." };

  const nomePrincipal = payload.textos["pt-pt"]?.name?.trim();
  if (!nomePrincipal) return { ok: false, error: "O nome em pt-PT é obrigatório." };

  const slug = slugify(payload.slug || nomePrincipal);
  if (!slug) return { ok: false, error: "Não foi possível gerar um identificador." };

  const linha = {
    slug,
    category: payload.category,
    equipment: limpar(payload.equipment),
    primary_muscles: payload.primaryMuscles,
    secondary_muscles: payload.secondaryMuscles,
    is_active: payload.isActive,
    tracking: payload.tracking,
    media_url: payload.mediaUrl,
    media_type: payload.mediaUrl ? payload.mediaType : null,
    source: "axon" as const,
  };

  let id = payload.id;

  if (id) {
    const { error } = await supabase.from("exercises").update(linha).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("exercises")
      .insert({ ...linha, created_by: user.id })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    id = data.id;
  }

  const traducoes = locales
    .map((locale) => {
      const texto = payload.textos[locale];
      if (!texto?.name?.trim()) return null;
      return {
        exercise_id: id as string,
        locale,
        name: texto.name.trim(),
        description: limpar(texto.description),
        procedure: limpar(texto.procedure),
        breathing: limpar(texto.breathing),
        action_feel: limpar(texto.actionFeel),
      };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  if (traducoes.length > 0) {
    const { error } = await supabase
      .from("exercise_translations")
      .upsert(traducoes, { onConflict: "exercise_id,locale" });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, id: id as string };
}

export async function deleteExerciseAction(id: string): Promise<Resultado> {
  const { supabase, isAdmin } = await admin();
  if (!isAdmin) return { ok: false, error: "Sem permissão." };

  // As séries já registadas apontam para o exercício. Em vez de apagar e
  // perder histórico, desativa-se: sai do catálogo e o passado mantém-se.
  const { error } = await supabase
    .from("exercises")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function setExerciseActiveAction(
  id: string,
  active: boolean,
): Promise<Resultado> {
  const { supabase, isAdmin } = await admin();
  if (!isAdmin) return { ok: false, error: "Sem permissão." };

  const { error } = await supabase
    .from("exercises")
    .update({ is_active: active })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function setUserRoleAction(
  userId: string,
  role: UserRole,
): Promise<Resultado> {
  const { supabase, isAdmin, user } = await admin();
  if (!isAdmin || !user) return { ok: false, error: "Sem permissão." };

  // Um administrador não se despromove a si próprio: evita ficar sem ninguém
  // com acesso ao painel por engano.
  if (userId === user.id && role !== "admin") {
    return { ok: false, error: "Não podes remover o teu próprio acesso de administrador." };
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, id: userId };
}
