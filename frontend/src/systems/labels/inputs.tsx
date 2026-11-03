import { useLabelCatalog } from "./context";
import { t, useLanguage } from "@/systems/i18n/locale";
import { useState, type ChangeEvent } from "react";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { formatLabels, normalizeLabels } from "./values";

function readableTagText(color: string) {
  const value = color.replace("#", "");
  const channel = (index: number) => { const n = parseInt(value.slice(index, index + 2), 16) / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; };
  return .2126 * channel(0) + .7152 * channel(2) + .0722 * channel(4) > .179 ? "#111827" : "#ffffff";
}

export function TagChip({ name, color }: { name: string; color?: string }) {
  useLanguage();
  const catalog=useLabelCatalog();
  color??=catalog.find(item=>(item.kind??"tag")==="tag"&&item.name.toLowerCase()===name.toLowerCase())?.color;
  return <span className="inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-xs font-medium" style={color?{ backgroundColor: color, color: readableTagText(color) }:{backgroundColor:"var(--muted)",color:"var(--foreground)"}}><span className="truncate">{name}</span></span>;
}

type LabelInputProps = {
  id: string;
  label?: string;
  value: string;
  change: (value: string) => void;
  suggestions?: string[];
  single?: boolean;
  required?: boolean;
  multiline?: boolean;
};

/** All label editors share validation; line mode preserves legacy contact punctuation. */
export function LabelInput({ id, label, value, change, suggestions = [], single = false, required = false, multiline = false }: LabelInputProps) {
  useLanguage();
  const catalog=useLabelCatalog();
  const available=[...suggestions,...catalog.filter(item=>(item.kind??"tag")==="tag").map(item=>item.name)];
  const labels = single ? (value.trim() ? [value.trim()] : []) : normalizeLabels(value, multiline ? "lines" : "comma");
  const error = required && !labels.length ? t("Укажите метку.") : labels.length > 30 ? t("Не более 30 меток.") : labels.some(item => [...item].length > 64) ? t("Не более 64 символов в метке.") : "";
  const Component = multiline ? Textarea : Input;
  return <div className="space-y-2">
    <Component id={id} aria-label={t(label)} required={required} maxLength={single ? 128 : 3900}
      list={!multiline && available.length ? `${id}-suggestions` : undefined} value={value}
      aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
      ref={(element: HTMLInputElement | HTMLTextAreaElement | null) => { element?.setCustomValidity(error); }}
      onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(event.target.value)} />
    {available.length > 0 && <datalist id={`${id}-suggestions`}>{normalizeLabels(available).map(item => <option key={item} value={single||multiline?item:formatLabels([item])} />)}</datalist>}
    {error && <p id={`${id}-error`} role="status" className="text-xs text-destructive">{error}</p>}
  </div>;
}

export function TagSelection({ value, change, tags }: { value: string[]; change: (value: string[]) => void; tags: { name: string; color?: string }[] }) {
  useLanguage();
  const names = normalizeLabels([...tags.map(tag => tag.name), ...value]);
  return <div className="flex flex-wrap gap-3">{names.map(name => {
    const same = (item: string) => item.toLocaleLowerCase("ru-RU") === name.toLocaleLowerCase("ru-RU");
    const selected = value.some(same);
    return <label key={name} className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={selected} disabled={!selected && value.length >= 30}
        onChange={event => change(event.target.checked ? normalizeLabels([...value, name]) : value.filter(item => !same(item)))} />
      <TagChip name={name} color={tags.find(tag => same(tag.name))?.color} />
    </label>;
  })}</div>;
}

export function LabelManager({ labels, busy, rename, remove, label = t("Метка") }: { labels: string[]; busy: boolean; rename: (name: string, replacement: string) => void; remove: (name: string) => void; label?: string }) {
  useLanguage();
  const [name, setName] = useState("");
  const [replacement, setReplacement] = useState("");
  return <div className="space-y-4">
    <Select aria-label={t(label)} value={name} disabled={busy} onChange={event => { setName(event.target.value); setReplacement(event.target.value); }}>
      <option value="">{t("Выберите метку")}</option>{normalizeLabels(labels).sort().map(item => <option key={item}>{item}</option>)}
    </Select>
    <FormField id="label-replacement" label={t("Новое название метки")}><LabelInput id="label-replacement" single value={replacement} change={setReplacement} /></FormField>
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy || !name || !replacement.trim() || [...replacement.trim()].length > 64} onClick={() => rename(name, replacement.trim())}>{t("Переименовать метку")}</Button>
      <Button variant="outline" disabled={busy || !name} onClick={() => remove(name)}>{t("Удалить метку")}</Button>
    </div>
  </div>;
}
