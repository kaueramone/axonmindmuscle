"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MediaField } from "@/components/admin/media-field";
import { Button } from "@/components/ui/button";
import { Alert, Card, Spinner } from "@/components/ui/surface";
import { saveExerciseAction, type ExercisePayload, type ExerciseTextos } from "@/lib/admin/actions";
import { locales, type Locale } from "@/lib/i18n/config";
import type { ExerciseMediaType, ExerciseTracking, MuscleGroup } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebraco: "Antebraço",
  abdomen: "Abdómen",
  quadriceps: "Quadríceps",
  isquiotibiais: "Isquiotibiais",
  gluteos: "Glúteos",
  gemeos: "Gémeos",
  lombar: "Lombar",
  corpo_inteiro: "Corpo inteiro",
};

const GRUPOS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

const LOCALE_LABELS: Record<Locale, string> = {
  "pt-pt": "Português (Portugal)",
  "pt-br": "Português (Brasil)",
};

const VAZIO: ExerciseTextos = {
  name: "",
  description: "",
  procedure: "",
  breathing: "",
  actionFeel: "",
};

/* ---------------- Campos base ---------------- */

function Campo({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-footnote font-medium text-fg-muted">{label}</span>
      {children}
      {hint ? <span className="text-caption text-fg-subtle">{hint}</span> : null}
    </label>
  );
}

const INPUT =
  "h-11 w-full rounded-md border border-hairline bg-surface px-3.5 text-body text-fg outline-none focus:border-accent";
const AREA =
  "min-h-24 w-full resize-y rounded-md border border-hairline bg-surface px-3.5 py-2.5 text-body leading-relaxed text-fg outline-none focus:border-accent";

