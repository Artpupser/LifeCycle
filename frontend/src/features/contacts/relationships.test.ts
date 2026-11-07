import {expect,it} from "vitest";
import {familyAnalysis,kinshipProjection,relativeRole,type ContactRelationship} from "./relationships";
import {layoutContactTree} from "./tree-layout";
import {emptyContact,profileContact,type Contact} from "./types";
import {emptyOrigin,emptyFirsts,type Profile} from "@/features/profile/types";
const relation=(id:string,source_id:string,target_id:string,kind:ContactRelationship["kind"]="parent"):ContactRelationship=>({id,source_id,target_id,kind,category:kind==="friend"?"social":"family",revision:0});
const person=(id:string):Contact=>({id,data:{...emptyContact(),first_name:id},revision:0,created_at:"",updated_at:""});
it("projects the owner profile as a person using the same layout and family links",()=>{
 const profile={revision:3,name:"Владелец",nickname:"",birth_date:"1990-03-21",origin:emptyOrigin,firsts:emptyFirsts} as Profile;
 const owner=profileContact("owner",profile);
 const edges=[relation("owner-parent","parent","owner"),relation("owner-child","owner","child")];
 const result=layoutContactTree([person("parent"),owner,person("child")],edges);
 expect(result.nodes).toHaveLength(3);expect(result.edges).toHaveLength(2);
 expect([...familyAnalysis(owner.id,edges).ancestors]).toEqual(["parent"]);
 expect(owner.data).toMatchObject({first_name:"Владелец",birth_date:"1990-03-21"});
 expect(profile.name).toBe("Владелец");
});
it("derives ancestors, descendants and siblings without storing implied connections",()=>{
 const edges=[relation("1","grandparent","parent"),relation("2","parent","child"),relation("3","parent","sibling"),relation("4","friend","child","friend"),relation("5","explicit","child","sibling")];
 const analysis=familyAnalysis("child",edges);
 expect([...analysis.ancestors].sort()).toEqual(["grandparent","parent"]);expect([...analysis.descendants]).toEqual([]);expect([...analysis.siblings].sort()).toEqual(["explicit","sibling"]);expect(edges).toHaveLength(5);
 expect([...familyAnalysis("grandparent",edges).descendants].sort()).toEqual(["child","parent","sibling"]);
});
it("places parents above their children, retains isolated contacts and ignores dangling links",()=>{
 const contacts=["child","parent","sibling","grandparent","isolated"].map(person);
 const edges=[relation("1","parent","child"),relation("2","grandparent","parent"),relation("3","parent","sibling"),relation("4","missing","child")];
 const result=layoutContactTree(contacts,edges);const byId=new Map(result.nodes.map(node=>[node.id,node]));
 expect(result.nodes).toHaveLength(5);expect(result.edges).toHaveLength(3);expect(byId.get("grandparent")!.y).toBeLessThan(byId.get("parent")!.y);expect(byId.get("parent")!.y).toBeLessThan(byId.get("child")!.y);expect(byId.get("child")!.y).toBe(byId.get("sibling")!.y);
 expect(layoutContactTree([...contacts].reverse(),edges).nodes).toEqual(result.nodes);
});
it("terminates safely on stale cyclic data and never includes a person as their own ancestor",()=>{
 const edges=[relation("1","a","b"),relation("2","b","a")];
 expect(layoutContactTree([person("a"),person("b")],edges).nodes).toHaveLength(2);
 expect([...familyAnalysis("a",edges).ancestors]).toEqual(["b"]);
});

it("wraps independent people into compact shelves instead of one long strip",()=>{
 const layout=layoutContactTree(Array.from({length:30},(_,index)=>person(String(index).padStart(2,"0"))),[]);
 expect(layout.width).toBeLessThanOrEqual(2400);expect(new Set(layout.nodes.map(node=>node.y)).size).toBeGreaterThan(1);expect(new Set(layout.nodes.map(node=>`${node.x}:${node.y}`)).size).toBe(30);
});

it("aligns a partner with no recorded parents and keeps their shared child below both",()=>{
 const contacts=["grandparent","parent","a","b","child"].map(person);
 const edges=[relation("1","grandparent","parent"),relation("2","parent","a"),relation("3","a","b","partner"),relation("4","a","child"),relation("5","b","child")];
 const byId=new Map(layoutContactTree(contacts,edges).nodes.map(node=>[node.id,node]));
 expect(byId.get("a")!.y).toBe(byId.get("b")!.y);expect(byId.get("child")!.y).toBeGreaterThan(byId.get("b")!.y);
});

