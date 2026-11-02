export type ContactData = {
  first_name: string; last_name: string; middle_name: string; phones: string[];
  birth_date: string | null; description: string; relationship: string;
  profession: string; activity: string; categories: string[]; tags: string[]; source_keys: string[]; birthday_enabled: boolean;
};
export type Contact = { id: string; data: ContactData; revision: number; created_at: string; updated_at: string };
export const emptyContact = (): ContactData => ({ first_name: "", last_name: "", middle_name: "", phones: [], birth_date: null, description: "", relationship: "", profession: "", activity: "", categories: [], tags: [], source_keys: [], birthday_enabled: false });
export const contactName = (c: ContactData) => [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(" ");
export const phoneKey = (p: string) => p.replace(/\D/g, "").replace(/^00/, "");
const normalized = (p: string) => p.trim().replace(/\s+/g, " ").toLocaleLowerCase();
export function contactMatches(a: ContactData, b: ContactData) {
  return a.source_keys.some(k => b.source_keys.includes(k)) || a.phones.some(p => b.phones.some(q => phoneKey(p) === phoneKey(q))) || (normalized(contactName(a)) === normalized(contactName(b)) && a.birth_date === b.birth_date);
}
export function mergeImported(old: ContactData, incoming: ContactData): ContactData {
  const data = { ...old };
  for (const key of ["first_name", "last_name", "middle_name", "description", "relationship", "profession", "activity"] as const) if (incoming[key]) data[key] = incoming[key];
  if (incoming.birth_date) data.birth_date = incoming.birth_date;
  data.phones = [...old.phones];
  for (const phone of incoming.phones) if (!data.phones.some(p => phoneKey(p) === phoneKey(phone))) data.phones.push(phone);
  for (const key of ["categories", "tags", "source_keys"] as const) data[key] = [...new Set([...old[key], ...incoming[key]])];
  return data;
}
