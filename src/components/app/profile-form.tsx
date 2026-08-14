"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { AvatarField } from "@/components/app/avatar-field";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert as AlertIcon, Check } from "@/components/ui/icons";
import { ChoiceGrid } from "@/components/ui/segmented";
import { Alert, Card, ListGroup, Spinner } from "@/components/ui/surface";
import { SignOut } from "@/components/ui/icons";
import {
  signOutAction,
  updateProfileAction,
  type ActionResult,
} from "@/lib/auth/actions";
import type { Dict } from "@/lib/i18n/types";
import type { ExperienceLevel, Profile, TrainingGoal } from "@/lib/supabase/types";
import { useState } from "react";

function SubmitButton({ label, savingLabel }: { label: string; savingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? <Spinner /> : null}
      {pending ? savingLabel : label}
    </Button>
  );
}

export function ProfileForm({
  profile,
  dict,
  locale,
}: {
  profile: Profile;
  dict: Dict;
  locale: string;
}) {
  const copy = dict.app.profile;
  const onboarding = dict.onboarding.steps;

  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    updateProfileAction,
    null,
  );
  const [goal, setGoal] = useState<TrainingGoal | null>(profile.goal);
  const [experience, setExperience] = useState<ExperienceLevel | null>(
    profile.experience,
  );

  const goals = [
    {
      value: "hypertrophy" as const,
      label: onboarding.goal.options.hypertrophy,
      detail: onboarding.goal.options.hypertrophyBody,
    },
    {
      value: "strength" as const,
      label: onboarding.goal.options.strength,
      detail: onboarding.goal.options.strengthBody,
    },
    {
      value: "endurance" as const,
      label: onboarding.goal.options.endurance,
      detail: onboarding.goal.options.enduranceBody,
    },
    {
      value: "health" as const,
      label: onboarding.goal.options.health,
      detail: onboarding.goal.options.healthBody,
    },
  ];

  const levels = [
    {
      value: "beginner" as const,
      label: onboarding.experience.options.beginner,
      detail: onboarding.experience.options.beginnerBody,
    },
    {
      value: "intermediate" as const,
      label: onboarding.experience.options.intermediate,
      detail: onboarding.experience.options.intermediateBody,
    },
    {
      value: "advanced" as const,
      label: onboarding.experience.options.advanced,
      detail: onboarding.experience.options.advancedBody,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-6">
        {state?.ok ? (
          <Alert tone="success" icon={<Check className="size-4" />}>
            {copy.updated}
          </Alert>
        ) : null}
        {state && !state.ok ? (
          <Alert tone="danger" icon={<AlertIcon className="size-4" />}>
            {dict.errors[state.error as keyof Dict["errors"]] as string}
          </Alert>
        ) : null}

        <Card>
          <AvatarField
            userId={profile.id}
            name={profile.display_name}
            initialUrl={profile.avatar_url}
            labels={{
              title: copy.photo,
              change: copy.photoChange,
              remove: copy.photoRemove,
              hint: copy.photoHint,
              tooLarge: copy.photoTooLarge,
              wrongType: copy.photoWrongType,
              failed: copy.photoFailed,
            }}
          />
        </Card>

        <Card className="flex flex-col gap-5">
          <h2 className="label-brand text-fg-subtle">{copy.personal}</h2>

          <Field
            label={copy.displayName}
            name="display_name"
            defaultValue={profile.display_name ?? ""}
            required
            minLength={2}
            maxLength={60}
            autoComplete="name"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={copy.heightCm}
              name="height_cm"
              type="number"
              inputMode="numeric"
              min={90}
              max={250}
              defaultValue={profile.height_cm ?? ""}
            />
            <Field
              label={copy.weightKg}
              name="weight_kg"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={25}
              max={400}
              defaultValue={profile.weight_kg ?? ""}
            />
          </div>

          <Field
            label={copy.birthDate}
            name="birth_date"
            type="date"
            defaultValue={profile.birth_date ?? ""}
          />
        </Card>

        <Card className="flex flex-col gap-5">
          <h2 className="label-brand text-fg-subtle">{copy.training}</h2>

          <div className="flex flex-col gap-2.5">
            <p className="pl-1 text-footnote font-medium text-fg-muted">{copy.goal}</p>
            <input type="hidden" name="goal" value={goal ?? ""} />
            <ChoiceGrid
              options={goals}
              value={goal}
              onChange={setGoal}
              ariaLabel={copy.goal}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="pl-1 text-footnote font-medium text-fg-muted">
              {copy.experience}
            </p>
            <input type="hidden" name="experience" value={experience ?? ""} />
            <ChoiceGrid
              options={levels}
              value={experience}
              onChange={setExperience}
              ariaLabel={copy.experience}
            />
          </div>

          <Field
            label={copy.frequency}
            name="weekly_frequency"
            type="number"
            inputMode="numeric"
            min={1}
            max={7}
            defaultValue={profile.weekly_frequency ?? ""}
            hint={dict.onboarding.steps.frequency.days}
          />
        </Card>

          <SubmitButton label={dict.common.save} savingLabel={dict.common.saving} />
      </form>

      <ListGroup>
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-hover"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-danger/12 text-danger">
              <SignOut className="size-4.5" />
            </span>
            <span className="text-callout font-medium text-danger">
              {dict.nav.signOut}
            </span>
          </button>
        </form>
      </ListGroup>
    </div>
  );
}
