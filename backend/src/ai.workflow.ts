import {createHash} from 'node:crypto';
import {compareAlternatives,computeDemand,type Assumptions,type Alternative} from './dss.engine';

export type IntentKind='explain'|'compare'|'risk'|'decision_brief'|'what_if'|'clarify';
export type Intent={kind:IntentKind;demandChangePercent:number|null;absoluteDemand:number|null;doctorDelta:number|null;roomDelta:number|null;topic:string};
export type ChatTurn={role:'user'|'assistant';text:string};
export type ScenarioFacts={
  id:string; title:string; targetDay:Date|string; demand:number; baselineDemand:number;growthPercent:number;
  assumptions:unknown; alternatives:unknown;recommendation:unknown;
};
export type WhatIfPreview={
  originalDemand:number; projectedDemand:number; originalDoctors:number;
  changes:{demandChangePercent:number|null;absoluteDemand:number|null;doctorDelta:number|null;roomDelta:number|null};
  assumptions:Assumptions; alternatives:Alternative[];recommended:Alternative|null;criteria:string;
  requestedOption:{doctors:number;capacity:number;gap:number;eligible:boolean;addedCostVnd:number}|null;
  hypothetical:true; persisted:false;
};
export function emptyIntent(kind:IntentKind='explain'):Intent{return {kind,demandChangePercent:null,absoluteDemand:null,doctorDelta:null,roomDelta:null,topic:''};}

