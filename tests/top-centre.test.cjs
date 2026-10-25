const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,defaults}=require('../dist/app.js');

test('top centre posts use a 4-way laid on its side, so no socket plugs are needed',()=>{
 for(const o of [{},{overhead:false},{shelves:1},{layout:'step',steps:3},{layout:'step',steps:1,stepBrace:'none'}]){
  const m=calculate({...defaults,...o}),top=Math.max(...m.joints.map(j=>j.z)),W=m.W;
  assert.equal(m.caps,0,JSON.stringify(o));assert.ok(!m.equipment.bill.some(r=>r.id==='plug'));
  for(const j of m.joints)if(j.x>0&&j.x<W&&j.y%1===0&&!m.joints.some(k=>k.x===j.x&&k.y===j.y&&k.z>j.z))assert.notEqual(j.t,5,'no 5-way left open at a top centre');
  assert.ok(m.cuts.every(c=>c.cut>0));
 }
});

test('new shelf defaults: 5 shelves, 11 in rail gap, 22 in trays and 0.6 in fit allowance',()=>{
 assert.equal(defaults.shelves,5);assert.equal(defaults.gap,11);assert.equal(defaults.trayLength,22);assert.equal(defaults.trayGap,.6);
});
