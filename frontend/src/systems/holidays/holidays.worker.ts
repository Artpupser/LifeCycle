import { buildHolidayYear } from "./engine";
self.onmessage=(event:MessageEvent<{year:number}>)=>{
  const year=event.data.year;
  try {self.postMessage({year,value:buildHolidayYear(year)});}
  catch {self.postMessage({year,error:true});}
};
