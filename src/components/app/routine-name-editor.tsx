"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/surface";
import type { Dict } from "@/lib/i18n/types";
import { t } from "@/lib/i18n/interpolate";
import { renameRoutineAction } from "@/lib/routines/actions";

export function RoutineNameEditor({
  id,
  name,
  copy,
  onSaved,
}: {
  id: string;
  name: string;
  copy: Dict["app"]["week"];
  onSaved: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const editButton = useRef<HTMLButtonElement>(null);

  function close() {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  }

  function save() {
    const clean = draft.trim();
    if (!clean || clean.length > 60) {
      setError(copy.nameInvalid);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await renameRoutineAction(id, clean);
        if (!result.ok) {
          setError(result.error === "nome" ? copy.nameInvalid : copy.saveFailed);
          return;
        }
        onSaved(clean);
        setSaved(true);
        close();
      } catch {
        setError(copy.saveFailed);
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {editing ? (
        <form
          className="flex flex-col gap-3"
          aria-busy={pending}
          onSubmit={(event) => {
            event.preventDefault();
            if (!pending) save();
          }}
        >
          <label htmlFor={`routine-name-${id}`} className="text-subhead text-fg-muted">
            {copy.nameLabel}
          </label>
          <input
            id={`routine-name-${id}`}
            autoFocus
            type="text"
            value={draft}
            maxLength={60}
            disabled={pending}
            aria-invalid={!!error}
            aria-describedby={error ? `routine-name-error-${id}` : undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !pending) {
                event.preventDefault();
                close();
              }
            }}
            className="h-11 w-full min-w-0 rounded-md border border-hairline bg-surface px-4 text-callout text-fg focus:border-accent focus:outline-none"
          />
          {error ? (
            <div id={`routine-name-error-${id}`}>
              <Alert tone="danger">{error}</Alert>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              {copy.saveName}
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={close}>
              {copy.cancelRename}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <span className="break-words text-callout text-fg">{name}</span>
          <button
            ref={editButton}
            type="button"
            aria-label={t(copy.renameLabel, { name })}
            className="min-h-11 self-start text-subhead font-medium text-accent"
            onClick={() => {
              setDraft(name);
              setError(null);
              setSaved(false);
              setEditing(true);
            }}
          >
            {copy.rename}
          </button>
        </>
      )}
      <p role="status" className="text-caption text-success">
        {saved ? copy.nameSaved : ""}
      </p>
    </div>
  );
}
