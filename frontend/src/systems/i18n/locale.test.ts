import {afterEach,expect,it,vi} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {english} from "./messages";
import {getLanguage,getLocale,setLanguage,t,resolveLanguage,languageName} from "./locale";
import {recurrenceLabels} from "@/features/countdowns/types";
import {dateTimeLabel} from "@/lib/dates";
import {Markdown} from "@/components/markdown";
afterEach(()=>setLanguage("ru"));
it("switches labels, templates and date formatting without reimporting modules",async()=>{
 expect(recurrenceLabels.daily).toBe("Ежедневно");await setLanguage("en");
 expect(recurrenceLabels.daily).toBe("Daily");expect(getLocale()).toBe("en-US");expect(t("Удалить событие {v0}",{v0:"Личная дата"})).toBe("Delete event Личная дата");
 expect(dateTimeLabel("2026-11-02T12:00:00Z","UTC")).toContain("November");
});
it("never translates user Markdown and preserves interpolation values",async()=>{
 await setLanguage("en");expect(renderToStaticMarkup(createElement(Markdown,{value:"**Работа**"}))).toContain("<strong>Работа</strong>");
 expect(t("Задача")).toBe("Task");expect(t("constructor")).toBe("constructor");expect(t("  ")).toBe("  ");expect(t("Удалить событие {v0}",{v0:"{v1}"})).toBe("Delete event {v1}");
});
it("the English catalog preserves every interpolation placeholder",()=>{
 for(const [source,translation]of Object.entries(english))expect([...translation.matchAll(/\{\w+\}/g)].map(match=>match[0]).sort(),source).toEqual([...source.matchAll(/\{\w+\}/g)].map(match=>match[0]).sort());
});
it("resolves regional languages and falls back to English for unavailable translations",async()=>{
 expect(resolveLanguage("ru-RU")).toEqual({language:"ru",fallback:false});
 expect(resolveLanguage("EN_us")).toEqual({language:"en",fallback:false});
 for(const code of ["de","fr-CA","zz",""])expect(resolveLanguage(code)).toEqual({language:"en",fallback:true});
 expect(languageName("de")).toBe("Немецкий");
 expect(await setLanguage("de-DE")).toMatchObject({language:"en",fallback:true,applied:true});
 expect(getLanguage()).toBe("en");expect(t("Настройки")).toBe("Settings");
});
it("a newer language selection supersedes an earlier asynchronous fallback",async()=>{
 vi.resetModules();const isolated=await import("./locale");
 const first=isolated.setLanguage("de");const second=isolated.setLanguage("ru");
 expect(await first).toMatchObject({applied:false});await second;expect(isolated.getLanguage()).toBe("ru");
});
