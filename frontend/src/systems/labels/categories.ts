import {t} from "@/systems/i18n/locale";
import type {Label,EventCategory} from "./types";
export const eventCategories:EventCategory[]=["birthday","anniversary","holiday","personal","work","other"];
const names:Record<Exclude<EventCategory,`custom:${string}`>,string>={birthday:"День рождения",anniversary:"Годовщина",holiday:"Праздник",personal:"Личное",work:"Работа",other:"Событие"};
export const categoryName=(category:string,catalog:Label[]=[])=>category.startsWith("custom:")?catalog.find(label=>`custom:${label.id}`===category)?.name??t("Событие"):Object.hasOwn(names,category)?t(names[category as keyof typeof names]):category;
export function eventCategory(value:string):EventCategory {const key=value.toLowerCase();if(/^custom:[0-9a-f-]{36}$/i.test(value))return value as EventCategory;return eventCategories.find(item=>item===key||names[item as keyof typeof names].toLowerCase()===key)??"other";}
export const categoryTerms=(value:string,catalog:Label[]=[])=>[value,categoryName(value,catalog),names[eventCategory(value) as keyof typeof names]??categoryName(value,catalog)];
