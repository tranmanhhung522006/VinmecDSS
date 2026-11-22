import assert from 'node:assert/strict';
import test from 'node:test';
import {sessionIsValid,tokenDigest} from '../src/security/session.logic';

const TOKEN='example.jwt.for-local-testing-not-a-real-credential';
const createSession=(expiresAt:Date,revokedAt:Date|null=null)=>({tokenHash:tokenDigest(TOKEN),expiresAt,revokedAt});

test('session digest is deterministic and does not contain raw JWT',()=>{
  assert.equal(tokenDigest(TOKEN).length,64);
  assert.equal(tokenDigest(TOKEN),tokenDigest(TOKEN));
  assert.ok(!tokenDigest(TOKEN).includes(TOKEN));
});
test('active session allows exactly its issued token',()=>{
  const session=createSession(new Date('2026-12-01T08:00:00.000Z'));
  const now=new Date('2026-12-01T07:00:00.000Z');
  assert.equal(sessionIsValid(session,TOKEN,now),true);
  assert.equal(sessionIsValid(session,TOKEN+'x',now),false);
});
test('revocation blocks token immediately',()=>{
  const session=createSession(new Date('2026-12-01T09:00:00.000Z'),new Date('2026-12-01T07:00:00.000Z'));
  assert.equal(sessionIsValid(session,TOKEN,new Date('2026-12-01T07:01:00.000Z')),false);
});
test('expired or missing sessions are rejected',()=>{
  assert.equal(sessionIsValid(createSession(new Date('2026-12-01T07:00:00.000Z')),TOKEN,new Date('2026-12-01T07:00:00.000Z')),false);
  assert.equal(sessionIsValid(null,TOKEN),false);
});
test('malformed stored digests fail closed',()=>{
  assert.equal(sessionIsValid({...createSession(new Date('2030-01-01')),tokenHash:'incorrect'},TOKEN),false);
});
