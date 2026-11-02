import { useState, type ChangeEvent } from "react";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { normalizeLabels } from "./types";

function readableTagText(color: string) {
  const value = color.replace("#", "");
  const channel = (index: number) => { const n = parseInt(value.slice(index, index + 2), 16) / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; };
  return .2126 * channel(0) + .7152 * channel(2) + .0722 * channel(4) > .179 ? "#111827" : "#ffffff";
}

export function TagChip({ name, color = "#6366F1" }: { name: string; color?: string }) {
  return <span className="inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: color, color: readableTagText(color) }}><span className="truncate">{name}</span></span>;
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
  const labels = single ? (value.trim() ? [value.trim()] : []) : normalizeLabels(value, multiline ? "lines" : "comma");
  const error = required && !labels.length ? "Укажите метку." : labels.length > 30 ? "Не более 30 меток." : labels.some(item => [...item].length > 64) ? "Не более 64 символов в метке." : "";
  const Component = multiline ? Textarea : Input;
  return <div className="space-y-2">
    <Component id={id} aria-label={label} required={required} maxLength={single ? 128 : 3900}
      list={!multiline && suggestions.length ? `${id}-suggestions` : undefined} value={value}
      aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
      ref={(element: HTMLInputElement | HTMLTextAreaElement | null) => { element?.setCustomValidity(error); }}
      onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(event.target.value)} />
    {suggestions.length > 0 && <datalist id={`${id}-suggestions`}>{normalizeLabels(suggestions).map(item => <option key={item} value={item} />)}</datalist>}
    {error && <p id={`${id}-error`} role="status" className="text-xs text-destructive">{error}</p>}
  </div>;
}

export function TagSelection({ value, change, tags }: { value: string[]; change: (value: string[]) => void; tags: { name: string; color?: string }[] }) {
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

export function LabelManager({ labels, busy, rename, remove, label = "Метка" }: { labels: string[]; busy: boolean; rename: (name: string, replacement: string) => void; remove: (name: string) => void; label?: string }) {
  const [name, setName] = useState("");
  const [replacement, setReplacement] = useState("");
  return <div className="space-y-4">
    <Select aria-label={label} value={name} disabled={busy} onChange={event => { setName(event.target.value); setReplacement(event.target.value); }}>
      <option value="">Выберите метку</option>{normalizeLabels(labels).sort().map(item => <option key={item}>{item}</option>)}
    </Select>
    <FormField id="label-replacement" label="Новое название метки"><LabelInput id="label-replacement" single value={replacement} change={setReplacement} /></FormField>
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy || !name || !replacement.trim() || [...replacement.trim()].length > 64} onClick={() => rename(name, replacement.trim())}>Переименовать метку</Button>
      <Button variant="outline" disabled={busy || !name} onClick={() => remove(name)}>Удалить метку</Button>
    </div>
  </div>;
}
