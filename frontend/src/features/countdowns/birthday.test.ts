import {expect,it} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {ZodiacBadge} from "@/systems/icons/zodiac-badge";
import {countdownBirthDate,isBirthdayCountdown} from "./birthday";

it("uses the same birthday classification for counters and zodiac, including legacy cake icons",()=>{
 const event={contact_birthday:false,category:"other",icon:"tabler:calendar",suspended:false,target_date:"1980-03-21"};
 expect(countdownBirthDate(event)).toBeNull();
 for(const birthday of [{...event,contact_birthday:true},{...event,category:"birthday"},{...event,icon:"cake"}]){
  expect(isBirthdayCountdown(birthday)).toBe(true);
  expect(countdownBirthDate(birthday)).toBe("1980-03-21");
  expect(renderToStaticMarkup(createElement(ZodiacBadge,{birthDate:countdownBirthDate(birthday)}))).toContain("Овен");
 }
 expect(countdownBirthDate({...event,category:"birthday",suspended:true})).toBeNull();
 expect(countdownBirthDate({...event,category:"birthday",target_date:null})).toBeNull();
});
