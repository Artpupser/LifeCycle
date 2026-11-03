import {afterEach,expect,it,vi} from "vitest";
import {configureAnimations,motionAllowed,scrollElement} from "./policy";
afterEach(()=>{vi.unstubAllGlobals();configureAnimations(true);});
it("honors both the account switch and system reduction for smooth scrolling",()=>{
 let reduced=false;
 vi.stubGlobal("window",{matchMedia:()=>({matches:reduced})});
 const element={scrollTo:vi.fn(),scrollBy:vi.fn()} as unknown as HTMLElement;
 expect(motionAllowed()).toBe(true);scrollElement(element,{top:200});
 expect(element.scrollTo).toHaveBeenLastCalledWith({top:200,behavior:"smooth"});
 reduced=true;expect(motionAllowed()).toBe(false);scrollElement(element,{left:320,relative:true});
 expect(element.scrollBy).toHaveBeenLastCalledWith({left:320,behavior:"instant"});
 reduced=false;configureAnimations(false);expect(motionAllowed()).toBe(false);
});
