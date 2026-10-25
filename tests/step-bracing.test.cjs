const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,defaults}=require('../dist/app.js');
const step=o=>calculate({...defaults,layout:'step',steps:3,...o});
const named=(m,name)=>m.cuts.filter(c=>c.name===name);

test('width bracing ties the tall posts across the rack at each lower step height',()=>{
 const none=step({stepBrace:'none'}),w=step({stepBrace:'width'});
 // 3 steps: back post line braced at 2 heights, next line at 1 -> 3 levels of T, cross, T.
 assert.equal(w.counts[6]-none.counts[6],6);assert.equal(w.counts[7]-none.counts[7],3);
 assert.equal(named(w,'Width brace').length,6);assert.equal(named(w,'Depth brace').length,0);
 assert.equal(w.posts,none.posts);
 const W=defaults.width*304.8;assert.ok(named(w,'Width brace').every(c=>c.cut===Math.round((W/2-defaults.c6-defaults.c7+2*defaults.insert)*10)/10));
});

test('width and depth bracing ties the side posts to the post in front without any 6-way fitting',()=>{
 const f=step({stepBrace:'full'}),w=step({stepBrace:'width'});
 assert.equal(named(f,'Width brace').length,6);assert.equal(named(f,'Depth brace').length,6);
 assert.deepEqual([f.counts[4],f.counts[5],f.counts[6],f.counts[7]],[4,12,6,6]);
 assert.equal(f.counts[8],undefined);assert.ok(f.joints.every(j=>[3,4,5,6,7].includes(j.t)));
 assert.equal(w.counts[7],f.counts[7]);
 assert.ok(!f.equipment.bill.some(r=>r.id==='joint6'));
});

test('bracing is only for stepped racks with posts behind the first step, and cuts stay positive',()=>{
 assert.deepEqual(step({steps:1,stepBrace:'full'}).counts,step({steps:1,stepBrace:'none'}).counts);
 assert.deepEqual(calculate({...defaults,stepBrace:'full'}).cuts,calculate({...defaults,stepBrace:'none'}).cuts);
 for(const stepBrace of ['none','width','full'])for(const steps of [2,4,6])for(const center of [true,false])
  assert.ok(step({stepBrace,steps,center}).cuts.every(c=>Number.isFinite(c.cut)&&c.cut>0),`${stepBrace} ${steps} ${center}`);
});
