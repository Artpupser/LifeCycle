import {useMemo,useState} from "react";
import {Link} from "react-router";
import {Dialog} from "@/components/dialog";
import {FormField} from "@/components/form-field";
import {ErrorState,LoadingState} from "@/components/resource-state";
import {Button} from "@/components/ui/button";
import {ChoiceInput,ChoiceField} from "@/components/ui/choice-picker";

import {SaveButton,SaveForm} from "@/components/ui/save";
import {useResource} from "@/hooks/use-resource";
import {api,errorMessage} from "@/lib/api";
import {notify} from "@/lib/feedback";
import {t,useLanguage} from "@/systems/i18n/locale";
import {ObjectActions} from "@/systems/actions/action-menu";
import {GenderBadge} from "@/systems/icons/gender-badge";
import {genderIcon} from "@/systems/icons/gender";
import {relationshipSorts,sortRelationshipPeople,type RelationshipSort,useRelationshipPeople,kinshipProjection,removeRelationship,type KinshipProjection,otherContactId,relativeRole,relationshipCategory,relationshipKinds,relationshipName,type ContactRelationship,type RelationshipKind} from "./relationships";
import {contactName,type Contact} from "./types";

export type RelationshipDraft={record?:ContactRelationship;initialSourceId?:string;initialTargetId?:string;initialKind?:RelationshipKind};
export function RelationshipEditor({contacts,record,initialSourceId="",initialTargetId="",initialKind="parent",close,saved}:RelationshipDraft&{contacts:Contact[];close:()=>void;saved:()=>void}){
 useLanguage();
 const [source,setSource]=useState(record?.source_id??initialSourceId),[target,setTarget]=useState(record?.target_id??initialTargetId);
 const [kind,setKind]=useState<RelationshipKind>(record?.kind??initialKind);
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const options=contacts.map(contact=>({value:contact.id,label:contactName(contact.data),search:contact.data.phones.join(" "),icon:genderIcon(contact.data.gender),suffix:""}));
 const name=(id:string)=>options.find(option=>option.value===id)?.label??"";
 async function submit(event:React.SubmitEvent){
  event.preventDefault();if(busy||!source||!target||source===target)return;setBusy(true);setError(null);
  try{const data={source_id:source,target_id:target,kind};await api(record?`/contacts/relationships/${record.id}`:"/contacts/relationships",{method:record?"PUT":"POST",body:record?{revision:record.revision,data}:data});notify(t("Связь сохранена."));saved();}
  catch(failure){setError(errorMessage(failure));}finally{setBusy(false);}
 }
 return <Dialog title={t(record?"Изменить связь":"Новая связь")} onClose={()=>{if(!busy)close();}}><SaveForm className="space-y-5" onSubmit={event=>void submit(event)}><fieldset disabled={busy} className="space-y-5">
  <p className="text-sm text-muted-foreground">{t("Люди берутся из контактной книжки и вашего профиля. Изменение связи не меняет их данные.")}</p>
  <FormField id="relation-source" label={t("Первый контакт")}><ChoiceInput id="relation-source" value={source} displayValue={name(source)} icon="tabler:user" title={t("Выберите первый контакт")} searchLabel={t("Поиск контактов")} empty={t("Нет контактов с такими условиями поиска.")} options={options} choose={id=>{setSource(id);if(id===target)setTarget("");}}/></FormField>
  <FormField id="relation-kind" label={t("Тип связи")}><ChoiceField id="relation-kind" value={kind} change={next=>setKind(next as RelationshipKind)}><optgroup label={t("Семейные связи")}>{relationshipKinds.filter(item=>relationshipCategory(item)==="family").map(item=><option key={item} value={item}>{relationshipName(item)}</option>)}</optgroup><optgroup label={t("Другие связи")}>{relationshipKinds.filter(item=>relationshipCategory(item)==="social").map(item=><option key={item} value={item}>{relationshipName(item)}</option>)}</optgroup></ChoiceField></FormField>
  {kind==="parent"&&<p className="rounded-xl bg-primary/5 p-3 text-sm text-primary">{t("Первый контакт — родитель, второй — ребёнок.")}</p>}
  <FormField id="relation-target" label={t("Второй контакт")}><ChoiceInput id="relation-target" value={target} displayValue={name(target)} icon="tabler:user" title={t("Выберите второй контакт")} searchLabel={t("Поиск контактов")} empty={t("Нет контактов с такими условиями поиска.")} options={options.filter(option=>option.value!==source)} choose={setTarget}/></FormField>
 </fieldset>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<SaveButton type="submit" disabled={busy||!source||!target||source===target}>{busy?t("Сохраняем…"):t("Сохранить связь")}</SaveButton></SaveForm></Dialog>;
}

