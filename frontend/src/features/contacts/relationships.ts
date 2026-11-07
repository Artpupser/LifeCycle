import {useMemo} from "react";
import {useResource} from "@/hooks/use-resource";
import {useAuth} from "@/features/auth/auth-context";
import type {Profile} from "@/features/profile/types";
import type {Resource} from "@/systems/loading/cache";
import type {Gender} from "@/systems/icons/gender";
import {api} from "@/lib/api";
import {confirmAction,notify} from "@/lib/feedback";
import {profileContact,type Contact} from "./types";
import {getLanguage,t,useLanguage} from "@/systems/i18n/locale";

export const relationshipKinds=["parent","partner","romantic_partner","spouse","former_spouse","sibling","adoptive_parent","step_parent","godparent","guardian","friend","colleague","other"] as const;
export type RelationshipKind=typeof relationshipKinds[number];
export type ContactRelationship={id:string;source_id:string;target_id:string;kind:RelationshipKind;category:"family"|"social";revision:number};
const registry:Record<RelationshipKind,{name:string;directed?:boolean;parental?:boolean;couple?:boolean;social?:boolean}>={
 parent:{name:"Родитель → ребёнок",directed:true,parental:true},partner:{name:"Партнёры",couple:true},
 romantic_partner:{name:"Девушка / парень",couple:true},spouse:{name:"Муж / жена",couple:true},former_spouse:{name:"Бывшие супруги"},
 sibling:{name:"Брат / сестра"},adoptive_parent:{name:"Усыновитель → ребёнок",directed:true,parental:true},
 step_parent:{name:"Отчим / мачеха → ребёнок",directed:true},godparent:{name:"Крёстный родитель → крестник",directed:true},guardian:{name:"Опекун → подопечный",directed:true},
 friend:{name:"Друг / подруга",social:true},colleague:{name:"Коллеги",social:true},other:{name:"Другая связь",social:true},
};
export const isParentKind=(kind:RelationshipKind)=>registry[kind].parental===true;
export const isCoupleKind=(kind:RelationshipKind)=>registry[kind].couple===true;
export const isDirectedKind=(kind:RelationshipKind)=>registry[kind].directed===true;
export function relationshipCategory(kind:RelationshipKind):ContactRelationship["category"]{return registry[kind].social?"social":"family";}
export function relationshipName(kind:RelationshipKind){return t(registry[kind].name);}
const gendered=(gender:Gender|undefined,male:string,female:string,neutral:string)=>t(gender==="male"?male:gender==="female"?female:neutral);
/** The role describes the other person; gender is explicit data, never inferred from names. */
export function relativeRole(edge:ContactRelationship,contactId:string,gender?:Gender){
 const forward=edge.source_id===contactId;
 switch(edge.kind){
  case "parent":return forward?gendered(gender,"Сын","Дочь","Ребёнок"):gendered(gender,"Отец","Мать","Родитель");
  case "sibling":return gendered(gender,"Брат","Сестра","Брат / сестра");
  case "spouse":return gendered(gender,"Муж","Жена","Супруг / супруга");
  case "romantic_partner":return gendered(gender,"Парень","Девушка","Романтический партнёр");
  case "friend":return gendered(gender,"Друг","Подруга","Друг / подруга");
  case "former_spouse":return gendered(gender,"Бывший муж","Бывшая жена","Бывший супруг / супруга");
  case "adoptive_parent":return forward?gendered(gender,"Приёмный сын","Приёмная дочь","Приёмный ребёнок"):gendered(gender,"Приёмный отец","Приёмная мать","Усыновитель");
  case "step_parent":return forward?gendered(gender,"Пасынок","Падчерица","Пасынок / падчерица"):gendered(gender,"Отчим","Мачеха","Отчим / мачеха");
  case "godparent":return forward?gendered(gender,"Крестник","Крестница","Крестник / крестница"):gendered(gender,"Крёстный отец","Крёстная мать","Крёстный родитель");
  case "guardian":return forward?gendered(gender,"Подопечный","Подопечная","Подопечный / подопечная"):t("Опекун");
  default:return relationshipName(edge.kind);
 }
}
export async function removeRelationship(edge:ContactRelationship){
 if(!await confirmAction(t("Удалить связь? Оба человека и остальные связи сохранятся.")))return false;
 await api(`/contacts/relationships/${edge.id}`,{method:"DELETE",body:{revision:edge.revision}});notify(t("Связь удалена."));return true;
}
export function otherContactId(edge:ContactRelationship,contactId:string){return edge.source_id===contactId?edge.target_id:edge.source_id;}
function reachable(start:string,adjacency:Map<string,string[]>){
 const visited=new Set<string>([start]);const pending=[...(adjacency.get(start)??[])];
 while(pending.length){const next=pending.pop()!;if(visited.has(next))continue;visited.add(next);pending.push(...adjacency.get(next)??[]);}
 visited.delete(start);return visited;
}
/** Inferred relatives are a projection of recorded parentage, never duplicate stored edges. */
export function familyAnalysis(contactId:string,relationships:ContactRelationship[]){
 const parents=new Map<string,string[]>(),children=new Map<string,string[]>();
 for(const edge of relationships)if(isParentKind(edge.kind)){
  parents.set(edge.target_id,[...parents.get(edge.target_id)??[],edge.source_id]);
  children.set(edge.source_id,[...children.get(edge.source_id)??[],edge.target_id]);
 }
 const siblingIds=new Set((parents.get(contactId)??[]).flatMap(parent=>children.get(parent)??[]));
 for(const edge of relationships)if(edge.kind==="sibling"&&(edge.source_id===contactId||edge.target_id===contactId))siblingIds.add(otherContactId(edge,contactId));
 siblingIds.delete(contactId);
 return {ancestors:reachable(contactId,parents),descendants:reachable(contactId,children),siblings:siblingIds};
}

