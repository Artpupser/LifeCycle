import {beforeAll,expect,it} from "vitest";
import {buildHolidayYear,holidayIdentity} from "./engine";
import {holidayFilters,holidayOccurrences,matchesHoliday} from "./holidays";
import {parseFilterQuery} from "@/lib/filter-query";
import type {HolidayYear} from "./types";
let year:HolidayYear;
beforeAll(()=>{year=buildHolidayYear(2026);});
it("keeps a holiday as one object with country-specific dates and kinds",()=>{
  expect(year.countries.length).toBeGreaterThan(200);
  const newYear=year.holidays.find(h=>h.id==="shared:New Year's Day")!;
  expect(newYear.countries).toEqual(expect.arrayContaining(["RU","US","JP"]));
  expect(newYear.countries.length).toBeGreaterThan(100);
  expect(year.holidays.filter(h=>h.id===newYear.id)).toHaveLength(1);
  const list=holidayOccurrences([newYear],"2026-01-01","2026-01-01");
  expect(list.some(item=>item.countries.includes("RU")&&item.countries.includes("US"))).toBe(true);
  expect(holidayIdentity("RU","Independence Day","06-12")).not.toBe(holidayIdentity("US","Independence Day","07-04"));
});
it("calculates floating and multi-day holidays without shifting their civil dates",()=>{
  const thanksgiving=year.holidays.find(h=>h.countries.includes("US")&&h.name.en==="Thanksgiving Day")!;
  expect(thanksgiving.observances.find(item=>item.country==="US")?.date).toBe("2026-11-26");
  const vacation=year.holidays.find(h=>h.name.ru==="Новогодние каникулы")!;
  expect(vacation.observances[0]).toMatchObject({date:"2026-01-02",through:"2026-01-06"});
  expect(holidayOccurrences([vacation],"2026-01-05","2026-01-05")).toHaveLength(1);
});
it("searches local countries and uncommon international observances through shared filters",()=>{
  const items=holidayOccurrences(year.holidays,"2026-11-01","2026-11-30");
  const local=parseFilterQuery("страна:Россия",holidayFilters);
  const result=items.filter(item=>matchesHoliday(local,item));
  expect(result.some(item=>item.holiday.name.ru.includes("единства"))).toBe(true);
  expect(result.some(item=>item.holiday.id==="un:toilet-day")).toBe(true);
  expect(result.some(item=>item.countries.includes("US")&&!item.countries.includes("RU"))).toBe(false);
  const rare=parseFilterQuery("World Toilet kind:observance country:JP",holidayFilters);
  expect(items.filter(item=>matchesHoliday(rare,item)).map(item=>item.holiday.id)).toEqual(["un:toilet-day"]);
  expect(items.filter(item=>matchesHoliday(parseFilterQuery("страна:RU тип:несуществующий",holidayFilters),item))).toEqual([]);
});
it("bounds calculations to the supported calendar range",()=>{
 expect(()=>buildHolidayYear(1969)).toThrow();expect(()=>buildHolidayYear(2081)).toThrow();expect(()=>buildHolidayYear(NaN)).toThrow();
});
