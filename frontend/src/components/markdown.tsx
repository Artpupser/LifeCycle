import { Eye, ImagePlus, LoaderCircle, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ApiError, errorMessage } from "@/lib/api";
import { Button } from "./ui/button";
import { Textarea } from "./ui/input";

function safeMarkdownUrl(url: string, image = false) {
  if (image) return /^\/api\/media\/[a-f0-9-]{36}$/i.test(url) ? url : "";
  return /^(https?:\/\/|mailto:|#[a-z0-9_-]*$)/i.test(url) || /^\/(?![/\\])[^\\]*$/.test(url) ? url : "";
}

export function Markdown({ value }: { value: string }) {
  return <div className="markdown min-w-0 break-words text-sm leading-7"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml urlTransform={(url, key) => safeMarkdownUrl(url, key === "src")} components={{ a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">{children}</a> : <span>{children}</span>, img: ({ src, alt }) => src ? <img src={src} alt={alt ?? ""} className="my-4 max-h-96 max-w-full rounded-xl object-contain" loading="lazy" /> : <span className="text-muted-foreground">{alt || "Изображение недоступно"}</span> }}>{value}</ReactMarkdown></div>;
}

export function MarkdownEditor({ id, value, onChange, onUploading }: { id: string; value: string; onChange: (value: string) => void; onUploading?: (uploading: boolean) => void }) {
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const latest = useRef(value);
  useEffect(() => { latest.current = value; }, [value]);

  async function upload(file: File) {
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) { setError("Выберите PNG, JPEG или WebP размером до 8 МБ."); return; }
    setUploading(true); onUploading?.(true);
    try {
      const response = await fetch("/api/media", { method: "POST", credentials: "same-origin", headers: { "Content-Type": file.type }, body: file, signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new ApiError(response.status, "upload_failed");
      const result = await response.json() as { id: string; url: string };
      if (!safeMarkdownUrl(result.url, true)) throw new Error("Invalid image URL");
      onChange(`${latest.current}${latest.current ? "\n\n" : ""}![${file.name.replace(/[[\]\r\n]/g, "")}](${result.url})`); setPreview(false);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setUploading(false); onUploading?.(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return <div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><Button size="sm" variant={!preview ? "default" : "outline"} aria-pressed={!preview} onClick={() => setPreview(false)}><Pencil aria-hidden="true" />Текст</Button><Button size="sm" variant={preview ? "default" : "outline"} aria-pressed={preview} onClick={() => setPreview(true)}><Eye aria-hidden="true" />Просмотр</Button><Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}Изображение</Button><input ref={fileRef} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Загрузить изображение" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></div>{preview ? <div className="min-h-40 rounded-xl border border-border bg-background p-4">{value ? <Markdown value={value} /> : <p className="text-sm text-muted-foreground">Добавьте текст для предпросмотра.</p>}</div> : <Textarea id={id} value={value} maxLength={200_000} className="min-h-44 font-mono text-xs" onChange={(event) => onChange(event.target.value)} />}{error && <p className="text-sm text-destructive" role="alert">{error}</p>}<p className="text-xs text-muted-foreground">Markdown: **жирный**, *курсив*, списки и таблицы. Изображения доступны только вам.</p></div>;
}
