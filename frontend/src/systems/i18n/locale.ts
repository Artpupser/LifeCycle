import { useSyncExternalStore } from "react";
let english: Record<string,string> | null = null;
let loading: Promise<void> | null = null;
let requestVersion=0;
export type Language = "ru" | "en";
let language: Language = "ru";
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const getLocale = () => language === "en" ? "en-US" : "ru-RU";
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useLanguage() { return useSyncExternalStore(subscribe, getLanguage, () => "ru" as Language); }
function commitLanguage(next: Language) {
  if (next === language) return;
  language = next;
  if (typeof document !== "undefined") document.documentElement.lang = next;
  listeners.forEach(listener => listener());
}
/** Load the second language only when selected; newer selections cancel stale loads. */
export async function setLanguage(next: Language) {
  const version=++requestVersion;
  if(next==="en"&&!english) {
    loading??=import("./messages").then(module=>{english=module.english;}).catch(error=>{loading=null;throw error;});
    await loading;
  }
  if(version===requestVersion)commitLanguage(next);
}
/** Interpolation never translates user content or treats it as markup. */
type Translated<T> = T extends string ? string : T;
export function t<T extends string | number | null | undefined>(source: T, values: Record<string, string | number> = {}): Translated<T> {
  if (typeof source !== "string") return source as Translated<T>;
  const key=source.trim();
  if(!key)return source as Translated<T>;
  const translated=language === "en" && english && Object.hasOwn(english,key) ? english[key] : key;
  const message=source.slice(0,source.length-source.trimStart().length)+translated+source.slice(source.trimEnd().length);
  return message.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match)) as Translated<T>;
}
export function numberLabel(value: number, options?: Intl.NumberFormatOptions) { return new Intl.NumberFormat(getLocale(), options).format(value); }
