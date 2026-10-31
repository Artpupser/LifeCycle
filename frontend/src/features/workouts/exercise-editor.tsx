import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { MarkdownEditor } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { kindLabels, type Exercise, type RecordData } from "./types";

export function ExerciseEditor({ initial, close, saved, submitDraft }: { initial: RecordData<Exercise> | null; close: () => void; saved: () => void; submitDraft?: (value: Exercise) => Promise<void> }) {
  const [value, setValue] = useState<Exercise>(initial?.data ?? { title: "", kind: "repetitions", description: "", images: [], sources: [] });
  const [sources, setSources] = useState(value.sources.join("\n"));
  const [uploading, setUploading] = useState(false);
  const action = useAction();
  const images = [...new Set([...value.description.matchAll(/\/api\/media\/([a-f0-9-]{36})/gi)].map((match) => match[1]!))];
  async function submit(event: FormEvent) {
    event.preventDefault();
    await action.run(() => submitDraft ? submitDraft({ ...value, images, sources: sources.split("\n").map((line) => line.trim()).filter(Boolean) }) : api(initial ? `/exercises/${initial.id}` : "/exercises", { method: initial ? "PUT" : "POST", body: { ...value, images, sources: sources.split("\n").map((line) => line.trim()).filter(Boolean) } }), saved);
  }
  return <Dialog title={initial ? "Изменить упражнение" : "Новое упражнение"} onClose={close}><form className="space-y-5" onSubmit={(event) => void submit(event)}><fieldset disabled={action.busy} className="space-y-5"><FormField id="exercise-title" label="Название упражнения"><Input id="exercise-title" autoFocus required maxLength={200} value={value.title} onChange={(event) => setValue({ ...value, title: event.target.value })} /></FormField><FormField id="exercise-kind" label="Тип упражнения"><Select id="exercise-kind" value={value.kind} onChange={(event) => setValue({ ...value, kind: event.target.value as Exercise["kind"] })}>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></FormField><p className="text-xs text-muted-foreground">Название и техника — ваши собственные: планка, стульчик или любое другое упражнение. Тип используемого в плане упражнения можно изменить после удаления из активных планов.</p><FormField id="exercise-description" label="Техника выполнения"><MarkdownEditor id="exercise-description" value={value.description} onChange={(description) => setValue((old) => ({ ...old, description }))} onUploading={setUploading} /></FormField><p className={images.length > 3 ? "text-sm text-destructive" : "text-xs text-muted-foreground"}>Иллюстрации техники: {images.length}/3. Загружайте изображения кнопкой редактора.</p><FormField id="exercise-sources" label="Источники (HTTP/HTTPS, один на строку)"><Textarea id="exercise-sources" value={sources} maxLength={20000} onChange={(event) => setSources(event.target.value)} /></FormField></fieldset>{action.error && <p role="alert" className="text-destructive">{action.error}</p>}<Button type="submit" disabled={action.busy || uploading || images.length > 3}>Сохранить упражнение</Button></form></Dialog>;
}
