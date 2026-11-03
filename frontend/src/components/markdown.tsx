import { ExternalLink } from "@/systems/links/external-link";
import { t, useLanguage } from "@/systems/i18n/locale";
import { Eye, Pencil } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mediaUrl, markdownImage } from "@/systems/media/media";
import { UserImage } from "@/systems/media/user-image";
import { ImageUpload } from "@/systems/media/image-upload";
import { Button } from "./ui/button";
import { Textarea } from "./ui/input";

function safeMarkdownUrl(url: string, image = false) {
  if (image) return mediaUrl(url);
  return /^(https?:\/\/|mailto:|#[a-z0-9_-]*$)/i.test(url) || /^\/(?![/\\])[^\\]*$/.test(url) ? url : "";
}

export function Markdown({ value, allowImages = true }: { value: string; allowImages?: boolean }) {
  useLanguage();
  return <div className="markdown min-w-0 break-words text-sm leading-7"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml urlTransform={(url, key) => key === "src" && !allowImages ? "" : safeMarkdownUrl(url, key === "src")} components={{ a: ({ href, children }) => href ? (/^(https?:|mailto:)/i.test(href)?<ExternalLink href={href} className="text-primary underline underline-offset-4">{children}</ExternalLink>:<a href={href} className="text-primary underline underline-offset-4">{children}</a>) : <span>{children}</span>, img: ({ src, alt }) => src ? <UserImage src={src} alt={alt ?? ""} className="my-4 max-h-96 max-w-full rounded-xl object-contain"/> : <span className="text-muted-foreground">{alt || t("Изображение недоступно")}</span> }}>{value}</ReactMarkdown></div>;
}

export function MarkdownEditor({ id, value, onChange, onUploading, allowImages = true, maxLength = 200_000 }: { id: string; value: string; onChange: (value: string) => void; onUploading?: (uploading: boolean) => void; allowImages?: boolean; maxLength?: number }) {
  useLanguage();
  const [preview, setPreview] = useState(false);
  const latest = useRef(value);
  useEffect(() => { latest.current = value; }, [value]);
  return <div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><Button size="sm" variant={!preview ? "default" : "outline"} aria-pressed={!preview} onClick={() => setPreview(false)}><Pencil aria-hidden="true" />{t("Текст")}</Button><Button size="sm" variant={preview ? "default" : "outline"} aria-pressed={preview} onClick={() => setPreview(true)}><Eye aria-hidden="true" />{t("Просмотр")}</Button>{allowImages && <ImageUpload onUploading={onUploading} onUploaded={(image,file)=>{const next=`${latest.current}${latest.current ? "\n\n" : ""}${markdownImage(file.name,image.url)}`;latest.current=next;onChange(next);setPreview(false);}}/>}</div>{preview ? <div className="min-h-40 rounded-xl border border-border bg-background p-4">{value ? <Markdown value={value} allowImages={allowImages}/> : <p className="text-sm text-muted-foreground">{t("Добавьте текст для предпросмотра.")}</p>}</div> : <Textarea id={id} value={value} maxLength={maxLength} className="min-h-44 font-mono text-xs" onChange={(event) => onChange(event.target.value)} />}<p className="text-xs text-muted-foreground">{t("Markdown: **жирный**, *курсив*, списки и таблицы. Изображения доступны только вам.")}</p></div>;
}
