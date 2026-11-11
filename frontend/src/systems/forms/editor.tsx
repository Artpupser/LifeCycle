import {useRef,type ComponentProps} from "react";
import {SaveForm} from "@/components/ui/save";
import {t} from "@/systems/i18n/locale";
import type {EditorValidation} from "./use-editor";
export function EditorForm({editor,children,onSubmit,saveControls=true,...props}:ComponentProps<typeof SaveForm>&{editor:EditorValidation|EditorValidation[];saveControls?:boolean}){
 const validating=useRef(false);
 const editors=Array.isArray(editor)?editor:[editor];const Form=saveControls?SaveForm:"form";
 return <Form {...props} onSubmit={async event=>{event.preventDefault();event.stopPropagation();if(validating.current)return;validating.current=true;try{const valid=await Promise.all(editors.map(item=>item.validate()));if(valid.every(Boolean))onSubmit?.(event);}finally{validating.current=false;}}}>{children}{editors.flatMap(item=>item.messages).map((message,index)=><p role="alert" className="text-sm text-destructive" key={`${index}:${message}`}>{t(message==="Заполните обязательные поля."?message:"Проверьте заполненные поля и допустимые значения.")}</p>)}</Form>;
}