/** Both relationship surfaces resolve exactly the same owned people and profile. */
export function useRelationshipPeople(){
 const {user}=useAuth();useLanguage();const fallbackName=t("Мой профиль");
 const source=useResource<Contact[]>("/contacts"),profile=useResource<Profile>("/profile");
 const resource=useMemo<Resource<Contact[]>>(()=>{
  if(source.resource.status!=="ready")return source.resource;
  if(profile.resource.status!=="ready")return profile.resource;
  return {status:"ready",data:[...(user?[profileContact(user.id,profile.resource.data,fallbackName)]:[]),...source.resource.data.filter(contact=>contact.id!==user?.id)]};
 },[source.resource,profile.resource,user,fallbackName]);
 return {resource,retry:()=>{source.retry();profile.retry();}};
}

export type KinshipRole={label:string;path:string[];basis:"recorded"|"lineage"|"affinity"|"chain";up?:number;down?:number};
export type KinshipProjection={roles:Map<string,KinshipRole[]>;ancestors:Set<string>;descendants:Set<string>};
type Walk={distance:Map<string,number>;via:Map<string,string>};
function walk(start:string,adjacency:Map<string,Set<string>>):Walk{
 const distance=new Map([[start,0]]),via=new Map<string,string>(),queue=[start];
 for(let index=0;index<queue.length;index++)for(const next of adjacency.get(queue[index])??[]){
  if(distance.has(next))continue;distance.set(next,distance.get(queue[index])!+1);via.set(next,queue[index]);queue.push(next);
 }
 return {distance,via};
}
function walkedPath(start:string,end:string,walked:Walk){const result=[end];while(result.at(-1)!==start){const previous=walked.via.get(result.at(-1)!);if(!previous)return [];result.push(previous);}return result.reverse();}
function collateralName(degree:number,gender:Gender|undefined,male:string,female:string,neutral:string){
 const base=gendered(gender,male,female,neutral);if(degree===1)return base;
 const adjectives:Record<number,[string,string,string]>={2:["Двоюродный {role}","Двоюродная {role}","Двоюродный родственник: {role}"],3:["Троюродный {role}","Троюродная {role}","Троюродный родственник: {role}"],4:["Четвероюродный {role}","Четвероюродная {role}","Четвероюродный родственник: {role}"],5:["Пятиюродный {role}","Пятиюродная {role}","Пятиюродный родственник: {role}"]};
 const template=adjectives[degree]??["{n}-юродный {role}","{n}-юродная {role}","{n}-юродный родственник: {role}"];
 return t(template[gender==="male"?0:gender==="female"?1:2],{role:base.toLocaleLowerCase(),n:degree});
}
function lineageName(up:number,down:number,gender:Gender|undefined){
 if(!up||!down){
  const generations=up||down;const ancestor=down===0;
  if(generations===1)return ancestor?gendered(gender,"Отец","Мать","Родитель"):gendered(gender,"Сын","Дочь","Ребёнок");
  if(generations===2)return ancestor?gendered(gender,"Дедушка","Бабушка","Дедушка / бабушка"):gendered(gender,"Внук","Внучка","Внук / внучка");
  if(generations===3)return ancestor?gendered(gender,"Прадедушка","Прабабушка","Прадедушка / прабабушка"):gendered(gender,"Правнук","Правнучка","Правнук / правнучка");
  return t(ancestor?"Предок: {n} поколений выше":"Потомок: {n} поколений ниже",{n:generations});
 }
 const degree=Math.min(up,down),delta=Math.abs(up-down);
 if(getLanguage()==="en"&&degree>=2)return !delta?t("Кузен степени {n}",{n:degree-1}):t(up>down?"Кузен степени {degree}, на {n} поколений выше":"Кузен степени {degree}, на {n} поколений ниже",{degree:degree-1,n:delta});
 if(!delta)return collateralName(degree,gender,"Брат","Сестра","Брат / сестра");
 if(delta===1)return up>down?collateralName(degree,gender,"Дядя","Тётя","Дядя / тётя"):collateralName(degree,gender,"Племянник","Племянница","Племянник / племянница");
 if(delta===2)return up>down?collateralName(degree+1,gender,"Дедушка","Бабушка","Дедушка / бабушка"):collateralName(degree+1,gender,"Внук","Внучка","Внук / внучка");
 if(delta===3)return up>down?collateralName(degree+1,gender,"Прадедушка","Прабабушка","Прадедушка / прабабушка"):collateralName(degree+1,gender,"Правнук","Правнучка","Правнук / правнучка");
 return t(up>down?"Боковой родственник: ветвь {degree}, на {n} поколений выше":"Боковой родственник: ветвь {degree}, на {n} поколений ниже",{degree,n:delta});
}
/** One immutable projection per selected person. No inferred edges are persisted.
 * Cousin distances: https://www.familysearch.org/en/blog/cousin-chart
 * Russian affinity: https://gramota.ru/meta/svekrov-143780
 * Only recorded parentage and explicit sibling bridges prove lineage; spouse edges prove affinity.
 * Walks are iterative, cycle-safe and bounded by the existing contact/relationship limits.
 */
