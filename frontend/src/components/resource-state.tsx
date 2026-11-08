import { useEffect,useState } from "react";
import {secondsUntil} from "@/lib/dates";
import { t, numberLabel, useLanguage } from "@/systems/i18n/locale";
import { LoaderCircle } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function LoadingState() {
  useLanguage();
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setVisible(true),140);return()=>clearTimeout(timer);},[]);
  if(!visible)return <div className="min-h-56" aria-busy="true"/>;
  return <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-5" aria-hidden="true" /> {t(" Загружаем данные…")}</div>;
}

export function ErrorState({ message, retry,retryAt=null }: { message: string; retry: () => void;retryAt?:number|null }) {
  useLanguage();
  return <div className="rounded-2xl border border-border bg-card p-8"><p className="mb-5 text-sm leading-6" role="alert">{message}</p>{retryAt&&<p className="mb-4 text-sm text-muted-foreground" role="status">{t("Следующая попытка через {seconds} с.",{seconds:numberLabel(secondsUntil(retryAt))})}</p>}<Button variant="outline" disabled={retryAt!==null} onClick={retry}>{t(retryAt?"Ожидание перед повтором":"Попробовать снова")}</Button></div>;
}
