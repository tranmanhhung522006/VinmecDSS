import assert from 'node:assert/strict';
import test from 'node:test';
import {computeDemand,compareAlternatives,forecastByWeekday} from '../src/dss.engine';
const assumptions={currentDoctors:8,availableDoctors:10,rooms:10,visitsPerDoctor:30,extraDoctorCost:900000};
test('scenario increases demand from 200 to 260',()=>assert.equal(computeDemand(200,30),260));
test('8, 9, 10 doctors have 240, 270, 300 slots and 9 is recommended',()=>{
  const r=compareAlternatives(260,assumptions);
  assert.deepEqual(r.alternatives.map(a=>a.capacity),[240,270,300]);
  assert.deepEqual(r.alternatives.map(a=>a.gap),[20,0,0]);
  assert.equal(r.recommended?.doctors,9);
});
test('room limit is a hard constraint',()=>{
  const r=compareAlternatives(260,{...assumptions,rooms:8});
  assert.equal(r.alternatives[1].eligible,false); assert.equal(r.recommended?.doctors,8);
});
test('no history makes forecast fail explicitly',()=>assert.throws(()=>forecastByWeekday(new Date('2026-11-23'),[])));