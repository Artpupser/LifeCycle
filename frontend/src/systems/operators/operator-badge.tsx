import {AppIcon} from "@/systems/icons/app-icon";
import {operatorLogo} from "@/systems/icons/operators";
import {useEffect,useState} from "react";
import {lookupOperator} from "./service";
import {rangeOperator,type OperatorResult} from "./ranges";
import {t,useLanguage} from "@/systems/i18n/locale";
import {dateTimeLabel} from "@/lib/dates";
import {usePreferences} from "@/features/settings/preferences-context";
export function OperatorBadge({phone}:{phone:string}){useLanguage();const {settings}=usePreferences();const [revision,setRevision]=useState(0);useEffect(()=>{const update=()=>setRevision(value=>value+1);window.addEventListener("lifecycle:operators-changed",update);window.addEventListener("online",update);window.addEventListener("focus",update);return()=>{window.removeEventListener("lifecycle:operators-changed",update);window.removeEventListener("online",update);window.removeEventListener("focus",update);};},[]);const [result,setResult]=useState<{phone:string;value:OperatorResult|null}|null>(null);useEffect(()=>{let active=true;const timer=setTimeout(()=>{void lookupOperator(phone).then(value=>{if(active)setResult({phone,value});});},400);return()=>{active=false;clearTimeout(timer);};},[phone,revision]);const item=result?.phone===phone?result.value:rangeOperator(phone);if(!item)return null;return <p className="mt-1 text-xs text-muted-foreground"><AppIcon icon={operatorLogo(item.operator)} className="mr-1 size-5"/>{item.operator} · {item.source==="range"?t("Архивный диапазон; перенос номера не учтён"):item.source==="cache"?t("Из кеша"):t("Проверено онлайн")}{item.checked_at&&` · ${dateTimeLabel(item.checked_at,settings.timezone,settings.time_format)}`}</p>;}
