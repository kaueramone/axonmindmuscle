"use client";

import { useRef, useState } from "react";

import { Close } from "@/components/ui/icons";
import { Alert, Spinner } from "@/components/ui/surface";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Lado do quadrado guardado. Recortamos ao centro antes de enviar. */
const OUTPUT_SIZE = 512;

/**
 * Recorta ao centro, redimensiona e converte para WebP. Assim a imagem que
 * chega ao armazenamento é sempre quadrada e leve, independentemente do que
 * o utilizador escolheu.
 */
async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas indisponível");

  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("falha a converter"))),
      "image/webp",
      0.9,
    );
  });
}

export function AvatarField({
  userId,
  name,
  initialUrl,
  labels,
}: {
  userId: string;
  name: string | null;
  initialUrl: string | null;
  labels: {
    title: string;
    change: string;
    remove: string;
    hint: string;
    tooLarge: string;
    wrongType: string;
    failed: string;
  };
}) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);

    if (!TYPES.includes(file.type)) return setError(labels.wrongType);
    if (file.size > MAX_BYTES) return setError(labels.tooLarge);

    setBusy(true);
    try {
      const blob = await toSquareWebp(file);
      const supabase = createClient();
      const path = `${userId}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/webp" });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      // A cache-busting garante que a imagem nova aparece de imediato.
      const versioned = `${publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: versioned })
        .eq("id", userId);
      if (profileError) throw profileError;

      setUrl(versioned);
    } catch {
      setError(labels.failed);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase.storage.from("avatars").remove([`${userId}/avatar.webp`]);
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
      setUrl(null);
    } catch {
      setError(labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="label-brand text-fg-subtle">{labels.title}</h2>

      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <span className="grid size-20 place-items-center overflow-hidden rounded-full border border-hairline bg-surface-strong">
            {url ? (
              // Imagem externa do Supabase: <img> evita configurar domínios
              // no otimizador para um recorte que já enviámos com 512px.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt=""
                width={80}
                height={80}
                className="size-full object-cover"
              />
            ) : (
              <span className="text-title2 font-semibold text-fg-subtle">
                {initials(name)}
              </span>
            )}
          </span>

          {busy ? (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-bg/70 text-fg">
              <Spinner />
            </span>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="rounded-sm border border-hairline bg-surface-strong px-3.5 py-2 text-subhead font-medium text-fg transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              {labels.change}
            </button>

            {url ? (
              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className="inline-flex items-center gap-1 rounded-sm px-2 py-2 text-subhead text-fg-subtle transition-colors hover:text-danger disabled:opacity-50"
              >
                <Close className="size-3.5" />
                {labels.remove}
              </button>
            ) : null}
          </div>

          <p className="text-caption text-fg-subtle">{labels.hint}</p>
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
