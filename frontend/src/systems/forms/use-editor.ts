import {useState,type Dispatch,type SetStateAction} from "react";
import {useForm,useWatch,type Resolver} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
export type EditorValidation={validate:()=>Promise<boolean>;messages:string[];dirty:boolean;reset:()=>void};
/** Controlled domain editors share RHF state and schema validation without a second draft store. */
export function useEditorState<T>(initial:T|(()=>T),schema:z.ZodType=z.unknown()):[T,Dispatch<SetStateAction<T>>,EditorValidation]{
 const [defaults]=useState(()=>({value:typeof initial==="function"?(initial as ()=>T)():initial}));
 const form=useForm<{value:unknown}>({defaultValues:defaults,resolver:zodResolver(z.object({value:schema})) as Resolver<{value:unknown}>,mode:"onSubmit"});
 const value=useWatch({control:form.control,name:"value",defaultValue:defaults.value}) as T;
 const setValue:Dispatch<SetStateAction<T>>=next=>{form.setValue("value",(typeof next==="function"?(next as (value:T)=>T)(form.getValues("value") as T):next),{shouldDirty:true,shouldTouch:true,shouldValidate:form.formState.isSubmitted});};
 const messages:string[]=[];
 function collect(error:unknown){if(!error||typeof error!=="object")return;for(const [key,value] of Object.entries(error)){if(key==="ref")continue;if(key==="message"&&typeof value==="string")messages.push(value);else if(typeof value==="object")collect(value);}}
 collect(form.formState.errors);
 return [value,setValue,{validate:async()=>{let valid=false;await form.handleSubmit(()=>{valid=true;})();return valid;},messages:[...new Set(messages)],dirty:form.formState.isDirty,reset:()=>form.reset()}];
}
/** Field adapters keep scalar controls in the same form state as the rest of their editor. */
export function useEditorField<T,K extends keyof T>(value:T,setValue:Dispatch<SetStateAction<T>>,key:K):[T[K],Dispatch<SetStateAction<T[K]>>]{
 return [value[key],next=>setValue(current=>({...current,[key]:typeof next==="function"?(next as (value:T[K])=>T[K])(current[key]):next}))];
}
