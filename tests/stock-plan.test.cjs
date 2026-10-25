const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,defaults,pipeRuns}=require('../dist/app.js');
const math=require('../dist/quote-math.js');

const valid=(m,v)=>{
 const stock=v.stock*1000;
 assert.ok(m.bins.every(b=>b.used<=stock+.001),'no pipe is overfilled');
 assert.equal(m.bins.reduce((n,b)=>n+b.pieces.length,0),m.cuts.filter(c=>c.cut>0).length*v.racks,'every cut is planned once per rack');
};

test('racks are cut together so one rack\'s offcut feeds the next',()=>{
 for(const [o,expected] of [[{},26],[{layout:'step',steps:3},18],[{width:5,shelves:6},40]]){
  const v={...defaults,racks:4,...o},m=calculate(v),single=calculate({...v,racks:1});
  valid(m,v);
  assert.equal(m.bins.length,expected);
  assert.ok(m.bins.length<=single.bins.length*4);
 }
});

test('the per-rack plan never needs more pipes than first-fit decreasing',()=>{
 const ffd=(cuts,stock,kerf)=>{const bins=[];for(const p of [...cuts].filter(c=>c.cut>0).sort((a,b)=>b.cut-a.cut)){let bin=bins.find(b=>b.used+p.cut+kerf<=stock+.001);if(!bin){bin={used:0};bins.push(bin);}bin.used+=p.cut+kerf;}return bins.length;};
 for(const o of [{},{shelves:6},{width:5,shelves:6},{layout:'step',steps:6},{depth:1,center:false},{stock:3.048}]){
  const v={...defaults,...o},m=calculate(v);valid(m,v);
  assert.ok(m.bins.length<=ffd(m.cuts,v.stock*1000,v.kerf),JSON.stringify(o));
 }
});

test('cuts on each pipe follow the cut-list order and identical pipes sit together',()=>{
 const v={...defaults,racks:4},m=calculate(v),order=m.groups.map(g=>g.name).filter((n,i,a)=>a.indexOf(n)===i);
 for(const b of m.bins){const ranks=b.pieces.map(p=>order.indexOf(p.name));assert.deepEqual(ranks,[...ranks].sort((a,b)=>a-b));}
 const runs=pipeRuns(m.bins),patterns=new Set(m.bins.map(b=>b.pieces.map(p=>p.name+p.cut).join('|')));
 assert.equal(runs.length,patterns.size,'each cutting pattern appears as one run');
 assert.equal(runs.reduce((n,r)=>n+r.to-r.from+1,0),m.bins.length);
});

test('the estimate prices the whole-order stock pipe count, not per rack times racks',()=>{
 const v={...defaults,racks:4},m=calculate(v),row=m.equipment.bill.find(r=>r.id.startsWith('stock-'));
 assert.equal(row.orderQty,m.bins.length);
 const s=math.calculate({rows:[row],prices:{[row.id]:100},rackQuantity:4});
 assert.equal(s.lines[0].totalQty,m.bins.length);assert.equal(s.componentSubtotal,m.bins.length*100);
});
