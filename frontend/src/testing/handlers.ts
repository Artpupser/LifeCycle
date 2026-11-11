import {http,HttpResponse} from "msw";
import {emptyOrigin,emptyFirsts} from "@/features/profile/types";
export const mockSettings={timezone:"Europe/Moscow",time_format:"24h",language:"ru",theme:"light",week_starts_on:"monday",pomodoro_work_minutes:25,pomodoro_break_minutes:5,animations_enabled:false,effects_enabled:false,sounds_enabled:false};
/** Opt-in development fixtures; never use real account data in mocks. */
export const handlers=[
 http.get("*/api/auth/me",()=>HttpResponse.json({user:{id:"mock-user",email:"demo@example.test"}})),
 http.get("*/api/settings",()=>HttpResponse.json(mockSettings)),
 http.get("*/api/profile",()=>HttpResponse.json({revision:1,name:"",nickname:"",gender:"unspecified",birth_date:null,birth_country:"",residence_country:"",origin:emptyOrigin,firsts:emptyFirsts,harmful_habits:[],conditions:[],daily_medications:[],past_medications:[],surgeries:[],height_cm:null,weight_kg:null,arms_count:null,legs_count:null,eye_color:"",hair_color:"",skin_color:"",colleagues_count:null,friends_count:null,acquaintances_count:null,has_family:null,has_partner:null,penis_length_cm:null,penis_width_cm:null,breast_size:"",pregnant:null})),
 http.get("*/api/navigation",()=>HttpResponse.json({ordering:["/today","/tasks","/calendar","/profile","/settings"],pinned:["/today","/tasks","/calendar","/profile","/settings"],revision:1})),
 http.get("*/api/notifications/push",()=>HttpResponse.json({public_key:null,subscriptions:[]})),
 ...["notifications","labels","labels/values","labels/subject-tags","integrations","contacts","contacts/relationships","notes","notes/folders","tasks","boards","events","countdowns"].map(path=>http.get(`*/api/${path}`,()=>HttpResponse.json([]))),
];
