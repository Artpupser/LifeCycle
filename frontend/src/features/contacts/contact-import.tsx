import {Input} from "@/components/ui/input";
import {SelectionGesture} from "@/systems/selection/gestures";
import {useSelection} from "@/systems/selection/state";
import { t, useLanguage } from "@/systems/i18n/locale";
import {SelectionActions} from "@/systems/selection/selection";
import { useState } from "react";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/ui/button";
import {ObjectActions} from "@/systems/actions/action-menu";
import {selectionMenuActions} from "@/systems/selection/actions";
import type {ContextAction} from "@/systems/actions/context";
import { api, errorMessage } from "@/lib/api";
import { contactMatches, contactName, contactBirthDate, mergeImported, type Contact, type ContactData } from "./types";
export function ContactImport({ contacts, incoming, warnings, close, saved }: { contacts: Contact[]; incoming: ContactData[]; warnings: string[]; close: () => void; saved: (message: string) => void }) {
  useLanguage();
  const matches = incoming.map(data => contacts.filter(c => contactMatches(data, c.data)));
  const chooseNew = () => { let selected = 0; return incoming.map((_, i) => !matches[i].length && selected++ < 100 ? "create" : "skip"); };
  const [choices, setChoices] = useState<string[]>(chooseNew);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [birthdays, setBirthdays] = useState(false);
  const indexes=incoming.map((_,index)=>index);
  const selection=useSelection({items:indexes,itemKey:String,limit:100,initial:chooseNew().flatMap((choice,index)=>choice!=="skip"?[index]:[]),selectable:(index:number)=>matches[index].length<=1});
  const selectedChoices=choices.map((choice,index)=>selection.has(index)?choice==="skip"?matches[index].length?"update":"create":choice:"skip");
  const count=selection.count;
  async function submit() {
    setBusy(true); setError(null);
    try {
      const items = incoming.flatMap((data, i) => selectedChoices[i] === "skip" ? [] : selectedChoices[i] === "create" ? [{ data: { ...data, birthday_enabled: birthdays && Boolean(contactBirthDate(data)) } }] : [{ id: matches[i][0].id, revision: matches[i][0].revision, data: { ...mergeImported(matches[i][0].data, data), birthday_enabled: matches[i][0].data.birthday_enabled || (birthdays && Boolean(contactBirthDate(data))) } }]);
      if (new TextEncoder().encode(JSON.stringify({ items })).length > 1_000_000) { setError(t("Выбранные записи превышают 1 МБ. Сократите выбор и импортируйте оставшиеся контакты следующим пакетом.")); return; }
      const result = await api<{ created: number; updated: number; skipped: number }>("/contacts/import", { method: "POST", body: { items } });
      saved(t("Импорт завершён: добавлено {v0}, обновлено {v1}, пропущено совпадений {v2}.", {v0: result.created, v1: result.updated, v2: result.skipped}));
    } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  return <Dialog title={t("Предпросмотр импорта")} onClose={() => { if (!busy) close(); }}><div data-action-subject="contact-import" tabIndex={0} className="space-y-4">
    <p className="text-sm text-muted-foreground">{t("Выберите записи для сохранения. Совпадения по телефону, имени с датой рождения или идентификатору источника пропускаются. Обновление требует вашего выбора: заполненные импортом поля заменятся, отсутствующие сведения и прежние телефоны сохранятся.")}</p>
    {warnings.length > 0 && <details><summary className="cursor-pointer text-sm">{t("Замечания к импорту: ")}{warnings.length}</summary><ul className="list-inside list-disc text-xs">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}
    <SelectionActions selection={selection} disabled={busy} actions={[{id:"new-only",label:t("Выбрать новые"),disabled:busy,run:()=>{setChoices(chooseNew());selection.replace(chooseNew().flatMap((choice,index)=>choice!=="skip"?[index]:[]));}},{id:"confirm-import",label:t("Подтвердить импорт"),disabled:busy||count===0||count>100,run:()=>void submit()}]}/>
    <SelectionGesture selection={selection} items={indexes} itemKey={String} disabled={busy}><div className="max-h-96 space-y-3 overflow-y-auto">{incoming.map((data, i) => <div data-action-subject="import-row" key={i} data-selection-key={String(i)} data-selected={selection.has(i)||undefined} className="min-w-0 rounded-xl border border-border p-3 data-[selected=true]:ring-2 data-[selected=true]:ring-primary/30"><p className="break-words font-medium">{contactName(data)}</p><p className="break-words text-xs text-muted-foreground">{data.phones.join(" · ") || t("Без телефона")}{contactBirthDate(data) ? ` · ${contactBirthDate(data)}` : ""}</p>{matches[i].length > 0 && <p className="mt-1 text-xs text-primary">{t("Совпадение: ")}{matches[i].map(c => contactName(c.data)).join(", ")}</p>}<p className="mt-2 text-xs text-muted-foreground">{t(selectedChoices[i]==="skip"?"Пропустить":selectedChoices[i]==="update"?"Обновить существующий контакт":"Добавить новый контакт")}</p><ObjectActions label={t("Действие импорта {v0}",{v0:i+1})} actions={[...([...(matches[i].length===0?[{value:"create",label:t("Добавить новый контакт")}]:[]),...(matches[i].length===1?[{value:"update",label:t("Обновить существующий контакт")}]:[]),{value:"skip",label:t("Пропустить")}].map(choice=>({id:choice.value,label:choice.label,disabled:busy||(choice.value!=="skip"&&!selection.has(i)&&selection.count>=selection.limit),run:()=>{setChoices(values=>values.map((value,index)=>index===i?choice.value:value));selection.toggle(i,choice.value!=="skip");}})) as ContextAction[]),...selectionMenuActions(selection,{item:i,disabled:busy,selectable:matches[i].length<=1})]}/>{matches[i].length > 1 && <p className="mt-1 text-xs text-muted-foreground">{t("Несколько совпадений: уточните контакты вручную.")}</p>}</div>)}</div></SelectionGesture>
    <label className="flex items-start gap-3 text-sm"><Input type="checkbox" disabled={busy} checked={birthdays} onChange={e => setBirthdays(e.target.checked)} />{t("Создать дни рождения выбранных контактов с известными днём и месяцем")}</label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button disabled={busy || count === 0 || count > 100} onClick={() => void submit()}>{busy ? t("Импортируем…") : t("Подтвердить импорт")}</Button>
  </div></Dialog>;
}
