import assert from 'node:assert/strict';
import test from 'node:test';
import {compareForecastModels,forecastUsing,type DailyDemand} from '../src/forecast.comparison';

const history:DailyDemand[]=Array.from({length:35},(_,i)=>({day:new Date(Date.UTC(2026,0,1+i)),visits:100+(i%7)*5}));
const target=new Date(Date.UTC(2026,1,5));

test('all candidates use the same holdout dates without mutating inputs',()=>{
  const initial=history.map(r=>r.visits);
  const output=compareForecastModels(history,target);
  assert.equal(output.models.length,3);
  assert.equal(output.evaluatedDays,21);
  assert.ok(output.models.every(m=>m.sampleCount===21&&Number.isFinite(m.mae)&&m.rmse>=m.mae));
  assert.deepEqual(history.map(r=>r.visits),initial);
});
test('stable weekday mean correctly predicts next matching weekday',()=>{
  const result=forecastUsing('WEEKDAY_MEAN_4',history,target);
  const weekday=target.getUTCDay();
  const observations=history.filter(r=>r.day.getUTCDay()===weekday).slice(-4);
  assert.equal(result,Math.round(observations.reduce((s,r)=>s+r.visits,0)/observations.length));
});
test('same model preference is independent of source ordering',()=>{
  const a=compareForecastModels(history,target),b=compareForecastModels([...history].reverse(),target);
  assert.deepEqual(a,b);
});
test('zero visit holdout avoids division by zero, errors remain finite',()=>{
  const zero=history.map(r=>({...r,visits:0}));
  const a=compareForecastModels(zero,target);
  assert.equal(a.models.every(m=>m.mape===null),true);
  assert.equal(a.prediction.intervalLow,0);
  assert.equal(a.prediction.intervalHigh,0);
});
test('target must be after sufficient history and duplicates are rejected',()=>{
  assert.throws(()=>compareForecastModels(history.slice(0,9),target));
  assert.throws(()=>compareForecastModels([...history,history[0]],target));
});
test('outlier protection reports an illustrative, nonnegative error envelope',()=>{
  const altered=history.map((r,i)=>({...r,visits:i===24?500:r.visits}));
  const output=compareForecastModels(altered,target);
  assert.ok(output.prediction.intervalLow>=0);
  assert.ok(output.prediction.intervalHigh>=output.prediction.predictedVisits);
  assert.ok(output.warnings.some(w=>w.includes('không phải khoảng dự báo')));
});
