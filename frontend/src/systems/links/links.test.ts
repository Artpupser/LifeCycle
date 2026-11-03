import {expect,it} from "vitest";
import {phoneLinks,safeExternalUrl,linkIcon} from "./links";
it("builds explicit phone actions without opening or sending anything",()=>{
 const links=phoneLinks("+7 (916) 123-45-67");expect(links).toHaveLength(5);expect(links.find(link=>link.service==="whatsapp")?.href).toBe("https://wa.me/79161234567");expect(links.find(link=>link.service==="telegram")?.href).toBe("https://t.me/+79161234567");for(const link of links)expect(safeExternalUrl(link.href)).toBeTruthy();expect(phoneLinks("javascript:alert(1)")).toEqual([]);
});
it("rejects unsafe schemes, credentials and injected mail headers",()=>{
 for(const url of ["javascript:alert(1)","data:text/html,x","https://user:secret@example.com","mailto:a@example.com%0d%0aBcc:x@example.com","viber://evil?number=+79161234567"])expect(safeExternalUrl(url)).toBe("");expect(linkIcon("https://github.com/user")).toBe("simple-icons:github");
});
