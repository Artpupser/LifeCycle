import {createElement,Fragment} from "react";
import {expect,it} from "vitest";
import {choiceOptions} from "./choice-options";
it("preserves exact values, punctuation and disabled groups in declarative choice catalogs",()=>{
 const children=createElement(Fragment,null,
  createElement("option",{value:""},"Не указано"),
  createElement("optgroup",{label:"Семья",disabled:true},createElement("option",{value:"a,b"},"Анна, Мария")),
  [false,createElement("option",{key:"zero",value:0},"Ноль"),createElement("option",{key:"implicit"},"Имя без кода")]);
 expect(choiceOptions(children)).toEqual([
  {value:"",label:"Не указано",group:undefined,disabled:undefined},
  {value:"a,b",label:"Анна, Мария",group:"Семья",disabled:true},
  {value:"0",label:"Ноль",group:undefined,disabled:undefined},
  {value:"Имя без кода",label:"Имя без кода",group:undefined,disabled:undefined},
 ]);
});
