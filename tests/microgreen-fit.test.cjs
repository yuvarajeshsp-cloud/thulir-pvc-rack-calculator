const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,defaults,trayFit}=require('../dist/app.js');

const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<.01,`${msg}: ${a} vs ${b}`);

test('standard racks keep their typed size and have no tray layout',()=>{
 const m=calculate({...defaults});
 close(m.W,defaults.width*304.8,'width');close(m.D,defaults.depth*304.8,'depth');
 assert.equal(m.trayLayout,undefined);
 assert.equal(m.equipment.bill.find(r=>r.id==='tray').qty,4*defaults.shelves);
});

test('four 24 x 12 in trays: two per bay clear the fittings and the ends rest across the rails',()=>{
 const v={...defaults,microgreen:true,trayLength:24,trayWidth:12,traysPerRow:4,trayGap:.5};
 const m=calculate(v),fit=trayFit(v),g=.5*25.4;
 close(m.W,fit.width*304.8,'width follows the tray fit');close(m.D,fit.depth*304.8,'depth follows the tray fit');
 // Each bay: two trays, the slide-in allowance and the fitting socket reach at both posts.
 close(m.W/2,2*12*25.4+g+v.c4+v.c5,'bay width');
 // The rails sit inside the tray ends, which overhang each rail's outer edge by half the allowance.
 close(m.D,24*25.4-v.od-g,'depth');
 assert.equal(m.trayLayout.length,4);
 for(const t of m.trayLayout){
  close(t.y1-t.y0,24*25.4,'tray length');close(t.x1-t.x0,12*25.4,'tray width');
  close(-t.y0-v.od/2,g/2,'front overhang past the rail');close(t.y1-m.D-v.od/2,g/2,'back overhang past the rail');
  const inBay=t.x1<=m.W/2?[0,m.W/2]:[m.W/2,m.W],reach=x=>x===0||x===m.W?Math.max(v.c3,v.c4):v.c5;
  assert.ok(t.x0>=inBay[0]+reach(inBay[0])-.01&&t.x1<=inBay[1]-reach(inBay[1])+.01,'tray stays clear of the fitting sockets');
 }
 assert.equal(m.equipment.bill.find(r=>r.id==='tray').qty,4*v.shelves);
 assert.ok(m.cuts.every(c=>Number.isFinite(c.cut)&&c.cut>0));
});

test('odd tray counts, no centre posts and stepped racks still fit every tray',()=>{
 for(const v of [{traysPerRow:3},{traysPerRow:3,center:false},{layout:'step',steps:3},{traysPerRow:6,trayLength:21.4,trayWidth:10.9}]){
  const m=calculate({...defaults,microgreen:true,...v}),n=v.traysPerRow||4;
  assert.equal(m.trayLayout.length,n);
  const xs=m.trayLayout.map(t=>[t.x0,t.x1]).sort((a,b)=>a[0]-b[0]);
  for(let i=1;i<xs.length;i++)assert.ok(xs[i][0]>=xs[i-1][1]-.01,'trays do not overlap');
  assert.ok(xs[0][0]>0&&xs.at(-1)[1]<m.W,'trays stay between the outer posts');
  assert.ok(m.cuts.every(c=>Number.isFinite(c.cut)&&c.cut>0));
 }
});
