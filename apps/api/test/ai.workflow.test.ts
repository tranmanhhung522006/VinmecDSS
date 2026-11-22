import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLocalIntent,validateIntent,computePreview,dynamicFallback,parseAnswer,cacheKey,boundedHistory,
  hasPotentialPatientIdentifiers,emptyIntent
} from '../src/ai.workflow';

const facts={
  id:'scenario-001',title:'Outpatient demand',targetDay:'2026-11-30',baselineDemand:200,growthPercent:30,demand:260,
  assumptions:{currentDoctors:8,availableDoctors:10,rooms:10,visitsPerDoctor:30,extraDoctorCost:900000},
  alternatives:[],recommendation:{recommended:{doctors:9,capacity:270,gap:0,surplus:10,utilizationPercent:96.3,addedCostVnd:900000,eligible:true,servesDemand:true,score:80,reason:'covers'}}
};

test('Vietnamese What-if understands 20% additional demand relative to the current scenario',()=>{
  const intent=parseLocalIntent('Nếu nhu cầu khám tăng thêm 20% thì cần bao nhiêu bác sĩ?');
  assert.equal(intent?.kind,'what_if');
  assert.equal(intent?.demandChangePercent,20);
  const preview=computePreview(facts,intent!);
  assert.equal(preview?.projectedDemand,312);
  assert.equal(preview?.originalDemand,260);
  assert.equal(preview?.recommended?.doctors,10);
  assert.equal(preview?.persisted,false);
});
test('negative scenarios and room constraints are recalculated by the DSS engine',()=>{
  const intent=parseLocalIntent('Giả sử nhu cầu giảm 15%, đồng thời thêm 1 phòng khám');
  assert.equal(intent?.demandChangePercent,-15);
  assert.equal(intent?.roomDelta,1);
  const preview=computePreview(facts,intent!);
  assert.equal(preview?.projectedDemand,221);
  assert.equal(preview?.assumptions.rooms,11);
});
test('specific staffing request evaluates eligibility without granting additional workforce',()=>{
  const intent=parseLocalIntent('Nếu thêm 3 bác sĩ thì sao?');
  assert.equal(intent?.doctorDelta,3);
  const preview=computePreview(facts,intent!);
  assert.equal(preview?.requestedOption?.doctors,11);
  assert.equal(preview?.requestedOption?.eligible,false);
  assert.equal(preview?.assumptions.availableDoctors,10);
});
test('natural language questions route to distinct answers, not the same 4-block template',()=>{
  assert.equal(parseLocalIntent('Chi phí phương án nào tiết kiệm nhất?')?.kind,'compare');
  assert.equal(parseLocalIntent('Những rủi ro quá tải hiện nay?')?.kind,'risk');
  assert.equal(parseLocalIntent('Tôi nên phê duyệt phương án này không?')?.kind,'decision_brief');
  assert.notEqual(dynamicFallback(facts,emptyIntent('risk'),null),dynamicFallback(facts,emptyIntent('compare'),null));
});
test('AI intent cannot ask server to inflate input beyond resource limits',()=>{
  assert.equal(validateIntent({kind:'what_if',demandChangePercent:2000,absoluteDemand:null,doctorDelta:null,roomDelta:null,topic:''}),null);
  assert.equal(validateIntent({kind:'what_if',demandChangePercent:null,absoluteDemand:999999,doctorDelta:null,roomDelta:null,topic:''}),null);
  assert.equal(validateIntent({kind:'what_if',demandChangePercent:null,absoluteDemand:null,doctorDelta:null,roomDelta:null,topic:''})?.kind,'clarify');
});
test('structured AI narrative allows grounded numerals and rejects incomplete schema',()=>{
  assert.deepEqual(parseAnswer(JSON.stringify({answer:'Với 10 bác sĩ hệ thống có thể giảm thiếu công suất; cần kiểm tra ràng buộc nguồn lực.',warnings:['Dữ liệu giả lập'],nextActions:['Đối chiếu ca trực']}))?.warnings,['Dữ liệu giả lập']);
  assert.equal(parseAnswer('{"answer":"short"}'),null);
  assert.equal(parseAnswer('not-json'),null);
});
test('history is bounded, and answer cache is scoped to user scenario and context',()=>{
  const h=boundedHistory(Array.from({length:9},(_,i)=>({role:i%2?'assistant':'user' as const,text:String(i).repeat(700)})));
  assert.equal(h.length,6);
  assert.ok(h.every(t=>t.text.length<=500));
  assert.notEqual(cacheKey('user1',facts,'risk',h,'gpt-4.1-mini'),cacheKey('user2',facts,'risk',h,'gpt-4.1-mini'));
  assert.notEqual(cacheKey('user1',facts,'risk',h,'gpt-4.1-mini'),cacheKey('user1',facts,'cost',h,'gpt-4.1-mini'));
});
test('rejects obvious identifiers from untrusted user input before any AI call',()=>{
  assert.equal(hasPotentialPatientIdentifiers('Bệnh nhân email abc@example.com'),true);
  assert.equal(hasPotentialPatientIdentifiers('Mã bệnh nhân 5622'),true);
  assert.equal(hasPotentialPatientIdentifiers('Nhu cầu tăng 20% thì sao?'),false);
});
