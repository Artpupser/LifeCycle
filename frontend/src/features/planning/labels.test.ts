import {expect,it} from "vitest";
import {normalizeLabels} from "./types";
it("normalizes tag entry consistently while preserving names and legacy contact punctuation",()=>{
 expect(normalizeLabels(" Работа,работа, Дом\nдом, ")).toEqual(["Работа","Дом"]);
 expect(normalizeLabels("Друзья, коллеги\n Семья \nсемья", "lines")).toEqual(["Друзья, коллеги","Семья"]);
 expect(normalizeLabels([" Работа ","работа","Дом"])).toEqual(["Работа","Дом"]);
});
