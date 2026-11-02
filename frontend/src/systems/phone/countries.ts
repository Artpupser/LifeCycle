import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { getLanguage } from "@/systems/i18n/locale";
export type { CountryCode } from "libphonenumber-js";
const phoneCountries=new Set<string>(getCountries());
export const countries=[...new Set<string>([...getCountries(),"AQ","BV","GS","HM","PN","TF","UM"])].sort();
const ru=new Intl.DisplayNames(["ru"],{type:"region"});
const en=new Intl.DisplayNames(["en"],{type:"region"});
const nameCache=new Map<string,{ru:string;en:string}>();
export function countryNames(code:string){let names=nameCache.get(code);if(!names){names={ru:ru.of(code)??code,en:en.of(code)??code};nameCache.set(code,names);}return names;}
export function countryName(code:string){return countryNames(code)[getLanguage()];}
export function countryCode(value:string){const text=value.trim().toLocaleLowerCase();return countries.find(code=>{const names=countryNames(code);return [code,names.ru,names.en].some(name=>name.toLocaleLowerCase()===text);})??null;}
export function callingCode(code:string){return phoneCountries.has(code)?getCountryCallingCode(code as CountryCode):"";}
export const countryFlag=(code:string)=>`circle-flags:${code.toLowerCase()}`;
