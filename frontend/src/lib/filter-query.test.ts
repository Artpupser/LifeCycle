import {expect,it} from "vitest";
import {parseFilterQuery,matchesFilter,tagFilter,aiFilter,type FilterSpec} from "./filter-query";
const specs:FilterSpec[]=[tagFilter,aiFilter,{key:"folder",aliases:["папка"],label:"Папка",example:'папка:"Идеи работы"'},{key:"from",aliases:["с"],label:"С",example:"с:2026-11-01"},{key:"to",aliases:["по"],label:"По",example:"по:2026-11-30"}];
it("combines text, quoted Unicode values, aliases and exclusions",()=>{
 const query=parseFilterQuery('План папка:"Идеи работы" тег:Работа -tag:архив ai:нет',specs);
 expect(query.errors).toEqual([]);expect(query.text).toBe("План");
 expect(matchesFilter(query,"План на завтра",{folder:"Идеи работы",tag:["работа"],ai:false})).toBe(true);
 expect(matchesFilter(query,"План на завтра",{folder:"Идеи работы",tag:["работа","архив"],ai:false})).toBe(false);
 expect(matchesFilter(query,"План на завтра",{folder:"Идеи работы",tag:["работа"],ai:true})).toBe(false);
});
it("bounds dates inclusively, requires dates and supports several tag filters",()=>{
 const query=parseFilterQuery('с:2026-11-01 по:2026-11-30 тег:один tag:два',specs);
 expect(matchesFilter(query,"",{from:"2026-11-01",to:"2026-11-01",tag:["один","два"]})).toBe(true);
 expect(matchesFilter(query,"",{from:"2026-10-31",to:"2026-10-31",tag:["один","два"]})).toBe(false);
 expect(matchesFilter(query,"",{from:null,to:null,tag:["один","два"]})).toBe(false);
 expect(matchesFilter(query,"",{from:"2026-11-01",to:"2026-11-01",tag:["один"]})).toBe(false);
});
it("reports unsupported filters, invalid boolean/date and unfinished quotes",()=>{
 for(const text of ['unknown:yes','ai:maybe','с:завтра','папка:"Не закончено','тег:'])expect(parseFilterQuery(text,specs).errors.length).toBeGreaterThan(0);
 expect(matchesFilter(parseFilterQuery('unknown:yes',specs),"anything",{})).toBe(false);
});
it("keeps ordinary URLs searchable and quoted literal colons literal",()=>{
 expect(parseFilterQuery('https://example.test "Идея:"',specs)).toEqual({text:'https://example.test Идея:',terms:[],errors:[]});
 expect(parseFilterQuery('папка:"Идеи \\"работы\\""',specs).terms[0]?.value).toBe('Идеи "работы"');
});

import { filterRange, rangeFilters } from "./filter-query";
it("validates server ranges without silently dropping unsupported text, exclusions or duplicates",()=>{
 const defaults={from:"2026-11-01",to:"2026-11-30"};
 expect(filterRange(parseFilterQuery('с:2024-01-01 по:2024-12-31',rangeFilters),defaults).error).toBeNull();
 for(const source of ['с:2025-01-01 по:2026-01-02','с:2026-11-30 по:2026-11-01','с:2026-02-29','-с:2026-11-01','с:2026-11-01 from:2026-11-02','неподдержанный текст']){
  expect(filterRange(parseFilterQuery(source,rangeFilters),defaults).error).toBeTruthy();
 }
});
