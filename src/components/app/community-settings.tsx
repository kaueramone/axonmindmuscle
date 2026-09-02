"use client";

import Link from "next/link";
import { useState } from "react";

import { GeneratedAvatar } from "@/components/app/avatar";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/ui/surface";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/types";
import { profileRoute } from "@/lib/routes";
import type { Profile } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/**
 * O que a comunidade vê de ti, decidido por ti.
 *
 * Os quatro interruptores nascem desligados (privacidade por omissão): quem
 * nunca abrir isto tem um perfil com nome, avatar, publicações e seguidores,
 * e nada de treino. Cada linha diz em texto o que passa a ficar visível —
 * um interruptor sem frase é uma pergunta que a pessoa não sabe responder.
 *
 * Campos do mesmo formulário do perfil: gravam com o botão "Guardar".
 */
export function CommunitySettings({
  profile,
  copy,
  medals,
  locale,
}: {
  profile: Profile;
  copy: Dict["app"]["profile"];
  medals: Dict["app"]["medals"];
  locale: Locale;
}) {
  const [kind, setKind] = useState<"photo" | "generated">(profile.avatar_kind);
  const [seed, setSeed] = useState(profile.avatar_seed ?? profile.id.slice(0, 8));

  function novaSemente() {
    // 8 caracteres de [a-z0-9]: chega para não repetir e passa na regra da
    // base de dados. Não precisa de ser criptográfico — é uma figura.
    const letras = "abcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < 8; i += 1) s += letras[Math.floor(Math.random() * letras.length)];
    setSeed(s);
  }

  const interruptores: {
    nome: "is_private" | "show_stats" | "show_records" | "show_readiness" | "ranking_opt_in";
    rotulo: string;
    ajuda: string;
    valor: boolean;
  }[] = [
    { nome: "show_stats", rotulo: copy.showStats, ajuda: copy.showStatsHint, valor: profile.show_stats },
    { nome: "show_records", rotulo: copy.showRecords, ajuda: copy.showRecordsHint, valor: profile.show_records },
    { nome: "show_readiness", rotulo: copy.showReadiness, ajuda: copy.showReadinessHint, valor: profile.show_readiness },
    { nome: "ranking_opt_in", rotulo: medals.rankingOptIn, ajuda: medals.rankingOptInHint, valor: profile.ranking_opt_in },
    { nome: "is_private", rotulo: copy.isPrivate, ajuda: copy.isPrivateHint, valor: profile.is_private },
  ];

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="label-brand text-fg-subtle">{copy.communityTitle}</h2>
        {profile.handle ? (
          <Link
            href={profileRoute(locale, profile.handle)}
            className="text-subhead font-medium text-accent"
          >
            {copy.viewPublic}
          </Link>
        ) : null}
      </div>

      {/* Avatar: foto ou figura gerada. */}
      <div className="flex flex-col gap-2.5">
        <p className="pl-1 text-footnote font-medium text-fg-muted">{copy.avatarKind}</p>
        <input type="hidden" name="avatar_kind" value={kind} />
        <input type="hidden" name="avatar_seed" value={seed} />
        <div className="grid grid-cols-2 gap-2">
          {(["photo", "generated"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={cn(
                "flex items-center gap-3 rounded-md border px-3.5 py-3 text-left text-callout transition-colors",
                kind === k
                  ? "border-accent bg-accent-soft text-fg"
                  : "border-hairline bg-surface text-fg-muted",
              )}
            >
              {k === "generated" ? (
                <GeneratedAvatar seed={seed} size={36} />
              ) : (
                <span className="size-9 shrink-0 rounded-full bg-surface-strong" />
              )}
              {k === "photo" ? copy.avatarPhoto : copy.avatarGenerated}
            </button>
          ))}
        </div>
        {kind === "generated" ? (
          <button
            type="button"
            onClick={novaSemente}
            className="self-start text-subhead font-medium text-accent"
          >
            {copy.avatarShuffle}
          </button>
        ) : null}
        <p className="pl-1 text-caption text-fg-subtle">{copy.avatarGeneratedHint}</p>
      </div>

      <Field
        label={copy.gym}
        name="gym"
        defaultValue={profile.gym ?? ""}
        maxLength={60}
        hint={copy.gymHint}
        autoComplete="organization"
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="pl-1 text-footnote font-medium text-fg-muted">
          {copy.bio}
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio ?? ""}
          maxLength={160}
          rows={2}
          className="w-full resize-none rounded-md border border-hairline bg-surface px-3.5 py-2.5 text-callout text-fg outline-none focus:border-accent"
        />
        <p className="pl-1 text-caption text-fg-subtle">{copy.bioHint}</p>
      </div>

      <div className="flex flex-col gap-1 border-t border-hairline pt-4">
        <p className="pl-1 text-footnote font-medium text-fg-muted">{copy.privacyTitle}</p>
        <p className="pl-1 text-caption text-fg-subtle">{copy.privacyHint}</p>
        <ul className="mt-2 flex flex-col divide-y divide-hairline">
          {interruptores.map((i) => (
            <li key={i.nome}>
              <label className="flex cursor-pointer items-start gap-3 py-3">
                <input
                  type="checkbox"
                  name={i.nome}
                  defaultChecked={i.valor}
                  className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-callout text-fg">{i.rotulo}</span>
                  <span className="text-caption text-fg-subtle">{i.ajuda}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