const numeric=(raw:string)=>Number(raw.replace(',','.'));
/** Common Vietnamese/English what-if language is parsed locally at zero API cost. */
export function parseLocalIntent(input:string):Intent|null{
  const q=input.trim().toLocaleLowerCase('vi-VN');
  if(!q)return null;
  const whatIf=/(nếu|giả sử|thử|what.if|trong trường hợp)/i.test(q);
  const demandContext=/(nhu cầu|lượt khám|bệnh nhân|ca khám|demand|khách khám)/i.test(q);
  const pct=q.match(/(?:tăng|giảm|cao hơn|thấp hơn)\s*(?:thêm|đến|khoảng)?\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*%/i)
    ||q.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*%\s*(?:tăng|giảm)/i);
  const absolute=q.match(/(?:lên|tới|thành|đạt|là)\s*(\d{1,5})\s*(?:lượt khám|lượt|bệnh nhân|ca khám)/i);
  const docs=q.match(/(?:thêm|bớt|giảm|tăng thêm)\s*(\d{1,2})\s*bác sĩ/i);
  const rooms=q.match(/(?:thêm|bớt|giảm|tăng thêm)\s*(\d{1,2})\s*phòng/i);
  if(whatIf||((pct||absolute)&&demandContext)||docs||rooms){
    const out=emptyIntent('what_if');
    if(pct&&(whatIf||demandContext)){
      const value=numeric(pct[1]);
      out.demandChangePercent=/(giảm|thấp hơn)/i.test(q)?-value:value;
    }
    if(absolute&&demandContext)out.absoluteDemand=Number(absolute[1]);
    if(docs){const n=Number(docs[1]);out.doctorDelta=/(bớt|giảm)/i.test(docs[0])?-n:n;}
    if(rooms){const n=Number(rooms[1]);out.roomDelta=/(bớt|giảm)/i.test(rooms[0])?-n:n;}
    if(out.demandChangePercent!==null||out.absoluteDemand!==null||docs||rooms)return out;
    if(whatIf)return null; // Ask the model to interpret complex conditional scenarios
  }
  if(/so sánh|đánh đổi|chi phí|tiết kiệm|cost|compare/i.test(q))return emptyIntent('compare');
  if(/rủi ro|nguy cơ|quá tải|thiếu hụt|risk/i.test(q))return emptyIntent('risk');
  if(/phê duyệt|quyết định|manager|nên duyệt|tóm tắt/i.test(q))return emptyIntent('decision_brief');
  return null; // Let a model interpret non-trivial natural-language intent
}
export function validateIntent(value:unknown):Intent|null{
  if(!value||typeof value!=='object')return null;
  const o=value as Record<string,unknown>;
  if(!['explain','compare','risk','decision_brief','what_if','clarify'].includes(String(o.kind)))return null;
  const fields=['demandChangePercent','absoluteDemand','doctorDelta','roomDelta'] as const;
  for(const key of fields)if(o[key]!==null&&(typeof o[key]!=='number'||!Number.isFinite(o[key] as number)))return null;
  if(typeof o.topic!=='string'||o.topic.length>180)return null;
  if(o.demandChangePercent!==null&&(o.demandChangePercent as number)<-90)return null;
  if(o.demandChangePercent!==null&&(o.demandChangePercent as number)>300)return null;
  if(o.absoluteDemand!==null&&(!Number.isInteger(o.absoluteDemand as number)||(o.absoluteDemand as number)<0||(o.absoluteDemand as number)>100000))return null;
  if(o.doctorDelta!==null&&(!Number.isInteger(o.doctorDelta as number)||Math.abs(o.doctorDelta as number)>5))return null;
  if(o.roomDelta!==null&&(!Number.isInteger(o.roomDelta as number)||Math.abs(o.roomDelta as number)>5))return null;
  if(o.kind==='what_if'&&fields.every(key=>o[key]===null))return {...o,kind:'clarify'} as Intent;
  return o as Intent;
}
export const intentSchema={
  type:'json_schema',name:'dss_intent',strict:true,
  schema:{type:'object',additionalProperties:false,
    properties:{
      kind:{type:'string',enum:['explain','compare','risk','decision_brief','what_if','clarify']},
      demandChangePercent:{type:['number','null']},
      absoluteDemand:{type:['integer','null']},
      doctorDelta:{type:['integer','null']},
      roomDelta:{type:['integer','null']},
      topic:{type:'string'}
    },
    required:['kind','demandChangePercent','absoluteDemand','doctorDelta','roomDelta','topic']
  }
} as const;
export const answerSchema={
  type:'json_schema',name:'dss_answer',strict:true,
  schema:{type:'object',additionalProperties:false,
    properties:{answer:{type:'string'},warnings:{type:'array',items:{type:'string'}},nextActions:{type:'array',items:{type:'string'}}},
    required:['answer','warnings','nextActions']
  }
} as const;
export function parseAnswer(raw:string):{answer:string;warnings:string[];nextActions:string[]}|null{
  try{
    const data:unknown=JSON.parse(raw);
    if(!data||typeof data!=='object')return null;
    const v=data as Record<string,unknown>;
    if(typeof v.answer!=='string'||v.answer.trim().length<20||v.answer.length>2400)return null;
    if(!Array.isArray(v.warnings)||v.warnings.length>5||v.warnings.some(s=>typeof s!=='string'||s.length>260))return null;
    if(!Array.isArray(v.nextActions)||v.nextActions.length>4||v.nextActions.some(s=>typeof s!=='string'||s.length>260))return null;
    return {answer:v.answer.trim(),warnings:v.warnings,nextActions:v.nextActions};
  }catch{return null;}
}
export function computePreview(facts:ScenarioFacts,intent:Intent):WhatIfPreview|null{
  if(intent.kind!=='what_if')return null;
  const a=facts.assumptions as Assumptions;
  const next:Assumptions={...a};
  let demand=facts.demand;
  if(intent.absoluteDemand!==null)demand=intent.absoluteDemand;
  else if(intent.demandChangePercent!==null)demand=computeDemand(facts.demand,intent.demandChangePercent);
  if(intent.roomDelta!==null)next.rooms=Math.max(1,Math.min(30,a.rooms+intent.roomDelta));
  const doctors=intent.doctorDelta!==null?a.currentDoctors+intent.doctorDelta:null;
  if(!Number.isFinite(demand)||demand<0||demand>100000)throw new Error('What-if demand exceeds supported demonstration bounds');
  // Do not silently change the original staffing roster. A requested staff count is shown as a separate option.
  const result=compareAlternatives(demand,next);
  const requestedOption=doctors===null?null:{
    doctors,capacity:doctors*a.visitsPerDoctor,
    gap:Math.max(0,demand-doctors*a.visitsPerDoctor),
    eligible:doctors>=a.currentDoctors&&doctors<=a.availableDoctors&&doctors<=next.rooms,
    addedCostVnd:(doctors-a.currentDoctors)*a.extraDoctorCost
  };
  return {originalDemand:facts.demand,projectedDemand:demand,originalDoctors:a.currentDoctors,
    changes:{demandChangePercent:intent.demandChangePercent,absoluteDemand:intent.absoluteDemand,doctorDelta:intent.doctorDelta,roomDelta:intent.roomDelta},
    assumptions:next,alternatives:result.alternatives,recommended:result.recommended,criteria:result.criteria,
    requestedOption,hypothetical:true,persisted:false};
}
export function dynamicFallback(facts:ScenarioFacts,intent:Intent,preview:WhatIfPreview|null):string{
  const previous=(facts.recommendation as {recommended:Alternative|null}).recommended;
  if(intent.kind==='clarify')return 'Bạn muốn thay đổi số lượt khám, số bác sĩ hay số phòng? Hãy nêu rõ mức thay đổi, ví dụ “Nếu nhu cầu tăng 20% thì sao?”.';
  if(preview){
    const rec=preview.recommended;
    return 'Trong kịch bản giả định này, nhu cầu là '+preview.projectedDemand+' lượt (ban đầu '+preview.originalDemand+'). '+
      (rec?'Phương án được xếp hạng cao nhất là '+rec.doctors+' bác sĩ, công suất '+rec.capacity+' lượt, thiếu '+rec.gap+' lượt, chi phí bổ sung '+rec.addedCostVnd.toLocaleString('vi-VN')+' ₫.':'Không có phương án phù hợp giới hạn nguồn lực.')+
      (preview.requestedOption?' Phương án bạn hỏi với '+preview.requestedOption.doctors+' bác sĩ '+(preview.requestedOption.eligible?'hợp lệ':'vượt giới hạn nguồn lực')+'.':'')+
      ' Đây chỉ là phép tính What-if, chưa lưu hoặc phê duyệt.';
  }
  if(intent.kind==='risk')return 'Cần xem xét mức thiếu công suất và giới hạn nhân sự/phòng khám. '+(previous?'Phương án '+previous.doctors+' bác sĩ thiếu '+previous.gap+' lượt; công suất '+previous.capacity+' lượt.':'Chưa có phương án hợp lệ.')+' Mô hình không có dữ liệu ca trực và ưu tiên bệnh nhân.';
  if(intent.kind==='compare')return 'So sánh các phương án hợp lệ cần đánh giá đồng thời công suất đáp ứng, chi phí thêm và số lượt thiếu hụt. '+(previous?'Phương án ưu tiên có '+previous.doctors+' bác sĩ, chi phí thêm '+previous.addedCostVnd.toLocaleString('vi-VN')+' ₫.':'Chưa có phương án hợp lệ.')+' Bảng so sánh bên dưới là nguồn số liệu chính thức của DSS.';
  if(intent.kind==='decision_brief')return 'Trước khi phê duyệt, Manager cần đối chiếu '+facts.demand+' lượt khám dự kiến với số bác sĩ và phòng khả dụng. '+(previous?'DSS ưu tiên '+previous.doctors+' bác sĩ nhưng không tự phê duyệt.':'Chưa có phương án đáp ứng ràng buộc.')+' Kiểm tra lại lịch trực thực tế và giả định năng suất.';
  return 'Với nhu cầu giả lập '+facts.demand+' lượt khám, '+(previous?'DSS đề xuất '+previous.doctors+' bác sĩ và công suất '+previous.capacity+' lượt.':'không có phương án thỏa ràng buộc.')+' Bạn có thể hỏi về chi phí, quá tải hoặc thử một mức tăng nhu cầu mới.';
}
export function cacheKey(userId:string,facts:ScenarioFacts,question:string,history:ChatTurn[],model:string):string{
  return createHash('sha256').update(JSON.stringify({v:7,userId,scenarioId:facts.id,demand:facts.demand,
    assumptions:facts.assumptions,recommendation:facts.recommendation,
    question:question.trim().toLowerCase(),history,model})).digest('hex');
}
export function boundedHistory(value:ChatTurn[]|undefined):ChatTurn[]{
  if(!value)return [];
  return value.slice(-6).filter(v=>v&&['user','assistant'].includes(v.role)&&typeof v.text==='string')
    .map(v=>({role:v.role,text:v.text.slice(0,500)}));
}
export function hasPotentialPatientIdentifiers(text:string):boolean{
  // Conservative input guard; not a substitute for a deployment-grade PHI/DLP system.
  return /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(text)
    || /\b(?:\+84|0)\d[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{2,3}\b/.test(text)
    || /\b(?:CCCD|CMND|MRN|mã bệnh nhân|số bệnh án)\b/i.test(text);
}
