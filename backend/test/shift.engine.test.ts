import assert from 'node:assert/strict';
import test from 'node:test';
import {optimizeShiftAllocation,type ShiftPlanningInput} from '../src/shift.engine';
const base:ShiftPlanningInput={
  shifts:[
    {name:'Sáng',demand:150,maxDoctors:6,rooms:6,visitsPerDoctor:30},
    {name:'Chiều',demand:90,maxDoctors:5,rooms:5,visitsPerDoctor:30},
    {name:'Tối',demand:30,maxDoctors:3,rooms:3,visitsPerDoctor:30}
  ],
  doctorSlotBudget:10,currentDoctorSlots:8,
  costPerAdditionalSlotVnd:300000,targetUtilizationPercent:100
};
test('allocates exactly enough slots when room and doctor budget allow',()=>{
  const r=optimizeShiftAllocation(base);
  assert.equal(r.recommended.plannedShortfall,0);
  assert.deepEqual(r.recommended.assignments.map(x=>x.doctors),[5,3,1]);
  assert.equal(r.recommended.totalDoctorSlots,9);
  assert.equal(r.recommended.addedCostVnd,300000);
});
test('honors global doctor-slot budget even when individual windows are open',()=>{
  const r=optimizeShiftAllocation({...base,doctorSlotBudget:7});
  assert.ok(r.recommended.totalDoctorSlots<=7);
  assert.equal(r.recommended.plannedShortfall,60);
  assert.equal(r.recommended.coversAllWindows,false);
  assert.ok(r.warnings.some(x=>x.includes('Không tìm thấy')));
});
test('never uses rooms beyond individual window limits',()=>{
  const shifts:ShiftPlanningInput['shifts']=[
    {...base.shifts[0],rooms:2},base.shifts[1],base.shifts[2]];
  const r=optimizeShiftAllocation({...base,shifts});
  assert.ok(r.recommended.assignments[0].doctors<=2);
  assert.ok(r.alternatives.every(p=>p.assignments[0].doctors<=2));
});
test('planning utilization affects effective capacity, not physical capacity',()=>{
  const r=optimizeShiftAllocation({...base,targetUtilizationPercent:80});
  assert.equal(r.recommended.totalDoctorSlots,10);
  assert.ok(r.recommended.plannedShortfall>0);
  assert.ok(r.recommended.assignments.every(x=>x.plannedCapacity<=x.physicalCapacity));
});
test('empty shifts and empty budget are valid but do not invent staff',()=>{
  const input={...base,doctorSlotBudget:0,currentDoctorSlots:0,shifts:base.shifts.map(s=>({...s,demand:0})) as ShiftPlanningInput['shifts']};
  const r=optimizeShiftAllocation(input);
  assert.equal(r.feasibleCombinationCount,1);
  assert.equal(r.recommended.totalDoctorSlots,0);
  assert.equal(r.recommended.plannedShortfall,0);
});
test('rejects invalid nested limits and unsafe cost',()=>{
  assert.throws(()=>optimizeShiftAllocation({...base,doctorSlotBudget:61}));
  assert.throws(()=>optimizeShiftAllocation({...base,costPerAdditionalSlotVnd:-1}));
  assert.throws(()=>optimizeShiftAllocation({...base,shifts:base.shifts.slice(0,2) as ShiftPlanningInput['shifts']}));
  assert.throws(()=>optimizeShiftAllocation({...base,shifts:[{...base.shifts[0],maxDoctors:21},base.shifts[1],base.shifts[2]]}));
});
