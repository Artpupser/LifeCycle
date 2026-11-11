import {EditorForm} from "@/systems/forms/editor";
import {useEditorState} from "@/systems/forms/use-editor";
import {editorSchemas} from "@/systems/forms/schemas";
import {ChoiceField} from "@/components/ui/choice-picker";
import {SaveButton} from "@/components/ui/save";
import { t, useLanguage } from "@/systems/i18n/locale";
import { mediaIdsInMarkdown } from "@/systems/media/media";
import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { MarkdownEditor } from "@/components/markdown";
import {Input,Textarea} from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { kindLabels, type Exercise, type RecordData } from "./types";

export function ExerciseEditor({ initial, close, saved, submitDraft }: { initial: RecordData<Exercise> | null; close: () => void; saved: () => void; submitDraft?: (value: Exercise) => Promise<void> }) {
  useLanguage();
  const [value, setValue, valueEditor] = useEditorState<Exercise>(initial?.data ?? { title: "", kind: "repetitions", description: "", images: [], sources: [] }, editorSchemas.titled);
  const [sources, setSources] = useState(value.sources.join("\n"));
  const [uploading, setUploading] = useState(false);
  const action = useAction();
  const images = mediaIdsInMarkdown(value.description);
  async function submit(event: FormEvent) {
    event.preventDefault();
    await action.run(() => submitDraft ? submitDraft({ ...value, images, sources: sources.split("\n").map((line) => line.trim()).filter(Boolean) }) : api(initial ? `/exercises/${initial.id}` : "/exercises", { method: initial ? "PUT" : "POST", body: { ...value, images, sources: sources.split("\n").map((line) => line.trim()).filter(Boolean) } }), saved);
  }
  return <Dialog title={initial ? t("Изменить упражнение") : t("Новое упражнение")} onClose={close}><EditorForm editor={valueEditor} className="space-y-5" onSubmit={(event) => void submit(event)}><fieldset disabled={action.busy} className="space-y-5"><FormField id="exercise-title" label={t("Название упражнения")}><Input id="exercise-title" autoFocus required maxLength={200} value={value.title} onChange={(event) => setValue({ ...value, title: event.target.value })} /></FormField><FormField id="exercise-kind" label={t("Тип упражнения")}><ChoiceField id="exercise-kind" value={value.kind} change={(next) => setValue({ ...value, kind: next as Exercise["kind"] })}>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</ChoiceField></FormField><p className="text-xs text-muted-foreground">{t("Название и техника — ваши собственные: планка, стульчик или любое другое упражнение. Тип используемого в плане упражнения можно изменить после удаления из активных планов.")}</p><FormField id="exercise-description" label={t("Техника выполнения")}><MarkdownEditor id="exercise-description" value={value.description} onChange={(description) => setValue((old) => ({ ...old, description }))} onUploading={setUploading} /></FormField><p className={images.length > 3 ? "text-sm text-destructive" : "text-xs text-muted-foreground"}>{t("Иллюстрации техники: ")}{images.length}{t("/3. Загружайте изображения кнопкой редактора.")}</p><FormField id="exercise-sources" label={t("Источники (HTTP/HTTPS, один на строку)")}><Textarea id="exercise-sources" value={sources} maxLength={20000} onChange={(event) => setSources(event.target.value)} /></FormField></fieldset>{action.error && <p role="alert" className="text-destructive">{action.error}</p>}<SaveButton type="submit" disabled={action.busy || uploading || images.length > 3}>{t("Сохранить упражнение")}</SaveButton></EditorForm></Dialog>;
}
