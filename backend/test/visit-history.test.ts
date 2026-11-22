import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import {plainToInstance} from 'class-transformer';
import {validateSync} from 'class-validator';
import {SaveVisitHistoryDto} from '../src/contracts/dto';
import {isValidObservedDay,todayVietnamDate,MORNING_SLOT,AFTERNOON_SLOT} from '../src/modules/visits/visit-history.service';

const valid={day:'2026-11-22',morningVisits:125,afternoonVisits:95,reason:'Synthetic test input'};
const errors=(value:unknown)=>validateSync(plainToInstance(SaveVisitHistoryDto,value),{whitelist:true,forbidNonWhitelisted:true});
test('valid synthetic aggregate day accepts two nonnegative integer visits and text reason',()=>{
 assert.equal(errors(valid).length,0);
 assert.equal(errors({...valid,morningVisits:0,afternoonVisits:0}).length,0);
});
test('invalid or over-limit visit inputs are refused',()=>{
 for(const row of [{...valid,morningVisits:-1},{...valid,afternoonVisits:2.5},{...valid,morningVisits:100001},{...valid,patientName:'no'}]){
  assert.ok(errors(row).length>0);
 }
});
test('calendar dates are real observed days rather than merely formatted strings',()=>{
 assert.equal(isValidObservedDay('2026-02-30'),false);
 assert.equal(isValidObservedDay('2026-11-22'),true);
 assert.equal(isValidObservedDay('2030-01-01'),false);
 assert.equal(isValidObservedDay(todayVietnamDate()),true);
 assert.equal(isValidObservedDay('2026-11-22T00:00:00'),false);
});
test('fixed slots match the stored synthetic historical observations',()=>{
 assert.equal(MORNING_SLOT,'08:00-12:00');
 assert.equal(AFTERNOON_SLOT,'13:00-17:00');
});
