import assert from 'node:assert/strict';
import test from 'node:test';
import {getModelCatalog,MODEL_CATALOG} from '../src/models/model.catalog';
test('model registry contains distinct, documented and safely scoped models',()=>{
  const ids=MODEL_CATALOG.map(x=>x.id);
  assert.equal(ids.length,9);
  assert.equal(new Set(ids).size,ids.length);
  for(const x of MODEL_CATALOG){
    assert.ok(x.version&&x.inputs.length&&x.outputs.length);
    assert.ok(x.qualityControl.length>20&&x.limitations.length>20);
    assert.ok(!x.implementation.includes('OPENAI_API_KEY'));
  }
  const result=getModelCatalog();
  assert.equal(result.clinicalUseAllowed,false);
  assert.equal(result.classification,'SYNTHETIC_AGGREGATES');
});
