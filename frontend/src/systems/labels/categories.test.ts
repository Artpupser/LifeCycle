import {formatLabels,normalizeLabels} from "./values";
import {expect,it} from "vitest";
import {eventCategory,categoryName,categoryTerms} from "./categories";
import {birthdayAges} from "@/lib/dates";
it("maps historical event categories and resolves reusable custom choices",()=>{
 expect(eventCategory("День рождения")).toBe("birthday");expect(eventCategory("Работа")).toBe("work");expect(eventCategory("unlisted")).toBe("other");const id="123e4567-e89b-12d3-a456-426614174000";expect(categoryName(`custom:${id}`,[{id,name:"Моя категория",color:"#123456",revision:1,kind:"category"}])).toBe("Моя категория");expect(categoryTerms("work")).toContain("Работа");
});
it("calculates current and upcoming birthday age for an independent event",()=>{
 expect(birthdayAges("2000-11-04","2026-11-04","Asia/Tokyo",Date.parse("2026-11-03T12:00:00Z"))).toMatchObject({current:25,next:26,today:false});
 expect(birthdayAges("2000-11-04","2026-11-04","Asia/Tokyo",Date.parse("2026-11-03T16:00:00Z"))).toMatchObject({current:26,next:26,today:true});
 expect(birthdayAges("2000-02-29","2027-02-28","UTC",Date.parse("2027-02-27T12:00:00Z"))).toMatchObject({current:26,next:27});
 expect(birthdayAges(null,null,"UTC")).toBeNull();
});

it("round-trips shared names containing commas without splitting legacy contact labels",()=>{
 const names=['Друзья, коллеги','Команда "А"','Дом'];expect(normalizeLabels(formatLabels(names))).toEqual(names);expect(normalizeLabels('Друзья, коллеги\nДом',"lines")).toEqual(['Друзья, коллеги','Дом']);
});
