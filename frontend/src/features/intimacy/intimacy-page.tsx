import {useId} from "react";
import {RatingScale} from "@/components/ui/input";
import {EntitySelectionArea,SelectionItem} from "@/systems/selection/entities";
import {SubjectLabels} from "@/systems/labels/functional";
import {ObjectActions} from "@/systems/actions/action-menu";
import {collectionLabel} from "@/systems/labels/collection-catalog";
import {TagChip} from "@/systems/labels/inputs";
import { t, useLanguage } from "@/systems/i18n/locale";
import { FilterSearch } from "@/components/filter-search";
import { parseFilterQuery, filterValue, filterRange, rangeFilters, type FilterSpec } from "@/lib/filter-query";
import { confirmAction } from "@/lib/feedback";
import { EyeOff, Heart, Pencil, Plus, Trash2 } from "@/components/icons";
import { useState } from "react";
import { Dialog } from "@/components/dialog";
import { Markdown } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { ApiError, api, errorMessage } from "@/lib/api";
import { dateTimeLabel, localDate, shiftDate } from "@/lib/dates";
import { EntryEditor } from "./entry-editor";
import { JournalStatistics } from "./journal-statistics";
import { answerLabel, kindLabel, newEntry, type Entry, type EntryData, type Journal } from "./types";

