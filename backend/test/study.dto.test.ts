import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import {plainToInstance} from 'class-transformer';
import {validateSync} from 'class-validator';
import {SaveStudyDto,ReviewStudyDto,ShiftAllocationDto} from '../src/contracts/dto';

const validShift={
  shifts:[
    {name:'Sáng',demand:150,maxDoctors:6,rooms:6,visitsPerDoctor:30},
    {name:'Chiều',demand:90,maxDoctors:5,rooms:5,visitsPerDoctor:30},
    {name:'Tối',demand:30,maxDoctors:3,rooms:3,visitsPerDoctor:30}
  ],
  doctorSlotBudget:10,currentDoctorSlots:8,costPerAdditionalSlotVnd:300000,targetUtilizationPercent:100
};
const errs=(dto:object)=>validateSync(dto,{whitelist:true,forbidNonWhitelisted:true,forbidUnknownValues:true});
test('a study requires a valid kind, short name and object input',()=>{
  assert.equal(errs(plainToInstance(SaveStudyDto,{name:'Capacity plan',kind:'CAPACITY',input:{baselineDemand:200}})).length,0);
  assert.ok(errs(plainToInstance(SaveStudyDto,{name:'x',kind:'ARBITRARY',input:{}})).length>0);
  assert.ok(errs(plainToInstance(SaveStudyDto,{name:'x',kind:'SHIFT',input:null})).length>0);
});
test('review only accepts approval or rejection and explicit written rationale',()=>{
  assert.equal(errs(plainToInstance(ReviewStudyDto,{action:'APPROVED',rationale:'Source constraints reviewed'})).length,0);
  assert.ok(errs(plainToInstance(ReviewStudyDto,{action:'DELETE',rationale:'Test'})).length>0);
});
test('nested shift planning input rejects out-of-range demand and unknown fields',()=>{
  const good=plainToInstance(ShiftAllocationDto,validShift);
  assert.equal(errs(good).length,0);
  const bad=plainToInstance(ShiftAllocationDto,{
    ...validShift,
    shifts:validShift.shifts.map((s,i)=>i===0?{...s,demand:-10}:s)
  });
  assert.ok(errs(bad).length>0);
  const rogue=plainToInstance(ShiftAllocationDto,{...validShift,assumeApproved:true});
  assert.ok(errs(rogue).length>0);
});
