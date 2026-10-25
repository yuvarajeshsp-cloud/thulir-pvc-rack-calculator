const test=require('node:test');
const assert=require('node:assert/strict');
const {feetInches,shortLength,setLengthUnit,calculate,defaults}=require('../dist/app.js');

test('lengths display in feet and inches or centimetres without changing the plan',()=>{
 const before=calculate({...defaults});
 try{
  setLengthUnit('cm');
  assert.equal(feetInches(1219.2),'121.9 cm');assert.equal(feetInches(181838.4),'18,183.8 cm');
  assert.equal(shortLength(33.4,3),'3.3 cm');
  assert.deepEqual(calculate({...defaults}).cuts,before.cuts);
  setLengthUnit('anything else');
  assert.equal(feetInches(1219.2),'4 ft 0 in');assert.equal(shortLength(33.4,3),'1.315 in');
 }finally{setLengthUnit('ftin');}
});
