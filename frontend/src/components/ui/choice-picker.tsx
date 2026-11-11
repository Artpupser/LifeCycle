import {VirtualGrid,type VirtualGridHandle} from "./virtual-grid";
import {useContext,useId,useRef,useState,type ComponentProps,type ReactNode} from "react";
import {createPortal} from "react-dom";
import {Dialog} from "@/components/dialog";
import {FormFieldContext} from "@/components/form-field-context";
import {FilterSearch} from "@/components/filter-search";
import {parseFilterQuery,matchesFilter} from "@/lib/filter-query";
import {AppIcon} from "@/systems/icons/app-icon";
import {t,useLanguage} from "@/systems/i18n/locale";
import {cn} from "@/lib/utils";
import {Button} from "./button";
import {Input} from "./input";
import {useControlState} from "./control-state";
import {choiceOptions,type ChoiceOption} from "./choice-options";
export type {ChoiceOption} from "./choice-options";

export function ChoicePicker({value,options,title,searchLabel,placeholder,empty,disabled=false,choose,close}:{value:string;options:ChoiceOption[];title:string;searchLabel:string;placeholder?:string;empty:string;disabled?:boolean;choose:(value:string)=>void;close:()=>void}){
 useLanguage();const [query,setQuery]=useState("");const virtual=useRef<VirtualGridHandle>(null);
 const filters=parseFilterQuery(query,[]);const matches=options.filter(option=>matchesFilter(filters,`${option.label} ${option.search??""} ${option.group??""} ${option.value}`,{}));const visible=matches;
 return <Dialog title={title} onClose={close}><div className="space-y-4" onKeyDown={event=>{
  const enabled=visible.filter(option=>!option.disabled);if(disabled||!enabled.length)return;
  const index=enabled.findIndex(option=>(event.target as HTMLElement).dataset.choiceOption===option.value);
  if(event.key==="ArrowDown"||event.key==="ArrowUp"||index>=0&&(event.key==="Home"||event.key==="End")){
   event.preventDefault();const next=event.key==="Home"?0:event.key==="End"?enabled.length-1:index<0?(event.key==="ArrowDown"?0:enabled.length-1):(index+(event.key==="ArrowDown"?1:-1)+enabled.length)%enabled.length;
   virtual.current?.focus(matches.indexOf(enabled[next]));
  }else if(event.key==="Enter"&&event.target instanceof HTMLInputElement){event.preventDefault();choose(enabled[0].value);}
 }}><FilterSearch label={searchLabel} value={query} change={setQuery} specs={[]} placeholder={placeholder}/><VirtualGrid ref={virtual} items={matches} itemKey={option=>option.value} scope={query} minItemWidth={100000} estimateSize={80} className="max-h-[55svh]" style={{height:`min(55svh,${Math.max(1,matches.length)*80}px)`}} render={(option,index)=><div>{option.group&&option.group!==visible[index-1]?.group&&<p className="px-3 pb-1 pt-3 text-xs font-semibold text-muted-foreground">{option.group}</p>}<button type="button" data-choice-option={option.value} disabled={disabled||option.disabled} aria-pressed={option.value===value} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 ${option.value===value?"border-primary/40 bg-primary/10":"border-transparent"}`} onClick={()=>{if(!disabled&&!option.disabled)choose(option.value);}}>{option.icon&&<AppIcon icon={option.icon} className="size-6 shrink-0"/>}<span className="min-w-0 flex-1 break-words"><span className="block">{option.label}</span>{option.description&&<span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>}</span>{option.suffix&&<span className="text-xs text-muted-foreground">{option.suffix}</span>}{option.value===value&&<AppIcon icon="tabler:check" className="size-4 text-primary"/>}</button></div>}/>{!visible.length&&<p role="status">{empty}</p>}</div></Dialog>;
}

type ChoiceInputProps={id:string;value:string;displayValue:string;icon?:string;disabled?:boolean;inputProps?:Omit<ComponentProps<"input">,"id"|"value"|"onChange"|"disabled">;changeText?:(value:string)=>void;choose:(value:string)=>void}&Omit<Parameters<typeof ChoicePicker>[0],"value"|"choose"|"close"|"disabled">;
export function ChoiceInput({id,value,displayValue,icon,disabled=false,inputProps,changeText,choose,...picker}:ChoiceInputProps){
 const [open,setOpen]=useState(false);const [host,setHost]=useState<HTMLElement|null>(null);const [bindRef,inputRef,blocked,isDisabled]=useControlState(disabled,inputProps?.ref);
 const show=()=>{if(!isDisabled()){setHost(inputRef.current?.closest<HTMLElement>("[data-dialog-root]")??document.body);setOpen(true);}};
 const dialog=open?<ChoicePicker {...picker} disabled={blocked} value={value} close={()=>setOpen(false)} choose={next=>{if(isDisabled())return;choose(next);setOpen(false);}}/>:null;
 return <div className="min-w-0"><div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background pl-3 pr-1 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">{icon&&<AppIcon icon={icon} className="size-5 text-muted-foreground"/>}<Input {...inputProps} data-contained id={id} ref={bindRef} disabled={disabled} className={cn("min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none outline-none focus-visible:ring-0",inputProps?.className)} value={displayValue} readOnly={!changeText} maxLength={inputProps?.maxLength??100} onChange={event=>changeText?.(event.target.value)} onClick={()=>{if(!changeText)show();}} onKeyDown={event=>{inputProps?.onKeyDown?.(event);if(event.defaultPrevented)return;if(event.key==="ArrowDown"||(!changeText&&(event.key==="Enter"||event.key===" "))){event.preventDefault();show();}}} aria-haspopup="dialog" aria-expanded={open}/><Button size="icon" variant="ghost" disabled={blocked} aria-label={picker.title} title={picker.title} aria-haspopup="dialog" aria-expanded={open} onClick={show}><AppIcon icon="tabler:search"/></Button></div>{dialog&&createPortal(dialog,host??document.body)}</div>;
}

export function RadioGroup({id,value,options,change,disabled=false,label,labelledBy,describedBy,invalid=false,required=false,className}:{id:string;value:string;options:ChoiceOption[];change:(value:string)=>void;disabled?:boolean;label?:string;labelledBy?:string;describedBy?:string;invalid?:boolean;required?:boolean;className?:string}){
 const name=useId();
 return <div id={id} role="radiogroup" aria-required={required||undefined} tabIndex={-1} aria-label={labelledBy?undefined:label} aria-labelledby={labelledBy} aria-describedby={describedBy} aria-invalid={invalid||undefined} aria-disabled={disabled||undefined} data-choice-field={id} data-choice-value={value} className={cn("grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2",className)}>{options.map((option,index)=><label key={option.value} className={`flex min-h-12 min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${option.value===value?"border-primary/50 bg-primary/10":"border-border bg-background hover:bg-muted/50"}`}><Input type="radio" name={`choice-${name}`} form={`choice-ui-${name}`} data-choice-option={option.value} id={`${id}-${index}`} value={option.value} checked={option.value===value} disabled={disabled||option.disabled} onChange={()=>change(option.value)} className="mt-0.5"/>{option.icon&&<AppIcon icon={option.icon} className="size-5 text-muted-foreground"/>}<span className="min-w-0 flex-1 break-words text-sm"><span className="block">{option.label}</span>{option.description&&<span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>}{option.content}</span></label>)}</div>;
}

type ChoiceFieldProps=Omit<ComponentProps<"input">,"type"|"value"|"defaultValue"|"onChange"|"children"|"size">&{value?:string|number;defaultValue?:string|number;children?:ReactNode;options?:ChoiceOption[];change?:(value:string)=>void;presentation?:"radio"|"picker"};
/** Short choices stay visible; larger/grouped catalogs reuse the searchable dialog. */
export function ChoiceField({id:providedId,value,defaultValue,children,options:catalog,change,disabled=false,required,name,form,presentation,className,ref:forwarded,...props}:ChoiceFieldProps){
 useLanguage();const field=useContext(FormFieldContext);const unique=useId();const id=providedId??`choice-${unique}`;
 const options=catalog??choiceOptions(children);const [local,setLocal]=useState(()=>String(defaultValue??options[0]?.value??""));const current=String(value??local);
 const [invalid,setInvalid]=useState(false);const [bindRef,,blocked,isDisabled]=useControlState(disabled,forwarded);
 const {"aria-label":explicitLabel,"aria-labelledby":explicitLabelledBy,"aria-describedby":explicitDescription,...nativeProps}=props;
 const label=explicitLabel??field?.label??t("Выбор");const labelledBy=explicitLabelledBy??(field?.id===id?field.labelId:undefined);const describedBy=explicitDescription??(field?.id===id?field.hintId:undefined);
 const choose=(next:string)=>{if(isDisabled()||!options.some(option=>option.value===next&&!option.disabled))return;setLocal(next);setInvalid(false);change?.(next);};
 const radios=presentation==="radio"||presentation!=="picker"&&options.length>0&&options.length<=5&&!options.some(option=>option.group);
 const selected=options.find(option=>option.value===current);
 return <div data-choice-field={id} data-choice-value={current} className={cn("min-w-0",className)}>
  <Input {...nativeProps} data-choice-native id={undefined} ref={bindRef} type="text" name={name} form={form} value={current} onChange={()=>{}} disabled={disabled} required={required} aria-hidden="true" tabIndex={-1} className="sr-only" onInvalid={event=>{props.onInvalid?.(event);event.preventDefault();setInvalid(true);document.getElementById(id)?.focus();}}/>
  {radios?<RadioGroup id={id} value={current} options={options} change={choose} disabled={blocked} label={label} labelledBy={labelledBy} describedBy={describedBy} invalid={invalid||Boolean(props["aria-invalid"])} required={required}/>:<ChoiceInput id={id} value={current} displayValue={selected?.label??t("Выберите вариант")} icon={selected?.icon} disabled={blocked} inputProps={{"aria-required":required,"aria-label":label,"aria-labelledby":labelledBy,"aria-describedby":describedBy,"aria-invalid":invalid||props["aria-invalid"]}} options={options} title={t("Выберите: {field}",{field:label})} searchLabel={t("Поиск вариантов")} empty={t("Варианты не найдены")} choose={choose}/>}
  {invalid&&<p role="alert" className="mt-2 text-xs text-destructive">{t("Выберите вариант.")}</p>}
 </div>;
}