it("computes arbitrary cousin order and generation offsets from common ancestors",()=>{
 for(const depth of [2,3,4,5,6,12]){
  const ids=["root"];const edges:ContactRelationship[]=[];
  for(const side of ["a","b"]){let parent="root";for(let level=1;level<=depth;level++){const id=`${side}${level}`;ids.push(id);edges.push(relation(id,parent,id));parent=id;}}
  const people=ids.map(person);people.at(-1)!.data.gender="female";
  const role=kinshipProjection(`a${depth}`,people,edges).roles.get(`b${depth}`)![0];
  expect(role).toMatchObject({basis:"lineage",up:depth,down:depth});expect(role.path).toHaveLength(2*depth+1);
  expect(role.label).toContain(depth===2?"Двоюродная":depth===3?"Троюродная":depth===4?"Четвероюродная":depth===5?"Пятиюродная":`${depth}-юродная`);
 }
 const people=["g","p","a","c","niece"].map(person);people[1].data.gender="female";people[4].data.gender="female";
 const edges=[relation("1","g","p"),relation("2","g","a"),relation("3","p","c"),relation("4","a","niece")];
 expect(kinshipProjection("c",people,edges).roles.get("p")![0].label).toBe("Мать");
 expect(kinshipProjection("p",people,edges).roles.get("niece")![0].label).toBe("Племянница");
 expect([...kinshipProjection("c",people,edges).ancestors].sort()).toEqual(["g","p"]);
});
it("uses explicit sibling evidence without treating chains of half siblings as transitive",()=>{
 const people=["a","b","c","child-a","child-b"].map(person);
 const edges=[relation("1","a","b","sibling"),relation("2","b","c","sibling"),relation("3","a","child-a"),relation("4","b","child-b")];
 expect(kinshipProjection("child-a",people,edges).roles.get("child-b")![0]).toMatchObject({basis:"lineage",up:2,down:2});
 expect(kinshipProjection("a",people,edges).roles.get("c")![0].basis).toBe("chain");
});
it("distinguishes spouses, romantic partners, affinity and gender-neutral roles",()=>{
 const people=["me","husband","mother","father","brother","daughter","son-in-law","co-mother"].map(person);
 const genders=["female","male","female","male","male","female","male","female"] as const;people.forEach((p,index)=>p.data.gender=genders[index]);
 const edges=[relation("1","me","husband","spouse"),relation("2","mother","husband"),relation("3","father","husband"),relation("4","father","brother"),relation("5","me","daughter"),relation("6","daughter","son-in-law","spouse"),relation("7","co-mother","son-in-law")];
 const roles=kinshipProjection("me",people,edges).roles;
 for(const [id,label]of [["husband","Муж"],["mother","Свекровь"],["father","Свёкор"],["brother","Деверь"],["son-in-law","Зять"],["co-mother","Сватья"]])expect(roles.get(id)!.map(role=>role.label)).toContain(label);
 expect(kinshipProjection("me",people,[{...edges[0],kind:"romantic_partner"},...edges.slice(1)]).roles.get("mother")!.map(role=>role.label)).not.toContain("Свекровь");
 expect(relativeRole(edges[0],"me")).toBe("Супруг / супруга");
});
it("preserves multiple roles and terminates on missing people and stale ancestry cycles",()=>{
 const people=["g","p","q","a","b"].map(person);people.at(-1)!.data.gender="male";
 const edges=[relation("1","g","p"),relation("2","g","q"),relation("3","p","a"),relation("4","q","b"),relation("5","a","b","spouse"),relation("6","ghost","a")];
 const result=kinshipProjection("a",people,edges);expect(result.roles.get("b")!.map(role=>role.label)).toEqual(["Муж","Двоюродный брат"]);expect(result.roles.has("ghost")).toBe(false);
 const cyclic=kinshipProjection("p",people,[...edges,relation("cycle","a","g")]);expect(cyclic.roles.has("p")).toBe(false);expect(cyclic.ancestors.has("p")).toBe(false);
});
