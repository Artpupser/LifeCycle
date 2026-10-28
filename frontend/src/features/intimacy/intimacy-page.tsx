import { EyeOff, Heart, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { Markdown } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { ApiError, api, errorMessage } from "@/lib/api";
import { dateLabel, instantLabel, localDate, shiftDate } from "@/lib/dates";
import { EntryEditor } from "./entry-editor";
import { JournalStatistics } from "./journal-statistics";
import { answerLabel, kindLabel, newEntry, type Entry, type EntryData, type Journal } from "./types";

function EntryDetail({ record, close }: { record: Entry; close: () => void }) {
  const data = record.data;
  const sexLabels: Record<string,string> = { anal:"Анальный", oral:"Оральный", vaginal:"Вагинальный", other:"Другой" };
  const genderLabels: Record<string,string> = { female:"Женский", male:"Мужской", other:"Другой", unspecified:"Предпочитаю не указывать" };
  const textRows = [
    ["Исходное время", `${data.local_start.replace("T"," ").slice(0,16)} · ${data.timezone} · ${data.time_occurrence === "earlier" ? "первое" : "второе"} вхождение часа`],
    ["Длительность", data.duration_minutes === null ? "Не указано" : `${data.duration_minutes} мин`], ["Эякуляций", data.ejaculation_count ?? "Не указано"], ["Игрушки", data.toys.join(", ") || "Не указано"],
    ["Смазка", answerLabel(data.lubricant_used)], ["Была одежда", answerLabel(data.was_clothed)], ["Эмоции", data.emotions.join(", ") || "Не указано"], ["Хочу повторить", answerLabel(data.repeat_desired)],
    ...(data.partner ? [["Защита", answerLabel(data.partner.protection_used)], ["Имя партнёра",data.partner.name || "Не указано"], ["Пол партнёра",genderLabels[data.partner.gender] || "Не указано"], ["Позы",data.partner.positions.join(", ") || "Не указано"], ["Виды секса", data.partner.sex_types.map((v) => sexLabels[v]).join(", ") || "Не указано"]] : []),
    ...(data.solo ? [["Источники порно",data.solo.porn_sources.join(", ") || "Не указано"]] : []),
  ];
  return <Dialog title={kindLabel(data.kind)} onClose={close}><dl className="space-y-3">{textRows.map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value}</dd></div>)}</dl>{[["Обстановка",data.setting],["Ощущения после",data.solo?.feelings_after ?? ""],["Заметка",data.note]].map(([label,text]) => text && <section key={label} className="mt-5 min-w-0"><h3 className="mb-2 font-medium">{label}</h3><Markdown value={text} /></section>)}</Dialog>;
}
function VisibleJournal({ hide }: { hide: () => void }) {
  const { settings } = usePreferences();
  const today = localDate(settings.timezone);
  const [filter, setFilter] = useState({ from: shiftDate(today,-29), to: today, kind: "", offset: 0 });
  const [editor, setEditor] = useState<{ data: EntryData; record?: Entry } | null>(null);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = new URLSearchParams({ from:filter.from, to:filter.to, offset:String(filter.offset), ...(filter.kind ? { kind:filter.kind } : {}) });
  const journal = useResource<Journal>(`/sex?${params}`);
  const changeFilter = (fields: Partial<typeof filter>) => { setFilter({ ...filter, ...fields, offset:0 }); setSelected(null); };
  async function remove(entry: Entry) {
    if (!window.confirm("Безвозвратно удалить это интимное событие? Оно исчезнет из журнала и статистики.")) return;
    setPending(true); setError(null);
    try { await api(`/sex/${entry.id}?revision=${entry.revision}`, { method:"DELETE" }); setSelected(null); setFilter((current) => ({ ...current, offset:0 })); journal.retry(); }
    catch (failure) { setError(errorMessage(failure)); if (failure instanceof ApiError && failure.code === "stale_intimacy") { setSelected(null); journal.retry(); } }
    finally { setPending(false); }
  }
  const contents = journal.resource;
  return <><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm text-primary">Личные наблюдения</p><h1 className="text-3xl font-semibold">Интимный журнал</h1><p className="mt-3 text-sm text-muted-foreground">События, ощущения и статистика, доступные вашей учётной записи.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={hide} disabled={pending}><EyeOff aria-hidden="true" />Скрыть журнал</Button><Button onClick={() => setEditor({data:newEntry(settings.timezone)})}><Plus aria-hidden="true" />Новое событие</Button></div></header>
    <div className="grid gap-4 sm:grid-cols-3"><FormField id="intimacy-from" label="Период с"><Input id="intimacy-from" type="date" required value={filter.from} onChange={(event) => { if (event.target.value) changeFilter({from:event.target.value}); }} /></FormField><FormField id="intimacy-to" label="Период по"><Input id="intimacy-to" type="date" required value={filter.to} onChange={(event) => { if (event.target.value) changeFilter({to:event.target.value}); }} /></FormField><FormField id="intimacy-filter-kind" label="Тип в журнале"><Select id="intimacy-filter-kind" value={filter.kind} onChange={(event) => changeFilter({kind:event.target.value})}><option value="">Все события</option><option value="sex">Секс</option><option value="masturbation">Мастурбация</option></Select></FormField></div><p className="text-xs text-muted-foreground">До 366 дат включительно. Время и границы дней: {settings.timezone}. Можно добавить несколько событий за день.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{contents.status === "loading" ? <LoadingState /> : contents.status === "error" ? <ErrorState message={contents.message} retry={journal.retry} /> : <><JournalStatistics value={contents.data.statistics} /><section aria-label="События журнала" className="space-y-4"><h2 className="text-xl font-semibold">События ({contents.data.total})</h2>{contents.data.total === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center"><Heart className="mx-auto mb-3 size-7 text-primary" aria-hidden="true" /><p>В выбранном периоде нет записей.</p></div> : contents.data.entries.map((entry) => <article key={entry.id} className="min-w-0 rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{kindLabel(entry.data.kind)}</h3><p className="mt-1 text-sm text-muted-foreground">{dateLabel(localDate(contents.data.timezone,new Date(entry.started_at)),{ day:"numeric",month:"long",year:"numeric" })} · {instantLabel(entry.started_at,contents.data.timezone)}</p><p className="mt-2 text-sm">{entry.data.duration_minutes === null ? "Длительность не указана" : `${entry.data.duration_minutes} мин`}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSelected(entry)}>Подробности</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => setEditor({data:entry.data,record:entry})}><Pencil aria-hidden="true" />Редактировать</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => void remove(entry)}><Trash2 aria-hidden="true" />Удалить</Button></div></div></article>)}<div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={filter.offset === 0} onClick={() => setFilter({...filter,offset:Math.max(0,filter.offset-50)})}>Назад</Button><span className="text-xs text-muted-foreground">{contents.data.total ? `${filter.offset + 1}–${Math.min(filter.offset+50,contents.data.total)} из ${contents.data.total}` : "0 записей"}</span><Button variant="outline" disabled={filter.offset+50 >= contents.data.total} onClick={() => setFilter({...filter,offset:filter.offset+50})}>Далее</Button><Button variant="outline" onClick={journal.retry}>Обновить журнал</Button></div></section></>}
    {selected && <EntryDetail record={selected} close={() => setSelected(null)} />}{editor && <EntryEditor initial={editor.data} record={editor.record} close={() => setEditor(null)} conflict={journal.retry} saved={() => { setEditor(null); setSelected(null); setFilter((current) => ({ ...current, offset:0 })); journal.retry(); }} />}
  </>;
}
export function IntimacyPage() {
  const [hidden, setHidden] = useState(false);
  return <main id="main" className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:px-10">{hidden ? <div className="space-y-5 rounded-2xl border border-border p-8"><h1 className="text-2xl font-semibold">Журнал скрыт</h1><Button onClick={() => setHidden(false)}>Показать журнал</Button></div> : <VisibleJournal hide={() => setHidden(true)} />}</main>;
}
