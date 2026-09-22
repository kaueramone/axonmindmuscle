"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/surface";
import {
  enableAffiliate,
  payAffiliate,
  setAffiliate,
} from "@/lib/affiliates/actions";
import type { AffiliateCopy } from "@/lib/affiliates/copy";
import { t } from "@/lib/i18n/interpolate";

const inputClass =
  "h-11 w-full min-w-0 rounded-md border border-hairline bg-surface px-3 text-fg";
const errorText = (copy: AffiliateCopy, code: string) =>
  code === "accountNotFound"
    ? copy.accountNotFound
    : code === "insufficient"
      ? copy.insufficient
      : copy.failed;

export function ReferralLink({
  url,
  copy,
}: {
  url: string;
  copy: AffiliateCopy;
}) {
  const [message, setMessage] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="affiliate-link" className="text-headline">
        {copy.link}
      </label>
      <input
        id="affiliate-link"
        readOnly
        value={url}
        className={inputClass}
        onFocus={(e) => e.target.select()}
      />
      <Button
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setMessage(copy.copied);
          } catch {
            setMessage(copy.copyFailed);
          }
        }}
      >
        {copy.copy}
      </Button>
      <p role="status" className="text-footnote text-fg-muted">
        {message}
      </p>
    </div>
  );
}

export function EnableAffiliate({
  copy,
  base,
}: {
  copy: AffiliateCopy;
  base: string;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        setError("");
        start(async () => {
          try {
            const result = await enableAffiliate(email);
            if (!result.ok) {
              setError(errorText(copy, result.error));
              return;
            }
            router.push(`${base}/${result.id}`);
            router.refresh();
          } catch {
            setError(copy.failed);
          }
        });
      }}
    >
      <h2 className="text-headline">{copy.register}</h2>
      <p className="text-footnote text-fg-muted">{copy.registerHint}</p>
      <label htmlFor="affiliate-email">{copy.email}</label>
      <input
        id="affiliate-email"
        type="email"
        required
        maxLength={254}
        value={email}
        disabled={pending}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />
      <Button disabled={pending}>
        {pending ? <Spinner /> : null}
        {copy.register}
      </Button>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </form>
  );
}

export function AffiliateToggle({
  id,
  enabled,
  copy,
}: {
  id: string;
  enabled: boolean;
  copy: AffiliateCopy;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError("");
          start(async () => {
            try {
              const result = await setAffiliate(id, !enabled);
              if (!result.ok) setError(copy.failed);
              else router.refresh();
            } catch {
              setError(copy.failed);
            }
          });
        }}
      >
        {pending ? <Spinner /> : null}
        {enabled ? copy.disable : copy.enable}
      </Button>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}

export function AffiliatePayment({
  id,
  available,
  copy,
}: {
  id: string;
  available: number;
  copy: AffiliateCopy;
}) {
  const [quantity, setQuantity] = useState("");
  const [review, setReview] = useState<{
    quantity: number;
    request: string;
  } | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-headline">{copy.payTitle}</h2>
      <p>
        {copy.pending}: <strong>{available}</strong>
      </p>
      <p className="text-footnote text-fg-muted">{copy.payHelp}</p>
      {review ? (
        <>
          <p>{t(copy.confirmText, { n: review.quantity })}</p>
          <Button
            disabled={pending}
            onClick={() => {
              setAttempted(true);
              setError("");
              start(async () => {
                try {
                  const result = await payAffiliate(
                    id,
                    review.quantity,
                    review.request,
                  );
                  if (!result.ok) {
                    setError(errorText(copy, result.error));
                    setAttempted(false);
                    return;
                  }
                  setReview(null);
                  setQuantity("");
                  setSuccess(true);
                  setAttempted(false);
                  router.refresh();
                } catch {
                  // Retain the request UUID and quantity on uncertain responses.
                  setError(copy.retry);
                }
              });
            }}
          >
            {pending ? <Spinner /> : null}
            {copy.confirm}
          </Button>
          <Button
            variant="secondary"
            disabled={pending || attempted}
            onClick={() => {
              setReview(null);
              setError("");
            }}
          >
            {copy.cancel}
          </Button>
        </>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSuccess(false);
            const n = Number(quantity);
            if (!Number.isSafeInteger(n) || n < 1 || n > available) {
              setError(copy.invalidQuantity);
              return;
            }
            setError("");
            setReview({ quantity: n, request: crypto.randomUUID() });
          }}
        >
          <label htmlFor="affiliate-quantity">{copy.quantity}</label>
          <input
            id="affiliate-quantity"
            type="number"
            min={1}
            max={Math.max(1, available)}
            step={1}
            required
            inputMode="numeric"
            value={quantity}
            disabled={available === 0}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClass}
          />
          <Button disabled={available === 0}>{copy.review}</Button>
        </form>
      )}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <p role="status" className="text-success">
        {success ? copy.paidSuccess : ""}
      </p>
    </div>
  );
}
