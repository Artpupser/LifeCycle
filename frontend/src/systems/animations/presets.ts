import type {Transition} from "motion/react";
export const transitions={quick:{duration:.16,ease:"easeOut"},surface:{type:"spring",bounce:.12,visualDuration:.24}} satisfies Record<string,Transition>;
export const entrances={dialog:{opacity:0,y:10,scale:.985},notice:{opacity:0,y:12},card:{opacity:0,y:5}};
