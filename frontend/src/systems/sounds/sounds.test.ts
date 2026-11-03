import {afterEach,expect,it,vi} from "vitest";
vi.mock("@foleyjs/core",()=>({play:vi.fn(),set:vi.fn()}));
import {play,set} from "@foleyjs/core";
import {configureSounds,playSound,previewSound,playTaskResult} from "./sounds";
afterEach(()=>{configureSounds({sounds_enabled:false});vi.clearAllMocks();vi.useRealTimers();});
it("master mute blocks every channel and preview",()=>{
 configureSounds({sounds_enabled:false});playSound("tap");playSound("chime","notification");previewSound({sounds_enabled:false});expect(play).not.toHaveBeenCalled();
});
it("UI and notification channels can be controlled separately",()=>{
 configureSounds({sounds_enabled:true,sound_ui:false,sound_notifications:true,sound_volume:20,sound_theme:"glass"});playSound("tap");playSound("success","notification");expect(play).toHaveBeenCalledTimes(1);expect(play).toHaveBeenCalledWith("success");
 expect(set).toHaveBeenCalledWith(expect.objectContaining({muted:false,volume:.2,theme:"glass"}));
});
it("disabling sound cancels a pending preview restore",()=>{
 vi.useFakeTimers();configureSounds({sounds_enabled:true});previewSound({sounds_enabled:true});configureSounds({sounds_enabled:false});vi.advanceTimersByTime(2000);expect(set).toHaveBeenLastCalledWith(expect.objectContaining({muted:true}));
});

it("plays distinct completion and cancellation feedback through the UI mute policy",()=>{
 configureSounds({sounds_enabled:true,sound_ui:true});playTaskResult("completed");playTaskResult("rejected");expect(play).toHaveBeenNthCalledWith(1,"success");expect(play).toHaveBeenNthCalledWith(2,"bubble");vi.mocked(play).mockClear();configureSounds({sounds_enabled:true,sound_ui:false});playTaskResult("completed");expect(play).not.toHaveBeenCalled();
});
