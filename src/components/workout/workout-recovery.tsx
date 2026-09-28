"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/surface";
import type { Dict } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import { route } from "@/lib/routes";
import { clearDraft, readDraft, writeDraft, type WorkoutDraft } from "@/lib/workout/draft";
import { discardSession, endSession, flushQueue, isSessionClosed } from "@/lib/workout/store";

const RecoveryContext = createContext<WorkoutDraft | null>(null);
export const useRecoveredWorkout = () => useContext(RecoveryContext);

/** The page only mounts after recovery is resolved, including on client navigation. */
export function WorkoutRecovery({ userId, locale, copy, initialDraft, children }: {
  userId: string; locale: Locale; copy: Dict["workout"]["recovery"];
  initialDraft: WorkoutDraft | null; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams().toString();
  const locationKey = `${pathname}?${search}`;
  const [checkedPath, setCheckedPath] = useState<string | null>(null);
  const [pending, setPending] = useState<WorkoutDraft | null>(null);
  const [recovered, setRecovered] = useState<WorkoutDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const allowedDestination = useRef<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const workoutPath = route(locale, "workout");

  useEffect(() => {
    const sync = () => { void flushQueue(userId).catch(() => {}); };
    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [userId]);

  useEffect(() => {
    if (allowedDestination.current === locationKey) {
      allowedDestination.current = null;
      setCheckedPath(locationKey);
      return;
    }
    const local = readDraft(userId);
    const draft = local ?? initialDraft;
    const open = draft && (!draft.sessionId || !isSessionClosed(draft.sessionId, userId)) ? draft : null;
    setRecovered(null);
    setPending(open);
    setCheckedPath(locationKey);
    setError(false);
  }, [locationKey, userId, initialDraft]);

  useEffect(() => {
    const element = dialog.current;
    if (!pending || !element) return;
    const preventCancel = (event: Event) => event.preventDefault();
    const keepOpen = () => { if (element.isConnected && !element.open) element.showModal(); };
    element.addEventListener("cancel", preventCancel);
    element.addEventListener("close", keepOpen);
    if (!element.open) element.showModal();
    return () => {
      element.removeEventListener("cancel", preventCancel);
      element.removeEventListener("close", keepOpen);
    };
  }, [pending, checkedPath]);

  const resume = () => {
    if (!pending) return;
    try {
      writeDraft(pending);
      setRecovered(pending);
      setPending(null);
      const destination = pending.routineId ? `${workoutPath}?rotina=${encodeURIComponent(pending.routineId)}` : `${workoutPath}?livre=1`;
      if (locationKey !== destination) {
        allowedDestination.current = destination;
        router.push(destination);
      }
    } catch { setError(true); }
  };

  const close = async (discard: boolean) => {
    if (!pending || busy) return;
    setBusy(true);
    setError(false);
    try {
      if (pending.sessionId) {
        if (discard) await discardSession(pending.sessionId, userId);
        else await endSession(pending.sessionId, userId);
      }
      clearDraft(userId);
      setRecovered(null);
      setPending(null);
      router.refresh();
    } catch { setError(true); }
    finally { setBusy(false); }
  };

  if (checkedPath !== locationKey) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>;
  if (pending) return (
    <div className="min-h-dvh bg-bg">
      <dialog ref={dialog} closedby="none" aria-labelledby="recover-title" aria-describedby="recover-description"
        onCancel={(event) => event.preventDefault()}
        onKeyDown={(event) => { if (event.key === "Escape") event.preventDefault(); }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-hairline bg-bg p-6 text-fg shadow-2xl backdrop:bg-black/70">
        <h2 id="recover-title" className="text-title2 font-semibold">{copy.title}</h2>
        <p id="recover-description" className="mt-3 text-callout text-fg-muted">{copy.description}</p>
        <p className="mt-3 text-subhead text-fg-muted">
          {new Date(pending.startedAt).toLocaleString(locale)} · {pending.logged.length} {pending.logged.length === 1 ? copy.set : copy.sets}
        </p>
        <p className="mt-2 text-footnote text-fg-muted">{copy.finishHint}</p>
        {error ? <div className="mt-3"><Alert tone="danger">{copy.error}</Alert></div> : null}
        <div className="mt-6 flex flex-col gap-3">
          <Button autoFocus fullWidth disabled={busy} onClick={resume}>{copy.resume}</Button>
          <Button fullWidth variant="secondary" disabled={busy} onClick={() => void close(false)}>{copy.finish}</Button>
          <Button fullWidth variant="danger" disabled={busy} onClick={() => void close(true)}>{copy.discard}</Button>
        </div>
      </dialog>
    </div>
  );
  return <RecoveryContext.Provider value={recovered}>{children}</RecoveryContext.Provider>;
}
