import {useLayoutEffect, useRef, useState, type ReactNode} from "react";
import {createPortal} from "react-dom";
import type {Selection} from "./state";
import {scrollElement} from "@/systems/animations/policy";
import "./selection.css";

type Point = {x:number;y:number};
type Rectangle = {left:number;top:number;width:number;height:number};
const interactive = 'a,button,input,textarea,select,label,summary,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="slider"],[role="menu"],[data-selection-ignore],svg,[draggable="true"]';

/** Mouse marquee; a stationary touch hold arms selection without taking ordinary scrolling. */
export function SelectionGesture<T>({selection, items, itemKey, scope="", disabled=false, children, className}: {
  selection:Selection<T>;items:T[];itemKey:(item:T)=>string;scope?:string;disabled?:boolean;children:ReactNode;className?:string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const current = useRef({selection, items, itemKey, disabled});
  useLayoutEffect(()=>{current.current={selection,items,itemKey,disabled};});
  const [rectangle,setRectangle] = useState<Rectangle|null>(null);
  useLayoutEffect(()=>{
    const element=root.current;
    if(!element||disabled)return;
    let gesture: {origin:Point;point:Point;base:T[];before:T[];active:boolean;touch:boolean;pointer:number|null;scrollX:number;scrollY:number;scroll:HTMLElement;original:string}|null=null;
    let hold:ReturnType<typeof setTimeout>|undefined;
    let frame=0;let suppressUntil=0;
    const eligible=(target:EventTarget|null)=>{const dialog=document.querySelector('[role="dialog"],dialog[open]');return target instanceof Element && target.closest("[data-selection-surface]")===element && !target.closest(interactive) && (!dialog||dialog.contains(element));};
    const scroller=(target:Element)=>{
      let node:HTMLElement|null=target instanceof HTMLElement?target:target.parentElement;
      while(node&&node!==document.body){const style=getComputedStyle(node);if(/auto|scroll/.test(style.overflowY+style.overflowX)&&(node.scrollHeight>node.clientHeight||node.scrollWidth>node.clientWidth))return node;node=node.parentElement;}
      return document.scrollingElement as HTMLElement;
    };
    const scrollPosition=(node:HTMLElement)=>({x:node.scrollLeft,y:node.scrollTop});
    const update=()=>{
      if(!gesture?.active)return;
      const {origin,point,scroll,scrollX,scrollY}=gesture;
      const position=scrollPosition(scroll);
      const x=origin.x-position.x+scrollX,y=origin.y-position.y+scrollY;
      const bounds={left:Math.min(x,point.x),top:Math.min(y,point.y),width:Math.max(1,Math.abs(x-point.x)),height:Math.max(1,Math.abs(y-point.y))};
      const values=new Map(current.current.items.map(item=>[current.current.itemKey(item),item]));
      const hits:T[]=[];
      element.querySelectorAll<HTMLElement>('[data-selection-key]').forEach(node=>{
        if(node.closest('[data-selection-surface]')!==element)return;
        const rect=node.getBoundingClientRect();
        const clip=node.parentElement?.closest('.workspace-scroll');const viewport=clip?.getBoundingClientRect();
        const visible=clip===scroll||!viewport||rect.bottom>viewport.top&&rect.top<viewport.bottom&&rect.right>viewport.left&&rect.left<viewport.right;
        const value=values.get(node.dataset.selectionKey!);
        if(value!==undefined&&visible&&rect.width&&rect.height&&rect.left<bounds.left+bounds.width&&rect.right>bounds.left&&rect.top<bounds.top+bounds.height&&rect.bottom>bounds.top)hits.push(value);
      });
      const state=current.current;
      const chosen=[...new Map([...gesture.base,...hits].filter(state.selection.canSelect).map(item=>[state.itemKey(item),item])).values()].slice(0,state.selection.limit);
      if(chosen.length!==state.selection.count||chosen.some((item,index)=>state.itemKey(item)!==state.itemKey(state.selection.selected[index])))state.selection.replace(chosen);
      setRectangle({left:Math.max(0,bounds.left),top:Math.max(0,bounds.top),width:Math.max(0,Math.min(innerWidth,bounds.left+bounds.width)-Math.max(0,bounds.left)),height:Math.max(0,Math.min(innerHeight,bounds.top+bounds.height)-Math.max(0,bounds.top))});
    };
    const stop=(cancel=false)=>{
      clearTimeout(hold);cancelAnimationFrame(frame);
      if(gesture?.active){
        if(cancel)current.current.selection.replace(gesture.before);
        gesture.scroll.style.userSelect=gesture.original;
        suppressUntil=performance.now()+500;
      }
      gesture=null;setRectangle(null);
    };
    const animate=()=>{
      if(!gesture?.active)return;
      const node=gesture.scroll,box=node===document.scrollingElement?{left:0,top:0,right:innerWidth,bottom:innerHeight}:node.getBoundingClientRect();
      const delta=(value:number,min:number,max:number)=>value<min+36?-Math.min(14,(min+36-value)/3):value>max-36?Math.min(14,(value-max+36)/3):0;
      const dx=delta(gesture.point.x,box.left,box.right),dy=delta(gesture.point.y,box.top,box.bottom);
      const before=scrollPosition(node);scrollElement(node,{left:dx,top:dy,relative:true,immediate:true});
      if(before.x!==node.scrollLeft||before.y!==node.scrollTop)update();
      frame=requestAnimationFrame(animate);
    };
    const activate=()=>{
      if(!gesture||current.current.disabled)return;
      gesture.active=true;gesture.scroll.style.userSelect="none";window.getSelection()?.removeAllRanges();
      update();frame=requestAnimationFrame(animate);
    };
    const begin=(target:EventTarget|null,point:Point,touch:boolean,pointer:number|null,add:boolean)=>{
      if(current.current.disabled||current.current.selection.loading||!eligible(target))return;
      const scroll=scroller(target as Element),position=scrollPosition(scroll);
      gesture={origin:point,point,base:add?[...current.current.selection.selected]:[],before:[...current.current.selection.selected],active:false,touch,pointer,scroll,scrollX:position.x,scrollY:position.y,original:scroll.style.userSelect};
      if(touch)hold=setTimeout(activate,400);
    };
    const down=(event:PointerEvent)=>{suppressUntil=0;if(event.pointerType==="touch")return;if(event.button!==0||event.altKey||!event.isPrimary)return;begin(event.target,{x:event.clientX,y:event.clientY},false,event.pointerId,event.ctrlKey||event.metaKey||event.shiftKey);};
    const move=(event:PointerEvent)=>{
      if(!gesture||gesture.touch||event.pointerId!==gesture.pointer)return;
      if(!(event.buttons&1)){stop();return;}
      gesture.point={x:event.clientX,y:event.clientY};
      if(!gesture.active&&Math.hypot(gesture.point.x-gesture.origin.x,gesture.point.y-gesture.origin.y)>6)activate();
      if(gesture?.active){event.preventDefault();update();}
    };
    const touchstart=(event:TouchEvent)=>{if(event.touches.length!==1){stop(true);return;}const touch=event.touches[0];begin(event.target,{x:touch.clientX,y:touch.clientY},true,null,true);};
    const touchmove=(event:TouchEvent)=>{
      if(!gesture?.touch)return;
      if(event.touches.length!==1){stop(true);return;}
      const touch=event.touches[0];gesture.point={x:touch.clientX,y:touch.clientY};
      if(!gesture.active){if(Math.hypot(touch.clientX-gesture.origin.x,touch.clientY-gesture.origin.y)>8)stop();return;}
      event.preventDefault();update();
    };
    const up=()=>stop();const cancel=()=>stop(true);
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"&&gesture){event.preventDefault();stop(true);}};
    const suppress=(event:Event)=>{if(gesture?.active||event.type==="contextmenu"&&gesture?.touch||performance.now()<suppressUntil){event.preventDefault();event.stopPropagation();}};
    const scroll=()=>{if(gesture?.active)update();};
    const visibility=()=>{if(document.hidden)cancel();};
    element.addEventListener("pointerdown",down);document.addEventListener("pointermove",move,{passive:false});document.addEventListener("pointerup",up);document.addEventListener("pointercancel",cancel);
    element.addEventListener("touchstart",touchstart,{passive:true});document.addEventListener("touchmove",touchmove,{passive:false});document.addEventListener("touchend",up);document.addEventListener("touchcancel",cancel);
    element.addEventListener("click",suppress,true);element.addEventListener("contextmenu",suppress,true);document.addEventListener("keydown",escape);document.addEventListener("scroll",scroll,true);window.addEventListener("blur",cancel);
    document.addEventListener("visibilitychange",visibility);
    return()=>{stop();element.removeEventListener("pointerdown",down);document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",up);document.removeEventListener("pointercancel",cancel);element.removeEventListener("touchstart",touchstart);document.removeEventListener("touchmove",touchmove);document.removeEventListener("touchend",up);document.removeEventListener("touchcancel",cancel);element.removeEventListener("click",suppress,true);element.removeEventListener("contextmenu",suppress,true);document.removeEventListener("keydown",escape);document.removeEventListener("scroll",scroll,true);window.removeEventListener("blur",cancel);document.removeEventListener("visibilitychange",visibility);};
  },[scope,disabled]);
  return <div ref={root} data-selection-surface className={className}>{children}{rectangle&&createPortal(<div data-selection-marquee aria-hidden="true" style={rectangle}/>,document.body)}</div>;
}
