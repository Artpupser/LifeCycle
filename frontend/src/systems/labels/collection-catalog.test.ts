import {expect,it} from "vitest";
import {visibleCollectionCatalog,orderedCollectionCatalog,collectionCatalog,collectionDefinition,collectionLabel,collectionOptions,isCollectionKind} from "./collection-catalog";
import {resolveIcon} from "@/systems/icons/catalog";
import type {Label} from "./types";

it("assigns a bundled semantic icon to every fixed option, including old registry rows",()=>{
 for(const definition of collectionCatalog.filter(item=>!item.expandable)){
  for(const entry of definition.entries){
   expect(resolveIcon(entry.icon)).toBe(entry.icon);
   const row:Label={id:entry.value,kind:definition.id,name:entry.name,value:entry.value,revision:0,color:"",icon:definition.icon};
   expect(collectionOptions(definition.id,[{...row,description:"Старое описание"}])[0]).toMatchObject({icon:entry.icon,description:entry.description});
  }
 }
 expect(collectionLabel("радость","emotion")).toBe("Радость");
});

it("locks lubricant and contraception catalogs while retaining historical private selections",()=>{
 for(const kind of ["lubricant","contraception"] as const){
  expect(collectionDefinition(kind).expandable).toBe(false);
  const row:Label={id:kind,kind,name:"Личный вариант",revision:1,color:"",in_collection:false};
  expect(collectionOptions(kind,[row])).toEqual([]);
  expect(collectionOptions(kind,[row],[row.name])[0]).toMatchObject({label:row,legacy:true});
  expect(collectionDefinition(kind).entries.length).toBeGreaterThan(0);
 }
 const water=collectionDefinition("lubricant").entries[0];
 const old:Label={id:"water",kind:"lubricant",name:water.name,value:water.value,revision:1,color:""};
 expect(collectionOptions("lubricant",[old],[water.name])).toHaveLength(1);
 expect(collectionOptions("lubricant",[old],[water.name])[0].value).toBe(water.name);
 expect(isCollectionKind("feelings_after")).toBe(false);
});

it("hides private collection definitions without changing journal options or stored references",()=>{
 const hidden=collectionCatalog.filter(item=>item.sensitive).map(item=>item.id);
 expect(hidden).toEqual(expect.arrayContaining(["sex_type","toy","lubricant","contraception"]));
 expect(visibleCollectionCatalog(hidden).map(item=>item.id)).toEqual(["emotion"]);
 const definition=collectionDefinition("lubricant"),entry=definition.entries[0];
 expect(collectionOptions("lubricant",[{id:"water",kind:"lubricant",name:entry.name,value:entry.value,revision:1,color:""}])).toHaveLength(1);
});
it("restores a saved collection order, appends new kinds and ignores stale or duplicate IDs",()=>{
 const ordered=orderedCollectionCatalog(["emotion","unknown","emotion","toy"]);
 expect(ordered.slice(0,2).map(item=>item.id)).toEqual(["emotion","toy"]);
 expect(ordered).toHaveLength(collectionCatalog.length);
 expect(visibleCollectionCatalog(["toy"],["emotion","toy"])[0].id).toBe("emotion");
});
