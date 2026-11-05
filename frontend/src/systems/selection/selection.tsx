import {ObjectActions} from "@/systems/actions/action-menu";
import type {ContextAction} from "@/systems/actions/context";
import {t,useLanguage} from "@/systems/i18n/locale";
import {selectionMenuActions} from "./actions";
import type {Selection} from "./state";

export function SelectionActions<T>({selection,disabled=false,actions=[],allLabel,contribute=false}:{selection:Selection<T>;disabled?:boolean;actions?:ContextAction[];allLabel?:string;contribute?:boolean}){
 useLanguage();return <ObjectActions contribute={contribute} label={t("Действия с выбором")} actions={selectionMenuActions(selection,{disabled,actions,allLabel})}/>;
}
