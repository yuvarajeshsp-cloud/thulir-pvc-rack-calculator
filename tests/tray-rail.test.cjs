const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,defaults}=require('../dist/app.js');

test('tray support rail adds T joints at the sides and a cross T at the centre of each growing shelf',()=>{
 const m=calculate({...defaults});
 assert.equal(m.counts[6],2*defaults.shelves);assert.equal(m.counts[7],defaults.shelves);
 const rails=m.cuts.filter(c=>c.name==='Tray support rail');
 assert.equal(rails.length,2*defaults.shelves);
 const W=defaults.width*304.8,expected=Math.round((W/2-defaults.c6-defaults.c7+2*defaults.insert)*10)/10;
 assert.ok(rails.every(c=>c.cut===expected));
 const D=defaults.depth*304.8,side=m.cuts.find(c=>c.name==='Depth half-rail');
 assert.equal(side.cut,Math.round((D/2-defaults.c4-defaults.c6+2*defaults.insert)*10)/10);
 const bill=Object.fromEntries(m.equipment.bill.map(r=>[r.id,r.qty]));
 assert.equal(bill.jointT,m.counts[6]);assert.equal(bill.jointX,m.counts[7]);
});

test('turning the tray rail off restores the original frame',()=>{
 const off=calculate({...defaults,trayRail:false});
 assert.equal(off.counts[6],0);assert.equal(off.counts[7],0);
 assert.ok(!off.cuts.some(c=>/depth half-rail|Depth half-rail|Tray support/.test(c.name)));
 assert.ok(!off.equipment.bill.some(r=>r.id==='jointT'||r.id==='jointX'));
});

test('stepped racks and racks without centre supports use only T joints where needed',()=>{
 const step=calculate({...defaults,layout:'step',steps:3,stepBrace:'none'});
 assert.equal(step.counts[6],6);assert.equal(step.counts[7],3);
 const plain=calculate({...defaults,center:false});
 assert.equal(plain.counts[6],2*defaults.shelves);assert.equal(plain.counts[7],0);
 for(const m of [step,plain])assert.ok(m.cuts.every(c=>Number.isFinite(c.cut)&&c.cut>0));
});
