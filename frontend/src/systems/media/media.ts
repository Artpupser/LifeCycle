import { ApiError } from "@/lib/api";
import { t } from "@/systems/i18n/locale";
export const imageTypes = ["image/png", "image/jpeg", "image/webp"];
export const imageAccept = imageTypes.join(",");
const identifier = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function mediaId(value: string) {
  const id = value.startsWith("/api/media/") ? value.slice(11) : value;
  return identifier.test(id) ? id : null;
}
export function mediaUrl(value: string | null | undefined) { const id = value ? mediaId(value) : null; return id ? `/api/media/${id}` : ""; }
export function validateImage(file: Pick<File,"type"|"size">) {
  if (!imageTypes.includes(file.type) || file.size <= 0 || file.size > 8 * 1024 * 1024) throw new Error(t("Выберите PNG, JPEG или WebP размером до 8 МБ."));
}
export async function uploadImage(file: File, signal?: AbortSignal): Promise<{id:string;url:string}> {
  validateImage(file);
  const response = await fetch("/api/media", {method:"POST",credentials:"same-origin",headers:{"Content-Type":file.type},body:file,signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000)});
  if (!response.ok) throw new ApiError(response.status,"upload_failed");
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("id" in result) || !("url" in result) || typeof result.id !== "string" || typeof result.url !== "string" || mediaUrl(result.id)!==result.url) throw new Error(t("Сервер вернул некорректное изображение."));
  return {id:result.id,url:result.url};
}
export function mediaIdsInMarkdown(value: string) { return [...new Set([...value.matchAll(/\/api\/media\/([a-f0-9-]{36})(?![a-f0-9/-])/gi)].map(match=>mediaId(match[1])).filter((id): id is string=>Boolean(id)))]; }
export function markdownImage(name: string, url: string) { return `![${name.replace(/[[\]\\\r\n]/g,"")}](${mediaUrl(url)})`; }
