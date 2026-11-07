import {Dialog} from "@/components/dialog";
import {useAuth} from "@/features/auth/auth-context";
import {useEffect,useId,useMemo,useRef,useState,type DragEvent} from "react";
import {Link,useNavigate,useSearchParams} from "react-router";
import {FilterSearch} from "@/components/filter-search";
import {Markdown} from "@/components/markdown";
import {ErrorState,LoadingState} from "@/components/resource-state";
import {Button} from "@/components/ui/button";
import {useResource} from "@/hooks/use-resource";
import {errorMessage} from "@/lib/api";
import {dateLabel} from "@/lib/dates";
import {matchesFilter,parseFilterQuery,categoryFilter,tagFilter} from "@/lib/filter-query";
import {notify} from "@/lib/feedback";
import {ObjectActions} from "@/systems/actions/action-menu";
import type {ContextAction} from "@/systems/actions/context";
import {scrollElement} from "@/systems/animations/policy";
import {AppIcon} from "@/systems/icons/app-icon";
import {GenderBadge} from "@/systems/icons/gender-badge";
import {genderIcon} from "@/systems/icons/gender";
import {ZodiacBadge} from "@/systems/icons/zodiac-badge";
import {numberLabel,t,useLanguage} from "@/systems/i18n/locale";
import {SubjectLabels} from "@/systems/labels/functional";
import {TagChip} from "@/systems/labels/inputs";
import {ContactActions} from "@/systems/links/contact-actions";
import {contactLinkActions} from "@/systems/links/contact-menu";
import {OperatorBadge} from "@/systems/operators/operator-badge";
import {removeContact} from "./contact-actions";
import {ContactEditor} from "./contact-editor";
import {ContactRelationships,RelationshipEditor,type RelationshipDraft} from "./relationship-editor";
import {relationshipSorts,type RelationshipSort,useRelationshipPeople,kinshipProjection,isParentKind,relationshipName,removeRelationship,type ContactRelationship} from "./relationships";
import {contactTreeEdgePath,layoutContactTree,treeNodeSize} from "./tree-layout";
import {contactName,type Contact} from "./types";

const EMPTY_CONTACTS:Contact[]=[];
const EMPTY_RELATIONSHIPS:ContactRelationship[]=[];
const DRAG_TYPE="application/x-lifecycle-tree-person";

