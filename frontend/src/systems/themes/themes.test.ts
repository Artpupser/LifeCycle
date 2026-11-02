import {expect,it} from "vitest";
import {readableText,themes,themeStyle,validTheme} from "./themes";
it("all shipped themes keep normal text and primary actions readable",()=>{
 for(const [name,theme] of Object.entries(themes))expect(validTheme(theme),name).toBe(true);
 expect(readableText("#ffffff")).toBe("#172314");expect(readableText("#000000")).toBe("#ffffff");
});
it("rejects unreadable palettes and CSS values outside the color contract",()=>{
 expect(validTheme({...themes.light,foreground:themes.light.background})).toBe(false);
 expect(validTheme({...themes.light,background:'url("https://example.test/pixel")'})).toBe(false);
 expect(themeStyle(themes.light)["--primary-foreground"]).toBe(themes.light.primary_foreground);
});
