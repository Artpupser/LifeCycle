import {Button} from "./button";
import {t,useLanguage} from "@/systems/i18n/locale";
import {useVirtualizer} from "@tanstack/react-virtual";
import {useEffect,useLayoutEffect,useImperativeHandle,useRef,useState,type Ref,type CSSProperties,type ReactNode} from "react";
export type VirtualGridHandle={focus:(index:number)=>void};
/** One measured virtual surface for long catalogs. Entity identities remain with domain owners. */
export function VirtualGrid<T>({items,itemKey,render,minItemWidth=240,estimateSize=160,label,className="h-[60svh]",scope="",ref,style,pageSize,endMessage}:{items:T[];itemKey:(item:T)=>string;render:(item:T,index:number)=>ReactNode;minItemWidth?:number;estimateSize?:number;label?:string;className?:string;scope?:string;ref?:Ref<VirtualGridHandle>;style?:CSSProperties;pageSize?:number;endMessage?:string}){
 useLanguage();const [page,setPage]=useState({scope,count:pageSize??items.length});if(page.scope!==scope)setPage({scope,count:pageSize??items.length});const limit=pageSize?Math.max(pageSize,page.scope===scope?page.count:pageSize):items.length;const visible=items.slice(0,limit);
 const element=useRef<HTMLDivElement>(null);const [columns,setColumns]=useState(1);const [pending,setPending]=useState<number|null>(null);
 useEffect(()=>{const node=element.current;if(!node)return;const measure=()=>setColumns(Math.max(1,Math.floor(node.clientWidth/minItemWidth)));measure();const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();},[minItemWidth]);
 // TanStack Virtual owns mutable measurements; exclude this call from React Compiler memoization.
 // eslint-disable-next-line react-hooks/incompatible-library
 const virtual=useVirtualizer({count:Math.ceil(visible.length/columns),getScrollElement:()=>element.current,estimateSize:()=>estimateSize,overscan:3,getItemKey:index=>itemKey(visible[index*columns])});
 useEffect(()=>{virtual.scrollToOffset(0);},[scope,columns,virtual]);
 const rows=virtual.getVirtualItems();
 useImperativeHandle(ref,()=>({focus:index=>{setPending(index);virtual.scrollToIndex(Math.floor(index/columns),{align:"auto"});}}),[virtual,columns]);
 useLayoutEffect(()=>{if(pending===null||!items[pending])return;const key=itemKey(items[pending]);const item=[...element.current!.querySelectorAll<HTMLElement>("[data-virtual-key]")].find(node=>node.dataset.virtualKey===key);const control=item?.querySelector<HTMLElement>("button:not(:disabled),a,input");if(control){control.focus({preventScroll:true});setPending(null);}},[pending,items,itemKey,rows]);
 return <><div ref={element} aria-label={label} style={style} className={`workspace-scroll min-w-0 overflow-y-auto ${className}`}><div className="relative w-full" style={{height:virtual.getTotalSize()}}>{rows.map(row=><div key={row.key} data-index={row.index} ref={virtual.measureElement} className="absolute left-0 top-0 grid w-full gap-3 pb-3" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`,transform:`translateY(${row.start}px)`}}>{visible.slice(row.index*columns,(row.index+1)*columns).map((item,index)=><div key={itemKey(item)} data-virtual-key={itemKey(item)} className="min-w-0">{render(item,row.index*columns+index)}</div>)}</div>)}</div></div>{pageSize&&<div className="flex min-h-11 items-center justify-center pt-3">{limit<items.length?<Button variant="outline" onClick={()=>setPage({scope,count:limit+pageSize})}>{t("Показать ещё")}</Button>:endMessage&&<p role="status" className="text-center text-sm text-fg-muted">{endMessage}</p>}</div>}</>;
}
