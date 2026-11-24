import assert from 'node:assert/strict';
import test from 'node:test';
import {computeDemand,compareAlternatives,forecastByWeekday,forecastByWeekdayWithEvidence} from '../src/dss.engine';
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

const observed=(day:string,visits:number)=>({day:new Date(day+'T00:00:00Z'),visits});
test('forecast evidence contains only the four most recent matching weekdays before target',()=>{
  const target=new Date('2026-11-23T00:00:00Z');
  const rows=[observed('2026-10-19',999),observed('2026-10-26',180),observed('2026-11-02',190),
    observed('2026-11-09',200),observed('2026-11-16',210),observed('2026-11-22',999),
    observed('2026-11-23',999),observed('2026-11-30',999)];
  const forecast=forecastByWeekdayWithEvidence(target,rows);
  assert.equal(forecast.model,'WEEKDAY_MEAN_4');
  assert.deepEqual(forecast.sample,[{day:'2026-11-16',visits:210},{day:'2026-11-09',visits:200},{day:'2026-11-02',visits:190},{day:'2026-10-26',visits:180}]);
  assert.equal(forecast.trainingDays,forecast.sample.length);
  assert.equal(forecast.predictedVisits,195);
  const {sample,...legacy}=forecast;
  assert.equal(sample.length,4);
  assert.deepEqual(legacy,forecastByWeekday(target,rows));
});
test('fallback evidence contains only up to seven recent observed days and matches rounded forecast',()=>{
  const target=new Date('2026-11-23T00:00:00Z');
  const rows=[observed('2026-11-13',999),observed('2026-11-14',100),observed('2026-11-15',101),
    observed('2026-11-16',102),observed('2026-11-17',103),observed('2026-11-19',104),
    observed('2026-11-20',105),observed('2026-11-22',109),observed('2026-11-23',999)];
  const forecast=forecastByWeekdayWithEvidence(target,rows);
  assert.equal(forecast.model,'MOVING_AVERAGE_7');
  assert.deepEqual(forecast.sample.map(v=>v.day),['2026-11-22','2026-11-20','2026-11-19','2026-11-17','2026-11-16','2026-11-15','2026-11-14']);
  assert.equal(forecast.predictedVisits,Math.round((109+105+104+103+102+101+100)/7));
  assert.equal(forecast.trainingDays,7);
  const sparse=forecastByWeekdayWithEvidence(target,[observed('2026-11-22',201),observed('2026-11-23',999)]);
  assert.deepEqual(sparse.sample,[{day:'2026-11-22',visits:201}]);
  assert.equal(sparse.predictedVisits,201);
  assert.throws(()=>forecastByWeekdayWithEvidence(target,[observed('2026-11-23',999)]));
});
