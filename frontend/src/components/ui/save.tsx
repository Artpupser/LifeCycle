import {Children,isValidElement,useCallback,useContext,useId,useLayoutEffect,useState,type ComponentProps,type ReactNode} from "react";
import {createPortal} from "react-dom";
import {AppIcon} from "@/systems/icons/app-icon";
import {t,useLanguage} from "@/systems/i18n/locale";
import {cn} from "@/lib/utils";
import {Button} from "./button";
import {SaveFormTarget,SaveHeaderContext} from "./save-context";
function textOf(children:ReactNode):string{return Children.toArray(children).map(child=>typeof child==="string"||typeof child==="number"?String(child):isValidElement<{children?:ReactNode}>(child)?textOf(child.props.children):"").join("");}
export function SaveForm({children,onSubmit,...props}:ComponentProps<"form">){
 const header=useContext(SaveHeaderContext);const [target,setTarget]=useState<HTMLDivElement|null>(null);
 return <form {...props} onSubmit={onSubmit??(event=>event.preventDefault())}><SaveFormTarget value={target}>{(!header||header.count!==1)&&<div data-save-header className="pointer-events-none sticky top-0 z-20 ml-auto flex min-h-11 w-fit shrink-0 self-end justify-end p-1"><div ref={setTarget} className="pointer-events-auto"/></div>}{children}</SaveFormTarget></form>;
}
export function SaveButton({children,className,...props}:ComponentProps<typeof Button>){
 useLanguage();const id=useId();const local=useContext(SaveFormTarget);const header=useContext(SaveHeaderContext);const register=header?.register;
 const [association,setAssociation]=useState({form:undefined as string|undefined,disabled:false});
 useLayoutEffect(()=>register?.(id),[register,id]);
 // A portal leaves the source fieldset. Mirror its native disabled semantics,
 // including changes that do not rerender this button and the first-legend exception.
 const anchor=useCallback((node:HTMLSpanElement|null)=>{
  if(!node)return;
  const form=node.closest("form");if(form&&!form.id)form.id=`save-form-${id}`;
  const fieldsets:HTMLFieldSetElement[]=[];let parent=node.parentElement;
  while(parent){if(parent instanceof HTMLFieldSetElement)fieldsets.push(parent);parent=parent.parentElement;}
  const sync=()=>{const name=form?.id,disabled=fieldsets.some(fieldset=>fieldset.disabled&&!Array.from(fieldset.children).find(child=>child.tagName==="LEGEND")?.contains(node));setAssociation(current=>current.form===name&&current.disabled===disabled?current:{form:name,disabled});};
  sync();const observer=new MutationObserver(sync);
  for(const fieldset of fieldsets)observer.observe(fieldset,{attributes:true,attributeFilter:["disabled"]});
  if(form)observer.observe(form,{attributes:true,attributeFilter:["id"]});
  return()=>observer.disconnect();
 },[id]);
 const label=props["aria-label"]??(textOf(children)||t("Сохранить"));const target=header?.count===1?header.target:local;
 const button=<Button {...props} form={props.form??association.form} disabled={props.disabled||association.disabled} aria-label={label} title={props.title??label} data-save-button size="icon" className={cn(className,"size-9 shrink-0 rounded-full border border-primary/20 p-0 shadow-sm ring-4 ring-card")}><AppIcon icon="tabler:device-floppy" aria-hidden="true"/><span className="sr-only">{children||label}</span></Button>;
 return <><span ref={anchor} className="contents"/>{target?createPortal(button,target):<span className="flex justify-end">{button}</span>}</>;
}
