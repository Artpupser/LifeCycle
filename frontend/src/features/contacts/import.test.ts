import { describe, expect, it } from "vitest";
import { parseContactFile, parseVcards } from "./import";
import { contactMatches, emptyContact, mergeImported } from "./types";
describe("contact import", () => {
  it("imports explicit gender without guessing and preserves known gender when an import omits it",()=>{
    const card=parseVcards("BEGIN:VCARD\nVERSION:4.0\nFN:Anna\nGENDER:F\nEND:VCARD").contacts[0];expect(card.gender).toBe("female");
    const old={...emptyContact(),first_name:"Anna",gender:"female" as const};expect(mergeImported(old,emptyContact()).gender).toBe("female");
    expect(parseContactFile(JSON.stringify({version:1,contacts:[old]})).contacts[0].gender).toBe("female");
    expect(()=>parseContactFile(JSON.stringify({version:1,contacts:[{...old,gender:"invalid"}]}))).toThrow();
  });
  it("reads folded vCards, escaped names, multiple phones and leap birthdays", () => {
    const { contacts, warnings } = parseVcards("BEGIN:VCARD\r\nVERSION:4.0\r\nN:Иванова;Анна;Петровна;;\r\nTEL;VALUE=uri:tel:+79001234567\r\nTEL:+79007654321\r\nBDAY:20000229\r\nNOTE:Первая\\nвторая\r\n строка\r\nCATEGORIES:Семья,Коллеги\\, друзья\r\nUID:stable-id\r\nEND:VCARD");
    expect(warnings).toEqual([]); expect(contacts[0]).toMatchObject({ first_name: "Анна", last_name: "Иванова", middle_name: "Петровна", birth_date: "2000-02-29", description: "Первая\nвтораястрока", source_keys: ["vcard:stable-id"], categories: ["Семья", "Коллеги, друзья"] });
    expect(contacts[0].phones).toHaveLength(2);
  });
  it("decodes legacy quoted printable and reports unknown-year dates without inventing a year", () => {
    const result = parseVcards("BEGIN:VCARD\nVERSION:2.1\nFN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=D0=90=D0=BD=D0=BD=D0=B0\nBDAY:--0229\nEND:VCARD");
    expect(result.contacts[0].first_name).toBe("Анна"); expect(result.contacts[0].birth_date).toBeNull(); expect(result.warnings).toHaveLength(1);
    expect(parseVcards("BEGIN:VCARD\nFN:A\nBDAY:2001-02-29\nEND:VCARD").warnings).toHaveLength(1);
  });
  it("preserves local fields and matches formatted numbers or stable source IDs when importing again", () => {
    const old = { ...emptyContact(), first_name: "Anna", phones: ["+7 (900) 123-45-67"], relationship: "Friend", tags: ["local"] };
    const next = { ...emptyContact(), first_name: "Anne", phones: ["0079001234567"], tags: ["import"] };
    expect(contactMatches(old, next)).toBe(true);
    expect(mergeImported(old, next)).toMatchObject({ first_name: "Anne", phones: old.phones, relationship: "Friend", tags: ["local", "import"] });
    const backup = parseContactFile(JSON.stringify({ version: 1, contacts: [old] })); expect(backup.contacts).toEqual([old]);
    expect(() => parseContactFile('{"version":1,"contacts":[{"phones":42}]}')).toThrow();
  });
});
