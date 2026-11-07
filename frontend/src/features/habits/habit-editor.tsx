import {ChoiceField} from "@/components/ui/choice-picker";
import {SaveButton,SaveForm} from "@/components/ui/save";
import { formatLabels } from "@/systems/labels/values";
import { useUploadActivity } from "@/systems/media/use-upload-activity";
import { t, useLanguage } from "@/systems/i18n/locale";
import { IconPicker } from "@/systems/icons/icon-picker";
import { resolveIcon } from "@/systems/icons/catalog";
import { LabelInput } from "@/systems/labels/inputs";
import { normalizeLabels } from "@/features/planning/types";
import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { MarkdownEditor } from "@/components/markdown";
import {Input} from "@/components/ui/input";
import { ErrorState, LoadingState } from "@/components/resource-state";
import type { RecordData, Workout } from "@/features/workouts/types";
import { useResource } from "@/hooks/use-resource";
import { ScheduleEditor } from "@/features/planning/schedule-editor";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { habitChanged, type HabitInput } from "./types";

export function HabitEditor({ initial, saved, close }: { initial: HabitInput & { id?: string }; saved: () => void; close: () => void }) {
  useLanguage();
  const [value, setValue] = useState({...initial,habit:{...initial.habit,icon:resolveIcon(initial.habit.icon,"tabler:seedling")}});
  const [tags, setTags] = useState(formatLabels(initial.tags));
  const {uploading, setUploading} = useUploadActivity();
  const action = useAction();
  const workouts = useResource<RecordData<Workout>[]>("/workouts");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const body: HabitInput = { title: value.title.trim(), description: value.description, tags: normalizeLabels(tags), color: value.color, schedule: value.schedule, habit: value.habit };
    await action.run(() => api(initial.id ? `/habits/${initial.id}` : "/habits", { method: initial.id ? "PUT" : "POST", body }), () => { habitChanged(); saved(); });
  }
  return <Dialog title={initial.id ? t("Изменить привычку") : t("Новая привычка")} onClose={close}><SaveForm className="space-y-5" onSubmit={(event) => void submit(event)}><fieldset disabled={action.busy} className="space-y-5"><FormField id="habit-title" label={t("Название привычки")}><Input id="habit-title" autoFocus required maxLength={200} value={value.title} onChange={(event) => setValue({ ...value, title: event.target.value })} /></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField id="habit-icon" label={t("Значок привычки")}><IconPicker id="habit-icon" value={value.habit.icon} change={icon=>setValue({...value,habit:{...value.habit,icon}})} label={t("Выбрать значок привычки")}/></FormField><FormField id="habit-color" label={t("Цвет привычки")}><Input id="habit-color" type="color" value={value.color} onChange={(event) => setValue({ ...value, color: event.target.value })} /></FormField></div><FormField id="habit-tags" label={t("Теги привычки")}><LabelInput id="habit-tags" value={tags} change={setTags}/></FormField><FormField id="habit-description" label={t("Описание привычки")}><MarkdownEditor id="habit-description" value={value.description} onChange={(description) => setValue((old) => ({ ...old, description }))} onUploading={setUploading} /></FormField><ScheduleEditor habitMode timezoneReadOnly={!!initial.id} value={value.schedule} onChange={(schedule) => setValue({ ...value, schedule })} />{initial.id && <p className="text-sm text-muted-foreground">{t("Изменения действуют с сегодняшней даты. Прошлые правила и сделанные отметки сохраняются.")}</p>}<section className="space-y-3"><FormField id="habit-workout" label={t("Тренировка привычки")}><ChoiceField id="habit-workout" value={value.habit.workout_id ?? ""} disabled={workouts.resource.status !== "ready"} change={(next) => setValue({ ...value, habit: { ...value.habit, workout_id: next || null } })}><option value="">{t("Без тренировки")}</option>{workouts.resource.status === "ready" && workouts.resource.data.map((item) => <option key={item.id} value={item.id}>{item.data.title}</option>)}{value.habit.workout_id && workouts.resource.status === "ready" && !workouts.resource.data.some((item) => item.id === value.habit.workout_id) && <option value={value.habit.workout_id}>{t("Удалённая тренировка — отвяжите или выберите другую")}</option>}</ChoiceField></FormField>{workouts.resource.status === "loading" && <LoadingState />}{workouts.resource.status === "error" && <ErrorState message={workouts.resource.message} retry={workouts.retry} />}<p className="text-xs text-muted-foreground">{t("Тренировка откроется из Today и календаря. Полное выполнение без пропусков завершит это появление привычки. Для разных занятий по дням недели создайте отдельные привычки.")}</p></section></fieldset>{action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}<SaveButton type="submit" disabled={action.busy || uploading}>{t("Сохранить привычку")}</SaveButton></SaveForm></Dialog>;
}
