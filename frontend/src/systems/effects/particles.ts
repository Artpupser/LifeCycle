import type {EffectRequest} from "./events";
import {effectsEnabled} from "./events";
import {prefersReducedMotion} from "@/systems/animations/policy";
let canvas:HTMLCanvasElement|null=null;
let running:{destroy:(remove?:boolean)=>void;fpsLimit:number}|undefined;
let timeout:ReturnType<typeof setTimeout>|undefined;
let generation=0;
let queue=Promise.resolve();
export function clearParticles(){generation++;clearTimeout(timeout);running?.destroy();running=undefined;canvas?.remove();canvas=null;}
export function playParticles(request:EffectRequest) {
  if(!effectsEnabled()||prefersReducedMotion()||document.hidden)return Promise.resolve();
  clearTimeout(timeout);
  const version=++generation;
  queue=queue.catch(()=>{}).then(()=>renderParticles(request,version));
  return queue;
}
async function renderParticles(request:EffectRequest,version:number) {
  if(version!==generation||!effectsEnabled()||prefersReducedMotion()||document.hidden)return;
  const {confetti}=await import("@tsparticles/confetti");
  if(version!==generation||!effectsEnabled()||prefersReducedMotion()||document.hidden)return;
  running?.destroy();canvas?.remove();clearTimeout(timeout);
  canvas=document.createElement("canvas");canvas.id="lifecycle-effects";canvas.dataset.effect=request.kind;
  canvas.setAttribute("aria-hidden","true");
  Object.assign(canvas.style,{position:"fixed",inset:"0",width:"100%",height:"100%",pointerEvents:"none",zIndex:"110"});
  const dialogs=document.querySelectorAll<HTMLDialogElement>("dialog[open]");
  const dialog=dialogs[dialogs.length-1];(dialog??document.body).append(canvas);
  const css=getComputedStyle(document.documentElement);
  const token=(name:string)=>css.getPropertyValue(`--${name}`).trim();
  const strong=request.kind==="complete",soft=["notice","confirm","error"].includes(request.kind);
  const color=request.kind==="error"||request.kind==="remove"?token("destructive"):token("primary");
  let origin=request.origin??{x:.5,y:.6};
  if(dialog){const rect=dialog.getBoundingClientRect();origin={x:(rect.left+rect.width/2)/window.innerWidth,y:(rect.top+rect.height/2)/window.innerHeight};}
  const target=canvas;
  const fire=await confetti.create(target,{count:0});
  if(version!==generation||!effectsEnabled()||prefersReducedMotion()||document.hidden){
    (await fire({particleCount:0}))?.destroy();target.remove();if(canvas===target)canvas=null;return;
  }
  const container=await fire({particleCount:strong?28:soft?6:12,spread:strong?65:35,startVelocity:strong?20:9,gravity:.7,decay:.92,ticks:65,scalar:soft?.45:.65,colors:[color,token("muted-foreground")],shapes:strong?["square","circle"]:["circle"],origin,disableForReducedMotion:true,zIndex:110});
  if(version!==generation||!effectsEnabled()||prefersReducedMotion()||document.hidden){container?.destroy();target.remove();if(canvas===target)canvas=null;return;}
  running=container;if(running)running.fpsLimit=40;
  timeout=setTimeout(clearParticles,1200);
}