function EntryDetail({ record, close }: { record: Entry; close: () => void }) {
  useLanguage();
  const { settings } = usePreferences();
  const data = record.data;
  const scaleId=useId();
  const genderLabels: Record<string,string> = { female:t("Женский"), male:t("Мужской"), other:t("Другой"), unspecified:t("Предпочитаю не указывать") };
  const textRows = [
    [t("Запланированное"),answerLabel(data.planned??null)],
    [t("Лубриканты"),(data.lubricants??[]).join(", ")||t("Не указано")],
    [t("Контрацепция"),(data.contraception??[]).join(", ")||t("Не указано")],
    [t("Эмоции до"),(data.emotions_before??[]).map(value=>collectionLabel(value,"emotion")).join(", ")||t("Не указано")],
    [t("Время события"), dateTimeLabel(record.started_at, settings.timezone, settings.time_format)],
    [t("Длительность"), data.duration_minutes === null ? t("Не указано") : t("{v0} мин", {v0: data.duration_minutes})], [t("Игрушки"), data.toys.map(value=>collectionLabel(value,"toy")).join(", ") || t("Не указано")],
    [t("Смазка"), answerLabel(data.lubricant_used)], [t("Была одежда"), answerLabel(data.was_clothed)], [t("Эмоции после"), data.emotions_after.map(value=>collectionLabel(value,"emotion")).join(", ") || t("Не указано")], [t("Хочу повторить"), answerLabel(data.repeat_desired)],
    ...(data.partner ? [[t("Защита"), answerLabel(data.partner.protection_used)], [t("Имя партнёра"),data.partner.name || t("Не указано")], [t("Пол партнёра"),genderLabels[data.partner.gender] || t("Не указано")], [t("Позы"),data.partner.positions.join(", ") || t("Не указано")], [t("Виды секса"), data.partner.sex_types.map(value=>collectionLabel(value,"sex_type")).join(", ") || t("Не указано")]] : []),
    ...(data.solo ? [[t("Источники порно"),data.solo.porn_sources.join(", ") || t("Не указано")]] : []),
  ];
  return <Dialog title={kindLabel(data.kind)} onClose={close}><div className="mb-5 grid gap-4 sm:grid-cols-2"><RatingScale id={`${scaleId}-libido`} kind="libido" label={t("Уровень либидо (0–10)")} value={data.libido_level??null}/><RatingScale id={`${scaleId}-satisfaction`} label={t("Удовлетворённость (0–10)")} value={data.satisfaction_level??null}/></div><dl className="space-y-3">{textRows.map(([label,value]) => <div key={t(label)} className="min-w-0"><dt className="text-xs text-muted-foreground">{t(label)}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value}</dd></div>)}</dl>{[[t("Обстановка"),data.setting],[t("Заметка"),data.note]].map(([label,text]) => text && <section key={t(label)} className="mt-5 min-w-0"><h3 className="mb-2 font-medium">{t(label)}</h3><Markdown value={text} /></section>)}</Dialog>;
}
function VisibleJournal({ hide }: { hide: () => void }) {
  useLanguage();
  const { settings } = usePreferences();
  const today = localDate(settings.timezone);
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const specs: FilterSpec[] = [...rangeFilters,{key:"kind", aliases:["тип"],label:t("Тип события"),example:"тип:секс",values:["sex","masturbation","секс","мастурбация"],control:true}];
  const filters = parseFilterQuery(query, specs);
  const range = filterRange(filters, {from:shiftDate(today,-29),to:today});
  const kind = filterValue(filters,"kind").toLocaleLowerCase("ru-RU");
  const filter = {...range, offset, kind: ({секс:"sex",мастурбация:"masturbation"} as Record<string,string>)[kind] ?? kind};
  const [editor, setEditor] = useState<{ data: EntryData; record?: Entry } | null>(null);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = new URLSearchParams({ from:filter.from, to:filter.to, offset:String(filter.offset), ...(filter.kind ? { kind:filter.kind } : {}) });
  const journal = useResource<Journal>(range.error ? null : `/sex?${params}`);
  async function remove(entry: Entry) {
    if (!await confirmAction(t("Безвозвратно удалить это интимное событие? Оно исчезнет из журнала и статистики."))) return;
    setPending(true); setError(null);
    try { await api(`/sex/${entry.id}?revision=${entry.revision}`, { method:"DELETE" }); setSelected(null); setOffset(0); journal.retry(); }
    catch (failure) { setError(errorMessage(failure)); if (failure instanceof ApiError && failure.code === "stale_intimacy") { setSelected(null); journal.retry(); } }
    finally { setPending(false); }
  }
  const contents = journal.resource;
  return <><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm text-primary">{t("Личные наблюдения")}</p><h1 className="text-3xl font-semibold">{t("Интимный журнал")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("События, ощущения и статистика, доступные вашей учётной записи.")}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={hide} disabled={pending}><EyeOff aria-hidden="true" />{t("Скрыть журнал")}</Button><Button onClick={() => setEditor({data:newEntry(settings.timezone)})}><Plus aria-hidden="true" />{t("Новое событие")}</Button></div></header>
    <FilterSearch label={t("Поиск в интимном журнале")} value={query} change={value=>{setQuery(value);setOffset(0);setSelected(null);}} specs={specs} placeholder={t("с:2026-11-01 по:2026-11-30 тип:секс")} /><p className="text-xs text-muted-foreground">{t("По умолчанию — последние 30 дней. До 366 дат включительно.")}</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{range.error ? <p role="alert" className="text-sm text-destructive">{range.error}</p> : contents.status === "loading" ? <LoadingState /> : contents.status === "error" ? <ErrorState message={contents.message} retry={journal.retry} /> : <><JournalStatistics value={contents.data.statistics} /><EntitySelectionArea items={contents.data.entries} itemKey={item=>item.id} scope={`${query}:${offset}`} subjectKind="intimacy" disabled={pending||!!editor||!!selected} refresh={()=>{setSelected(null);journal.retry();}} remove={item=>api(`/sex/${item.id}?revision=${item.revision}`,{method:"DELETE"})} removeMessage={t("Удалить выбранные интимные события? Они исчезнут из журнала и статистики.")}><section aria-label={t("События журнала")} className="space-y-4"><h2 className="text-xl font-semibold">{t("События (")}{contents.data.total})</h2>{contents.data.total === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center"><Heart className="mx-auto mb-3 size-7 text-primary" aria-hidden="true" /><p>{t("В выбранном периоде нет записей.")}</p></div> : contents.data.entries.map((entry) => <SelectionItem key={entry.id} id={entry.id}><article className="min-w-0 rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{kindLabel(entry.data.kind)}</h3><p className="mt-1 text-sm text-muted-foreground">{dateTimeLabel(entry.started_at,settings.timezone,settings.time_format)}</p><p className="mt-2 text-sm">{entry.data.duration_minutes === null ? t("Длительность не указана") : t("{v0} мин", {v0: entry.data.duration_minutes})}</p></div><ObjectActions subject={{kind:"intimacy",id:entry.id}}><Button size="sm" variant="outline" onClick={() => setSelected(entry)}>{t("Подробности")}</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => setEditor({data:entry.data,record:entry})}><Pencil aria-hidden="true" />{t("Редактировать")}</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => void remove(entry)}><Trash2 aria-hidden="true" />{t("Удалить")}</Button></ObjectActions></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><RatingScale id={`libido-${entry.id}`} kind="libido" label={t("Уровень либидо (0–10)")} value={entry.data.libido_level??null}/><RatingScale id={`satisfaction-${entry.id}`} label={t("Удовлетворённость (0–10)")} value={entry.data.satisfaction_level??null}/></div><SubjectLabels subject={{kind:"intimacy",id:entry.id}} className="mt-4">{[...entry.data.emotions_after.map(name=>({name,kind:"emotion"})),...entry.data.toys.map(name=>({name,kind:"toy"})),{name:entry.data.setting,kind:"setting"}].filter(item=>item.name).slice(0,6).map(item=><TagChip key={`${item.kind}:${item.name}`} name={item.name} kind={item.kind} displayName={collectionLabel(item.name,item.kind as "emotion"|"toy"|"setting")}/>)}</SubjectLabels></article></SelectionItem>)}<div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={filter.offset === 0} onClick={() => setOffset(Math.max(0,offset-50))}>{t("Назад")}</Button><span className="text-xs text-muted-foreground">{contents.data.total ? t("{v0}–{v1} из {v2}", {v0: filter.offset + 1, v1: Math.min(filter.offset+50,contents.data.total), v2: contents.data.total}) : t("0 записей")}</span><Button variant="outline" disabled={filter.offset+50 >= contents.data.total} onClick={() => setOffset(offset+50)}>{t("Далее")}</Button><Button variant="outline" onClick={journal.retry}>{t("Обновить журнал")}</Button></div></section></EntitySelectionArea></>}
    {selected && <EntryDetail record={selected} close={() => setSelected(null)} />}{editor && <EntryEditor initial={editor.data} record={editor.record} close={() => setEditor(null)} conflict={journal.retry} saved={() => { setEditor(null); setSelected(null); setOffset(0); journal.retry(); }} />}
  </>;
}
export function IntimacyPage() {
  useLanguage();
  const [hidden, setHidden] = useState(false);
  return <main id="main" className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:px-10">{hidden ? <div className="space-y-5 rounded-2xl border border-border p-8"><h1 className="text-2xl font-semibold">{t("Журнал скрыт")}</h1><Button onClick={() => setHidden(false)}>{t("Показать журнал")}</Button></div> : <VisibleJournal hide={() => setHidden(true)} />}</main>;
}
