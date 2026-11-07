import {expect,it} from "vitest";
import {collectionCatalog,collectionDefinition,collectionLabel,collectionOptions,isCollectionKind} from "./collection-catalog";
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
