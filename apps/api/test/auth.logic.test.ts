import test from 'node:test';
import assert from 'node:assert/strict';
import {LoginFailureLimiter,normalizeLoginEmail} from '../src/auth.logic';

test('email normalization trims spaces and ignores case',()=>{
  assert.equal(normalizeLoginEmail('  Manager@DEMO.Local  '),'manager@demo.local');
});
test('successful attempts do not exhaust the sign-in rate limit',()=>{
  const limiter=new LoginFailureLimiter(3,1000);
  for(let i=0;i<20;i++){
    assert.equal(limiter.isBlocked('client',100),false);
    limiter.recordSuccess('client');
  }
});
test('limits repeated failures and resets after a successful sign in',()=>{
  const limiter=new LoginFailureLimiter(3,1000);
  for(let i=0;i<3;i++)limiter.recordFailure('client',100);
  assert.equal(limiter.isBlocked('client',100),true);
  assert.equal(limiter.isBlocked('client',1101),false);
  limiter.recordFailure('client',1200);
  limiter.recordSuccess('client');
  assert.equal(limiter.isBlocked('client',1200),false);
});
