import "./actions.css";
import {Children,Fragment,isValidElement,useLayoutEffect,useEffect,useRef,useState,type ReactNode,type MouseEvent} from "react";
import {useNavigate} from "react-router";
import {createPortal} from "react-dom";
import {AnimatedSurface} from "@/systems/animations/surfaces";
import {AppIcon} from "@/systems/icons/app-icon";
import {t,useLanguage} from "@/systems/i18n/locale";
import type {LabelSubject} from "@/systems/labels/context";
import {SubjectLabelEditor} from "@/systems/labels/functional";
import {ActionsContext,useActionMenu,type ContextAction,type Menu} from "./context";

const subjects="article,[data-action-subject],[data-drag-item],[data-note-id]";
type ReadActions=()=>ContextAction[];
const scopes=new WeakMap<Element,Map<HTMLElement,ReadActions>>();
// An explicit key lets alternate representations (e.g. SVG Gantt bars) share a declaration.
const aliases=new Map<string,Map<HTMLElement,ReadActions>>();
function subjectActions(target:Element){
 const dialog=target.closest("dialog");
 for(let node:Element|null=target;node;node=node.parentElement){
  const groups=scopes.get(node)??aliases.get(node.getAttribute("data-action-key")??"");
  const active=groups?[...groups].filter(([anchor])=>anchor.closest("dialog")===dialog):[];
  if(active.length)return {actions:active.flatMap(([,read])=>read()).map((action,index)=>({...action,id:`scope-${index}`})),anchor:(active.find(([anchor])=>anchor.getAttribute("data-action-menu-anchor")!=="contribution")??active[0])[0]};
  if(node===dialog)break;
 }
 return null;
}
function textOf(value:ReactNode):string{
 return Children.toArray(value).map(child=>typeof child==="string"||typeof child==="number"?String(child):isValidElement<{children?:ReactNode}>(child)?textOf(child.props.children):"").join("");
}
/** Declarative compatibility with feature action controls; no hidden DOM or proxy clicks. */
function declaredActions(children:ReactNode,navigate:(path:string)=>void):ContextAction[]{
 return Children.toArray(children).flatMap((child,index)=>{
  if(!isValidElement<{children?:ReactNode;onClick?:()=>void;disabled?:boolean;className?:string;"aria-label"?:string;to?:string}>(child))return [];
  if(child.type===Fragment)return declaredActions(child.props.children,navigate);
  const props=child.props;
  const link=Children.toArray(props.children).find(node=>isValidElement<{to?:string}>(node)&&node.props.to);
  const to=props.to??(isValidElement<{to?:string}>(link)?link.props.to:undefined);
  if(!props.onClick&&!to)return [];
  return [{id:String(index),label:props["aria-label"]??textOf(props.children),disabled:props.disabled,danger:props.className?.includes("text-destructive"),run:props.onClick??(()=>navigate(to!))}];
 });
}
export function ObjectActions({children,actions=[],label,subject,contribute=false}:{children?:ReactNode;actions?:ContextAction[];label?:string;subject?:LabelSubject;contribute?:boolean}){
 useLanguage();
 const [editing,setEditing]=useState(false);
 const navigate=useNavigate();const anchor=useRef<HTMLSpanElement>(null);
 const key=subject?`${subject.kind}:${subject.id}`:null;
 const all=[...actions,...declaredActions(children,navigate),...(subject?[{id:"labels",label:t("Метки"),icon:"tabler:tags",run:()=>setEditing(true)}]:[])].map((action,index)=>({...action,id:`${index}:${action.id}`}));
 const latest=useRef(all);useLayoutEffect(()=>{latest.current=all;});
 useLayoutEffect(()=>{
  const node=anchor.current!;const root=node.closest(subjects)??node;
  if(root!==node){root.setAttribute("data-action-menu-root","");node.setAttribute("data-action-menu-anchor",contribute?"contribution":"corner");}
  const group=scopes.get(root)??new Map<HTMLElement,ReadActions>();
  group.set(node,()=>latest.current);scopes.set(root,group);
  const shared=key?(aliases.get(key)??new Map<HTMLElement,ReadActions>()):null;
  if(key&&shared){shared.set(node,()=>latest.current);aliases.set(key,shared);}
  return()=>{group.delete(node);if(!group.size)root.removeAttribute("data-action-menu-root");shared?.delete(node);if(key&&shared?.size===0)aliases.delete(key);};
 },[key,contribute]);
 return <span ref={anchor} className={contribute?"contents":"inline-flex items-center"}>{!contribute&&<ActionMenuButton label={label} actions={all} readActions={()=>subjectActions(anchor.current!)?.actions??latest.current}/>}{editing&&subject&&<SubjectLabelEditor subject={subject} close={()=>setEditing(false)}/>}</span>;
}
export function ActionMenuProvider({children}:{children:ReactNode}){
 useLanguage();const [menu,setMenu]=useState<Menu|null>(null);const ref=useRef<HTMLDivElement>(null);
 const open=(actions:ContextAction[],x:number,y:number,returnTo:HTMLElement|SVGElement|null=null)=>{if(actions.length)setMenu({actions,x,y,returnTo});};
 useEffect(()=>{
  const show=(event:globalThis.MouseEvent|KeyboardEvent)=>{
   if(event.defaultPrevented||!(event.target instanceof Element)||event.target.closest('input,textarea,select,[contenteditable=true],[role=menu]'))return;
   if(event instanceof KeyboardEvent&&!(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10'))return;
   const found=subjectActions(event.target);if(!found?.actions.length)return;
   event.preventDefault();const bounds=event.target.getBoundingClientRect();
   const origin=(event.target instanceof HTMLElement||event.target instanceof SVGElement)&&event.target.tabIndex>=0?event.target:found.anchor.querySelector<HTMLButtonElement>('button');
   open(found.actions,event instanceof KeyboardEvent?bounds.left:event.clientX,event instanceof KeyboardEvent?bounds.bottom:event.clientY,origin);
  };
  document.addEventListener('contextmenu',show);document.addEventListener('keydown',show);
  return()=>{document.removeEventListener('contextmenu',show);document.removeEventListener('keydown',show);};
 },[]);
 useEffect(()=>{
  if(!menu||!ref.current)return;
  const node=ref.current;
  node.style.left=`${Math.max(8,Math.min(menu.x,innerWidth-node.offsetWidth-8))}px`;
  node.style.top=`${Math.max(8,Math.min(menu.y,innerHeight-node.offsetHeight-8))}px`;
  node.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true});
  const dismiss=()=>setMenu(null);
  const outside=(event:Event)=>{if(!node.contains(event.target as Node))dismiss();};
  window.addEventListener('resize',dismiss);document.addEventListener('pointerdown',outside);
  document.addEventListener('wheel',outside,{passive:true});document.addEventListener('touchmove',outside,{passive:true});
  return()=>{window.removeEventListener('resize',dismiss);document.removeEventListener('pointerdown',outside);document.removeEventListener('wheel',outside);document.removeEventListener('touchmove',outside);};
 },[menu]);
 function keys(event:React.KeyboardEvent){
  const buttons=[...ref.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
  if(event.key==='Escape'||event.key==='Tab'){event.preventDefault();menu?.returnTo?.focus({preventScroll:true});setMenu(null);}
  else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}
 }
 return <ActionsContext value={open}>{children}{menu&&createPortal(<div ref={ref} role="menu" aria-label={t("Действия")} onKeyDown={keys} className="fixed z-[100] max-h-[min(75svh,36rem)] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-border bg-card p-1 text-foreground shadow-xl" style={{left:menu.x,top:menu.y}}><AnimatedSurface>{menu.actions.map(action=><button key={action.id} type="button" role="menuitem" disabled={action.disabled} onClick={()=>{setMenu(null);menu.returnTo?.focus({preventScroll:true});action.run();}} className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none disabled:opacity-40 ${action.danger?'text-destructive':''}`}>{action.icon&&<AppIcon icon={action.icon}/>}<span>{action.label}</span></button>)}</AnimatedSurface></div>,menu.returnTo?.closest("dialog")??document.body)}</ActionsContext>;
}
export function ActionMenuButton({actions,label,readActions}:{actions:ContextAction[];label?:string;readActions?:()=>ContextAction[]}){
 useLanguage();const open=useActionMenu();
 return <button data-context-ignore type="button" aria-haspopup="menu" className="rounded-lg border border-border bg-card p-2 hover:bg-muted" aria-label={label??t("Действия")} onClick={(event:MouseEvent<HTMLButtonElement>)=>{const box=event.currentTarget.getBoundingClientRect();open(readActions?.()??actions,box.left,box.bottom,event.currentTarget);}}><AppIcon icon="tabler:dots"/></button>;
}
