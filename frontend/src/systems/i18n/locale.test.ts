import {afterEach,expect,it} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {english} from "./messages";
import {getLocale,setLanguage,t} from "./locale";
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
