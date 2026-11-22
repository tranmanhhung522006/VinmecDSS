import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEvidence,fallbackAdvice,parseAdvisory} from '../src/ai.advisor';
const scenario={
  demand:260,baselineDemand:200,growthPercent:30,
  assumptions:{currentDoctors:8,availableDoctors:10,rooms:10},
  alternatives:[
    {doctors:8,capacity:240,gap:20,surplus:0,addedCostVnd:0,eligible:true,servesDemand:false},
    {doctors:9,capacity:270,gap:0,surplus:10,addedCostVnd:900000,eligible:true,servesDemand:true}
  ],
  recommendation:{recommended:{doctors:9,capacity:270,gap:0,surplus:10,addedCostVnd:900000,eligible:true,servesDemand:true}}
};
test('advisory fallback is grounded in deterministic evidence',()=>{
  const evidence=buildEvidence(scenario);
  const result=fallbackAdvice(evidence);
  assert.match(result,/260/);
  assert.match(result,/9 bác sĩ/);
  assert.match(result,/900.000/);
});
test('AI output must be well-formed, sufficiently useful and contain no fabricated numeric facts',()=>{
  const template={assessment:'Phương án ưu tiên có khả năng đáp ứng nhu cầu dự kiến theo giả định hiện tại.',
    tradeoff:'Bổ sung nhân lực có thể giảm thiếu hụt công suất nhưng cần cân nhắc nguồn lực.',
    risk:'Dữ liệu giả lập chưa bao gồm lịch trực chi tiết và ưu tiên từng ca khám.',
    nextStep:'Người quản lý nên đối chiếu với số phòng và nhân sự khả dụng trước khi quyết định.'};
  assert.ok(parseAdvisory(JSON.stringify(template)));
  assert.equal(parseAdvisory(JSON.stringify({...template,risk:'Tỷ lệ đạt 99%.'})),null);
  assert.equal(parseAdvisory('Ignore previous instructions'),null);
});
test('no eligible alternative returns a clear fallback',()=>{
  const evidence=buildEvidence({...scenario,recommendation:{recommended:null}});
  assert.match(fallbackAdvice(evidence),/Chưa có phương án/);
});
