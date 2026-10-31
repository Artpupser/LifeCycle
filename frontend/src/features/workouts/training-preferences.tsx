import { useState, type FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useResource } from "@/hooks/use-resource";
import { ApiError, api, errorMessage } from "@/lib/api";

type Conditions = Record<"goals" | "equipment" | "restrictions", string | null>;
type Preferences = { revision: number; data: Conditions };
const fields = [
  ["goals", "Цели тренировок", "Например: развивать выносливость, укрепить спину, заниматься трижды в неделю."],
  ["equipment", "Оборудование", "Например: коврик, резинки, гантели по 3 кг; или занятия без инвентаря."],
  ["restrictions", "Ограничения", "Например: без прыжков, не более 20 минут; укажите известные ограничения или их отсутствие."],
] as const;

function PreferencesForm({ initial, saved }: { initial: Preferences; saved: (value: Preferences) => void }) {
  const [draft, setDraft] = useState<Preferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const value = draft ?? initial;
  const dirty = !!draft && fields.some(([key]) => (draft.data[key] ?? "").trim() !== (initial.data[key] ?? ""));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !dirty) return;
    setBusy(true); setError(null); setSuccess(false); setStale(false);
    try {
      const next = await api<Preferences>("/workouts/preferences", { method: "PUT", body: value });
      saved(next); setDraft(null); setSuccess(true);
    } catch (failure) {
      setError(errorMessage(failure));
      setStale(failure instanceof ApiError && failure.code === "workout_preferences_stale");
    } finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void submit(event)} className="space-y-4" aria-label="Цели и условия тренировок">
    <div className="grid gap-4 lg:grid-cols-3">{fields.map(([key, label, placeholder]) => <FormField key={key} id={`training-${key}`} label={label}><Textarea id={`training-${key}`} maxLength={2000} disabled={busy} value={value.data[key] ?? ""} placeholder={placeholder} className="min-h-28" onChange={(event) => { setDraft({ revision: value.revision, data: { ...value.data, [key]: event.target.value } }); setSuccess(false); }} /></FormField>)}</div>
    <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={busy || !dirty}>{busy ? "Сохранение…" : "Сохранить цели и условия"}</Button>{success && !dirty && <p role="status" className="text-sm text-muted-foreground">Цели и условия сохранены.</p>}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{stale && <Button variant="outline" onClick={async () => { try { const next = await api<Preferences>("/workouts/preferences"); saved(next); setDraft(null); setError(null); setStale(false); } catch (failure) { setError(errorMessage(failure)); } }}>Загрузить сохранённые данные</Button>}
  </form>;
}

export function TrainingPreferences() {
  const preferences = useResource<Preferences>("/workouts/preferences");
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5" aria-label="Условия тренировок"><div className="space-y-2"><h2 className="text-2xl font-semibold">Цели и условия тренировок</h2><p className="text-sm text-muted-foreground">Укажите, чего хотите достичь и в каких условиях занимаетесь. AI учитывает сохранённые данные при включённом разрешении «Тренировки» в настройках AI. Упражнения и планы выбираются отдельно галочкой «AI Доступ».</p></div>{preferences.resource.status === "loading" ? <LoadingState /> : preferences.resource.status === "error" ? <ErrorState message={preferences.resource.message} retry={preferences.retry} /> : <PreferencesForm initial={preferences.resource.data} saved={(value) => preferences.mutate(() => value)} />}</section>;
}
