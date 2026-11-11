import * as Modal from "@radix-ui/react-dialog";
import * as Alert from "@radix-ui/react-alert-dialog";
import {AnimatedSurface} from "@/systems/animations/surfaces";
import {t,useLanguage} from "@/systems/i18n/locale";
import {X} from "@/components/icons";
import {type ReactNode} from "react";
import {cn} from "@/lib/utils";
import {Button} from "./ui/button";
import {SaveHeaderContext,useSaveHeader} from "./ui/save-context";
export function Dialog({title,onClose,children,fullScreen=false,role="dialog",className,bodyClassName}:{fullScreen?:boolean;role?:"dialog"|"alertdialog";title:string;onClose:()=>void;children:ReactNode;className?:string;bodyClassName?:string}){
 useLanguage();const {target,count,register,setTarget}=useSaveHeader();
 const {Root,Portal,Overlay,Content,Title}=role==="alertdialog"?Alert:Modal;
 return <SaveHeaderContext value={{target,count,register}}><Root open onOpenChange={open=>{if(!open)onClose();}}><Portal><Overlay className="fixed inset-0 z-50 bg-overlay/30"/><Content aria-describedby={undefined} data-dialog-root className={cn(fullScreen?"fixed inset-0 z-50 h-svh w-screen overflow-hidden bg-card text-foreground":"fixed left-1/2 top-1/2 z-50 max-h-[90svh] w-[min(48rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-card border border-line bg-surface text-foreground",className)}><div className={fullScreen?"flex h-full flex-col":"flex max-h-[90svh] flex-col"}><div className="z-30 flex shrink-0 items-center justify-between gap-4 border-b border-line bg-app/70 px-6 py-4 backdrop-blur-xl backdrop-saturate-150"><Title asChild><h2 className="min-w-0 break-words text-lg font-semibold">{title}</h2></Title><div className="flex shrink-0 items-center gap-2"><div ref={setTarget}/><Button variant="outline" size="icon" className="rounded-full" aria-label={t("Закрыть окно")} onClick={onClose}><X aria-hidden="true"/></Button></div></div><AnimatedSurface kind="dialog" className={cn(fullScreen?"min-h-0 flex-1 overflow-y-auto p-3 sm:p-5":"min-h-0 overflow-y-auto p-6",bodyClassName)}>{children}</AnimatedSurface></div></Content></Portal></Root></SaveHeaderContext>;
}
