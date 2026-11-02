import { useState } from "react";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";
import { contactMatches, contactName, mergeImported, type Contact, type ContactData } from "./types";
export function ContactImport({ contacts, incoming, warnings, close, saved }: { contacts: Contact[]; incoming: ContactData[]; warnings: string[]; close: () => void; saved: (message: string) => void }) {
  const matches = incoming.map(data => contacts.filter(c => contactMatches(data, c.data)));
  const chooseNew = () => { let selected = 0; return incoming.map((_, i) => !matches[i].length && selected++ < 100 ? "create" : "skip"); };
  const [choices, setChoices] = useState<string[]>(chooseNew);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [birthdays, setBirthdays] = useState(false);
  const count = choices.filter(c => c !== "skip").length;
  async function submit() {
    setBusy(true); setError(null);
    try {
      const items = incoming.flatMap((data, i) => choices[i] === "skip" ? [] : choices[i] === "create" ? [{ data: { ...data, birthday_enabled: birthdays && Boolean(data.birth_date) } }] : [{ id: matches[i][0].id, revision: matches[i][0].revision, data: { ...mergeImported(matches[i][0].data, data), birthday_enabled: matches[i][0].data.birthday_enabled || (birthdays && Boolean(data.birth_date)) } }]);
      if (new TextEncoder().encode(JSON.stringify({ items })).length > 1_000_000) { setError("Выбранные записи превышают 1 МБ. Сократите выбор и импортируйте оставшиеся контакты следующим пакетом."); return; }
      const result = await api<{ created: number; updated: number; skipped: number }>("/contacts/import", { method: "POST", body: { items } });
      saved(`Импорт завершён: добавлено ${result.created}, обновлено ${result.updated}, пропущено совпадений ${result.skipped}.`);
    } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  return <Dialog title="Предпросмотр импорта" onClose={() => { if (!busy) close(); }}><div className="space-y-4">
    <p className="text-sm text-muted-foreground">Выберите записи для сохранения. Совпадения по телефону, имени с датой рождения или идентификатору источника пропускаются. Обновление требует вашего выбора: заполненные импортом поля заменятся, отсутствующие сведения и прежние телефоны сохранятся.</p>
    {warnings.length > 0 && <details><summary className="cursor-pointer text-sm">Замечания к импорту: {warnings.length}</summary><ul className="list-inside list-disc text-xs">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => setChoices(chooseNew())}>Выбрать новые</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => setChoices(incoming.map(() => "skip"))}>Снять выбор</Button></div>
    <div className="max-h-96 space-y-3 overflow-y-auto">{incoming.map((data, i) => <div key={i} className="min-w-0 rounded-xl border border-border p-3"><p className="break-words font-medium">{contactName(data)}</p><p className="break-words text-xs text-muted-foreground">{data.phones.join(" · ") || "Без телефона"}{data.birth_date ? ` · ${data.birth_date}` : ""}</p>{matches[i].length > 0 && <p className="mt-1 text-xs text-primary">Совпадение: {matches[i].map(c => contactName(c.data)).join(", ")}</p>}<Select className="mt-2" aria-label={`Действие импорта ${i + 1}`} disabled={busy} value={choices[i]} onChange={e => setChoices(c => c.map((v, j) => i === j ? e.target.value : v))}><option value="skip">Пропустить</option>{!matches[i].length && <option value="create">Добавить новый контакт</option>}{matches[i].length === 1 && <option value="update">Обновить существующий контакт</option>}</Select>{matches[i].length > 1 && <p className="mt-1 text-xs text-muted-foreground">Несколько совпадений: уточните контакты вручную.</p>}</div>)}</div>
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" disabled={busy} checked={birthdays} onChange={e => setBirthdays(e.target.checked)} />Создать дни рождения выбранных контактов с полной датой рождения</label>
    <p className="text-sm">Выбрано: {count}. За один импорт — до 100 записей.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button disabled={busy || count === 0 || count > 100} onClick={() => void submit()}>{busy ? "Импортируем…" : "Подтвердить импорт"}</Button>
  </div></Dialog>;
}
