import {expect,it} from "vitest";
import {iconCatalog,iconData,loadIconPack,resolveIcon} from "./catalog";
import {countries,countryFlag} from "@/systems/phone/countries";
it("offers UI, decorative, brand and country icons from a single local catalog",async()=>{
 await Promise.all([loadIconPack("circle-flags"),loadIconPack("simple-icons")]);
 expect(new Set(iconCatalog.map(icon=>icon.id)).size).toBe(iconCatalog.length);
 for(const icon of iconCatalog)expect(iconData(icon.id)?.body,icon.id).toBeTruthy();
 for(const country of countries)expect(iconData(countryFlag(country)),country).toBeTruthy();
 expect(iconCatalog.some(icon=>icon.id==="lifecycle:mark")).toBe(true);
 expect(iconData("lifecycle:mark")?.body).toContain('<g fill="none">');
 expect(iconCatalog.some(icon=>icon.id==="tabler:rocket")).toBe(true);
});
it("maps historical values and falls back without loading arbitrary remote names",()=>{
 expect(resolveIcon("🌱")).toBe("tabler:seedling");expect(resolveIcon("cake")).toBe("tabler:cake");
 expect(resolveIcon("simple-icons:github")).toBe("simple-icons:github");
 expect(resolveIcon("https://untrusted.test/icon.svg")).toBe("tabler:sparkles");
 expect(resolveIcon("constructor")).toBe("tabler:sparkles");
 expect(resolveIcon("__proto__")).toBe("tabler:sparkles");
});
