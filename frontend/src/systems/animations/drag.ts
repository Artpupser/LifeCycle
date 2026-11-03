import {animate} from "motion";
import {motionAllowed} from "./policy";
const positions=new Map<string,DOMRect>();const identities=new WeakMap<Element,string>();let serial=0;
function key(element:Element){const explicit=element.getAttribute("data-drag-key");if(explicit)return explicit;let id=identities.get(element);if(!id){id=`drag-${++serial}`;identities.set(element,id);}return id;}
function items(root:Element){const nodes=new Set<Element>(root.querySelectorAll("[data-drag-item]"));root.querySelectorAll("[draggable=true]").forEach(handle=>nodes.add(handle.closest("li,article,[data-nav-path],[data-drag-item]")??handle));return nodes;}
export function captureDragLayout(root:Element){positions.clear();items(root).forEach(element=>positions.set(key(element),element.getBoundingClientRect()));}
export function animateDragLayout(root:Element){if(!motionAllowed()){positions.clear();return;}let moved=false;items(root).forEach(element=>{const before=positions.get(key(element)),after=element.getBoundingClientRect();if(before){const x=before.left-after.left,y=before.top-after.top;if(Math.abs(x)>.5||Math.abs(y)>.5){moved=true;void animate(element,{x:[x,0],y:[y,0]},{type:"spring",visualDuration:.25,bounce:.08});}}});if(moved)positions.clear();}
export function dragFeedback(element:Element,active:boolean){void animate(element,{opacity:active?.55:1,scale:active?.985:1},{duration:motionAllowed()?.12:0});}
export function installDragAnimations(root:HTMLElement){
 let dragged:Element|null=null;let frame=0;let expiry:ReturnType<typeof setTimeout>|undefined;
 const start=(event:Event)=>{if(!(event.target instanceof Element))return;const handle=event.target.closest("[draggable=true]");if(!handle)return;dragged=handle.closest("li,article,[data-nav-path],[data-drag-item]")??handle;clearTimeout(expiry);captureDragLayout(root);dragFeedback(dragged,true);};
 const end=()=>{if(!dragged&&!positions.size)return;if(dragged)dragFeedback(dragged,false);dragged=null;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>animateDragLayout(root));clearTimeout(expiry);expiry=setTimeout(()=>positions.clear(),2000);};
 const touch=(event:PointerEvent)=>{if(event.pointerType!=="mouse")start(event);};
 const keys=(event:KeyboardEvent)=>{if(["ArrowUp","ArrowDown"].includes(event.key)&&event.target instanceof Element&&event.target.closest("[draggable=true]")){start(event);end();}};
 const observer=new MutationObserver(()=>{if(positions.size&&!dragged){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>animateDragLayout(root));}});
 root.addEventListener("dragstart",start);root.addEventListener("dragend",end);root.addEventListener("drop",end,true);root.addEventListener("pointerdown",touch);root.addEventListener("pointerup",end);root.addEventListener("pointercancel",end);root.addEventListener("keydown",keys);observer.observe(root,{childList:true,subtree:true});return()=>{observer.disconnect();cancelAnimationFrame(frame);clearTimeout(expiry);positions.clear();root.removeEventListener("dragstart",start);root.removeEventListener("dragend",end);root.removeEventListener("drop",end,true);root.removeEventListener("pointerdown",touch);root.removeEventListener("pointerup",end);root.removeEventListener("pointercancel",end);root.removeEventListener("keydown",keys);};
}
