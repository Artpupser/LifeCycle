import {z} from "zod";
// Keep domain-specific transformations in their owners. These schemas validate raw editor data.
const text=z.string().trim().min(1,"Заполните обязательные поля.");
export const editorSchemas={
 titled:z.object({title:text.max(200)}).passthrough(),
 named:z.object({name:text.max(100)}).passthrough(),
 contact:z.object({first_name:z.string().max(200),last_name:z.string().max(200),tags:z.array(z.string()),phones:z.array(z.string())}).passthrough(),
 profile:z.object({name:z.string().max(200)}).passthrough(),
 settings:z.object({timezone:text,time_format:z.enum(["12h","24h"]),language:z.enum(["ru","en"]),pomodoro_work_minutes:z.number().int().min(1).max(180),pomodoro_break_minutes:z.number().int().min(1).max(180)}).passthrough(),
 program:z.object({name:text.max(100),data:z.object({work_seconds:z.number().int().min(1).max(86400),chill_seconds:z.number().int().min(1).max(86400),more_chill_seconds:z.number().int().min(1).max(86400),sequence:z.array(z.enum(["w","c","mc"])).min(1).max(60).refine(items=>items.includes("w"),"Заполните обязательные поля."),repeat:z.boolean()})}).passthrough(),
 record:z.record(z.string(),z.unknown()),
 text:z.string(),
};