type RelationshipsProps={contactId:string;contacts:Contact[];relationships:ContactRelationship[];refresh:()=>void;editable?:boolean;onSelect?:(id:string)=>void;projection?:KinshipProjection;sort?:RelationshipSort;changeSort?:(sort:RelationshipSort)=>void};
/** Contact cards and the tree share the same relationship controls and projection. */
export function ContactRelationships({contactId,contacts,relationships,refresh,editable=true,onSelect,projection,sort:externalSort,changeSort}:RelationshipsProps){
 useLanguage();const [creating,setCreating]=useState<RelationshipDraft|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const byId=new Map(contacts.map(contact=>[contact.id,contact]));
 const [ownSort,setOwnSort]=useState<RelationshipSort>("name");const sort=externalSort??ownSort;
 const current=relationships.filter(edge=>(edge.source_id===contactId||edge.target_id===contactId)&&byId.has(otherContactId(edge,contactId)));
 const computed=useMemo(()=>projection??kinshipProjection(contactId,contacts,relationships),[projection,contactId,contacts,relationships]);
 const ordered=sortRelationshipPeople(contacts,relationships,sort,computed);const ranks=new Map(ordered.map((person,index)=>[person.id,index]));
 current.sort((a,b)=>ranks.get(otherContactId(a,contactId))!-ranks.get(otherContactId(b,contactId))!);
 const directIds=new Set(current.map(edge=>otherContactId(edge,contactId)));
 const inferred=[...computed.roles].filter(([id])=>!directIds.has(id)).sort(([a],[b])=>ranks.get(a)!-ranks.get(b)!);
 async function remove(edge:ContactRelationship){
  if(busy)return;setBusy(true);setError(null);try{if(await removeRelationship(edge))refresh();}
  catch(failure){setError(errorMessage(failure));}finally{setBusy(false);}
 }
 function person(id:string){const label=contactName(byId.get(id)!.data);return onSelect?<button type="button" className="min-w-0 text-left text-primary [overflow-wrap:anywhere] underline underline-offset-4" onClick={()=>onSelect(id)}>{label}</button>:<Link className="min-w-0 text-primary [overflow-wrap:anywhere] underline underline-offset-4" to={`/tree?contact=${encodeURIComponent(id)}`}>{label}</Link>;}
 return <div className="min-w-0 space-y-4" aria-label={t("Связи контакта")}>
  <div data-action-subject="relationship-sort" className="flex min-w-0 items-center justify-between gap-2"><p className="min-w-0 break-words text-xs text-muted-foreground">{t(relationshipSorts.find(item=>item.value===sort)!.label)}</p><ObjectActions placement="inline" actions={[{id:"sort",label:t("Сортировка связей"),children:relationshipSorts.map(item=>({id:item.value,label:t(item.label),icon:sort===item.value?"tabler:check":undefined,run:()=>{setOwnSort(item.value);changeSort?.(item.value);}})),run:()=>{}}]}/></div>
  {(["family","social"] as const).map(category=>{
   const edges=current.filter(edge=>edge.category===category);
   return <section key={category} className="space-y-2"><h3 className="text-sm font-semibold">{t(category==="family"?"Семейные связи":"Другие связи")}</h3>{!edges.length?<p className="text-sm text-muted-foreground">{t("Связей пока нет.")}</p>:<ul className="space-y-2">{edges.map(edge=>{const id=otherContactId(edge,contactId);return <li key={edge.id} data-action-subject="contact-relationship" className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-muted/50 p-3 pr-12 text-sm"><span className="text-muted-foreground">{relativeRole(edge,contactId,byId.get(id)?.data.gender)} ·</span><GenderBadge gender={byId.get(id)?.data.gender}/>{person(id)}{editable&&<ObjectActions actions={[{id:"edit",label:t("Изменить связь"),disabled:busy,run:()=>setCreating({record:edge})},{id:"remove",label:t("Удалить связь"),danger:true,disabled:busy,run:()=>void remove(edge)}]}/>}</li>;})}</ul>}</section>;
  })}
  {!!inferred.length&&<section className="space-y-2"><h3 className="text-sm font-semibold">{t("Вычисленные родственники")}</h3><p className="text-xs text-muted-foreground">{t("Родство вычисляется по записанным связям. Пол неизвестен — название нейтральное. Несколько путей могут давать разные роли.")}</p><ul className="max-h-96 space-y-2 overflow-y-auto">{inferred.map(([id,roles])=><li key={id} className="space-y-1 rounded-xl bg-muted/50 p-3 text-sm"><div className="flex min-w-0 items-center gap-2"><GenderBadge gender={byId.get(id)?.data.gender}/>{person(id)}</div>{roles.map(role=><div key={role.label}><p className="break-words">{role.label}</p><p className="break-words text-xs text-muted-foreground">{t("Через: {path}",{path:role.path.map(id=>contactName(byId.get(id)!.data)).join(" → ")})}</p></div>)}</li>)}</ul></section>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {editable&&<Button size="sm" variant="outline" disabled={busy||contacts.length<2} onClick={()=>setCreating({initialSourceId:contactId})}>{t("Добавить связь")}</Button>}
  {creating&&<RelationshipEditor contacts={contacts} {...creating} close={()=>setCreating(null)} saved={()=>{setCreating(null);refresh();}}/>}
 </div>;
}

export function ContactRelationsSection({contactId}:{contactId:string}){
 useLanguage();const contacts=useRelationshipPeople(),relations=useResource<ContactRelationship[]>("/contacts/relationships");
 const retry=()=>{contacts.retry();relations.retry();};
 if(contacts.resource.status==="error")return <ErrorState message={contacts.resource.message} retry={retry}/>;
 if(relations.resource.status==="error")return <ErrorState message={relations.resource.message} retry={retry}/>;
 if(contacts.resource.status!=="ready"||relations.resource.status!=="ready")return <LoadingState/>;
 return <section className="mt-5 space-y-4 border-t border-border pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{t("Связи контакта")}</h2><Link className="text-sm text-primary underline" to={`/tree?contact=${encodeURIComponent(contactId)}`}>{t("Найти в древе")}</Link></div><p className="text-xs text-muted-foreground">{t("Связи сохраняются отдельно. Изменённые поля контакта сохраните кнопкой в заголовке.")}</p><ContactRelationships contactId={contactId} contacts={contacts.resource.data} relationships={relations.resource.data} refresh={relations.retry}/></section>;
}