export function TreePage(){
 useLanguage();const {user}=useAuth();const navigate=useNavigate();
 const source=useRelationshipPeople(),relations=useResource<ContactRelationship[]>("/contacts/relationships");
 const [params,setParams]=useSearchParams();const [editing,setEditing]=useState(false),[relationDraft,setRelationDraft]=useState<RelationshipDraft|null>(null);
 const [editor,setEditor]=useState<Contact|"new"|null>(null),[query,setQuery]=useState(""),[zoom,setZoom]=useState(1),[highlight,setHighlight]=useState(true);
 // Manual positions are view state only. People and relationships always come from their owners.
 const [fullScreen,setFullScreen]=useState(false),[sort,setSort]=useState<RelationshipSort>("name");
 const [positions,setPositions]=useState<Record<string,{x:number;y:number}>>({});
 const [dragging,setDragging]=useState<string|null>(null);const drag=useRef<{id:string;dx:number;dy:number}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);const viewport=useRef<HTMLDivElement>(null);const arrow=useId();
 const contacts=source.resource.status==="ready"?source.resource.data:EMPTY_CONTACTS;
 const relationships=relations.resource.status==="ready"?relations.resource.data:EMPTY_RELATIONSHIPS;
 const byId=new Map(contacts.map(contact=>[contact.id,contact]));
 const requestedId=params.get("contact");
 const selectedId=requestedId&&byId.has(requestedId)?requestedId:contacts[0]?.id??"";const selected=byId.get(selectedId);
 const selectedIsProfile=selected?.id===user?.id;
 const projection=useMemo(()=>kinshipProjection(selectedId,contacts,relationships),[selectedId,contacts,relationships]);
 const automatic=useMemo(()=>layoutContactTree(contacts,relationships,sort,projection),[contacts,relationships,sort,projection]);
 const layout=useMemo(()=>{
  const nodes=automatic.nodes.map(node=>({...node,...positions[node.id]}));
  return {...automatic,nodes,width:Math.max(automatic.width,...nodes.map(node=>node.x+treeNodeSize.width+32)),height:Math.max(automatic.height,...nodes.map(node=>node.y+treeNodeSize.height+32))};
 },[automatic,positions]);
 const selectedNode=layout.nodes.find(node=>node.id===selectedId);
 const selectedX=selectedNode?.x,selectedY=selectedNode?.y;
 const branch=new Set([selectedId,...projection.ancestors,...projection.descendants]);
 const filters=parseFilterQuery(query,[categoryFilter,tagFilter]);
 const matches=contacts.filter(contact=>matchesFilter(filters,[contactName(contact.data),...contact.data.phones,contact.data.profession,contact.data.activity,...contact.data.tags,...contact.data.categories].join(" "),{category:contact.data.categories,tag:contact.data.tags}));
 const matchingIds=new Set(matches.map(contact=>contact.id));
 const familyCount=relationships.filter(edge=>edge.category==="family").length;
 const nodeById=new Map(layout.nodes.map(node=>[node.id,node]));
 useEffect(()=>{
  const element=viewport.current;if(selectedX===undefined||selectedY===undefined||!element)return;
  const center=()=>scrollElement(element,{left:(selectedX+treeNodeSize.width/2)*zoom-element.clientWidth/2,top:(selectedY+treeNodeSize.height/2)*zoom-element.clientHeight/2,immediate:true});
  center();const observer=new ResizeObserver(center);observer.observe(element);
  return()=>observer.disconnect();
 },[selectedX,selectedY,zoom,fullScreen,source.resource.status,relations.resource.status]);
 function focusSelected(){
  const element=viewport.current;if(!selectedNode||!element)return;
  scrollElement(element,{left:(selectedNode.x+treeNodeSize.width/2)*zoom-element.clientWidth/2,top:(selectedNode.y+treeNodeSize.height/2)*zoom-element.clientHeight/2});
 }
 function select(id:string){setParams(previous=>{const next=new URLSearchParams(previous);next.set("contact",id);return next;},{replace:true});}
 function refresh(){source.retry();relations.retry();}
 async function mutate(operation:()=>Promise<void>){if(busy)return;setBusy(true);setError(null);try{await operation();}catch(failure){setError(errorMessage(failure));}finally{setBusy(false);}}
 function remove(person:Contact){return mutate(async()=>{if(person.id!==user?.id&&await removeContact(person)){if(person.id===selectedId)setParams({},{replace:true});refresh();}});}
 function move(id:string,x:number,y:number){setPositions(current=>({...current,[id]:{x:Math.max(16,x),y:Math.max(48,y)}}));}
 function startDrag(event:DragEvent<HTMLElement>,id:string){
  if(!editing||busy){event.preventDefault();return;}
  const box=event.currentTarget.getBoundingClientRect();drag.current={id,dx:(event.clientX-box.left)/zoom,dy:(event.clientY-box.top)/zoom};
  event.dataTransfer.setData(DRAG_TYPE,id);event.dataTransfer.effectAllowed="move";setDragging(id);
 }
 function drop(event:DragEvent<HTMLElement>,target?:string){
  const current=drag.current;if(!editing||busy||!current||event.dataTransfer.getData(DRAG_TYPE)!==current.id)return;
  event.preventDefault();event.stopPropagation();
  if(target&&target!==current.id)setRelationDraft({initialSourceId:current.id,initialTargetId:target});
  else if(!target||target===current.id){const box=viewport.current!.querySelector("[data-tree-stage]")!.getBoundingClientRect();move(current.id,(event.clientX-box.left)/zoom-current.dx,(event.clientY-box.top)/zoom-current.dy);}
  drag.current=null;setDragging(null);
 }
 function personActions(person:Contact):ContextAction[]{
  const node=nodeById.get(person.id);const own=person.id===user?.id;
  const actions:ContextAction[]=[{id:"select",label:t("Показать выбранного человека"),icon:"tabler:target",run:()=>select(person.id)},
   {id:"branch",label:t("Подсветить поколения"),icon:"tabler:tree",run:()=>{select(person.id);setHighlight(true);}},
   {id:"open",label:t(own?"Открыть профиль":"Открыть контакт"),icon:"tabler:user",run:()=>navigate(own?"/profile":`/contacts?contact=${encodeURIComponent(person.id)}`)}];
  if(!editing)return [...actions,{id:"edit-mode",label:t("Редактировать древо"),icon:"tabler:pencil",run:()=>setEditing(true)}];
  if(!own)actions.push({id:"edit",label:t("Изменить контакт"),icon:"tabler:pencil",disabled:busy,run:()=>setEditor(person)});
  actions.push({id:"link",label:t("Добавить связь"),icon:"tabler:heart",disabled:busy||contacts.length<2,run:()=>setRelationDraft({initialSourceId:person.id})});
  if(person.id!==selectedId&&selected)actions.push({id:"link-selected",label:t("Связать с выбранным человеком"),disabled:busy,run:()=>setRelationDraft({initialSourceId:selectedId,initialTargetId:person.id})});
  if(node)actions.push({id:"move",label:t("Переместить карточку"),icon:"tabler:arrows-move",children:[[-24,0,"Влево"],[24,0,"Вправо"],[0,-24,"Вверх"],[0,24,"Вниз"]].map(([x,y,label])=>({id:String(label),label:t(String(label)),run:()=>move(person.id,node.x+Number(x),node.y+Number(y))})),run:()=>{}});
  if(!own)actions.push({id:"remove",label:t("Удалить контакт"),icon:"tabler:trash",danger:true,disabled:busy,run:()=>void remove(person)});
  return [...actions,...contactLinkActions(person.data.phones)];
 }
 function edgeActions(edge:ContactRelationship):ContextAction[]{return editing?[
  {id:"edit",label:t("Изменить связь"),icon:"tabler:pencil",disabled:busy,run:()=>setRelationDraft({record:edge})},
  {id:"remove",label:t("Удалить связь"),icon:"tabler:trash",danger:true,disabled:busy,run:()=>void mutate(async()=>{if(await removeRelationship(edge))relations.retry();})},
 ]:[{id:"edit-mode",label:t("Редактировать древо"),icon:"tabler:pencil",run:()=>setEditing(true)}];}
 const loading=source.resource.status==="loading"||relations.resource.status==="loading";
 const failure=source.resource.status==="error"?source.resource.message:relations.resource.status==="error"?relations.resource.message:null;
 const content=<div className="min-w-0 space-y-4">
  {!fullScreen&&<header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 flex items-center gap-2 text-sm text-primary"><AppIcon icon="tabler:tree"/>{t("Люди и связи")}</p><h1 className="text-3xl font-semibold">{t("Древо")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("Контактная книжка в связях: поколения семьи и другие отношения между людьми.")}</p></div><Button variant="outline" asChild><Link to="/contacts">{t("Контактная книжка")}</Link></Button></header>}
  <div className="flex flex-wrap items-center justify-between gap-3"><div role="group" aria-label={t("Режим древа")} className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-border bg-card p-1"><Button size="sm" className="flex-1" variant={editing?"ghost":"default"} aria-pressed={!editing} onClick={()=>setEditing(false)}>{t("Просмотр")}</Button><Button size="sm" className="flex-1" variant={editing?"default":"ghost"} aria-pressed={editing} onClick={()=>setEditing(true)}>{t("Редактирование")}</Button></div><Button size="sm" variant="outline" aria-pressed={highlight} onClick={()=>setHighlight(value=>!value)}><AppIcon icon="tabler:tree"/>{t("Поколения до и после")}</Button>{editing&&<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={loading||!!failure||busy} onClick={()=>setEditor("new")}>{t("Новый контакт")}</Button><Button disabled={contacts.length<2||!!failure||busy} onClick={()=>setRelationDraft({initialSourceId:selectedId})}>{t("Добавить связь")}</Button></div>}</div>
  <form role="search" onSubmit={event=>{event.preventDefault();if(matches[0])select(matches[0].id);}}><FilterSearch label={t("Поиск в древе")} value={query} change={setQuery} specs={[categoryFilter,tagFilter]} placeholder={t("Имя, телефон, профессия или фильтр…")}/></form>
  {query&&<div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">{matches.length?matches.map(contact=><Button key={contact.id} size="sm" variant="outline" className="h-auto min-h-9 max-w-full whitespace-normal break-words text-left [overflow-wrap:anywhere]" aria-pressed={selectedId===contact.id} onClick={()=>select(contact.id)}>{contactName(contact.data)}</Button>):<p role="status" className="text-sm text-muted-foreground">{t("Нет контактов с такими условиями поиска.")}</p>}</div>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {loading?<LoadingState/>:failure?<ErrorState message={failure} retry={refresh}/>:<div className="grid min-w-0 items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem]">
   <section data-action-subject="tree-canvas" className="min-w-0 space-y-3" aria-label={t("Карта связей")}>
    <div data-action-subject="tree-controls" className="flex min-w-0 flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{t("Контактов: {people} · семейных связей: {family} · других: {social}",{people:numberLabel(contacts.length),family:numberLabel(familyCount),social:numberLabel(relationships.length-familyCount)})}</p><div className="flex flex-wrap items-center gap-1"><Button size="sm" variant="outline" aria-pressed={fullScreen} onClick={()=>setFullScreen(value=>!value)}><AppIcon icon="tabler:arrows-maximize"/>{t(fullScreen?"Выйти из полного экрана":"На весь экран")}</Button><Button size="icon" variant="outline" aria-label={t("Уменьшить древо")} disabled={zoom<=.5} onClick={()=>setZoom(value=>Math.max(.5,Math.round((value-.1)*10)/10))}><AppIcon icon="tabler:arrows-minimize"/></Button><Button size="sm" variant="ghost" aria-label={t("Сбросить масштаб")} onClick={()=>setZoom(1)}>{numberLabel(zoom,{style:"percent"})}</Button><Button size="icon" variant="outline" aria-label={t("Увеличить древо")} disabled={zoom>=1.6} onClick={()=>setZoom(value=>Math.min(1.6,Math.round((value+.1)*10)/10))}><AppIcon icon="tabler:plus"/></Button><Button size="icon" variant="outline" disabled={!selected} aria-label={t("Показать выбранного человека")} onClick={focusSelected}><AppIcon icon="tabler:target"/></Button><ObjectActions placement="inline" actions={[{id:"sort",label:t("Сортировка связей"),children:relationshipSorts.map(item=>({id:item.value,label:t(item.label),icon:sort===item.value?"tabler:check":undefined,run:()=>{setSort(item.value);setPositions({});}})),run:()=>{}},{id:"layout",label:t("Автоматическая раскладка"),icon:"tabler:refresh",run:()=>setPositions({})},{id:"refresh",label:t("Обновить контакты"),run:refresh}]}/></div></div>
    <div ref={viewport} onDragOver={event=>{if(editing&&drag.current)event.preventDefault();}} onDrop={event=>drop(event)} tabIndex={0} role="region" aria-label={t("Интерактивное древо контактов")} className={`${fullScreen?"h-[calc(100svh-18rem)]":"h-[min(64svh,44rem)]"} isolate min-h-64 overscroll-contain overflow-auto rounded-2xl border border-border bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
     <div data-tree-stage className="relative overflow-hidden" style={{width:layout.width*zoom,height:layout.height*zoom}}>
      <div className="absolute left-0 top-0 origin-top-left" style={{width:layout.width,height:layout.height,transform:`scale(${zoom})`}}>
       <svg width={layout.width} height={layout.height} className="absolute inset-0"><defs><marker id={arrow} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)"/></marker></defs>{layout.edges.map(edge=>{
        const from=nodeById.get(edge.source_id)!,to=nodeById.get(edge.target_id)!;const parent=isParentKind(edge.kind);
        const path=contactTreeEdgePath(from,to,parent);
        const active=highlight&&parent&&branch.has(edge.source_id)&&branch.has(edge.target_id)||edge.source_id===selectedId||edge.target_id===selectedId;
        return <g key={edge.id} data-tree-edge={edge.id} data-action-key={`tree-edge:${edge.id}`} tabIndex={0} role="button" aria-label={t("Связь: {from} — {to}, {kind}",{from:contactName(byId.get(edge.source_id)!.data),to:contactName(byId.get(edge.target_id)!.data),kind:relationshipName(edge.kind)})} className="group cursor-context-menu focus-visible:outline-none"><path d={path} fill="none" stroke="transparent" strokeWidth={16} pointerEvents="stroke"/><path className="group-focus-visible:stroke-ring group-focus-visible:opacity-100" d={path} fill="none" pointerEvents="none" stroke={edge.category==="family"?"var(--primary)":"var(--muted-foreground)"} strokeWidth={active?3:1.5} strokeDasharray={edge.category==="social"?"5 6":undefined} opacity={active?1:.55} markerEnd={parent?`url(#${arrow})`:undefined}/><title>{relationshipName(edge.kind)}</title></g>;
       })}</svg>
       {layout.nodes.map(node=>{
        const person=byId.get(node.id)!,active=node.id===selectedId,roles=projection.roles.get(node.id)??[];
        const dimmed=!!query&&!matchingIds.has(node.id)||highlight&&!active&&!roles.length;
        const lineage=active?"self":projection.ancestors.has(node.id)?"ancestor":projection.descendants.has(node.id)?"descendant":"none";
        return <article key={node.id} data-action-subject="tree-person" data-drag-item data-drag-key={`tree:${node.id}`} data-dragging={dragging===node.id||undefined} data-tree-person={node.id} data-lineage={lineage} draggable={editing&&!busy} onDragStart={event=>startDrag(event,node.id)} onDragEnd={()=>{drag.current=null;setDragging(null);}} onDragOver={event=>{if(editing&&drag.current&&drag.current.id!==node.id)event.preventDefault();}} onDrop={event=>drop(event,node.id)} className={`absolute rounded-2xl border bg-card shadow-sm ${active?"border-primary ring-2 ring-primary/30":highlight&&lineage!=="none"?"border-primary ring-1 ring-primary/25":"border-border"}`} style={{left:node.x,top:node.y,width:treeNodeSize.width,height:treeNodeSize.height}}>
         <button type="button" data-tree-contact={node.id} aria-label={t("Выбрать контакт {name}",{name:contactName(person.data)})} aria-pressed={active} onClick={()=>select(node.id)} className={`flex size-full min-w-0 flex-col items-start justify-center gap-2 rounded-2xl p-3 pr-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${dimmed?"text-muted-foreground":""}`}><span className={`flex w-full min-w-0 shrink-0 items-start gap-2 ${dimmed?"opacity-60":""}`}><AppIcon icon={genderIcon(person.data.gender)} className="mt-0.5 size-4 text-primary"/><span className="min-w-0 line-clamp-2 text-sm font-semibold [overflow-wrap:anywhere]">{contactName(person.data)}{node.id===user?.id&&<span className="ml-1 text-xs font-normal text-primary">· {t("Вы")}</span>}</span></span>{person.data.birth_date&&<ZodiacBadge birthDate={person.data.birth_date}/>}<span className="line-clamp-2 w-full shrink-0 text-xs text-primary [overflow-wrap:anywhere]" title={roles.map(role=>role.label).join(" · ")}>{active?t("Выбранный человек"):roles.map(role=>role.label).join(" · ")||t("Родство не установлено")}</span></button>
         <ObjectActions subject={node.id===user?.id?undefined:{kind:"contacts",id:node.id}} actions={personActions(person)}/>
        </article>;
       })}
      </div>
     </div>
    </div>
    {/* SVG and touch/keyboard controls share declarations through the existing action aliases. */}
    <div className="sr-only" aria-hidden="true">{layout.edges.map(edge=><span data-action-subject="tree-edge-actions" key={edge.id}><ObjectActions alias={`tree-edge:${edge.id}`} contribute actions={edgeActions(edge)}/></span>)}</div>
    <p className="text-xs leading-5 text-muted-foreground">{t(editing?"Правый клик открывает действия. Перетащите карточку на человека для связи, на пустое место — для перемещения. Положение карточек временное; связи сохраняются.":"Выберите человека: подписи показывают родство относительно него, подсветка — всех предков и потомков. Правый клик открывает действия.")}</p>
   </section>
   {selected&&<article role="region" aria-label={t("Выбранный контакт")} className="min-w-0 space-y-5 self-start rounded-2xl border border-border bg-card p-5"><header className="flex items-start justify-between gap-3"><h2 className="flex min-w-0 items-start gap-2 text-xl font-semibold"><GenderBadge gender={selected.data.gender}/><span className="min-w-0 [overflow-wrap:anywhere]">{contactName(selected.data)}</span></h2><ObjectActions subject={selectedIsProfile?undefined:{kind:"contacts",id:selected.id}} actions={personActions(selected)}/></header>
    <Link className="inline-flex text-sm text-primary underline underline-offset-4" to={selectedIsProfile?"/profile":`/contacts?contact=${encodeURIComponent(selected.id)}`}>{t(selectedIsProfile?"Открыть профиль":"Открыть контакт")}</Link>
    {selected.data.birth_date&&<div className="space-y-2"><p className="text-sm">{dateLabel(selected.data.birth_date,{day:"numeric",month:"long",year:"numeric"})}</p><ZodiacBadge birthDate={selected.data.birth_date}/></div>}
    {[selected.data.relationship,selected.data.activity,selected.data.profession].filter(Boolean).map((value,index)=><p key={index} className="break-words text-sm text-muted-foreground">{value}</p>)}
    {selected.data.phones.map(phone=><div key={phone} className="space-y-2"><p className="break-words text-sm">{phone}</p><OperatorBadge phone={phone}/><ContactActions phone={phone}/></div>)}
    {selected.data.description&&<details className="[overflow-wrap:anywhere]"><summary className="cursor-pointer text-sm">{t("Описание контакта")}</summary><Markdown value={selected.data.description}/></details>}
    {!selectedIsProfile&&<SubjectLabels subject={{kind:"contacts",id:selected.id}}>{selected.data.tags.map(name=><TagChip key={name} name={name}/>)}</SubjectLabels>}
    <p className="rounded-xl bg-primary/5 p-3 text-sm text-muted-foreground">{t("Предков: {ancestors} · потомков: {descendants}",{ancestors:numberLabel(projection.ancestors.size),descendants:numberLabel(projection.descendants.size)})}</p>
    <ContactRelationships key={selected.id} contactId={selected.id} contacts={contacts} relationships={relationships} refresh={relations.retry} editable={editing} onSelect={select} projection={projection} sort={sort} changeSort={next=>{setSort(next);setPositions({});}}/>
   </article>}
  </div>}
  {editing&&relationDraft&&<RelationshipEditor contacts={contacts} {...relationDraft} close={()=>setRelationDraft(null)} saved={()=>{setRelationDraft(null);relations.retry();}}/>}
  {editing&&editor&&<ContactEditor contact={editor==="new"?undefined:editor} close={()=>setEditor(null)} saved={person=>{setEditor(null);refresh();select(person.id);notify(t("Контакт сохранён."));}}/>}
 </div>;
 return fullScreen?<Dialog fullScreen title={t("Древо")} onClose={()=>setFullScreen(false)}>{content}</Dialog>:<main id="main" className="mx-auto w-full max-w-[100rem] px-5 py-8 sm:px-10">{content}</main>;
}
