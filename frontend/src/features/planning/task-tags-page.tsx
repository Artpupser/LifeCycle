import { t, useLanguage } from "@/systems/i18n/locale";
import { confirmAction } from "@/lib/feedback";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ArrowLeft, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { useResource } from "@/hooks/use-resource";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { TagChip, LabelInput } from "./tag-chip";
export type TaskTag = { id: string; name: string; revision: number; color: string };
const palette = ["#6366F1", "#2563EB", "#0891B2", "#16A34A", "#CA8A04", "#EA580C", "#DC2626", "#DB2777"];
function ColorChoice({ value, change, label }: { value: string; change: (value: string) => void; label: string }) {
  useLanguage();
  return <div className="flex flex-wrap items-center gap-2">{palette.map((color) => <button key={color} type="button" aria-label={`${label} ${color}`} aria-pressed={value.toUpperCase() === color.toUpperCase()} className={`size-7 rounded-full border-2 ${value.toUpperCase() === color.toUpperCase() ? "border-foreground ring-2 ring-background" : "border-transparent"}`} style={{ backgroundColor: color }} onClick={() => change(color)} />)}<Input type="color" aria-label={t(label)} className="h-8 w-10 p-1" value={value} onChange={(event) => change(event.target.value)} /></div>;
}
export function TaskTagsPage() {
  useLanguage();
  const tags = useResource<TaskTag[]>("/task-tags");
  const [name, setName] = useState(""); const [color, setColor] = useState(palette[0]);
  const action = useAction();
  function create(event: FormEvent) { event.preventDefault(); void action.run(() => api("/task-tags", { method: "POST", body: { name: name.trim(), color } }), () => { setName(""); tags.retry(); }); }
  return <main id="main" className="space-y-7"><header><Link to="/tasks" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" />{t("К задачам и доскам")}</Link><h1 className="text-3xl font-semibold">{t("Теги задач")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("Имя и цвет общие для всех досок. Удаление тега сохраняет задачи.")}</p></header><form onSubmit={create} className="space-y-4 rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-end gap-3"><div className="min-w-40 flex-1"><FormField id="new-tag-name" label={t("Новый тег")}><LabelInput id="new-tag-name" required single value={name} change={setName} /></FormField></div><Button type="submit" disabled={action.busy}><Plus className="size-4" />{t("Создать тег")}</Button></div><ColorChoice label={t("Цвет нового тега")} value={color} change={setColor} /></form>{action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}{tags.resource.status === "loading" ? <LoadingState /> : tags.resource.status === "error" ? <ErrorState message={tags.resource.message} retry={tags.retry} /> : <ul className="grid gap-4 xl:grid-cols-2">{tags.resource.data.map((tag) => <TagRow key={`${tag.id}-${tag.revision}`} tag={tag} busy={action.busy} save={(name, color) => void action.run(() => api(`/task-tags/${tag.id}`, { method: "PUT", body: { name, color, revision: tag.revision } }), tags.retry)} remove={async () => { if (await confirmAction(t("Удалить тег «{v0}» у всех задач? Сами задачи сохранятся.", {v0: tag.name}))) void action.run(() => api(`/task-tags/${tag.id}`, { method: "DELETE", body: { revision: tag.revision } }), tags.retry); }} />)}</ul>}</main>;
}
function TagRow({ tag, busy, save, remove }: { tag: TaskTag; busy: boolean; save: (name: string, color: string) => void; remove: () => void }) {
  useLanguage();
  const [name, setName] = useState(tag.name); const [color, setColor] = useState(tag.color);
  return <li className="space-y-4 rounded-2xl border border-border bg-card p-5"><TagChip name={name || tag.name} color={color} /><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save(name.trim(), color); }}><LabelInput id={`tag-name-${tag.id}`} label={t("Название тега {v0}", {v0: tag.name})} required single value={name} change={setName} /><ColorChoice label={t("Цвет тега {v0}", {v0: tag.name})} value={color} change={setColor} /><div className="flex gap-3"><Button variant="outline" type="submit" disabled={busy || (name.trim() === tag.name && color === tag.color)}>{t("Сохранить тег")}</Button><Button variant="ghost" disabled={busy} onClick={remove}>{t("Удалить")}</Button></div></form></li>;
}
