import { t, useLanguage } from "@/systems/i18n/locale";
import { useRef, useState, type FormEvent } from "react";
import { Plus, X } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
export function QuickTask({ save, close }: { save: (title: string) => Promise<void>; close: () => void }) {
  useLanguage();
  const [title,setTitle]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);const lock=useRef(false);const input=useRef<HTMLInputElement>(null);
  async function submit(event: FormEvent){event.preventDefault();if(lock.current||!title.trim())return;lock.current=true;setBusy(true);setError(null);try{await save(title.trim());setTitle("");input.current?.focus();}catch(failure){setError(errorMessage(failure));}finally{lock.current=false;setBusy(false);}}
  return <form onSubmit={(event)=>void submit(event)} aria-label={t("Быстрое создание задачи")} className="space-y-2 rounded-xl border border-primary/40 bg-card p-3 shadow-sm"><Input ref={input} autoFocus aria-label={t("Название новой задачи")} placeholder={t("Что нужно сделать?")} maxLength={200} required value={title} disabled={busy} onChange={(event)=>setTitle(event.target.value)} onKeyDown={(event)=>{if(event.key==="Escape"){event.preventDefault();close();}}}/><div className="flex items-center gap-2"><Button size="sm" type="submit" disabled={busy||!title.trim()}><Plus/>{busy?t("Добавляем…"):t("Добавить")}</Button><span className="mr-auto text-[10px] text-muted-foreground">{t("Enter — добавить")}</span><Button size="icon" variant="ghost" className="size-7" disabled={busy} aria-label={t("Закрыть быстрое создание")} onClick={close}><X/></Button></div>{error&&<p role="alert" className="text-xs text-destructive">{error}</p>}</form>;
}
