const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,defaults}=require('../dist/app.js');
const lit=o=>calculate({...defaults,lights:true,...o});

test('whole LED fixtures stay inside the frame and are centred on the shelf',()=>{
 for(const o of [{width:4},{width:5},{width:6},{microgreen:true},{width:4,ledFeet:2},{width:5,ledFeet:2},{width:7,ledFeet:2},{width:9}]){
  const m=lit(o),e=m.equipment,edge=defaults.od/2+.6;
  assert.ok(e.lights.length>0,JSON.stringify(o));
  for(const l of e.lights){assert.ok(l.a.x>=-edge&&l.b.x<=m.W+edge,`${JSON.stringify(o)} light inside frame`);}
  const row=e.lights.filter(l=>l.shelf===1&&l.row===1),left=row[0].a.x,right=m.W-row[row.length-1].b.x;
  assert.ok(Math.abs(left-right)<.01,'centred');
  assert.equal(e.bill.find(r=>/^led/.test(r.id)).qty,e.lights.length);
 }
});

test('the old over-length layouts are fixed: one 4 ft LED per row on 4.5 to 7 ft shelves',()=>{
 for(const w of [4,5,6,7]){const e=lit({width:w}).equipment;assert.equal(e.lightsPerRow,1,`${w} ft`);assert.equal(e.lights.length,2*defaults.shelves);}
 assert.equal(lit({microgreen:true}).equipment.lightsPerRow,1);
 assert.equal(lit({width:5,ledFeet:2}).equipment.lightsPerRow,2);
});

test('LEDs longer than the frame are not placed or billed, with a clear message',()=>{
 const e=lit({width:3}).equipment;
 assert.equal(e.lights.length,0);assert.ok(!e.bill.some(r=>/^led|light/.test(r.id)));
 assert.match(e.warnings.join(' '),/4 ft LEDs are longer than this .* Choose 2 ft LEDs/);
 assert.match(lit({width:6}).equipment.warnings.join(' '),/2 ft LEDs would light/);
 assert.equal(lit({width:4}).equipment.warnings.filter(w=>/LED/.test(w)).length,0);
});
