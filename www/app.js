const buildRackEquipment=typeof module!=='undefined'?require('./equipment.js'):window.buildEquipment;
const defaults={fansOn:true,lightsOn:true,fans:false,fansPerShelf:2,lights:false,lightsPerShelf:2,ledFeet:4,irrigation:false,layout:'vertical',steps:3,stepRise:12,width:4,depth:2,shelves:4,gap:18,foot:152.4,center:true,overhead:true,trays:true,od:33.4,insert:25,c3:35,c4:35,c5:35,confirmed:false,stock:6.096,kerf:3};
function calculate(v){
 if(v.layout==='step')return calculateSteps(v);
 const W=v.width*304.8,D=v.depth*304.8,F=v.shelves+(v.overhead?1:0),P=v.gap*25.4+v.od,posts=v.center?6:4;
 const joints=[],segments=[],cuts=[],C=t=>v['c'+t],I=v.insert,base=Math.max(F===1?v.c3:v.c4,v.center?v.c5:0)+v.foot;
 const xs=v.center?[0,W/2,W]:[0,W];const key=(x,y,f)=>`${x}/${y}/${f}`;const nodes=new Map();
 for(let f=0;f<F;f++)for(const x of xs)for(const y of [0,D]){const mid=x>0&&x<W,t=mid?5:(f===F-1?3:4),j={x,y,z:base+f*P,t,f,capped:mid&&f===F-1};joints.push(j);nodes.set(key(x,y,f),j);}
 function add(a,b,name,cut){segments.push({a,b,name});cuts.push({name,cut:Math.round(cut*10)/10});}
 function link(a,b,name){const span=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);add(a,b,name,span-C(a.t)-C(b.t)+2*I);}
 for(let f=0;f<F;f++){
  for(const y of [0,D])for(let ix=0;ix<xs.length-1;ix++)link(nodes.get(key(xs[ix],y,f)),nodes.get(key(xs[ix+1],y,f)),v.center?'Width half-rail':'Width rail');
  for(const x of xs)link(nodes.get(key(x,0,f)),nodes.get(key(x,D,f)),x>0&&x<W?'Centre depth rail':'Depth rail');
 }
 for(const x of xs)for(const y of [0,D]){
  for(let f=0;f<F-1;f++)link(nodes.get(key(x,y,f)),nodes.get(key(x,y,f+1)),'Upright');
  const a=nodes.get(key(x,y,0));add({...a,z:0},a,'Bottom leg',base-C(a.t)+I);
 }
 return finalizePlan({layout:'vertical',W,D,rowD:D,F,P,posts,base,xs,joints,segments,cuts,top:base+(F-1)*P,caps:v.center?2:0,growingShelves:v.shelves,shelfRects:Array.from({length:v.shelves},(_,f)=>({y0:0,y1:D,z:base+f*P,f}))},v);
}
function calculateSteps(v){
 const N=Math.max(1,Math.min(6,Math.round(v.steps||3))),W=v.width*304.8,rowD=v.depth*304.8,D=rowD*N,P=v.stepRise*25.4;
 const xs=v.center?[0,W/2,W]:[0,W],base=Math.max(v.c3,v.c4,v.center?v.c5:0)+v.foot;
 const joints=[],segments=[],cuts=[],shelfRects=[],columns=new Map(),boundaries=Array.from({length:N+1},(_,i)=>i*rowD);
 for(let f=0;f<N;f++){
  const y0=boundaries[N-1-f],y1=boundaries[N-f],z=base+f*P;shelfRects.push({y0,y1,z,f});
  for(const x of xs)for(const y of [y0,y1]){const j={x,y,z,f};joints.push(j);const key=x+':'+y;if(!columns.has(key))columns.set(key,[]);columns.get(key).push(j);}
 }
 for(const col of columns.values()){col.sort((a,b)=>a.z-b.z);col.forEach((j,i)=>{const mid=j.x>0&&j.x<W,last=i===col.length-1;j.t=mid?5:last?3:4;j.capped=mid&&last;});}
 const add=(a,b,name,cut)=>{segments.push({a,b,name});cuts.push({name,cut:Math.round(cut*10)/10});};
 const link=(a,b,name)=>add(a,b,name,Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)-v['c'+a.t]-v['c'+b.t]+2*v.insert);
 for(const rect of shelfRects){const nodes=joints.filter(j=>j.f===rect.f),node=(x,y)=>nodes.find(j=>j.x===x&&j.y===y);
  for(const y of [rect.y0,rect.y1])for(let i=0;i<xs.length-1;i++)link(node(xs[i],y),node(xs[i+1],y),v.center?'Width half-rail':'Width rail');
  for(const x of xs)link(node(x,rect.y0),node(x,rect.y1),x>0&&x<W?'Centre depth rail':'Depth rail');
 }
 for(const col of columns.values()){for(let i=0;i<col.length-1;i++)link(col[i],col[i+1],'Step riser');const j=col[0];add({...j,z:0},j,'Bottom leg',j.z-v['c'+j.t]+v.insert);}
 return finalizePlan({layout:'step',W,D,rowD,F:N,P,posts:columns.size,base,xs,joints,segments,cuts,top:base+(N-1)*P,caps:joints.filter(j=>j.capped).length,growingShelves:N,shelfRects},v);
}
function finalizePlan(plan,v){const {cuts,joints}=plan;
 const grouped=new Map();for(const p of cuts){const k=p.name+':'+p.cut;if(!grouped.has(k))grouped.set(k,{...p,qty:0});grouped.get(k).qty++;}
 const bins=[],tooLong=[],stock=v.stock*1000;for(const p of [...cuts].sort((a,b)=>b.cut-a.cut)){
  if(p.cut+v.kerf>stock){tooLong.push(p);continue;}if(p.cut<=0)continue;
  let bin=bins.find(b=>b.used+p.cut+v.kerf<=stock+.001);if(!bin){bin={used:0,pieces:[]};bins.push(bin);}bin.pieces.push(p);bin.used+=p.cut+v.kerf;
 }
 const result={...plan,groups:[...grouped.values()],bins,tooLong,total:cuts.reduce((a,b)=>a+b.cut,0),counts:{3:joints.filter(j=>j.t===3).length,4:joints.filter(j=>j.t===4).length,5:joints.filter(j=>j.t===5).length}};result.equipment=buildRackEquipment(result,v);return result;
}

