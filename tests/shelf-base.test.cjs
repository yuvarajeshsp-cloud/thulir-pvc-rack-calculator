const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,defaults}=require('../www/app.js');
const quote=require('../www/quote-math.js');

test('wire mesh remains the default shelf material',()=>{
 const m=calculate({...defaults,shelves:4});
 assert.equal(m.equipment.shelfBase.type,'mesh');
 assert.equal(m.equipment.bill.find(r=>r.id==='mesh').qty,4);
 assert.equal(m.equipment.bill.some(r=>r.id==='draincell'),false);
});

test('20x10-inch drain cells cover 4x2 foot shelves with a conservative 3x3 grid',()=>{
 const m=calculate({...defaults,shelfBase:'drain',width:4,depth:2,shelves:4});
 assert.equal(m.equipment.shelfBase.cols,3);
 assert.equal(m.equipment.shelfBase.rows,3);
 assert.equal(m.equipment.shelfBase.perShelf,9);
 assert.equal(m.equipment.bill.find(r=>r.id==='draincell').qty,36);
 assert.equal(m.equipment.bill.some(r=>r.id==='mesh'),false);
});

test('selected shelf material scales across multiple racks and pricing markup',()=>{
 const m=calculate({...defaults,shelfBase:'drain',shelves:4,racks:2});
 const selected=m.equipment.bill.filter(r=>r.id==='draincell'||r.id==='mesh');
 assert.equal(selected.length,1);
 const q=quote.calculate({rows:selected,prices:{draincell:32},profit:15,rackQuantity:2});
 assert.equal(q.lines[0].totalQty,72);
 assert.equal(q.lines[0].unitRate,36.8);
 assert.equal(q.total,2649.6);
});

test('unspecified drain cell price is marked missing, never silently free',()=>{
 const m=calculate({...defaults,shelfBase:'drain'});
 const q=quote.calculate({rows:m.equipment.bill.filter(r=>r.id==='draincell'),prices:{},rackQuantity:1});
 assert.equal(q.missing,1);
});

test('stepped racks and layouts without centre supports still calculate base counts',()=>{
 const m=calculate({...defaults,layout:'step',steps:3,shelfBase:'drain',center:false});
 assert.equal(m.equipment.bill.find(r=>r.id==='draincell').qty,m.equipment.shelfBase.perShelf*3);
 assert(m.equipment.warnings.some(s=>s.includes('support')));
});
