import {expect,it} from "vitest";
import {sortRelationshipPeople,familyAnalysis,kinshipProjection,relativeRole,type ContactRelationship} from "./relationships";
import {contactTreeEdgePath,layoutContactTree,treeNodeSize} from "./tree-layout";
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

it("settles partner and sibling generations independently of relationship order",()=>{
 const people=["grandparent","parent","a","b","c","child"].map(person);
 const edges=[relation("bc","b","c","sibling"),relation("ab","a","b","partner"),relation("gp","grandparent","parent"),relation("pa","parent","a"),relation("cc","c","child")];
 const result=layoutContactTree(people,edges);
 expect(layoutContactTree(people,[...edges].reverse()).nodes).toEqual(result.nodes);
 const byId=new Map(result.nodes.map(node=>[node.id,node]));
 expect(byId.get("a")!.y).toBe(byId.get("c")!.y);
 expect(byId.get("child")!.y).toBeGreaterThan(byId.get("c")!.y);
 for(const node of result.nodes){
  expect(node.x+treeNodeSize.width).toBeLessThan(result.width);
  expect(node.y+treeNodeSize.height).toBeLessThan(result.height);
  for(const other of result.nodes.filter(other=>other.id!==node.id)){
   expect(node.x+treeNodeSize.width<=other.x||other.x+treeNodeSize.width<=node.x||node.y+treeNodeSize.height<=other.y||other.y+treeNodeSize.height<=node.y).toBe(true);
  }
 }
});

it("draws adjacent links in the gap and routes longer same-row links above intervening cards",()=>{
 const from={id:"a",x:32,y:48,generation:0};
 const adjacent={...from,id:"b",x:300};
 const far={...from,id:"c",x:568};
 const child={...from,id:"child",y:264,generation:1};
 expect(contactTreeEdgePath(from,adjacent,false)).toBe("M268,124 C284,124 284,124 300,124");
 expect(contactTreeEdgePath(adjacent,from,false)).toBe("M300,124 C284,124 284,124 268,124");
 expect(contactTreeEdgePath(from,far,false)).toBe("M150,48 V24 H686 V48");
 expect(contactTreeEdgePath(from,child,true)).toBe("M150,200 C150,232 150,232 150,264");
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

it("resolves wives' sisters and their husbands, husbands' sisters and brothers' wives reciprocally",()=>{
 const people=["a","wife","sister","husband","brother","brother-wife"].map(person);
 const genders=["male","female","female","male","male","female"] as const;
 people.forEach((p,i)=>p.data.gender=genders[i]);
 const edges=[relation("a-wife","a","wife","spouse"),relation("sisters","wife","sister","sibling"),relation("sister-husband","sister","husband","spouse"),relation("brothers","a","brother","sibling"),relation("brother-wife","brother","brother-wife","spouse")];
 const names=(id:string,relative:string)=>kinshipProjection(id,people,edges).roles.get(relative)?.map(role=>role.label);
 expect(names("a","sister")).toContain("Свояченица");expect(names("a","husband")).toContain("Свояк");expect(names("husband","a")).toContain("Свояк");
 expect(names("wife","brother-wife")).toContain("Ятровка (ятровь)");expect(names("brother-wife","wife")).toContain("Ятровка (ятровь)");
 expect(names("husband","wife")).toContain("Свояченица");
 const sister=person("husband-sister");sister.data.gender="female";
 expect(kinshipProjection("wife",[...people,sister],[...edges,relation("siblings","a",sister.id,"sibling")]).roles.get(sister.id)?.map(role=>role.label)).toContain("Золовка");
});
it("shares stable relationship sorting with the layout while keeping generations intact",()=>{
 const people=["a","b","c"].map(person);people[0].data.birth_date="2000-01-01";people[1].data.birth_date="1980-01-01";
 const edges=[relation("1","b","a"),relation("2","a","c","friend")];
 expect(sortRelationshipPeople(people,edges,"birth").map(person=>person.id)).toEqual(["b","a","c"]);
 expect(sortRelationshipPeople(people,edges,"connections").map(person=>person.id)).toEqual(["a","b","c"]);
 const projection=kinshipProjection("b",people,edges);
 expect(sortRelationshipPeople(people.filter(p=>p.id!=="b"),edges,"kinship",projection).map(p=>p.id)).toEqual(["a","c"]);
 const layout=layoutContactTree(people,edges,"birth",projection);expect(layout.nodes.find(n=>n.id==="a")!.y).toBeGreaterThan(layout.nodes.find(n=>n.id==="b")!.y);
});