function feetInches(length){
 const sign=length<0?'-':'';
 const hundredths=Math.round(Math.abs(length)/25.4*100);
 const feet=Math.floor(hundredths/1200),inches=(hundredths%1200)/100;
 return `${sign}${feet} ft ${Number(inches.toFixed(2))} in`;
}
function decimalInches(length){return Number((length/25.4).toFixed(4));}
if(typeof module!=='undefined')module.exports={calculate,defaults,feetInches,decimalInches};
if(typeof document!=='undefined'){
const $=id=>document.getElementById(id),colors={3:'#d78b3c',4:'#44836f',5:'#7484b7'},memberColors={'Width half-rail':'#356aa0','Width rail':'#356aa0','Depth rail':'#b45d18','Centre depth rail':'#23766b','Upright':'#76569b','Step riser':'#76569b','Bottom leg':'#805c38'};let values={...defaults},model,view='iso',angle=-.65,highlight=0;
try{const saved=JSON.parse(localStorage.getItem('thulirRackV1')||'null');if(saved)for(const k in defaults)if(typeof saved[k]===typeof defaults[k])values[k]=saved[k];}catch(e){}
// Upgrade the previous defaults once while preserving customised dimensions.
try{if(!localStorage.getItem('thulirDefaults20ft6in')){if(values.foot===100)values.foot=defaults.foot;if(values.stock===3)values.stock=defaults.stock;localStorage.setItem('thulirRackV1',JSON.stringify(values));localStorage.setItem('thulirDefaults20ft6in','1');}}catch(e){}
const memberCodes={'Width half-rail':'W','Width rail':'W','Depth rail':'D','Centre depth rail':'C','Upright':'U','Step riser':'R','Bottom leg':'B'};
const memberDescriptions={'Width half-rail':'Across shelf width, split at centre support','Width rail':'Across the shelf width','Depth rail':'Front-to-back outer rails','Centre depth rail':'Front-to-back middle support','Upright':'Vertical sections between shelf frames','Step riser':'Vertical sections connecting adjacent steps','Bottom leg':'Lower sections from floor to first rail'};
const inchFields=new Set(['foot','od','insert','c3','c4','c5','kerf']);
const pairFields=new Set(['width','depth','stock']);
function sync(){
 for(const k in defaults){const el=$(k);if(k==='layout'){el.value=values.layout;continue;}if(el.type==='checkbox'){el.checked=values[k];continue;}
  if(pairFields.has(k)){const ft=k==='stock'?values[k]/.3048:values[k];el.value=Math.floor(ft);$(k+'In').value=Number(((ft-Math.floor(ft))*12).toFixed(4));$(k+'In').dataset.original=$(k+'In').value;}
  else el.value=inchFields.has(k)?decimalInches(values[k]):values[k];
  el.dataset.original=el.value;
 }
}
function read(){
 for(const k in defaults){const el=$(k);if(k==='layout'){values.layout=el.value==='step'?'step':'vertical';continue;}if(k==='ledFeet'){values.ledFeet=el.value==='2'?2:4;continue;}if(el.type==='checkbox'){values[k]=el.checked;continue;}
  const extra=pairFields.has(k)?$(k+'In'):null;
  if(el.value===el.dataset.original&&(!extra||extra.value===extra.dataset.original))continue;
  let n=Number(el.value);if(!Number.isFinite(n)||el.value==='')continue;
  n=Math.max(Number(el.min),Math.min(Number(el.max),n));
  if(extra){const inches=Math.max(0,Math.min(11.99,Number(extra.value)||0));values[k]=(Math.floor(n)+inches/12)*(k==='stock'?.3048:1);}
  else values[k]=n*(inchFields.has(k)?25.4:1);
  el.dataset.original=el.value;if(extra)extra.dataset.original=extra.value;
 }
 if(values.layout==='vertical'&&(values.lights||values.fans||values.irrigation)){values.overhead=true;$('overhead').checked=true;}
 values.shelves=Math.round(values.shelves);values.steps=Math.max(1,Math.min(6,Math.round(values.steps)));
}
const fmt=n=>Number(n.toFixed(1)).toLocaleString('en-IN');
function render(){read();model=calculate(values);try{localStorage.setItem('thulirRackV1',JSON.stringify(values));}catch(e){}const m=model;
 const step=m.layout==='step';$('fansOn').disabled=!values.fans||step;$('lightsOn').disabled=!values.lights||step;$('verticalEquipment').hidden=step;$('verticalEquipmentNote').hidden=!step;$('overhead').disabled=!step&&(values.lights||values.fans||values.irrigation);$('verticalCount').hidden=step;$('stepControls').hidden=!step;$('gapOption').hidden=step;$('overheadOption').hidden=step;$('stepsOut').textContent=values.steps;$('layoutNote').textContent=step?`${values.steps} staircase rows · each ${feetInches(m.W)} × ${feetInches(m.rowD)}. Rise ${feetInches(m.P)} per step. Shared posts; light mounts separate.`:'Stacked shelves with an optional overhead light frame.';
 $('lightingSummary').textContent=values.lights&&!step?`${m.equipment.lightRows} rows × ${m.equipment.lightsPerRow} LEDs = ${m.equipment.lightRows*m.equipment.lightsPerRow} fixtures per shelf · ${m.equipment.lights.length} total`:'';$('shelvesOut').textContent=values.shelves;$('dimensions').textContent=`${feetInches(m.W)} × ${feetInches(m.D)} · ${m.growingShelves} ${step?'steps':'growing shelves'}`;$('height').textContent=`${feetInches(m.top)} to top rail centre`;
 $('stats').innerHTML=`<div class="stat dark"><b>${m.joints.length}</b><span>total frame fittings</span></div><div class="stat"><b>${feetInches(m.total)}</b><span>net cut pipe · ${m.cuts.length} pieces</span></div><div class="stat"><b>${m.tooLong.length?'—':m.bins.length}</b><span>${feetInches(values.stock*1000)} stock pipes · estimated</span></div><div class="stat"><b>${m.posts}</b><span>vertical posts · ${m.F} frames</span></div>`;
 const errors=[...m.equipment.warnings];if(values.insert>Math.min(values.c3,values.c4,values.c5))errors.push('Insertion depth exceeds a fitting centre-to-mouth distance. Check your measurements.');if(m.cuts.some(p=>p.cut<=0))errors.push('Some cuts are zero or negative. Increase spans or correct fitting measurements.');if(m.tooLong.length)errors.push(`${m.tooLong.length} pieces exceed the selected stock length including kerf. Choose longer stock; no splice fittings are included.`);
 $('warning').textContent=errors.length?errors.join(' '):values.confirmed?'Using your measured fitting dimensions. Dry-fit one frame and confirm tray clearance before batch cutting.':'Example socket measurements — cut lengths are provisional until you measure your fittings. Width and depth are post-centre dimensions.';
 $('cutbadge').textContent=values.confirmed?'MEASURED INPUTS':'PROVISIONAL';
 const icon=t=>`<button class="fitting-thumb" data-highlight="${t}" aria-label="Highlight ${t}-way fittings on rack"><img src="assets/pvc-${t}-way.png" alt="White PVC ${t}-way ${t===3?'three-dimensional corner elbow':t===4?'side-outlet tee with vertical through sockets':'centre connector with five sockets'}" width="100" height="100" loading="lazy" decoding="async"></button>`;
 $('fittings').innerHTML=[3,4,5].map(t=>`<div class="fitting" data-fitting-type="${t}">${icon(t)}<button data-highlight="${t}">${t}-way ${t===3?'corner elbow':t===4?'side-outlet tee':'centre fitting'}<small>${t===3?'Outer post-top corners':t===4?'Through-post shelf corners':'Centre rail junctions'}</small></button><span class="number">${m.counts[t]}</span></div>`).join('')+`<div class="fitting"><span>Top-centre socket plugs</span><span class="number">${m.caps}</span></div><div class="fitting"><span>Feet / end caps</span><span class="number">${m.posts}</span></div><div class="fitting"><span>Mesh shelf panels <small>Each ${feetInches(m.W)} × ${feetInches(m.rowD)}; trim to frame</small></span><span class="number">${m.growingShelves}</span></div>${m.equipment.bill.filter(p=>['fan','led2','led4','nozzle'].includes(p.id)).map(p=>`<div class="fitting"><span>${p.label}</span><span class="number">${p.qty}</span></div>`).join('')}`;
 $('cuts').innerHTML=m.groups.map(p=>`<tr data-pipe-name="${p.name}" data-pipe-cut="${p.cut}"><td><span class="cut-key" style="background:${memberColors[p.name]}">${memberCodes[p.name]}</span>${p.name}</td><td>${feetInches(p.cut)}</td><td>${p.qty}</td><td>${feetInches(p.cut*p.qty)}</td></tr>`).join('');
 const waste=m.bins.length*values.stock*1000-m.bins.reduce((a,b)=>a+b.used,0);$('stocknote').textContent=m.tooLong.length?'Incomplete plan: over-length pieces are not packed.':`${m.bins.length} × ${feetInches(values.stock*1000)} lengths · ${feetInches(waste)} reusable offcut after kerf · first-fit estimate`;
 const usedMembers=[...new Set(m.cuts.map(p=>p.name))];
 $('stockLegend').innerHTML=usedMembers.map(name=>`<div class="stock-key"><span class="cut-key" style="background:${memberColors[name]}">${memberCodes[name]}</span><span><b>${name}</b><small>${memberDescriptions[name]}</small></span></div>`).join('')+'<div class="stock-key"><span class="offcut-key"></span><span><b>Offcut</b><small>Pale space at the end = leftover pipe</small></span></div>';
 $('stockbars').innerHTML=m.bins.map((b,i)=>`<div class="stock-pipe"><div class="stock-row"><span class="stock-id">Pipe ${i+1}</span><div class="stock-track">${b.pieces.map(p=>`<span class="piece" style="width:${(p.cut+values.kerf)/(values.stock*10)}%;background:${memberColors[p.name]}" title="${memberCodes[p.name]} — ${p.name}: ${feetInches(p.cut)}">${memberCodes[p.name]} · ${feetInches(p.cut)}</span>`).join('')}</div><span class="leftover">${feetInches(values.stock*1000-b.used)} left</span></div><details class="cut-sequence"><summary>See cuts for pipe ${i+1} · ${b.pieces.length} pieces</summary><ol>${b.pieces.map(p=>`<li><span class="cut-key" style="background:${memberColors[p.name]}">${memberCodes[p.name]}</span><span>${p.name}</span><b>${feetInches(p.cut)}</b></li>`).join('')}</ol></details></div>`).join('');draw();window.currentRack={model,values:{...values}};window.dispatchEvent(new CustomEvent('rackchange',{detail:window.currentRack}));
}
function draw(){const m=model,v=values,items=[];let raw;
 const real=window.PVCViewer?.available;
 $('pvcCanvas').hidden=!real;$('zoomTools').hidden=!real;$('rack').style.display=real?'none':'block';
 document.querySelector('.stage-note').textContent=real?(view==='iso'?'Drag to rotate · hover or tap a fitting / pipe to inspect':'Orthographic view · hover or tap to inspect · + / − to zoom'):'Select a fitting below to highlight';
 if(real){window.PVCViewer.update(m,v,highlight,view);return;}

 if(view==='front')raw=p=>[p.x,-p.z,p.y];else if(view==='side')raw=p=>[p.y,-p.z,p.x];else if(view==='top')raw=p=>[p.x,p.y,p.z];else raw=p=>{let x=p.x-m.W/2,y=p.y-m.D/2;return[x*Math.cos(angle)-y*Math.sin(angle),(x*Math.sin(angle)+y*Math.cos(angle))*.4-p.z*.9,(x*Math.sin(angle)+y*Math.cos(angle))*.9+p.z*.4];};
 const all=m.joints.map(raw).concat(m.segments.flatMap(s=>[raw(s.a),raw(s.b)]));const minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1]));const scale=Math.min(620/(maxX-minX+80),515/(maxY-minY+150));const point=p=>{const a=raw(p);return[400+(a[0]-(minX+maxX)/2)*scale,315+(a[1]-(minY+maxY)/2)*scale,a[2]];};
 const poly=(pts,fill,stroke='#7b9581',op=1)=>{const q=pts.map(point);items.push({z:q.reduce((s,p)=>s+p[2],0)/q.length,html:`<polygon points="${q.map(p=>p.slice(0,2).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width=".65" opacity="${op}"/>`});};
 for(const rect of m.shelfRects){const z=rect.z,y0s=rect.y0,y1s=rect.y1;poly([{x:0,y:y0s,z},{x:m.W,y:y0s,z},{x:m.W,y:y1s,z},{x:0,y:y1s,z}],'url(#mesh)','#9aa998',highlight?.2:.8);
 if(v.trays){for(let i=0;i<4;i++){const x0=m.W*(.025+i*.245),x1=x0+m.W*.22,y0=y0s+m.rowD*.1,y1=y1s-m.rowD*.1;poly([{x:x0,y:y0,z:z+14},{x:x1,y:y0,z:z+14},{x:x1,y:y1,z:z+14},{x:x0,y:y1,z:z+14}],'#344d3c','#203b34',highlight?.15:1);poly([{x:x0+8,y:y0+8,z:z+36},{x:x1-8,y:y0+8,z:z+36},{x:x1-8,y:y1-8,z:z+36},{x:x0+8,y:y1-8,z:z+36}],'url(#leaves)','#6d914d',highlight?.15:1);}}
 }
 for(const s of m.segments){const a=point(s.a),b=point(s.b),w=Math.max(3,v.od*scale);items.push({z:(a[2]+b[2])/2,html:`<g opacity="${highlight?.25:1}"><path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke="#adb8ad" stroke-width="${w+1.5}" stroke-linecap="round"/><path d="M${a[0]-.4} ${a[1]-.4}L${b[0]-.4} ${b[1]-.4}" stroke="#f7f9f2" stroke-width="${w-1}" stroke-linecap="round"/></g>`});}
 for(const j of m.joints){const p=point(j),r=Math.max(4,v.od*scale*.72);items.push({z:p[2]+1,html:`<circle cx="${p[0]}" cy="${p[1]}" r="${r}" fill="${colors[j.t]}" stroke="#fff" stroke-width="1.3" opacity="${highlight&&highlight!==j.t?.15:1}"><title>${j.t}-way fitting · frame ${j.f+1}</title></circle>`});}
 const defs=`<defs><pattern id="mesh" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#dce5d6" fill-opacity=".5"/><path d="M0 0H8M0 0V8" stroke="#9eaf99" stroke-width=".5"/></pattern><pattern id="leaves" width="13" height="11" patternUnits="userSpaceOnUse"><rect width="13" height="11" fill="#6f9250"/><ellipse cx="3" cy="4" rx="3" ry="2" fill="#9bb568"/><ellipse cx="10" cy="8" rx="3" ry="2" fill="#426d3b"/></pattern></defs>`;
 $('rack').innerHTML=defs+`<ellipse cx="400" cy="590" rx="210" ry="18" fill="#a7b49b" opacity=".15"/>`+items.sort((a,b)=>a.z-b.z).map(i=>i.html).join('')+`<text x="400" y="630" text-anchor="middle" fill="#74836d" font-size="11" font-family="system-ui">${view==='iso'?'ISOMETRIC':view.toUpperCase()+' VIEW'} · ${m.posts} POSTS · ${m.F} FRAMES</text>`;
}
for(const k of [...Object.keys(defaults),'widthIn','depthIn','stockIn'])$(k).addEventListener('input',render);
document.querySelectorAll('[data-steps]').forEach(b=>b.addEventListener('click',()=>{$('steps').value=b.dataset.steps;render();}));
$('views').addEventListener('click',e=>{if(!e.target.dataset.view)return;view=e.target.dataset.view;document.querySelectorAll('#views button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));draw();});
document.addEventListener('click',e=>{const b=e.target.closest('[data-highlight]');if(b){highlight=Number(b.dataset.highlight);draw();}});
let drag=null;$('rack').addEventListener('pointerdown',e=>{if(view!=='iso')return;drag={x:e.clientX,a:angle};$('rack').setPointerCapture(e.pointerId);});$('rack').addEventListener('pointermove',e=>{if(drag){angle=drag.a+(e.clientX-drag.x)*.008;draw();}});$('rack').addEventListener('pointerup',()=>drag=null);$('rack').addEventListener('pointercancel',()=>drag=null);
$('reset').onclick=()=>{values={...defaults};sync();highlight=0;render();};$('print').onclick=()=>window.print();$('csv').onclick=()=>{const m=model,rows=[['Thulir rack calculator'],['Status',values.confirmed?'Measured inputs':'PROVISIONAL example fitting dimensions'],['Layout',m.layout==='step'?'Staircase rows':'Vertical rack'],['Width post centres',feetInches(m.W)],['Total depth post centres',feetInches(m.D)],['Each shelf / step depth',feetInches(m.rowD)],['Length format','Feet and decimal inches; displayed to 0.01 inch'],['Growing shelves / steps',m.growingShelves],['Overhead frame',m.layout==='vertical'&&values.overhead],['Centre supports',values.center],[m.layout==='step'?'Step rise inches':'Clear rail gap inches',m.layout==='step'?values.stepRise:values.gap],['Pipe OD inches',decimalInches(values.od)],['Insertion inches',decimalInches(values.insert)],['3-way centre to mouth inches',decimalInches(values.c3)],['4-way centre to mouth inches',decimalInches(values.c4)],['5-way centre to mouth inches',decimalInches(values.c5)],[],['Member','Cut length ft and in','Quantity','Total ft and in'],...m.groups.map(p=>[p.name,feetInches(p.cut),p.qty,feetInches(p.cut*p.qty)]),[],['Fitting','Quantity'],...[3,4,5].map(t=>[t+'-way',m.counts[t]]),['Top plugs',m.caps],['Feet',m.posts],[],['Stock length',feetInches(values.stock*1000)],['Kerf inches',decimalInches(values.kerf)],['Estimated stock pipes',m.tooLong.length?'INCOMPLETE':m.bins.length],['Overlength pieces',m.tooLong.length],[],['Stock pipe','Cut lengths ft and in','Offcut after kerf ft and in'],...m.bins.map((b,i)=>[i+1,b.pieces.map(p=>feetInches(p.cut)).join(' + '),feetInches(values.stock*1000-b.used)])];const data=rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');if(window.shareRackFile){window.shareRackFile('Thulir_Rack_Cut_List.csv',data);return;}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8;'}));a.download='Thulir_Rack_Cut_List.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};sync();render();
}
