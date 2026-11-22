import assert from 'node:assert/strict';
import test from 'node:test';
import {optimizeCapacity,type PlanningInput} from '../src/planning.engine';
const base:PlanningInput={demand:260,currentDoctors:8,availableDoctors:10,rooms:10,visitsPerDoctor:30,extraDoctorCost:900000,targetUtilizationPercent:100};

test('searches all feasible staffing counts rather than only current, +1, +2',()=>{
  const r=optimizeCapacity({...base,availableDoctors:12,rooms:11});
  assert.equal(r.searchSpace,11);
  assert.equal(r.options.length,11);
  assert.equal(r.recommended.doctors,9);
  assert.equal(r.recommended.planningShortfall,0);
  assert.equal(r.recommended.addedCostVnd,900000);
});
test('rooms are a hard constraint and shortfalls are not hidden',()=>{
  const r=optimizeCapacity({...base,rooms:8});
  assert.equal(r.searchSpace,8);
  assert.equal(r.recommended.doctors,8);
  assert.equal(r.recommended.planningShortfall,20);
  assert.ok(r.warnings.some(x=>x.includes('Không phương án nào')));
});
test('planning buffer can require additional doctors without inventing clinical safety',()=>{
  const r=optimizeCapacity({...base,targetUtilizationPercent:90});
  assert.equal(r.recommended.doctors,10);
  assert.equal(r.recommended.planningCapacity,270);
  assert.equal(r.recommended.physicalCapacity,300);
});
test('cannot treat reduced staffing as financial savings',()=>{
  const r=optimizeCapacity({...base,demand:40});
  assert.equal(r.recommended.doctors,2);
  assert.equal(r.recommended.addedCostVnd,0);
});
test('sensitivity is recalculated and immutable to baseline options',()=>{
  const r=optimizeCapacity(base);
  assert.deepEqual(r.sensitivity.map(x=>x.deltaPercent),[-20,-10,0,10,20]);
  assert.equal(r.sensitivity[2].doctors,9);
  assert.equal(r.inputs.demand,260);
  assert.equal(r.options.find(x=>x.doctors===9)?.recommended,true);
});
test('rejects out-of-range or fractional staffing and zero productivity',()=>{
  assert.throws(()=>optimizeCapacity({...base,rooms:0}));
  assert.throws(()=>optimizeCapacity({...base,availableDoctors:1.5}));
  assert.throws(()=>optimizeCapacity({...base,visitsPerDoctor:0}));
});
