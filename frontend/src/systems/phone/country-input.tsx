import {ChoicePicker,ChoiceInput} from "@/components/ui/choice-picker";
import { callingCode, countries, countryCode, countryFlag, countryName, countryNames } from "./countries";
import { t, useLanguage } from "@/systems/i18n/locale";
export function CountryPicker({value,choose,close,phone=false}: {value:string;choose:(code:string)=>void;close:()=>void;phone?:boolean}) {
  useLanguage();return <ChoicePicker {...countryChoices(phone)} value={value} choose={choose} close={close}/>;
}
function countryChoices(phone=false){return {title:t("Выберите страну"),searchLabel:t("Поиск страны"),placeholder:t("Название, код страны или телефонный код"),empty:t("Страна не найдена"),options:countries.filter(code=>!phone||callingCode(code)).sort((a,b)=>countryName(a).localeCompare(countryName(b))).map(code=>({value:code,label:countryName(code),search:`${countryNames(code).ru} ${countryNames(code).en} +${callingCode(code)}`,icon:countryFlag(code),suffix:phone?`+${callingCode(code)}`:code}))};}
export function CountryInput({id,value,change}: {id:string;value:string;change:(value:string)=>void}) {
  useLanguage();const code=countryCode(value);return <ChoiceInput {...countryChoices()} id={id} value={code??""} displayValue={code?countryName(code):value} icon={code?countryFlag(code):"tabler:world"} changeText={change} choose={change}/>;
}
