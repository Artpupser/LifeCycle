import {dragAccessibility} from "./drag-accessibility";
import {useLanguage} from "@/systems/i18n/locale";
import {Accessibility,Feedback} from "@dnd-kit/dom";
import {DragDropProvider,KeyboardSensor,PointerSensor,useDraggable,useDroppable} from "@dnd-kit/react";
import {Slot} from "@radix-ui/react-slot";
import {useCallback,useLayoutEffect,useRef,type ReactNode,type ReactElement} from "react";

import {captureDragLayout,animateDragLayout} from "./drag";
export type DragData={kind:string;id:string;column?:string;x?:number;y?:number};
export function DragScope({children,drop}:{children:ReactNode;drop:(source:DragData,target:DragData,delta:{x:number;y:number})=>void}){
 useLanguage();
 return <DragDropProvider plugins={defaults=>[...defaults.filter(plugin=>plugin!==Accessibility&&plugin!==Feedback),dragAccessibility(),Feedback.configure({dropAnimation:null,keyboardTransition:null})]} onDragStart={()=>captureDragLayout(document.body)} onDragEnd={event=>{
  const {source,target}=event.operation;
  if(!event.canceled&&source&&target)drop(source.data as DragData,target.data as DragData,event.operation.transform);
  requestAnimationFrame(()=>animateDragLayout(document.body));
 }}>{children}</DragDropProvider>;
}
type DragItemProps={data:DragData;children:ReactElement;disabled?:boolean;accept?:string[];priority?:number};
export function DragItem(props:DragItemProps){
 // A disabled drag source must not mark its interactive descendants aria-disabled.
 return props.disabled?props.children:<ActiveDragItem {...props}/>;
}
function ActiveDragItem({data,children,accept,priority=10}:DragItemProps){
 const disabled=false;
 const key=`${data.kind}:${data.id}`;
 const {ref:sourceRef,handleRef,isDragging}=useDraggable({id:key,type:data.kind,data,disabled});
 const {ref:targetRef,isDropTarget}=useDroppable({id:key,type:data.kind,data,disabled,collisionPriority:priority,accept:source=>source.id!==key&&(accept??[data.kind]).includes(String(source.type))});
 const element=useRef<HTMLElement|null>(null);
 const ref=useCallback((node:HTMLElement|null)=>{element.current=node;sourceRef(node);targetRef(node);handleRef(node?.querySelector("[data-drag-handle]")??node);},[sourceRef,targetRef,handleRef]);
 useLayoutEffect(()=>{const node=element.current;handleRef(node?.querySelector("[data-drag-handle]")??node);},[disabled,handleRef]);
 return <Slot ref={ref} data-drag-item={data.kind} data-drag-key={key} data-drag-enabled={!disabled||undefined} data-dragging={isDragging||undefined} data-drop-target={isDropTarget||undefined}>{children}</Slot>;
}
/** Continuous SVG/canvas edits use the same sensors while the domain renders its own preview. */
export function GestureScope<T extends Record<string,unknown>>({children,start,move,end}:{children:ReactNode;start?:(data:T)=>void;move?:(data:T,delta:{x:number;y:number})=>void;end:(data:T,delta:{x:number;y:number},canceled:boolean)=>void}){
 useLanguage();const active=useRef<T|null>(null);
 return <DragDropProvider<T> sensors={[PointerSensor,KeyboardSensor.configure({keyboardCodes:{start:["Space"],end:["Space","Tab"],cancel:["Escape"],up:["ArrowUp"],down:["ArrowDown"],left:["ArrowLeft"],right:["ArrowRight"]}})]} plugins={defaults=>[...defaults.filter(plugin=>plugin!==Feedback&&plugin!==Accessibility),dragAccessibility(),Feedback.configure({feedback:"none",dropAnimation:null,keyboardTransition:null})]} onDragStart={event=>{if(event.operation.source){active.current={...event.operation.source.data};start?.(active.current);}}} onDragMove={event=>{if(active.current)move?.(active.current,event.operation.transform);}} onDragEnd={event=>{const data=active.current;active.current=null;if(data)end(data,event.operation.transform,event.canceled);}}>{children}</DragDropProvider>;
}
export function GestureItem<T extends Record<string,unknown>>(props:{id:string;data:T;children:ReactElement;disabled?:boolean}){return props.disabled?props.children:<ActiveGestureItem {...props}/>;}
function ActiveGestureItem<T extends Record<string,unknown>>({id,data,children}:{id:string;data:T;children:ReactElement}){
 const disabled=false;
 const {ref,isDragging}=useDraggable({id,data,disabled});
 return <Slot ref={ref} data-dragging={isDragging||undefined}>{children}</Slot>;
}
export function DropTarget({data,children,disabled=false,accept}:{data:DragData;children:ReactElement;disabled?:boolean;accept:string[]}){
 const {ref,isDropTarget}=useDroppable({id:`drop:${data.kind}:${data.id}`,type:data.kind,data,disabled,accept,collisionPriority:0});
 return <Slot ref={ref} data-drop-target={isDropTarget||undefined}>{children}</Slot>;
}