export function kinshipProjection(selected:string,people:Contact[],relationships:ContactRelationship[]):KinshipProjection{
 const byId=new Map(people.map(person=>[person.id,person]));
 const edges=relationships.filter(edge=>byId.has(edge.source_id)&&byId.has(edge.target_id)&&edge.source_id!==edge.target_id).sort((a,b)=>a.id.localeCompare(b.id));
 const parents=new Map<string,Set<string>>(),children=new Map<string,Set<string>>(),siblings=new Map<string,Set<string>>(),spouses=new Map<string,Set<string>>(),family=new Map<string,Set<string>>();
 const addEdge=(map:Map<string,Set<string>>,from:string,to:string)=>{const values=map.get(from)??new Set<string>();values.add(to);map.set(from,values);};
 for(const edge of edges){
  if(edge.category==="family"){addEdge(family,edge.source_id,edge.target_id);addEdge(family,edge.target_id,edge.source_id);}
  if(edge.kind==="parent"){addEdge(parents,edge.target_id,edge.source_id);addEdge(children,edge.source_id,edge.target_id);}
  if(edge.kind==="sibling"){addEdge(siblings,edge.source_id,edge.target_id);addEdge(siblings,edge.target_id,edge.source_id);}
  if(edge.kind==="spouse"){addEdge(spouses,edge.source_id,edge.target_id);addEdge(spouses,edge.target_id,edge.source_id);}
 }
 const roles=new Map<string,KinshipRole[]>();
 const add=(id:string,role:KinshipRole)=>{if(id===selected||!byId.has(id))return;const values=roles.get(id)??[];if(!values.some(value=>value.label===role.label))values.push(role);roles.set(id,values);};
 const gender=(id:string)=>byId.get(id)?.data.gender;
 for(const edge of edges)if(edge.source_id===selected||edge.target_id===selected){const id=otherContactId(edge,selected);add(id,{label:relativeRole(edge,selected,gender(id)),path:[selected,id],basis:"recorded"});}
 const own=walk(selected,parents);
 for(const person of people){
  if(person.id===selected)continue;
  const other=walk(person.id,parents);let best=Infinity;let candidates:KinshipRole[]=[];
  const candidate=(up:number,down:number,path:string[])=>{
   if(!path.length||new Set(path).size!==path.length)return;
   const length=up+down;if(length>best)return;if(length<best){best=length;candidates=[];}
   candidates.push({label:lineageName(up,down,person.data.gender),path,basis:"lineage",up,down});
  };
  for(const [ancestor,up]of own.distance){
   const down=other.distance.get(ancestor);
   if(down!==undefined&&up+down<=best)candidate(up,down,[...walkedPath(selected,ancestor,own),...walkedPath(person.id,ancestor,other).reverse().slice(1)]);
   for(const sibling of siblings.get(ancestor)??[]){const distance=other.distance.get(sibling);if(distance!==undefined&&up+distance+2<=best)candidate(up+1,distance+1,[...walkedPath(selected,ancestor,own),...walkedPath(person.id,sibling,other).reverse()]);}
  }
  for(const role of candidates)add(person.id,role);
 }
 const siblingIds=(id:string)=>new Set([...(siblings.get(id)??[]),...[...(parents.get(id)??[])].flatMap(parent=>[...(children.get(parent)??[])])].filter(other=>other!==id));
 const affinity=(id:string,label:string,path:string[])=>{if(new Set(path).size===path.length)add(id,{label,path,basis:"affinity"});};
 for(const spouse of spouses.get(selected)??[]){
  for(const parent of parents.get(spouse)??[])affinity(parent,gender(spouse)==="male"?gendered(gender(parent),"Свёкор","Свекровь","Родитель мужа"):gender(spouse)==="female"?gendered(gender(parent),"Тесть","Тёща","Родитель жены"):t("Родитель супруга / супруги"),[selected,spouse,parent]);
  for(const sibling of siblingIds(spouse)){
   affinity(sibling,gender(spouse)==="male"?gendered(gender(sibling),"Деверь","Золовка","Брат / сестра мужа"):gender(spouse)==="female"?gendered(gender(sibling),"Шурин","Свояченица","Брат / сестра жены"):t("Брат / сестра супруга"),[selected,spouse,sibling]);
   for(const partner of spouses.get(sibling)??[])affinity(partner,gender(spouse)==="female"&&gender(sibling)==="female"&&gender(partner)==="male"?t("Свояк"):gender(spouse)==="male"&&gender(sibling)==="male"&&gender(partner)==="female"?t("Ятровь (невестка)"):t("Супруг родственника супруга"),[selected,spouse,sibling,partner]);
  }
 }
 for(const child of children.get(selected)??[])for(const partner of spouses.get(child)??[]){
  affinity(partner,gendered(gender(partner),"Зять","Невестка (сноха)","Супруг / супруга ребёнка"),[selected,child,partner]);
  for(const parent of parents.get(partner)??[])affinity(parent,gendered(gender(parent),"Сват","Сватья","Родитель супруга ребёнка"),[selected,child,partner,parent]);
 }
 for(const sibling of siblingIds(selected))for(const partner of spouses.get(sibling)??[])affinity(partner,gendered(gender(partner),"Зять (муж сестры / брата)","Невестка (жена брата / сестры)","Супруг / супруга брата или сестры"),[selected,sibling,partner]);
 // Complex affinity, step, adoptive and spiritual relationships retain an exact recorded path.
 const godparents=new Map<string,Set<string>>();
 for(const edge of edges)if(edge.kind==="godparent")addEdge(godparents,edge.target_id,edge.source_id);
 for(const [child,godparentsOfChild]of godparents){
  const parentsOfChild=parents.get(child)??new Set<string>();
  const peers=godparentsOfChild.has(selected)?new Set([...parentsOfChild,...godparentsOfChild]):parentsOfChild.has(selected)?godparentsOfChild:new Set<string>();
  for(const peer of peers)affinity(peer,gendered(gender(peer),"Кум","Кума","Кум / кума"),[selected,child,peer]);
 }
 const connected=walk(selected,family);
 for(const id of connected.distance.keys())if(id!==selected&&!roles.has(id))add(id,{label:t("Связь через семью"),path:walkedPath(selected,id,connected),basis:"chain"});
 const generations=familyAnalysis(selected,edges);
 return {roles,ancestors:generations.ancestors,descendants:generations.descendants};
}
