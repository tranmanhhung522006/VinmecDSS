import assert from 'node:assert/strict';
import test from 'node:test';
import {rollingForecastBacktest} from '../src/forecast.metrics';
const history=Array.from({length:28},(_,i)=>({day:new Date(Date.UTC(2026,8,i+1)),visits:80+i}));
test('backtest reports proper holdout statistics without changing input',()=>{
  const initial=history.map(r=>r.visits);
  const result=rollingForecastBacktest(history);
  assert.equal(result.sampleCount,21);
  assert.ok(result.mae!==null && result.mae>0);
  assert.ok(result.rmse!==null && result.rmse>=result.mae);
  assert.ok(result.mape!==null && result.mape>0);
  assert.deepEqual(history.map(r=>r.visits),initial);
});
test('backtest refuses to claim accuracy on fewer than 8 dates',()=>{
  assert.equal(rollingForecastBacktest(history.slice(0,7)).sampleCount,0);
});
test('MAPE does not divide by zero',()=>{
  const zero=history.map(r=>({...r,visits:0}));
  assert.equal(rollingForecastBacktest(zero).mape,null);
});
