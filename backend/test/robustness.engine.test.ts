import assert from 'node:assert/strict';
import test from 'node:test';
import {optimizeCapacity,type PlanningInput} from '../src/planning.engine';
import {analyzeDecisionRobustness} from '../src/robustness.engine';

const base:PlanningInput={demand:260,currentDoctors:8,availableDoctors:10,rooms:10,visitsPerDoctor:30,extraDoctorCost:900000,targetUtilizationPercent:100};

test('25 cases are evaluated independently and the base case is preserved',()=>{
  const optimal=optimizeCapacity(base);
  const report=analyzeDecisionRobustness(optimal.inputs,optimal.recommended.doctors);
  assert.equal(report.casesEvaluated,25);
  assert.equal(report.cases.length,25);
  assert.equal(report.baseDoctors,9);
  assert.equal(report.base.baselineShortfall,0);
  assert.equal(report.cases.find(c=>c.demandDeltaPercent===0&&c.productivityDeltaPercent===0)?.baseShortfall,0);
  assert.equal(report.synthetic,true);
  assert.equal(report.persisted,false);
});
test('robust choice can differ from cost-efficient baseline and is constraint bounded',()=>{
  const report=analyzeDecisionRobustness(base,9);
  assert.equal(report.robustDoctors,10);
  assert.ok(report.robust.coveredCases>=report.base.coveredCases);
  assert.ok(report.robust.worstPlanningShortfall<=report.base.worstPlanningShortfall);
  assert.equal(report.robust.addedCostVnd,1800000);
});
test('no invented staff or physical capacity is used when rooms are constrained',()=>{
  const input={...base,availableDoctors:18,rooms:8};
  const report=analyzeDecisionRobustness(input,8);
  assert.equal(report.options.length,8);
  assert.equal(report.robustDoctors,8);
  assert.ok(report.robust.worstPlanningShortfall>0);
});
test('zero demand works without division by zero or undefined results',()=>{
  const report=analyzeDecisionRobustness({...base,demand:0},1);
  assert.equal(report.robustDoctors,1);
  assert.equal(report.robust.coveredCases,25);
  assert.equal(report.robust.worstPlanningShortfall,0);
});
test('input validation rejects invalid constraints and arbitrary baseline',()=>{
  assert.throws(()=>analyzeDecisionRobustness({...base,rooms:0},1));
  assert.throws(()=>analyzeDecisionRobustness({...base,visitsPerDoctor:0},1));
  assert.throws(()=>analyzeDecisionRobustness(base,11));
  assert.throws(()=>analyzeDecisionRobustness({...base,demand:1.25},9));
});
test('all 25 scenario results are consistent with assumed capacity',()=>{
  const report=analyzeDecisionRobustness(base,9);
  for(const row of report.cases){
    assert.equal(row.baseShortfall,Math.max(0,row.demand-Math.floor(9*row.visitsPerDoctor)));
    assert.equal(row.robustShortfall,Math.max(0,row.demand-Math.floor(report.robustDoctors*row.visitsPerDoctor)));
  }
});
