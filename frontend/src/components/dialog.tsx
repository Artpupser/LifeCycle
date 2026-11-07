import { AnimatedSurface } from "@/systems/animations/surfaces";
import { t, useLanguage } from "@/systems/i18n/locale";
import { X } from "@/components/icons";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./ui/button";
import {SaveHeaderContext,useSaveHeader} from "./ui/save-context";

export function Dialog({ title, onClose, children, fullScreen=false, role = "dialog" }: { fullScreen?:boolean; role?: "dialog" | "alertdialog"; title: string; onClose: () => void; children: ReactNode }) {
  useLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const {target,count,register,setTarget}=useSaveHeader();
  const save={target,count,register};
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <SaveHeaderContext value={save}><dialog role={role} ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} className={fullScreen?"m-0 h-svh max-h-none w-screen max-w-none overflow-hidden border-0 bg-card p-0 text-foreground backdrop:bg-black/65":"m-auto max-h-[90svh] w-[min(48rem,calc(100%-2rem))] overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/65"}><div className={fullScreen?"flex h-full flex-col":"flex max-h-[90svh] flex-col"}><div className="z-30 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6 py-4"><h2 id={titleId} className="min-w-0 break-words text-lg font-semibold">{title}</h2><div className="flex shrink-0 items-center gap-2"><div ref={setTarget}/><Button variant="outline" size="icon" className="rounded-full" aria-label={t("Закрыть окно")} onClick={onClose}><X aria-hidden="true" /></Button></div></div><AnimatedSurface kind="dialog" className={fullScreen?"min-h-0 flex-1 overflow-y-auto p-3 sm:p-5":"min-h-0 overflow-y-auto p-6"}>{children}</AnimatedSurface></div></dialog></SaveHeaderContext>;
}
