"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert as AlertIcon, Download, Photo, Plus, Trash } from "@/components/ui/icons";
import { Alert, Card, Spinner } from "@/components/ui/surface";
import { formatDate, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/interpolate";
import type { Dict } from "@/lib/i18n/types";
import {
  apagarFoto,
  exportarZip,
  fotosDisponiveis,
  guardarFoto,
  lerFoto,
  listarFotos,
  pedirPersistencia,
  todasAsFotos,
  type FotoResumo,
} from "@/lib/photos/store";
import { isInstalled, isIos } from "@/lib/workout/rest-alert";
import { cn } from "@/lib/utils";

type Copy = Dict["app"]["photos"];

/**
 * Galeria, comparação e exportação. Tudo aqui é local: a única rede que esta
 * página usa é a que a trouxe.
 *
 * Comparar: escolher duas fotografias na grelha põe-nas lado a lado, a mais
 * antiga à esquerda. É a única funcionalidade que pede mais do que olhar —
 * e é a que dá sentido a tirar a fotografia uma vez por mês.
 */
export function ProgressPhotos({ copy, locale }: { copy: Copy; locale: Locale }) {
  const [fotos, setFotos] = useState<FotoResumo[] | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [comparacao, setComparacao] = useState<{ a: string; b: string } | null>(null);
  const [aberta, setAberta] = useState<{ id: string; url: string } | null>(null);
  const [aApagar, setAApagar] = useState<string | null>(null);
  const [aExportar, setAExportar] = useState(false);
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState("");
  const ficheiro = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fotosDisponiveis()) {
      setIndisponivel(true);
      setFotos([]);
      return;
    }
    let cancelado = false;
    void listarFotos()
      .then((lista) => {
        if (!cancelado) setFotos(lista);
      })
      .catch(() => {
        if (!cancelado) {
          setIndisponivel(true);
          setFotos([]);
        }
      });
    void pedirPersistencia();
    return () => {
      cancelado = true;
    };
  }, []);

  async function adicionar(file: File | undefined) {
    if (!file) return;
    setErro(null);
    setAGuardar(true);
    try {
      const nova = await guardarFoto(file, `${data}T12:00:00.000Z`, nota);
      setFotos((atual) =>
        [nova, ...(atual ?? [])].sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1)),
      );
      setNota("");
    } catch {
      setErro(copy.saveFailed);
    } finally {
      setAGuardar(false);
      if (ficheiro.current) ficheiro.current.value = "";
    }
  }

  async function abrir(id: string) {
    const f = await lerFoto(id);
    if (!f) return;
    setAberta({ id, url: URL.createObjectURL(f.blob) });
  }

  function fechar() {
    if (aberta) URL.revokeObjectURL(aberta.url);
    setAberta(null);
  }

  async function apagar(id: string) {
    await apagarFoto(id);
    setFotos((atual) => (atual ?? []).filter((f) => f.id !== id));
    setSelecionadas((s) => s.filter((x) => x !== id));
    setAApagar(null);
    if (aberta?.id === id) fechar();
  }

  function alternarSelecao(id: string) {
    setSelecionadas((atual) => {
      if (atual.includes(id)) return atual.filter((x) => x !== id);
      // Duas no máximo: a terceira substitui a mais antiga da seleção.
      return [...atual.slice(-1), id];
    });
  }

  async function comparar() {
    if (selecionadas.length !== 2) return;
    const [x, y] = await Promise.all(selecionadas.map((id) => lerFoto(id)));
    if (!x || !y) return;
    const [antiga, recente] = x.takenAt <= y.takenAt ? [x, y] : [y, x];
    setComparacao({
      a: URL.createObjectURL(antiga.blob),
      b: URL.createObjectURL(recente.blob),
    });
  }

  function fecharComparacao() {
    if (comparacao) {
      URL.revokeObjectURL(comparacao.a);
      URL.revokeObjectURL(comparacao.b);
    }
    setComparacao(null);
  }

  async function exportar() {
    setAExportar(true);
    try {
      const todas = await todasAsFotos();
      const zip = await exportarZip(todas);
      const url = URL.createObjectURL(zip);
      const a = document.createElement("a");
      a.href = url;
      a.download = `axon-fotos-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setErro(copy.exportFailed);
    } finally {
      setAExportar(false);
    }
  }

  const porData = (f: FotoResumo) =>
    formatDate(f.takenAt, locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

  if (fotos == null) {
    return (
      <div className="flex items-center gap-2 text-subhead text-fg-subtle">
        <Spinner /> {copy.loading}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Alert tone="info" icon={<AlertIcon className="size-4" />}>
        <strong className="font-semibold">{copy.localTitle}</strong> {copy.localBody}
        {isIos() && !isInstalled() ? ` ${copy.localIos}` : null}
      </Alert>

      {indisponivel ? (
        <Card>
          <p className="text-callout text-fg-muted">{copy.unavailable}</p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-footnote font-medium text-fg-muted">{copy.dateLabel}</span>
              <input
                type="date"
                value={data}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setData(e.target.value)}
                className="h-11 rounded-md border border-hairline bg-surface px-3 text-callout text-fg outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-footnote font-medium text-fg-muted">{copy.noteLabel}</span>
              <input
                type="text"
                value={nota}
                maxLength={80}
                placeholder={copy.notePlaceholder}
                onChange={(e) => setNota(e.target.value)}
                className="h-11 rounded-md border border-hairline bg-surface px-3 text-callout text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
              />
            </label>
          </div>
          <input
            ref={ficheiro}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void adicionar(e.target.files?.[0])}
          />
          <Button
            type="button"
            size="lg"
            fullWidth
            disabled={aGuardar}
            onClick={() => ficheiro.current?.click()}
          >
            {aGuardar ? <Spinner /> : <Plus className="size-4" />}
            {copy.add}
          </Button>
          {erro ? <Alert tone="danger">{erro}</Alert> : null}
        </Card>
      )}

      {fotos.length === 0 ? (
        !indisponivel ? (
          <Card className="flex items-center gap-3">
            <Photo className="size-5 shrink-0 text-fg-subtle" />
            <p className="text-callout text-fg-muted">{copy.empty}</p>
          </Card>
        ) : null
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-caption text-fg-subtle">
              {selecionadas.length === 2 ? copy.compareReady : copy.compareHint}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={selecionadas.length !== 2}
                onClick={() => void comparar()}
              >
                {copy.compare}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={aExportar}
                onClick={() => void exportar()}
              >
                {aExportar ? <Spinner /> : <Download className="size-4" />}
                {copy.exportZip}
              </Button>
            </div>
          </div>

          <ul className="grid grid-cols-3 gap-2">
            {fotos.map((f) => {
              const escolhida = selecionadas.includes(f.id);
              return (
                <li key={f.id} className="relative">
                  <button
                    type="button"
                    onClick={() => void abrir(f.id)}
                    className={cn(
                      "block aspect-[3/4] w-full overflow-hidden rounded-md border-2 bg-surface-strong",
                      escolhida ? "border-accent" : "border-transparent",
                    )}
                  >
                    {/* Miniatura local: um URL de objeto, não uma imagem remota. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.thumbUrl} alt="" className="size-full object-cover" />
                  </button>
                  <label className="absolute left-1.5 top-1.5 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/55">
                    <input
                      type="checkbox"
                      checked={escolhida}
                      onChange={() => alternarSelecao(f.id)}
                      aria-label={copy.select}
                      className="size-4 accent-[var(--accent)]"
                    />
                  </label>
                  <p className="mt-1 truncate text-caption text-fg-subtle">
                    {porData(f)}
                    {f.nota ? ` · ${f.nota}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Uma foto, grande. */}
      {aberta ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4 safe-t safe-b"
          onClick={fechar}
        >
          <div className="flex items-center justify-between gap-3 text-white">
            <span className="text-subhead">
              {(() => {
                const f = fotos.find((x) => x.id === aberta.id);
                return f ? `${porData(f)}${f.nota ? ` · ${f.nota}` : ""}` : "";
              })()}
            </span>
            <div className="flex gap-2">
              {aApagar === aberta.id ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    void apagar(aberta.id);
                  }}
                >
                  {copy.deleteConfirm}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAApagar(aberta.id);
                  }}
                >
                  <Trash className="size-4" />
                  {copy.delete}
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={fechar}>
                {copy.close}
              </Button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aberta.url} alt="" className="mt-3 min-h-0 flex-1 object-contain" />
        </div>
      ) : null}

      {/* Duas fotos, lado a lado. */}
      {comparacao ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4 safe-t safe-b"
          onClick={fecharComparacao}
        >
          <div className="flex items-center justify-between gap-3 text-white">
            <span className="text-subhead">{copy.compareTitle}</span>
            <Button type="button" variant="secondary" onClick={fecharComparacao}>
              {copy.close}
            </Button>
          </div>
          <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={comparacao.a} alt="" className="min-h-0 size-full object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={comparacao.b} alt="" className="min-h-0 size-full object-contain" />
          </div>
          <p className="mt-2 flex justify-between text-caption text-white/70">
            <span>{copy.compareBefore}</span>
            <span>{copy.compareAfter}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
