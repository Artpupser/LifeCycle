import {ChoiceInput} from "@/components/ui/choice-picker";
import {notify} from "@/lib/feedback";
import {t,useLanguage,languageOptions,languageName,languageSearch,resolveLanguage,type Language} from "./locale";

export function LanguageInput({id,value,change}:{id:string;value:Language;change:(value:Language)=>void}){
 useLanguage();
 const selected=resolveLanguage(value).language;
 return <ChoiceInput id={id} value={selected} displayValue={languageName(selected)} icon="tabler:language" title={t("Выберите язык")} searchLabel={t("Поиск языка")} empty={t("Язык не найден")} options={languageOptions.map(code=>({value:code,label:languageName(code),search:languageSearch(code),icon:"tabler:language"}))} choose={requested=>{
  const next=resolveLanguage(requested);change(next.language);
  if(next.fallback)notify(t("Перевод на язык «{language}» недоступен. Выбран английский; изменение применится после сохранения настроек.",{language:languageName(requested)}),"info");
 }}/>;
}
