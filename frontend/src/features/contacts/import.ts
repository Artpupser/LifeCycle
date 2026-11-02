import { isCalendarDate } from "@/lib/dates";
import { emptyContact, type ContactData } from "./types";

function split(value: string, separator: string) {
  const parts = []; let part = ""; let escaped = false;
  for (const char of value) {
    if (escaped) { part += `\\${char}`; escaped = false; }
    else if (char === "\\") escaped = true;
    else if (char === separator) { parts.push(part); part = ""; }
    else part += char;
  }
  parts.push(part); return parts;
}
const unescape = (value: string) => value.replace(/\\([nN,;\\])/g, (_, char: string) => /n/i.test(char) ? "\n" : char).trim();
function decode(value: string, header: string) {
  if (!/ENCODING=QUOTED-PRINTABLE/i.test(header)) return value;
  const charset = /CHARSET="?([^;"\s]+)/i.exec(header)?.[1] ?? "utf-8";
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "=" && /^[0-9a-f]{2}$/i.test(value.slice(i + 1, i + 3))) { bytes.push(parseInt(value.slice(i + 1, i + 3), 16)); i += 2; }
    else bytes.push(...new TextEncoder().encode(value[i]));
  }
  return new TextDecoder(charset, { fatal: true }).decode(new Uint8Array(bytes));
}
export function parseVcards(text: string): { contacts: ContactData[]; warnings: string[] } {
  if (text.length > 2_000_000) throw new Error("Файл слишком большой: максимум 2 МБ.");
  const cards = text.replace(/^\uFEFF/, "").replace(/=\r?\n/g, "").replace(/\r?\n[ \t]/g, "").match(/BEGIN:VCARD\r?\n[\s\S]*?END:VCARD/gi) ?? [];
  if (!cards.length) throw new Error("В файле не найдены карточки vCard.");
  if (cards.length > 2000) throw new Error("Импортируйте не более 2000 карточек из одного файла.");
  const contacts: ContactData[] = []; const warnings: string[] = [];
  for (const [index, card] of cards.entries()) {
    const data = emptyContact(); let fn = "";
    try {
      for (const line of card.split(/\r?\n/)) {
        const colon = line.indexOf(":"); if (colon < 0) continue;
        const header = line.slice(0, colon); const key = header.split(";")[0].split(".").at(-1)?.toUpperCase();
        const value = decode(line.slice(colon + 1), header);
        if (key === "N") { const parts = split(value, ";").map(unescape); data.last_name = parts[0] ?? ""; data.first_name = parts[1] ?? ""; data.middle_name = parts[2] ?? ""; }
        if (key === "FN") fn = unescape(value);
        if (key === "TEL") { const phone = unescape(value).replace(/^tel:/i, ""); if (phone && !data.phones.includes(phone)) data.phones.push(phone); }
        if (key === "BDAY") {
          const match = /^(\d{4})-?(\d{2})-?(\d{2})(?:T.*)?$/.exec(value);
          const date = match ? `${match[1]}-${match[2]}-${match[3]}` : null;
          if (date && isCalendarDate(date)) data.birth_date = date;
          else warnings.push(`Карточка ${index + 1}: дата рождения без полного года или в неизвестном формате пропущена.`);
        }
        if (key === "NOTE") data.description = unescape(value);
        if (key === "TITLE") data.profession = unescape(value);
        if (key === "ORG") data.activity = split(value, ";").map(unescape).filter(Boolean).join(" · ");
        if (key === "CATEGORIES") data.categories = split(value, ",").map(unescape).filter(Boolean);
        if (key === "UID" && value.trim()) data.source_keys = [`vcard:${unescape(value)}`];
      }
      if (![data.first_name, data.last_name, data.middle_name].some(Boolean)) data.first_name = fn;
      if (![data.first_name, data.last_name, data.middle_name].some(Boolean)) throw new Error("Нет имени");
      contacts.push(data);
    } catch { warnings.push(`Карточка ${index + 1} пропущена: проверьте имя, кодировку и формат.`); }
  }
  return { contacts, warnings };
}
export function parseContactFile(text: string) {
  if (!text.trimStart().startsWith("{")) return parseVcards(text);
  if (text.length > 2_000_000) throw new Error("Файл слишком большой: максимум 2 МБ.");
  const backup: unknown = JSON.parse(text);
  if (!backup || typeof backup !== "object" || !("version" in backup) || backup.version !== 1 || !("contacts" in backup) || !Array.isArray(backup.contacts) || backup.contacts.length > 2000) throw new Error("Нужен JSON-экспорт контактной книжки LifeCycle версии 1.");
  const contacts: ContactData[] = backup.contacts.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Неверная запись контакта в JSON.");
    const data = emptyContact();
    for (const key of Object.keys(data) as (keyof ContactData)[]) {
      if (!(key in item)) continue;
      const value: unknown = (item as Record<string, unknown>)[key];
      if (key === "birthday_enabled") { if (typeof value !== "boolean") throw new Error("Неверное разрешение дня рождения в JSON."); data[key] = value; }
      else if (key === "birth_date") { if (value !== null && typeof value !== "string") throw new Error("Неверная дата в JSON."); data[key] = value; }
      else if (key === "phones" || key === "categories" || key === "tags" || key === "source_keys") { if (!Array.isArray(value) || !value.every(x => typeof x === "string")) throw new Error("Неверный список в JSON."); data[key] = value; }
      else { if (typeof value !== "string") throw new Error("Неверное поле контакта в JSON."); data[key] = value; }
    }
    return data;
  });
  return { contacts, warnings: [] as string[] };
}

type Picker = { getProperties: () => Promise<string[]>; select: (properties: string[], options: { multiple: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]> };
export const devicePicker = () => (navigator as Navigator & { contacts?: Picker }).contacts;
export async function selectDeviceContacts() {
  const picker = devicePicker(); if (!picker) throw new Error("Используйте импорт файла vCard.");
  const properties = (await picker.getProperties()).filter(p => ["name", "tel"].includes(p));
  if (!properties.includes("name")) throw new Error("Система не предоставляет имена контактов. Используйте vCard.");
  const contacts = await picker.select(properties, { multiple: true });
  return contacts.map(c => ({ ...emptyContact(), first_name: c.name?.[0] ?? "", phones: c.tel ?? [] }));
}
