import {afterEach,expect,it} from "vitest";
import {formatPhone,parsePhone,phoneKey,possiblePhone} from "./phone";
import {callingCode,countryCode,countryName} from "./countries";
import {setLanguage} from "@/systems/i18n/locale";
afterEach(()=>setLanguage("ru"));
it("parses international and national numbers without a hand-written mask",()=>{
 expect(parsePhone("+1 (202) 555-0123")?.country).toBe("US");
 expect(formatPhone("8 912 345 67 89","RU")).toBe("+7 912 345 67 89");
 expect(possiblePhone("123","RU")).toBe(false);
 expect(phoneKey("+7 (912) 345-67-89")).toBe("79123456789");
});
it("resolves stored country codes and old names in either language",async()=>{
 expect(countryCode("Россия")).toBe("RU");expect(countryCode("Russia")).toBe("RU");expect(countryCode("Страна из старой анкеты")).toBeNull();
 expect(callingCode("GB")).toBe("44");expect(countryName("DE")).toBe("Германия");await setLanguage("en");expect(countryName("DE")).toBe("Germany");
});
