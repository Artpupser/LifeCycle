import {AppIcon} from "@/systems/icons/app-icon";
import {createPortal} from "react-dom";
import {Dialog} from "@/components/dialog";
import {UserImage} from "@/systems/media/user-image";
import {t,useLanguage} from "@/systems/i18n/locale";
import type {CollectionOption} from "./collection-catalog";
export function CollectionReference({item,compact=false}:{item:CollectionOption;compact?:boolean}){
 useLanguage();return <div className="min-w-0 space-y-3">{item.image_id&&<UserImage src={item.image_id} alt={item.name} className={`${compact?"max-h-32":"max-h-72"} w-full rounded-xl object-contain`}/>}<p className={`${compact?"line-clamp-3":"whitespace-pre-wrap"} break-words text-sm text-muted-foreground`}>{item.description||t("Описание не добавлено")}</p>{item.legacy&&<p className="text-xs text-muted-foreground">{t("Из сохранённой записи")}</p>}</div>;
}
export function CollectionReferenceDialog({item,close}:{item:CollectionOption;close:()=>void}){useLanguage();return createPortal(<Dialog title={item.name} onClose={close}><div className="mb-4 flex items-center gap-2"><AppIcon icon={item.icon}/><span>{item.name}</span></div><CollectionReference item={item}/></Dialog>,document.body);}
