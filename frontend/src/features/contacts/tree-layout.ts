import {contactName,type Contact} from "./types";
import {isParentKind,isCoupleKind,type ContactRelationship} from "./relationships";

export const treeNodeSize={width:236,height:152};
export type TreeNode={id:string;x:number;y:number;generation:number};
/** Automatic positions are derived from contacts and parentage; no independent people/layout store. */
export function layoutContactTree(contacts:Contact[],relationships:ContactRelationship[]){
 const ordered=[...contacts].sort((a,b)=>contactName(a.data).localeCompare(contactName(b.data))||a.id.localeCompare(b.id));
 const order=new Map(ordered.map((contact,index)=>[contact.id,index]));
 const ids=new Set(ordered.map(contact=>contact.id));
 const edges=relationships.filter(edge=>ids.has(edge.source_id)&&ids.has(edge.target_id)&&edge.source_id!==edge.target_id);
 const family=new Map(ordered.map(contact=>[contact.id,[] as string[]]));
 const children=new Map(ordered.map(contact=>[contact.id,[] as string[]]));
 const indegree=new Map(ordered.map(contact=>[contact.id,0]));const hasParent=new Set<string>();
 for(const edge of edges){
  if(edge.category==="family"){family.get(edge.source_id)!.push(edge.target_id);family.get(edge.target_id)!.push(edge.source_id);}
  if(isParentKind(edge.kind)){children.get(edge.source_id)!.push(edge.target_id);indegree.set(edge.target_id,indegree.get(edge.target_id)!+1);hasParent.add(edge.target_id);}
 }
 const generation=new Map(ordered.map(contact=>[contact.id,0]));
 const queue=ordered.filter(contact=>indegree.get(contact.id)===0).map(contact=>contact.id);
 for(let cursor=0;cursor<queue.length;cursor++){
  const id=queue[cursor];
  for(const child of children.get(id)??[]){generation.set(child,Math.max(generation.get(child)!,generation.get(id)!+1));indegree.set(child,indegree.get(child)!-1);if(indegree.get(child)===0)queue.push(child);}
 }
 // A partner/sibling with no recorded parents can share the known generation.
 // Never align an ancestor with a descendant, even if stale data contains that link.
 function reaches(from:string,to:string){const seen=new Set<string>(),pending=[from];while(pending.length){const id=pending.pop()!;if(id===to)return true;if(seen.has(id))continue;seen.add(id);pending.push(...children.get(id)??[]);}return false;}
 for(const edge of edges)if(isCoupleKind(edge.kind)||edge.kind==="sibling"){
  const first=generation.get(edge.source_id)!,second=generation.get(edge.target_id)!;
  const lower=first<second?edge.source_id:edge.target_id,higher=first<second?edge.target_id:edge.source_id;
  if(first!==second&&!hasParent.has(lower)&&!reaches(lower,higher))generation.set(lower,Math.max(first,second));
 }
 for(const id of queue)for(const child of children.get(id)??[])generation.set(child,Math.max(generation.get(child)!,generation.get(id)!+1));
 const visited=new Set<string>();const nodes:TreeNode[]=[];
 const preferredWidth=Math.max(960,Math.min(2400,Math.ceil(Math.sqrt(contacts.length))*268));
 let offsetX=32,offsetY=48,shelfHeight=0,width=480,height=280;
 for(const contact of ordered){
  if(visited.has(contact.id))continue;
  const component=new Set<string>(),pending=[contact.id];
  while(pending.length){const id=pending.pop()!;if(component.has(id))continue;component.add(id);visited.add(id);pending.push(...family.get(id)??[]);}
  const rows=new Map<number,string[]>();
  for(const id of [...component].sort((a,b)=>order.get(a)!-order.get(b)!)){const rank=generation.get(id)!;rows.set(rank,[...rows.get(rank)??[],id]);}
  const columns=Math.max(...[...rows.values()].map(row=>row.length));
  const componentWidth=columns*268-32,componentHeight=Math.max(...rows.keys())*216+treeNodeSize.height;
  if(offsetX>32&&offsetX+componentWidth>preferredWidth){offsetX=32;offsetY+=shelfHeight+80;shelfHeight=0;}
  for(const [rank,row]of rows){const padding=(columns-row.length)*134;row.forEach((id,index)=>nodes.push({id,x:offsetX+padding+index*268,y:offsetY+rank*216,generation:rank}));}
  width=Math.max(width,offsetX+componentWidth+32);height=Math.max(height,offsetY+componentHeight+48);shelfHeight=Math.max(shelfHeight,componentHeight);offsetX+=componentWidth+80;
 }
 return {nodes,edges,width,height};
}
