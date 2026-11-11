import {animate} from "motion";
import {motionAllowed} from "./policy";
const positions=new Map<string,DOMRect>();const identities=new WeakMap<Element,string>();let serial=0;
function key(element:Element){const explicit=element.getAttribute("data-drag-key");if(explicit)return explicit;let id=identities.get(element);if(!id){id=`drag-${++serial}`;identities.set(element,id);}return id;}
function items(root:Element){const nodes=new Set<Element>(root.querySelectorAll("[data-drag-item]"));return nodes;}
export function captureDragLayout(root:Element){positions.clear();items(root).forEach(element=>positions.set(key(element),element.getBoundingClientRect()));}
export function animateDragLayout(root:Element){if(!motionAllowed()){positions.clear();return;}let moved=false;items(root).forEach(element=>{const before=positions.get(key(element)),after=element.getBoundingClientRect();if(before){const x=before.left-after.left,y=before.top-after.top;if(Math.abs(x)>.5||Math.abs(y)>.5){moved=true;void animate(element,{x:[x,0],y:[y,0]},{type:"spring",visualDuration:.25,bounce:.08});}}});if(moved)positions.clear();}
