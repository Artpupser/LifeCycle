import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, LoaderCircle } from "@/components/icons";
import { errorMessage } from "@/lib/api";
import { imageAccept, uploadImage } from "./media";
import { t, useLanguage } from "@/systems/i18n/locale";
export function ImageUpload({label=t("Изображение"),onUploaded,onUploading,disabled=false}: {label?:string;onUploaded:(image:{id:string;url:string},file:File)=>void;onUploading?:(busy:boolean)=>void;disabled?:boolean}) {
  useLanguage();
  const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null);
  const input=useRef<HTMLInputElement>(null); const request=useRef<AbortController|null>(null);
  const handlers=useRef({onUploaded,onUploading});
  useEffect(()=>{handlers.current={onUploaded,onUploading};},[onUploaded,onUploading]);
  useEffect(()=>()=>{if(request.current){request.current.abort();request.current=null;handlers.current.onUploading?.(false);}},[]);
  async function upload(file:File) {
    if(request.current) return;
    const controller=new AbortController();request.current=controller;
    setBusy(true);setError(null);handlers.current.onUploading?.(true);
    try {const image=await uploadImage(file,controller.signal);if(!controller.signal.aborted)handlers.current.onUploaded(image,file);}
    catch(failure){if(!controller.signal.aborted)setError(errorMessage(failure));}
    finally{if(!controller.signal.aborted){setBusy(false);handlers.current.onUploading?.(false);}request.current=null;if(input.current)input.current.value="";}
  }
  return <div className="space-y-2"><Button size="sm" variant="outline" disabled={disabled||busy} onClick={()=>input.current?.click()}>{busy?<LoaderCircle className="animate-spin"/>:<ImagePlus/>}{t(label)}</Button><input ref={input} type="file" className="sr-only" accept={imageAccept} aria-label={t("Загрузить изображение")} disabled={disabled||busy} onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file);}}/>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