function Chips({
  valores,
  selecionados,
  onToggle,
}: {
  valores: MuscleGroup[];
  selecionados: MuscleGroup[];
  onToggle: (v: MuscleGroup) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {valores.map((v) => {
        const ativo = selecionados.includes(v);
        return (
          <button
            key={v}
            type="button"
            aria-pressed={ativo}
            onClick={() => onToggle(v)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-subhead transition-colors",
              ativo
                ? "border-accent bg-accent-soft text-accent"
                : "border-hairline bg-surface text-fg-subtle hover:text-fg",
            )}
          >
            {MUSCLE_LABELS[v]}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Formulário ---------------- */

export function ExerciseForm({
  inicial,
  locale,
}: {
  inicial: ExercisePayload;
  locale: Locale;
}) {
  const router = useRouter();

  const [dados, setDados] = useState<ExercisePayload>(inicial);
  const [aba, setAba] = useState<Locale>("pt-pt");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  // Chave estável para o caminho da media, também antes de o registo existir.
  const [chaveMedia] = useState(
    () => inicial.id ?? (globalThis.crypto?.randomUUID?.() ?? `novo-${Date.now()}`),
  );

  function texto(l: Locale): ExerciseTextos {
    return dados.textos[l] ?? VAZIO;
  }

  function definirTexto(l: Locale, campo: keyof ExerciseTextos, valor: string) {
    setDados((d) => ({
      ...d,
      textos: { ...d.textos, [l]: { ...(d.textos[l] ?? VAZIO), [campo]: valor } },
    }));
    setGuardado(false);
  }

  async function guardar() {
    setBusy(true);
    setErro(null);
    const resultado = await saveExerciseAction(dados);
    setBusy(false);

    if (!resultado.ok) {
      setErro(resultado.error);
      return;
    }

    setGuardado(true);
    if (!dados.id) {
      router.replace(`/${locale}/painel/exercicios/${resultado.id}`);
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {erro ? <Alert tone="danger">{erro}</Alert> : null}
      {guardado ? <Alert tone="success">Exercício guardado.</Alert> : null}

      <Card className="flex flex-col gap-5">
        <MediaField
          exerciseKey={chaveMedia}
          url={dados.mediaUrl}
          type={dados.mediaType}
          onChange={(url, type) => {
            setDados((d) => ({ ...d, mediaUrl: url, mediaType: type }));
            setGuardado(false);
          }}
        />
      </Card>

      <Card className="flex flex-col gap-5">
        <h2 className="label-brand text-fg-subtle">Classificação</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Grupo principal">
            <select
              value={dados.category}
              onChange={(e) => {
                const category = e.target.value as MuscleGroup;
                setDados((d) => ({ ...d, category }));
                setGuardado(false);
              }}
              className={INPUT}
            >
              {GRUPOS.map((g) => (
                <option key={g} value={g}>
                  {MUSCLE_LABELS[g]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Equipamento" hint="Barra, halteres, máquina, peso do corpo…">
            <input
              type="text"
              value={dados.equipment}
              onChange={(e) => {
                setDados((d) => ({ ...d, equipment: e.target.value }));
                setGuardado(false);
              }}
              className={INPUT}
            />
          </Campo>
        </div>

        <Campo
          label="Identificador"
          hint="Deixa vazio para gerar a partir do nome em pt-PT."
        >
          <input
            type="text"
            value={dados.slug}
            onChange={(e) => {
              setDados((d) => ({ ...d, slug: e.target.value }));
              setGuardado(false);
            }}
            className={`${INPUT} data-mono`}
            placeholder="agachamento-com-barra"
          />
        </Campo>

        <div className="flex flex-col gap-2">
          <span className="text-footnote font-medium text-fg-muted">
            Músculos principais
          </span>
          <Chips
            valores={GRUPOS}
            selecionados={dados.primaryMuscles}
            onToggle={(v) => {
              setDados((d) => ({
                ...d,
                primaryMuscles: d.primaryMuscles.includes(v)
                  ? d.primaryMuscles.filter((x) => x !== v)
                  : [...d.primaryMuscles, v],
              }));
              setGuardado(false);
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-footnote font-medium text-fg-muted">
            Músculos secundários
          </span>
          <Chips
            valores={GRUPOS}
            selecionados={dados.secondaryMuscles}
            onToggle={(v) => {
              setDados((d) => ({
                ...d,
                secondaryMuscles: d.secondaryMuscles.includes(v)
                  ? d.secondaryMuscles.filter((x) => x !== v)
                  : [...d.secondaryMuscles, v],
              }));
              setGuardado(false);
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-footnote font-medium text-fg-muted">Como se conta</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["reps", "Repetições", "Séries com cadência e metrónomo."],
                ["time", "Tempo", "Cronómetro livre, sem carga nem repetições."],
              ] as const
            ).map(([valor, rotulo, nota]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={dados.tracking === valor}
                onClick={() => {
                  setDados((d) => ({ ...d, tracking: valor as ExerciseTracking }));
                  setGuardado(false);
                }}
                className={cn(
                  "flex flex-col items-start rounded-lg border px-3.5 py-2.5 text-left transition-colors",
                  dados.tracking === valor
                    ? "border-accent bg-accent-soft"
                    : "border-hairline bg-surface hover:bg-surface-hover",
                )}
              >
                <span
                  className={cn(
                    "text-subhead font-semibold",
                    dados.tracking === valor ? "text-accent" : "text-fg",
                  )}
                >
                  {rotulo}
                </span>
                <span className="text-caption text-fg-subtle">{nota}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={dados.isActive}
            onChange={(e) => {
              setDados((d) => ({ ...d, isActive: e.target.checked }));
              setGuardado(false);
            }}
            className="size-4 accent-[var(--accent)]"
          />
          <span className="text-callout text-fg">Visível no catálogo</span>
        </label>
      </Card>

      <Card className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="label-brand text-fg-subtle">Apresentação</h2>
          <div className="flex gap-1.5">
            {locales.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setAba(l)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-subhead transition-colors",
                  aba === l
                    ? "bg-accent-soft text-accent"
                    : "text-fg-subtle hover:text-fg",
                )}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        <Campo
          label="Título"
          hint={
            aba === "pt-pt"
              ? "Obrigatório — é também a base do identificador."
              : "Se ficar vazio, o exercício aparece apenas em pt-PT."
          }
        >
          <input
            type="text"
            value={texto(aba).name}
            onChange={(e) => definirTexto(aba, "name", e.target.value)}
            className={INPUT}
          />
        </Campo>

        <Campo label="Descrição" hint="Uma frase de enquadramento, opcional.">
          <textarea
            value={texto(aba).description}
            onChange={(e) => definirTexto(aba, "description", e.target.value)}
            className={AREA}
          />
        </Campo>

        <Campo label="Procedimento" hint="Como executar o movimento, passo a passo.">
          <textarea
            value={texto(aba).procedure}
            onChange={(e) => definirTexto(aba, "procedure", e.target.value)}
            className={AREA}
          />
        </Campo>

        <Campo label="Respire" hint="Onde inspirar e onde expirar.">
          <textarea
            value={texto(aba).breathing}
            onChange={(e) => definirTexto(aba, "breathing", e.target.value)}
            className={AREA}
          />
        </Campo>

        <Campo
          label="Sentimento de ação"
          hint="O que se deve sentir, e onde."
        >
          <textarea
            value={texto(aba).actionFeel}
            onChange={(e) => definirTexto(aba, "actionFeel", e.target.value)}
            className={AREA}
          />
        </Campo>
      </Card>

      <div className="sticky bottom-0 flex gap-2.5 border-t border-hairline bg-bg/90 py-4 backdrop-blur safe-b">
        <Button size="lg" onClick={guardar} disabled={busy}>
          {busy ? <Spinner /> : null}
          Guardar exercício
        </Button>
        <Button
          size="lg"
          variant="ghost"
          onClick={() => router.push(`/${locale}/painel/exercicios`)}
        >
          Voltar
        </Button>
      </div>
    </div>
  );
}
