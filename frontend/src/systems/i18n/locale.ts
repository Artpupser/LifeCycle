import {createInstance} from "i18next";
import {initReactI18next,useTranslation} from "react-i18next";
const translations=createInstance();
void translations.use(initReactI18next).init({lng:"ru",fallbackLng:"ru",initAsync:false,resources:{ru:{translation:{}}},keySeparator:false,nsSeparator:false,interpolation:{escapeValue:false,prefix:"{",suffix:"}"},react:{useSuspense:false}});
let english: Record<string,string> | null = null;
let loading: Promise<void> | null = null;
let requestVersion=0;
export type Language = "ru" | "en";
/** Choice catalog is broader than the two translations shipped with the app. */
export const languageOptions = ["ru","en","ar","az","be","bg","bn","bs","ca","cs","cy","da","de","el","es","et","eu","fa","fi","fil","fr","ga","gl","gu","he","hi","hr","hu","hy","id","is","it","ja","ka","kk","km","kn","ko","ky","lt","lv","mk","ml","mn","mr","ms","mt","nb","ne","nl","pa","pl","pt","ro","sk","sl","sq","sr","sv","sw","ta","te","th","tr","uk","ur","uz","vi","zh"] as const;
export function resolveLanguage(requested: string): {language: Language; fallback: boolean} {
  const code=requested.trim().toLowerCase().split(/[-_]/)[0];
  return code==="ru"||code==="en" ? {language:code,fallback:false} : {language:"en",fallback:true};
}
export const getLanguage = ():Language => translations.language==="en"?"en":"ru";
export const getLocale = () => getLanguage() === "en" ? "en-US" : "ru-RU";
const languageNames={ru:new Intl.DisplayNames(["ru","en"],{type:"language"}),en:new Intl.DisplayNames(["en"],{type:"language"})};
export function languageName(code:string) {
  const name=languageNames[getLanguage()].of(code)??code;
  return name.charAt(0).toLocaleUpperCase(getLocale())+name.slice(1);
}
export function languageSearch(code:string){return `${languageNames.ru.of(code)??code} ${languageNames.en.of(code)??code}`;}
export function useLanguage() { useTranslation(undefined,{i18n:translations});return getLanguage(); }
/** Load the second language only when selected; newer selections cancel stale loads. */
export async function setLanguage(requested: string) {
  const selection=resolveLanguage(requested);
  const next=selection.language;
  const version=++requestVersion;
  if(next==="en"&&!english) {
    loading??=import("./messages").then(module=>{english=module.english;translations.addResourceBundle("en","translation",english,true,true);}).catch(error=>{loading=null;throw error;});
    await loading;
  }
  if(version===requestVersion){await translations.changeLanguage(next);if(typeof document!=="undefined"&&version===requestVersion)document.documentElement.lang=next;}
  return {...selection,applied:version===requestVersion};
}
/** Interpolation never translates user content or treats it as markup. */
type Translated<T> = T extends string ? string : T;
export function t<T extends string | number | null | undefined>(source: T, values: Record<string, string | number> = {}): Translated<T> {
  if (typeof source !== "string") return source as Translated<T>;
  const key=source.trim();
  if(!key)return source as Translated<T>;
  const translated=String(translations.t(key,{...values,defaultValue:key}));
  return (source.slice(0,source.length-source.trimStart().length)+translated+source.slice(source.trimEnd().length)) as Translated<T>;
}
export function numberLabel(value: number, options?: Intl.NumberFormatOptions) { return new Intl.NumberFormat(getLocale(), options).format(value); }
