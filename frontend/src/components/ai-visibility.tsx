import { useState } from "react";
import { api, errorMessage } from "@/lib/api";

export type AiAccess = { ai_shared: boolean; ai_access_revision: number };
export function AiVisibility({ kind, id, title, access, saved }: { kind: "notes" | "workouts" | "exercises"; id: string; title: string; access: AiAccess; saved: (next: AiAccess) => void }) {
  const [optimistic, setOptimistic] = useState<{ revision: number; checked: boolean } | null>(null);
  const checked = optimistic?.revision === access.ai_access_revision ? optimistic.checked : access.ai_shared;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function change(checked: boolean) {
    setOptimistic({ revision: access.ai_access_revision, checked }); setBusy(true); setError(null);
    try { saved(await api<AiAccess>(`/${kind}/${id}/ai-access`, { method: "PUT", body: { ai_shared: checked, revision: access.ai_access_revision } })); }
    catch (failure) { setOptimistic(null); setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <div className="space-y-1"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground" title="AI видит эту запись только при включённом доступе к разделу. Отзыв отменяет прежние предпросмотры и ожидающие ответы."><input type="checkbox" className="size-4 accent-primary" aria-label={`AI Доступ: ${title}`} checked={checked} disabled={busy} onChange={(event) => void change(event.target.checked)} /><span>AI Доступ</span>{busy && <span role="status">Сохранение…</span>}</label>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}
