"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { LogoPulse } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert as AlertIcon, ArrowRight, ChevronLeft } from "@/components/ui/icons";
import { ChoiceGrid } from "@/components/ui/segmented";
import { Alert, Spinner } from "@/components/ui/surface";
import { completeOnboardingAction, type ActionResult } from "@/lib/auth/actions";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import type { ExperienceLevel, TrainingGoal } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const TOTAL = 4;

function FinishButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth disabled={pending}>
      {pending ? <Spinner /> : null}
      {label}
    </Button>
  );
}

export function OnboardingWizard({
  locale,
  dict,
  defaultName,
  next,
}: {
  locale: Locale;
  dict: Dict;
  defaultName: string;
  /** Destino a honrar quando a calibração termina. Null vai para o Hoje. */
  next?: string | null;
}) {
  const copy = dict.onboarding;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultName);
  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [frequency, setFrequency] = useState(3);

  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    completeOnboardingAction,
    null,
  );

  const canAdvance = [name.trim().length >= 2, !!goal, !!experience, true][step];

  const steps = [
    { title: copy.steps.name.title, body: copy.steps.name.body },
    { title: copy.steps.goal.title, body: copy.steps.goal.body },
    { title: copy.steps.experience.title, body: copy.steps.experience.body },
    { title: copy.steps.frequency.title, body: copy.steps.frequency.body },
  ];

  return (
    <div className="flex w-full max-w-lg flex-col gap-8">
      {/* Cabeçalho: progresso */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((value) => value - 1)}
              className="grid size-9 place-items-center rounded-full border border-hairline bg-surface text-fg-muted transition-colors hover:text-fg"
              aria-label={dict.common.back}
            >
              <ChevronLeft className="size-4" />
            </button>
          ) : (
            <LogoPulse className="h-3.5 w-auto text-fg" />
          )}
          <p className="data-mono text-caption text-fg-subtle">
            {t(copy.stepOf, { current: step + 1, total: TOTAL })}
          </p>
        </div>

        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: TOTAL }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                index <= step ? "bg-accent" : "bg-surface-strong",
              )}
            />
          ))}
        </div>
      </div>

      {state && !state.ok ? (
        <Alert tone="danger" icon={<AlertIcon className="size-4" />}>
          {dict.errors[state.error as keyof Dict["errors"]] as string}
        </Alert>
      ) : null}

      <div key={step} className="animate-fade-up">
        <h1 className="text-title1 tracking-[-0.02em] text-fg">{steps[step].title}</h1>
        <p className="mt-2.5 text-callout leading-relaxed text-fg-muted">
          {steps[step].body}
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-7">
        <input type="hidden" name="locale" value={locale} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <input type="hidden" name="display_name" value={name} />
        <input type="hidden" name="goal" value={goal ?? ""} />
        <input type="hidden" name="experience" value={experience ?? ""} />
        <input type="hidden" name="weekly_frequency" value={frequency} />

        {step === 0 ? (
          <Field
            label={dict.auth.fields.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            autoFocus
            maxLength={60}
            placeholder={dict.auth.fields.namePlaceholder}
          />
        ) : null}

        {step === 1 ? (
          <ChoiceGrid
            ariaLabel={steps[1].title}
            value={goal}
            onChange={setGoal}
            options={[
              {
                value: "hypertrophy",
                label: copy.steps.goal.options.hypertrophy,
                detail: copy.steps.goal.options.hypertrophyBody,
              },
              {
                value: "strength",
                label: copy.steps.goal.options.strength,
                detail: copy.steps.goal.options.strengthBody,
              },
              {
                value: "endurance",
                label: copy.steps.goal.options.endurance,
                detail: copy.steps.goal.options.enduranceBody,
              },
              {
                value: "health",
                label: copy.steps.goal.options.health,
                detail: copy.steps.goal.options.healthBody,
              },
            ]}
          />
        ) : null}

        {step === 2 ? (
          <ChoiceGrid
            ariaLabel={steps[2].title}
            value={experience}
            onChange={setExperience}
            columns={1}
            options={[
              {
                value: "beginner",
                label: copy.steps.experience.options.beginner,
                detail: copy.steps.experience.options.beginnerBody,
              },
              {
                value: "intermediate",
                label: copy.steps.experience.options.intermediate,
                detail: copy.steps.experience.options.intermediateBody,
              },
              {
                value: "advanced",
                label: copy.steps.experience.options.advanced,
                detail: copy.steps.experience.options.advancedBody,
              },
            ]}
          />
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-hairline bg-surface p-8">
            <p className="data-mono text-[4rem] leading-none text-fg">{frequency}</p>
            <p className="text-subhead text-fg-subtle">
              {copy.steps.frequency.days}
            </p>
            <input
              type="range"
              min={1}
              max={7}
              step={1}
              value={frequency}
              onChange={(event) => setFrequency(Number(event.target.value))}
              aria-label={copy.steps.frequency.days}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-strong accent-[var(--accent)]"
            />
            <div className="flex w-full justify-between text-caption text-fg-subtle">
              {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                <span key={value} className="data-mono">
                  {value}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {step < TOTAL - 1 ? (
          <Button
            type="button"
            size="lg"
            fullWidth
            disabled={!canAdvance}
            onClick={() => setStep((value) => value + 1)}
          >
            {dict.common.next}
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <FinishButton label={copy.finishCta} />
        )}
      </form>
    </div>
  );
}
