import {contentColors,defaultItemColor} from "@/systems/themes/themes";
import {ChoiceField} from "@/components/ui/choice-picker";
import {SaveButton,SaveForm} from "@/components/ui/save";
import { t, useLanguage } from "@/systems/i18n/locale";
import { IconPicker } from "@/systems/icons/icon-picker";
import { resolveIcon } from "@/systems/icons/catalog";
import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import type { BoardColumn } from "./board-types";
export function BoardNameDialog({ title, initial, initialEmoji = "", busy, error, close, submit }: { title: string; initial: string; initialEmoji?: string; busy: boolean; error: string | null; close: () => void; submit: (name: string, emoji: string) => void }) {
  useLanguage();
  const [name, setName] = useState(initial);const [emoji,setEmoji]=useState(resolveIcon(initialEmoji,"tabler:columns-3"));
  return <Dialog title={title} onClose={close}><SaveForm className="space-y-5" onSubmit={(event) => { event.preventDefault(); submit(name.trim(),emoji.trim()); }}><FormField id="board-name" label={t("Название доски")}><Input id="board-name" required autoFocus maxLength={200} value={name} placeholder={t("Например, Личный проект")} onChange={(event) => setName(event.target.value)} /></FormField><FormField id="board-icon" label={t("Значок доски")}><IconPicker id="board-icon" value={emoji} change={setEmoji} label={t("Выбрать значок доски")}/></FormField>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<SaveButton type="submit" disabled={busy}>{t("Сохранить доску")}</SaveButton></SaveForm></Dialog>;
}
export function ColumnDialog({ column, columns, busy, error, close, save, remove }: { column: BoardColumn | null; columns: BoardColumn[]; busy: boolean; error: string | null; close: () => void; save: (name: string, position: number, color: string) => void; remove: (target: string | null) => void }) {
  useLanguage();
  const [name, setName] = useState(column?.name ?? "");const [color,setColor]=useState(column?.color??defaultItemColor);const [target, setTarget] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); save(name.trim(),column?.position??columns.length,color); }
  return <Dialog title={column ? t("Настроить колонку") : t("Новая колонка")} onClose={close}><SaveForm className="space-y-5" onSubmit={submit}><FormField id="column-name" label={t("Название колонки")}><Input id="column-name" autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></FormField><FormField id="column-color" label={t("Цвет колонки")}><Input id="column-color" type="color" value={color} onChange={(event)=>setColor(event.target.value)}/></FormField><div className="flex flex-wrap gap-2">{contentColors.map((item)=><button key={item} type="button" aria-label={t("Цвет колонки {v0}", {v0: item})} className={`size-8 rounded-full border-2 ${color.toLowerCase()===item.toLowerCase()?"border-foreground":"border-transparent"}`} style={{backgroundColor:item}} onClick={()=>setColor(item)}/>)}</div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<SaveButton disabled={busy} type="submit">{t("Сохранить колонку")}</SaveButton>{column && <div className="space-y-3 border-t border-border pt-5"><FormField id="column-target" label={t("Куда перенести задачи при удалении")}><ChoiceField id="column-target" value={target} change={(next) => setTarget(next)}><option value="">{t("Пустую колонку можно удалить сразу")}</option>{columns.filter((c) => c.id !== column.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</ChoiceField></FormField><Button variant="outline" disabled={busy} onClick={() => remove(target || null)}>{t("Удалить колонку")}</Button></div>}</SaveForm></Dialog>;
}
