import { t, useLanguage } from "@/systems/i18n/locale";
import {FormFieldContext} from "./form-field-context";
import type { ReactNode } from "react";

export function FormField({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  useLanguage();
  return <FormFieldContext value={{id,label:t(label),labelId:`${id}-label`,hintId:hint?`${id}-hint`:undefined}}><div className="min-w-0 space-y-2"><label id={`${id}-label`} htmlFor={id} onClick={()=>{const control=document.getElementById(id);if(control?.getAttribute("role")==="radiogroup")control.focus();}} className="block text-sm font-medium">{t(label)}</label>{children}{hint && <p id={`${id}-hint`} className="text-xs leading-5 text-muted-foreground">{t(hint)}</p>}</div></FormFieldContext>;
}
