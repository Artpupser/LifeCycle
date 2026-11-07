import {ChoiceField} from "@/components/ui/choice-picker";
import {SaveButton,SaveForm} from "@/components/ui/save";
import {useState,type FormEvent} from "react";
import {createPortal} from "react-dom";
import {Dialog} from "@/components/dialog";
import {FormField} from "@/components/form-field";
import {Button} from "@/components/ui/button";
import {Input,Textarea} from "@/components/ui/input";
import {useAction} from "@/hooks/use-action";
import {useResource} from "@/hooks/use-resource";
import {api} from "@/lib/api";
import {notify} from "@/lib/feedback";
import {ImageUpload} from "@/systems/media/image-upload";
import {UserImage} from "@/systems/media/user-image";
import {t,useLanguage} from "@/systems/i18n/locale";
import {collectionCatalog,collectionDefinition,type CollectionKind} from "./collection-catalog";
import type {Label} from "./types";
import {refreshCollectionResources} from "./collection-resources";

export function CollectionEditor({kind:initialKind="toy",initial,close,saved,chooseKind=false,initialName=""}:{kind?:CollectionKind;initial?:Label;close:()=>void;saved?:(label:Label)=>void;chooseKind?:boolean;initialName?:string}){
 useLanguage();const [kind,setKind]=useState(initialKind);const [name,setName]=useState(initial?.name??initialName);const [description,setDescription]=useState(initial?.description??"");const [image,setImage]=useState(initial?.image_id??null);const [uploading,setUploading]=useState(false);const action=useAction();const labels=useResource<Label[]>("/labels");
 async function submit(event:FormEvent){
  event.preventDefault();event.stopPropagation();if(uploading||action.busy||!collectionDefinition(kind).expandable)return;
  await action.run(async()=>{
   const label=await api<Label>(initial?`/labels/${initial.id}`:"/labels",{method:initial?"PUT":"POST",body:{name:name.trim(),kind,color:initial?.color??"#6366F1",icon:initial?.icon??collectionDefinition(kind).icon,...(initial?{revision:initial.revision}:{}),details:{description:description.trim(),image_id:image}}});
   labels.mutate(values=>[...values.filter(item=>item.id!==label.id),label]);refreshCollectionResources();notify(t("Элемент коллекции сохранён"));saved?.(label);close();
  });
 }
 return createPortal(<Dialog title={t(initial?"Редактировать элемент коллекции":"Новый элемент коллекции")} onClose={()=>{if(!action.busy&&!uploading)close();}}><SaveForm className="space-y-5" onSubmit={event=>void submit(event)}><fieldset disabled={action.busy} className="space-y-5">{chooseKind&&!initial&&<FormField id="collection-kind" label={t("Коллекция")}><ChoiceField id="collection-kind" value={kind} change={next=>setKind(next as CollectionKind)}>{collectionCatalog.filter(item=>item.expandable).map(item=><option key={item.id} value={item.id}>{t(item.name)}</option>)}</ChoiceField></FormField>}<FormField id="collection-name" label={t("Название")}><Input id="collection-name" autoFocus required maxLength={64} value={name} onChange={event=>setName(event.target.value)}/></FormField><FormField id="collection-description" label={t("Описание")} hint={t("Необязательно. Сведения, которые помогут отличить этот элемент.")}><Textarea id="collection-description" maxLength={5000} rows={4} value={description} onChange={event=>setDescription(event.target.value)}/></FormField>{image&&<div className="space-y-2"><UserImage src={image} alt={name} className="max-h-64 w-full rounded-xl object-contain"/><Button variant="ghost" disabled={uploading} onClick={()=>setImage(null)}>{t("Убрать изображение")}</Button></div>}<ImageUpload disabled={action.busy} onUploading={setUploading} onUploaded={image=>setImage(image.id)}/></fieldset>{action.error&&<p role="alert" className="text-sm text-destructive">{action.error}</p>}<SaveButton type="submit" disabled={action.busy||uploading||!name.trim()}>{t("Сохранить")}</SaveButton></SaveForm></Dialog>,document.body);
}
