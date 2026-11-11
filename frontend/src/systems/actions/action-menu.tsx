import {EditorForm} from "@/systems/forms/editor";
import {useEditorState,useEditorField} from "@/systems/forms/use-editor";
import {editorSchemas} from "@/systems/forms/schemas";
import "./actions.css";
import {Children,Fragment,isValidElement,useLayoutEffect,useEffect,useRef,useState,type ReactNode,type MouseEvent} from "react";
import {useNavigate} from "react-router";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import * as ContextMenu from "@radix-ui/react-context-menu";
import {Dialog} from "@/components/dialog";
import {AppIcon} from "@/systems/icons/app-icon";
import {t,useLanguage} from "@/systems/i18n/locale";
import type {LabelSubject} from "@/systems/labels/context";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {SubjectLabelEditor} from "@/systems/labels/functional";
import {ActionsContext,useActionMenu,type ContextAction} from "./context";

const subjects="article,[data-action-subject],[data-drag-item],[data-note-id]";
type ReadActions=()=>ContextAction[];
const scopes=new WeakMap<Element,Map<HTMLElement,ReadActions>>();
// An explicit key lets alternate representations (e.g. SVG Gantt bars) share a declaration.
const aliases=new Map<string,Map<HTMLElement,ReadActions>>();
function subjectActions(target:Element){
 const dialog=target.closest("[data-dialog-root]");
 for(let node:Element|null=target;node;node=node.parentElement){
  const groups=scopes.get(node)??aliases.get(node.getAttribute("data-action-key")??"");
  const active=groups?[...groups].filter(([anchor])=>anchor.closest("[data-dialog-root]")===dialog):[];
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
export function ObjectActions({children,actions=[],label,subject,contribute=false,alias,placement="corner"}:{children?:ReactNode;actions?:ContextAction[];label?:string;subject?:LabelSubject;contribute?:boolean;alias?:string;placement?:"corner"|"inline"}){
 useLanguage();
 const [editing,setEditing]=useState(false);
 const navigate=useNavigate();const anchor=useRef<HTMLSpanElement>(null);
 const key=subject?`${subject.kind}:${subject.id}`:alias??null;
 const all=[...actions,...declaredActions(children,navigate),...(subject?[{id:"labels",label:t("Метки"),icon:"tabler:tags",run:()=>setEditing(true)}]:[])].map((action,index)=>({...action,id:`${index}:${action.id}`}));
 const latest=useRef(all);useLayoutEffect(()=>{latest.current=all;});
 useLayoutEffect(()=>{
  const node=anchor.current!;const root=node.closest(subjects)??node;
  if(root!==node){if(!contribute&&placement==="corner")root.setAttribute("data-action-menu-root","");node.setAttribute("data-action-menu-anchor",contribute?"contribution":placement);}
  const group=scopes.get(root)??new Map<HTMLElement,ReadActions>();
  group.set(node,()=>latest.current);scopes.set(root,group);
  const shared=key?(aliases.get(key)??new Map<HTMLElement,ReadActions>()):null;
  if(key&&shared){shared.set(node,()=>latest.current);aliases.set(key,shared);}
  return()=>{group.delete(node);if(![...group.keys()].some(anchor=>anchor.getAttribute("data-action-menu-anchor")==="corner"))root.removeAttribute("data-action-menu-root");shared?.delete(node);if(key&&shared?.size===0)aliases.delete(key);};
 },[key,contribute,placement]);
 return <span ref={anchor} className={contribute?"contents":"inline-flex items-center"}>{!contribute&&<ActionMenuButton label={label} actions={all} readActions={()=>subjectActions(anchor.current!)?.actions??latest.current}/>}{editing&&subject&&<SubjectLabelEditor subject={subject} close={()=>setEditing(false)}/>}</span>;
}
type OpenMenu={actions:ContextAction[];x:number;y:number;returnTo:HTMLElement|SVGElement|null;context?:boolean};
const itemClass="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-40";
const contentClass="z-[100] max-h-[min(75svh,36rem)] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-card border border-line bg-surface p-1 text-foreground shadow-xl";
function MenuItems({actions,context,number,close}:{actions:ContextAction[];context:boolean;number:(action:ContextAction)=>void;close:()=>void}){
 const {Item,Sub,SubTrigger,SubContent,Portal}=context?ContextMenu:Dropdown;
 return actions.map(action=>action.children?<Sub key={action.id}><SubTrigger disabled={action.disabled} className={itemClass}>{action.icon&&<AppIcon icon={action.icon}/>}<span>{action.label}</span><AppIcon icon="tabler:chevron-right" className="ml-auto"/></SubTrigger><Portal><SubContent className={contentClass} collisionPadding={8}><MenuItems actions={action.children} context={context} number={number} close={close}/></SubContent></Portal></Sub>:<Item key={action.id} disabled={action.disabled} className={`${itemClass} ${action.danger?"text-destructive":""}`} onSelect={()=>{close();if(action.numberInput)number(action);else action.run();}}>{action.icon&&<AppIcon icon={action.icon}/>}<span>{action.label}</span></Item>);
}
function ContextPopup({menu,close,number}:{menu:OpenMenu;close:()=>void;number:(action:ContextAction)=>void}){
 const trigger=useRef<HTMLSpanElement>(null);
 useEffect(()=>{trigger.current?.dispatchEvent(new MouseEvent("contextmenu",{bubbles:true,clientX:menu.x,clientY:menu.y}));},[menu]);
 return <ContextMenu.Root onOpenChange={open=>{if(!open)close();}}><ContextMenu.Trigger ref={trigger} className="fixed pointer-events-none" style={{left:menu.x,top:menu.y}}/><ContextMenu.Portal><ContextMenu.Content className={contentClass} collisionPadding={8} onCloseAutoFocus={event=>{event.preventDefault();menu.returnTo?.focus({preventScroll:true});}}><MenuItems actions={menu.actions} context number={number} close={close}/></ContextMenu.Content></ContextMenu.Portal></ContextMenu.Root>;
}
export function ActionMenuProvider({children}:{children:ReactNode}){
 useLanguage();const [menu,setMenu]=useState<OpenMenu|null>(null);const [entry,setEntry]=useState<ContextAction|null>(null);
 const open=(actions:ContextAction[],x:number,y:number,returnTo:HTMLElement|SVGElement|null=null)=>{if(actions.length)setMenu({actions,x,y,returnTo});};
 useEffect(()=>{
  const show=(event:globalThis.MouseEvent|KeyboardEvent)=>{
   if(event.defaultPrevented||!(event.target instanceof Element)||event.target.closest('[role=menu]')||event.target.matches(':disabled'))return;
   const editable=event.target.closest('input,textarea,select,[contenteditable=true]');
   if(editable&&!(editable.matches('input[type=search]')&&editable.closest('[data-action-search]')))return;
   if(event instanceof KeyboardEvent&&!(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10'))return;
   const found=subjectActions(event.target);if(!found?.actions.length)return;
   event.preventDefault();const bounds=event.target.getBoundingClientRect();
   const origin=(event.target instanceof HTMLElement||event.target instanceof SVGElement)&&event.target.tabIndex>=0?event.target:found.anchor.querySelector<HTMLButtonElement>('button');
   setMenu({actions:found.actions,x:event instanceof KeyboardEvent?bounds.left:event.clientX,y:event instanceof KeyboardEvent?bounds.bottom:event.clientY,returnTo:origin,context:true});
  };
  document.addEventListener('contextmenu',show);document.addEventListener('keydown',show);
  return()=>{document.removeEventListener('contextmenu',show);document.removeEventListener('keydown',show);};
 },[]);
 const close=()=>setMenu(null);
 return <ActionsContext value={open}>{children}{menu&&(menu.context?<ContextPopup menu={menu} close={close} number={setEntry}/>:<Dropdown.Root open onOpenChange={open=>{if(!open)close();}}><Dropdown.Trigger className="fixed pointer-events-none" style={{left:menu.x,top:menu.y}}/><Dropdown.Portal><Dropdown.Content className={contentClass} collisionPadding={8} onCloseAutoFocus={event=>{event.preventDefault();menu.returnTo?.focus({preventScroll:true});}}><MenuItems actions={menu.actions} context={false} number={setEntry} close={close}/></Dropdown.Content></Dropdown.Portal></Dropdown.Root>)}{entry&&<Dialog title={entry.label} onClose={()=>setEntry(null)}><NumberEntry action={entry} submit={value=>{setEntry(null);entry.numberInput!.submit(value);}}/></Dialog>}</ActionsContext>;
}
function NumberEntry({action,submit}:{action:ContextAction;submit:(value:number)=>void}){
 useLanguage();const spec=action.numberInput!;const [editorValues,setEditorValues,formEditor]=useEditorState(()=>({value:String(spec.initial??spec.min)}),editorSchemas.record);
const [value,setValue]=useEditorField(editorValues,setEditorValues,"value");const number=Number(value);
 return <EditorForm saveControls={false} editor={formEditor} role="group" aria-label={action.label} className="space-y-3 p-3" onSubmit={event=>{event.preventDefault();if((value.trim()!==""&&Number.isFinite(number)&&(spec.step!==undefined||Number.isSafeInteger(number)))&&number>=spec.min&&(spec.max===undefined||number<=spec.max))submit(number);}}><label className="block space-y-2 text-sm"><span>{spec.label}</span><Input autoFocus required type="number" min={spec.min} max={spec.max} step={spec.step??1} value={value} onChange={event=>setValue(event.target.value)}/></label><Button className="w-full" type="submit" disabled={!(value.trim()!==""&&Number.isFinite(number)&&(spec.step!==undefined||Number.isSafeInteger(number)))||number<spec.min||(spec.max!==undefined&&number>spec.max)}>{t("Выбрать")}</Button></EditorForm>;
}

export function ActionMenuButton({actions,label,readActions}:{actions:ContextAction[];label?:string;readActions?:()=>ContextAction[]}){
 useLanguage();const open=useActionMenu();
 return <button data-context-ignore type="button" aria-haspopup="menu" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-line bg-surface p-2 hover:bg-muted [[data-action-search]_&]:min-h-11 [[data-action-search]_&]:min-w-11" aria-label={label??t("Действия")} onClick={(event:MouseEvent<HTMLButtonElement>)=>{const box=event.currentTarget.getBoundingClientRect();open(readActions?.()??actions,box.left,box.bottom,event.currentTarget);}}><AppIcon icon="tabler:dots"/></button>;
}
