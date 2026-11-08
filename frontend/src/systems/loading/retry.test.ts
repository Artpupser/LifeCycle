import {afterEach,expect,it,vi} from "vitest";
import {requestCooldown,recordRequestFailure,recordRequestSuccess,clearRequestCooldowns} from "./retry";
import {retryAfterMilliseconds} from "@/lib/dates";
afterEach(()=>{clearRequestCooldowns();vi.useRealTimers();});
it("grows transient failure delays and resets only after confirmed recovery",()=>{
 vi.useFakeTimers();vi.setSystemTime(0);
 const first=new Error("failed");expect(recordRequestFailure("/videogames",first,{status:500,code:"internal_error"})).toBe(30_000);
 recordRequestFailure("/videogames",first);expect(requestCooldown("/videogames/refresh")?.failures).toBe(1);
 recordRequestSuccess("/videogames");expect(requestCooldown("/videogames")).not.toBeNull();
 vi.setSystemTime(30_001);expect(requestCooldown("/videogames")).toBeNull();
 expect(recordRequestFailure("/videogames",new Error("again"),{status:503,code:"unavailable"})).toBe(90_001);
 vi.setSystemTime(90_002);recordRequestSuccess("/videogames");
 expect(recordRequestFailure("/videogames",new Error("new"),{status:500,code:"internal_error"})).toBe(120_002);
 expect(requestCooldown("/profile")).toBeNull();
});
it("honors numeric and HTTP-date Retry-After and applies a five-minute 429 minimum",()=>{
 vi.useFakeTimers();vi.setSystemTime(Date.parse("2026-11-08T12:00:00Z"));const now=Date.now();
 expect(retryAfterMilliseconds("Sun, 08 Nov 2026 12:15:00 GMT",now)).toBe(900_000);
 expect(retryAfterMilliseconds("nonsense",now)).toBe(0);
 expect(recordRequestFailure("/videogames",new Error(),{status:429,code:"rate_limited",retryAfter:"1"})).toBe(now+300_000);
 expect(recordRequestFailure("/notes",new Error(),{status:429,code:"rate_limited",retryAfter:"900"})).toBe(now+900_000);
});
it("keeps gateway bans across resource paths and ignores validation/cancelled requests",()=>{
 vi.useFakeTimers();vi.setSystemTime(0);
 expect(recordRequestFailure("/profile",new Error(),{status:400,code:"validation_error"})).toBeNull();
 recordRequestFailure("/videogames",Object.assign(new Error(),{name:"AbortError"}));expect(requestCooldown("/videogames")).toBeNull();
 recordRequestFailure("/videogames",new Error(),{status:429,code:"request_failed",global:true});expect(requestCooldown("/profile")?.retryAt).toBe(300_000);
});
it("migrates persisted whole-integration pauses without discarding external deadlines or global bans",()=>{
 vi.useFakeTimers();vi.setSystemTime(0);
 let value=JSON.stringify({"/integrations":{failures:2,retryAt:600_000,status:429,code:"rate_limited"},"/integrations/private-account/settings":{failures:1,retryAt:900_000,status:500,code:"internal_error"}});
 vi.stubGlobal("window",{localStorage:{getItem:()=>value,setItem:(_key:string,next:string)=>{value=next;},removeItem:()=>{value="{}";}}});
 try{
  expect(requestCooldown("/integrations")).toBeNull();expect(requestCooldown("/integrations/epic","PUT")).toBeNull();
  expect(requestCooldown("/integrations/epic/connect","POST")?.retryAt).toBe(600_000);
  expect(requestCooldown("/integrations/epic/authorize","POST")?.retryAt).toBe(600_000);
  expect(JSON.parse(value)["/integrations"]).toBeUndefined();expect(value).not.toContain("private-account");
  recordRequestFailure("/videogames",new Error(),{status:429,code:"request_failed",global:true});
  expect(requestCooldown("/integrations/steam","PUT")?.retryAt).toBe(300_000);
 }finally{clearRequestCooldowns();vi.unstubAllGlobals();}
});
