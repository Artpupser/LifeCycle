import {expect,it} from "vitest";
import {quickSchedule} from "./quick-date-values";
import type {Task} from "./types";
it("quick dates shift the complete recurring rule without dropping its end or time",()=>{const task={schedule:{start_date:"2026-11-02",time:"09:00",timezone:"Europe/Moscow",duration_minutes:45,recurrence:"weekly",interval_days:1,weekdays:[1,3],end_date:"2026-11-20"}} as Task;expect(quickSchedule(task,"2026-11-03","Europe/Moscow")).toMatchObject({start_date:"2026-11-03",time:"09:00",duration_minutes:45,weekdays:[2,4],end_date:"2026-11-21"});expect(quickSchedule(task,null,"UTC")).toBeNull();expect(quickSchedule({schedule:null} as Task,"2026-11-04","UTC")).toMatchObject({time:null,recurrence:"once",start_date:"2026-11-04"});});
