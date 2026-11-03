import {afterEach,expect,it,vi} from "vitest";
import {rangeOperator} from "./ranges";
import {lookupOperator,resetOperators} from "./service";
vi.mock("@/lib/api",()=>({api:vi.fn()}));
import {api} from "@/lib/api";
afterEach(()=>{resetOperators();vi.unstubAllGlobals();vi.clearAllMocks();});
it("uses allocation ranges locally, with no current-provider claim",()=>{
 expect(rangeOperator("+79161234567")).toMatchObject({operator:"МТС",source:"range"});expect(rangeOperator("+79261234567")).toMatchObject({operator:"МегаФон",source:"range"});expect(rangeOperator("+493012345678")).toBeNull();
});
it("deduplicates normalized phone lookups and caches online answers",async()=>{
 vi.mocked(api).mockResolvedValue({operator:"t2",source:"online",checked_at:"2026-11-03T12:00:00Z",ported:true});await Promise.all([lookupOperator("+7 (916) 123-45-67"),lookupOperator("+79161234567")]);await lookupOperator("+79161234567");expect(api).toHaveBeenCalledOnce();expect(await lookupOperator("+79161234567")).toMatchObject({operator:"t2",ported:true});
});
it("falls back without a network request when offline",async()=>{
 vi.stubGlobal("navigator",{onLine:false});expect(await lookupOperator("+79161234567")).toMatchObject({operator:"МТС",source:"range"});expect(api).not.toHaveBeenCalled();
});
