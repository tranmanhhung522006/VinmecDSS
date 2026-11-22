import {Database} from '../../infrastructure/database';

export const MORNING_SLOT='08:00-12:00';
export const AFTERNOON_SLOT='13:00-17:00';

export function todayVietnamDate():string {
  return new Date(Date.now()+7*60*60*1000).toISOString().slice(0,10);
}
export function isValidObservedDay(raw:string):boolean {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return false;
  const date=new Date(raw+'T00:00:00.000Z');
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===raw
    &&raw<=''+todayVietnamDate();
}

/** The same per-day aggregation that forecasting uses, with fixed synthetic slots. */
export async function listVisitHistory(db:Database){
  const department=await db.department.findFirst({orderBy:{name:'asc'}});
  if(!department)return {department:null,days:[],totalDays:0,synthetic:true};
  const records=await db.visitAggregate.findMany({
    where:{departmentId:department.id},orderBy:[{day:'desc'},{slot:'asc'}],
    select:{day:true,slot:true,visits:true}
  });
  const days=new Map<string,{day:string;morningVisits:number;afternoonVisits:number;totalVisits:number}>();
  for(const record of records){
    const day=record.day.toISOString().slice(0,10);
    const entry=days.get(day)??{day,morningVisits:0,afternoonVisits:0,totalVisits:0};
    if(record.slot===MORNING_SLOT)entry.morningVisits+=record.visits;
    if(record.slot===AFTERNOON_SLOT)entry.afternoonVisits+=record.visits;
    entry.totalVisits+=record.visits;
    days.set(day,entry);
  }
  return {department:department.name,totalDays:days.size,days:[...days.values()].slice(0,120),synthetic:true,
    note:'Lượt khám tổng hợp giả lập; chỉ ngày đã ghi nhận, không phải số liệu bệnh nhân thực tế.'};
}
