const buildRackEquipment=typeof module!=='undefined'?require('./equipment.js'):window.buildEquipment;
const defaults={sprinklerOn:true,fansOn:true,lightsOn:true,fans:false,fansPerShelf:2,lights:false,lightsPerShelf:2,ledFeet:4,irrigation:false,layout:'vertical',steps:3,stepRise:12,width:4,depth:2,shelves:4,gap:18,foot:152.4,center:true,overhead:true,trays:true,shelfBase:'mesh',od:33.4,insert:25,c3:35,c4:35,c5:35,c6:35,c7:35,trayRail:true,confirmed:false,stock:6.096,kerf:3,racks:1,microgreen:false,trayLength:24,trayWidth:12,traysPerRow:4,trayGap:.5};
// Microgreen racks size the shelf from the tray: trays sit side by side between the posts, and each tray's
// front and back ends rest across the front and back rails. Tray inputs are inches; returned sizes are feet.
function trayFit(v){
 const n=Math.max(1,Math.round(v.traysPerRow)),bays=v.center?2:1,perBay=Math.ceil(n/bays),g=v.trayGap*25.4,corner=Math.max(v.c3,v.c4);
 const bay=perBay*v.trayWidth*25.4+g+corner+(v.center?v.c5:corner),depth=v.trayLength*25.4-v.od-g;
 return {width:bays*bay/304.8,depth:depth/304.8,n,bays,perBay,bay,overhang:g/2};
}
// Tray rectangles for one shelf: x across the rack, y from the shelf's front rail (negative = past the rail).
function layoutTrays(plan,v){
 const {n,bays,perBay}=trayFit(v),tw=v.trayWidth*25.4,L=v.trayLength*25.4,corner=Math.max(v.c3,v.c4),trays=[];
 for(let b=0;b<bays;b++){const k=b===0?perBay:n-perBay;if(k<=0)continue;
  const left=plan.xs[b]+(b===0?corner:v.c5),right=plan.xs[b+1]-(b===bays-1?corner:v.c5),start=(left+right)/2-k*tw/2;
  for(let i=0;i<k;i++)trays.push({x0:start+i*tw,x1:start+(i+1)*tw,y0:(plan.rowD-L)/2,y1:(plan.rowD+L)/2});}
 return trays;
}
function calculate(v){
 if(v.microgreen){const fit=trayFit(v);v={...v,width:fit.width,depth:fit.depth};}
 if(v.layout==='step')return calculateSteps(v);
 const W=v.width*304.8,D=v.depth*304.8,F=v.shelves+(v.overhead?1:0),P=v.gap*25.4+v.od,posts=v.center?6:4;
 const joints=[],segments=[],cuts=[],C=t=>v['c'+t],I=v.insert,base=Math.max(F===1?v.c3:v.c4,v.center?v.c5:0)+v.foot;
 const xs=v.center?[0,W/2,W]:[0,W];const key=(x,y,f)=>`${x}/${y}/${f}`;const nodes=new Map();
 for(let f=0;f<F;f++)for(const x of xs)for(const y of [0,D]){const mid=x>0&&x<W,t=mid?5:(f===F-1?3:4),j={x,y,z:base+f*P,t,f,capped:mid&&f===F-1};joints.push(j);nodes.set(key(x,y,f),j);}
 // Tray support rail across the middle of the depth on each growing shelf: T joints at the sides, a cross T at the centre.
 const railed=f=>v.trayRail&&f<v.shelves,Y=D/2;
 for(let f=0;f<F;f++)if(railed(f))for(const x of xs){const j={x,y:Y,z:base+f*P,t:x>0&&x<W?7:6,f};joints.push(j);nodes.set(key(x,Y,f),j);}
 function add(a,b,name,cut){segments.push({a,b,name});cuts.push({name,cut:Math.round(cut*10)/10});}
 function link(a,b,name){const span=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);add(a,b,name,span-C(a.t)-C(b.t)+2*I);}
 for(let f=0;f<F;f++){
  for(const y of [0,D])for(let ix=0;ix<xs.length-1;ix++)link(nodes.get(key(xs[ix],y,f)),nodes.get(key(xs[ix+1],y,f)),v.center?'Width half-rail':'Width rail');
  for(const x of xs){const centre=x>0&&x<W;if(railed(f)){link(nodes.get(key(x,0,f)),nodes.get(key(x,Y,f)),centre?'Centre depth half-rail':'Depth half-rail');link(nodes.get(key(x,Y,f)),nodes.get(key(x,D,f)),centre?'Centre depth half-rail':'Depth half-rail');}else link(nodes.get(key(x,0,f)),nodes.get(key(x,D,f)),centre?'Centre depth rail':'Depth rail');}
  if(railed(f))for(let ix=0;ix<xs.length-1;ix++)link(nodes.get(key(xs[ix],Y,f)),nodes.get(key(xs[ix+1],Y,f)),'Tray support rail');
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
 if(v.trayRail)for(const rect of shelfRects)for(const x of xs)joints.push({x,y:(rect.y0+rect.y1)/2,z:rect.z,f:rect.f,t:x>0&&x<W?7:6});
 const add=(a,b,name,cut)=>{segments.push({a,b,name});cuts.push({name,cut:Math.round(cut*10)/10});};
 const link=(a,b,name)=>add(a,b,name,Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)-v['c'+a.t]-v['c'+b.t]+2*v.insert);
 for(const rect of shelfRects){const nodes=joints.filter(j=>j.f===rect.f),node=(x,y)=>nodes.find(j=>j.x===x&&j.y===y);
  for(const y of [rect.y0,rect.y1])for(let i=0;i<xs.length-1;i++)link(node(xs[i],y),node(xs[i+1],y),v.center?'Width half-rail':'Width rail');
  const Y=(rect.y0+rect.y1)/2;
  for(const x of xs){const centre=x>0&&x<W;if(v.trayRail){link(node(x,rect.y0),node(x,Y),centre?'Centre depth half-rail':'Depth half-rail');link(node(x,Y),node(x,rect.y1),centre?'Centre depth half-rail':'Depth half-rail');}else link(node(x,rect.y0),node(x,rect.y1),centre?'Centre depth rail':'Depth rail');}
  if(v.trayRail)for(let i=0;i<xs.length-1;i++)link(node(xs[i],Y),node(xs[i+1],Y),'Tray support rail');
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
 if(v.microgreen)plan.trayLayout=layoutTrays(plan,v);
 const result={...plan,groups:[...grouped.values()],bins,tooLong,total:cuts.reduce((a,b)=>a+b.cut,0),counts:{3:joints.filter(j=>j.t===3).length,4:joints.filter(j=>j.t===4).length,5:joints.filter(j=>j.t===5).length,6:joints.filter(j=>j.t===6).length,7:joints.filter(j=>j.t===7).length}};result.equipment=buildRackEquipment(result,v);return result;
}

function feetInches(length){
 const sign=length<0?'-':'';
 const hundredths=Math.round(Math.abs(length)/25.4*100);
 const feet=Math.floor(hundredths/1200),inches=(hundredths%1200)/100;
 return `${sign}${feet} ft ${Number(inches.toFixed(2))} in`;
}
function decimalInches(length){return Number((length/25.4).toFixed(4));}
if(typeof module!=='undefined')module.exports={calculate,defaults,feetInches,decimalInches,trayFit};
if(typeof document!=='undefined'){
const $=id=>document.getElementById(id),colors={3:'#d78b3c',4:'#44836f',5:'#7484b7',6:'#b8577a',7:'#8a6d2f'},memberColors={'Width half-rail':'#356aa0','Width rail':'#356aa0','Depth rail':'#b45d18','Centre depth rail':'#23766b','Depth half-rail':'#b45d18','Centre depth half-rail':'#23766b','Tray support rail':'#a0466b','Upright':'#76569b','Step riser':'#76569b','Bottom leg':'#805c38'};let values={...defaults},model,view='iso',angle=-.65,highlight=0;
try{const saved=JSON.parse(localStorage.getItem('thulirRackV1')||'null');if(saved)for(const k in defaults)if(typeof saved[k]===typeof defaults[k])values[k]=saved[k];
 // Rack quantity used to live only on the estimate; carry it over the first time.
 if(!saved||saved.racks===undefined){const est=JSON.parse(localStorage.getItem('thulirEstimateV1')||'null');if(est&&Number(est.rackQuantity)>1)values.racks=est.rackQuantity;}}catch(e){}
// Upgrade the previous defaults once while preserving customised dimensions.
try{if(!localStorage.getItem('thulirDefaults20ft6in')){if(values.foot===100)values.foot=defaults.foot;if(values.stock===3)values.stock=defaults.stock;localStorage.setItem('thulirRackV1',JSON.stringify(values));localStorage.setItem('thulirDefaults20ft6in','1');}}catch(e){}
const memberCodes={'Width half-rail':'W','Width rail':'W','Depth rail':'D','Centre depth rail':'C','Depth half-rail':'D','Centre depth half-rail':'C','Tray support rail':'S','Upright':'U','Step riser':'R','Bottom leg':'B'};
const memberDescriptions={'Width half-rail':'Across shelf width, split at centre support','Width rail':'Across the shelf width','Depth rail':'Front-to-back outer rails','Centre depth rail':'Front-to-back middle support','Depth half-rail':'Front or back half of a side rail, split at the T joint','Centre depth half-rail':'Front or back half of the centre rail, split at the cross T','Tray support rail':'Across the shelf at mid-depth, under the trays','Upright':'Vertical sections between shelf frames','Step riser':'Vertical sections connecting adjacent steps','Bottom leg':'Lower sections from floor to first rail'};
const inchFields=new Set(['foot','od','insert','c3','c4','c5','c6','c7','kerf']);
// Display names for each fitting type (6 = T joint, 7 = cross T joint on the tray support rail).
const fittingInfo={3:['3-way corner elbow','Outer post-top corners','pvc-3-way.png'],4:['4-way side-outlet tee','Through-post shelf corners','pvc-4-way.png'],5:['5-way centre fitting','Centre rail junctions','pvc-5-way.png'],6:['T joint','Tray support rail at the side rails','pvc-tee.png'],7:['Cross T joint','Tray support rail meets the centre rail','pvc-cross.png']};
// Product images for accessory rows in Fittings & accessories.
const accessoryImages={plug:['pvc-socket-plug.png','White PVC socket plug with a flanged head'],footcap:['pvc-end-cap.png','White PVC pipe end cap'],mesh:['mesh-panel.png','Galvanised welded-wire mesh shelf panel'],draincell:['draincell.svg','Modular 20 by 10 inch black drainage cell panel'],fan:['pc-fan.png','Black 120 mm PC fan with seven blades'],led2:['led-light.png','LED grow light batten with frosted diffuser'],led4:['led-light.png','LED grow light batten with frosted diffuser']};
const accessoryThumb=id=>accessoryImages[id]?`<span class="fitting-thumb"><img src="assets/${accessoryImages[id][0]}" alt="${accessoryImages[id][1]}" width="100" height="100" loading="lazy" decoding="async"></span>`:'';;
const fittingTypes=m=>[3,4,5,6,7].filter(t=>t<6||m.counts[t]);
const pairFields=new Set(['width','depth','stock']);
function showPair(k,value=values[k]){const el=$(k),ft=k==='stock'?value/.3048:value;el.value=Math.floor(ft);$(k+'In').value=Number(((ft-Math.floor(ft))*12).toFixed(4));$(k+'In').dataset.original=$(k+'In').value;el.dataset.original=el.value;}
function sync(){
 for(const k in defaults){const el=$(k);if(k==='layout'){el.value=values.layout;continue;}if(el.type==='checkbox'){el.checked=values[k];continue;}
  if(pairFields.has(k))showPair(k);
  else el.value=inchFields.has(k)?decimalInches(values[k]):values[k];
  el.dataset.original=el.value;
 }
}
function read(){
 for(const k in defaults){const el=$(k);if(k==='layout'){values.layout=el.value==='step'?'step':'vertical';continue;}if(k==='shelfBase'){values.shelfBase=el.value==='drain'?'drain':'mesh';continue;}if(k==='ledFeet'){values.ledFeet=el.value==='2'?2:4;continue;}if(el.type==='checkbox'){values[k]=el.checked;continue;}
  const extra=pairFields.has(k)?$(k+'In'):null;
  if(el.value===el.dataset.original&&(!extra||extra.value===extra.dataset.original))continue;
  let n=Number(el.value);if(!Number.isFinite(n)||el.value==='')continue;
  n=Math.max(Number(el.min),Math.min(Number(el.max),n));
  if(extra){const inches=Math.max(0,Math.min(11.99,Number(extra.value)||0));values[k]=(Math.floor(n)+inches/12)*(k==='stock'?.3048:1);}
  else values[k]=n*(inchFields.has(k)?25.4:1);
  el.dataset.original=el.value;if(extra)extra.dataset.original=extra.value;
 }
 if(values.layout==='vertical'&&(values.lights||values.fans||values.irrigation)){values.overhead=true;$('overhead').checked=true;}
 values.shelves=Math.round(values.shelves);values.racks=Math.max(1,Math.min(20,Math.round(values.racks)||1));values.steps=Math.max(1,Math.min(6,Math.round(values.steps)));
}
const fmt=n=>Number(n.toFixed(1)).toLocaleString('en-IN');
// Microgreen racks take width and depth from the tray fit. The size inputs show the fitted size while it is
// on, and the typed size is kept so unticking it restores the standard rack.
function applyTrayFit(){const fit=values.microgreen?trayFit(values):null;$('trayFitOptions').hidden=!fit;for(const id of ['width','widthIn','depth','depthIn'])$(id).disabled=!!fit;
 showPair('width',fit?fit.width:values.width);showPair('depth',fit?fit.depth:values.depth);if(!fit)return;for(const id of ['widthIn','depthIn'])$(id).value=$(id).dataset.original=Number(Number($(id).value).toFixed(2));
 const inch=n=>Number((n/25.4).toFixed(2)),step=values.layout==='step';
 $('trayFitNote').textContent=`${fit.n} trays of ${values.trayLength} × ${values.trayWidth} in per ${step?'step':'shelf'}${fit.bays>1?` · ${fit.n-fit.perBay===fit.perBay?`${fit.perBay} per bay`:`${fit.perBay} and ${fit.n-fit.perBay} in the two bays`} either side of the centre posts`:''}. Width ${feetInches(fit.width*304.8)} × ${step?'row ':''}depth ${feetInches(fit.depth*304.8)} post centres: each tray end overhangs the outer edge of its rail by ${inch(fit.overhang)} in. Measure your tray across the top rim.`;}
function render(){read();applyTrayFit();model=calculate(values);try{localStorage.setItem('thulirRackV1',JSON.stringify(values));}catch(e){}const m=model,R=values.racks,racksNote=R>1?` · ${R} racks`:'';
 const sb=m.equipment.shelfBase;
 $('shelfBaseNote').textContent=sb.type==='drain'
  ?`Estimated ${sb.perShelf} drain cells per shelf (${sb.cols} × ${sb.rows}, oriented ${Math.round(sb.panelW/25.4)} × ${Math.round(sb.panelD/25.4)} in); ${sb.total*R} total. Cut surplus and support every joint.`
  :`One cut-to-size wire mesh panel per shelf; ${sb.total*R} panels for ${R} rack(s).`;
 const step=m.layout==='step';$('sprinklerOn').disabled=!values.irrigation;$('fansOn').disabled=!values.fans||step;$('lightsOn').disabled=!values.lights||step;$('verticalEquipment').hidden=step;$('verticalEquipmentNote').hidden=!step;$('overhead').disabled=!step&&(values.lights||values.fans||values.irrigation);$('verticalCount').hidden=step;$('stepControls').hidden=!step;$('gapOption').hidden=step;$('overheadOption').hidden=step;$('stepsOut').textContent=values.steps;$('layoutNote').textContent=step?`${values.steps} staircase rows · each ${feetInches(m.W)} × ${feetInches(m.rowD)}. Rise ${feetInches(m.P)} per step. Shared posts; light mounts separate.`:'Stacked shelves with an optional overhead light frame.';
 $('lightingSummary').textContent=values.lights&&!step?`${m.equipment.lightRows} rows × ${m.equipment.lightsPerRow} LEDs = ${m.equipment.lightRows*m.equipment.lightsPerRow} fixtures per shelf · ${m.equipment.lights.length} total`:'';$('shelvesOut').textContent=values.shelves;$('dimensions').textContent=`${feetInches(m.W)} × ${feetInches(m.D)} · ${m.growingShelves} ${step?'steps':'growing shelves'}${R>1?` · ${R} racks`:''}`;$('height').textContent=`${feetInches(m.top)} to top rail centre`;
 $('stats').innerHTML=`<div class="stat dark"><b>${m.joints.length*R}</b><span>total frame fittings${racksNote}</span></div><div class="stat"><b>${feetInches(m.total*R)}</b><span>net cut pipe · ${m.cuts.length*R} pieces</span></div><div class="stat"><b>${m.tooLong.length?'—':m.bins.length*R}</b><span>${feetInches(values.stock*1000)} stock pipes · estimated</span></div><div class="stat"><b>${m.posts*R}</b><span>vertical posts · ${m.F} frames${R>1?' per rack':''}</span></div>`;
 const errors=[...m.equipment.warnings];if(values.insert>Math.min(values.c3,values.c4,values.c5,...(values.trayRail?[values.c6,values.c7]:[])))errors.push('Insertion depth exceeds a fitting centre-to-mouth distance. Check your measurements.');if(m.cuts.some(p=>p.cut<=0))errors.push('Some cuts are zero or negative. Increase spans or correct fitting measurements.');if(m.tooLong.length)errors.push(`${m.tooLong.length} pieces exceed the selected stock length including kerf. Choose longer stock; no splice fittings are included.`);
 $('warning').textContent=errors.length?errors.join(' '):values.confirmed?'Using your measured fitting dimensions. Dry-fit one frame and confirm tray clearance before batch cutting.':'Example socket measurements — cut lengths are provisional until you measure your fittings. Width and depth are post-centre dimensions.';
 $('cutbadge').textContent=values.confirmed?'MEASURED INPUTS':'PROVISIONAL';
 const icon=t=>`<button class="fitting-thumb" data-highlight="${t}" aria-label="Highlight ${fittingInfo[t][0]} fittings on rack"><img src="assets/${fittingInfo[t][2]}" alt="White PVC ${t===3?'three-dimensional corner elbow':t===4?'side-outlet tee with vertical through sockets':t===5?'centre connector with five sockets':t===6?'equal tee with three sockets':'cross with four sockets in one plane'}" width="100" height="100" loading="lazy" decoding="async"></button>`;
 $('fittings').innerHTML=fittingTypes(m).map(t=>`<div class="fitting" data-fitting-type="${t}">${icon(t)}<button data-highlight="${t}">${fittingInfo[t][0]}<small>${fittingInfo[t][1]}</small></button><span class="number">${m.counts[t]*R}</span></div>`).join('')+`<div class="fitting">${accessoryThumb('plug')}<span>Top-centre socket plugs<small>Close the unused top socket of centre fittings</small></span><span class="number">${m.caps*R}</span></div><div class="fitting">${accessoryThumb('footcap')}<span>Feet / end caps<small>One under each post</small></span><span class="number">${m.posts*R}</span></div>${m.equipment.bill.filter(p=>p.id==='mesh'||p.id==='draincell').map(p=>`<div class="fitting">${accessoryThumb(p.id)}<span>${p.label}<small>${sb.type==='drain'?`${sb.cols} × ${sb.rows} per shelf, 20 × 10 in, trim to frame`:`Each ${feetInches(m.W)} × ${feetInches(m.rowD)}; trim to frame`}</small></span><span class="number">${p.qty*R}</span></div>`).join('')}${m.equipment.bill.filter(p=>['fan','led2','led4','nozzle'].includes(p.id)).map(p=>`<div class="fitting">${accessoryThumb(p.id)}<span>${p.label}</span><span class="number">${p.qty*R}</span></div>`).join('')}`;
 $('cuts').innerHTML=m.groups.map(p=>`<tr data-pipe-name="${p.name}" data-pipe-cut="${p.cut}"><td><span class="cut-key" style="background:${memberColors[p.name]}">${memberCodes[p.name]}</span>${p.name}</td><td>${feetInches(p.cut)}</td><td>${p.qty*R}</td><td>${feetInches(p.cut*p.qty*R)}</td></tr>`).join('');
 const waste=m.bins.length*values.stock*1000-m.bins.reduce((a,b)=>a+b.used,0);$('stocknote').textContent=m.tooLong.length?'Incomplete plan: over-length pieces are not packed.':R>1?`Cutting plan for one rack — repeat it for each of the ${R} racks. ${m.bins.length} × ${feetInches(values.stock*1000)} lengths per rack (${m.bins.length*R} in total) · ${feetInches(waste)} reusable offcut per rack after kerf · first-fit estimate`:`${m.bins.length} × ${feetInches(values.stock*1000)} lengths · ${feetInches(waste)} reusable offcut after kerf · first-fit estimate`;
 const usedMembers=[...new Set(m.cuts.map(p=>p.name))];
 $('stockLegend').innerHTML=usedMembers.map(name=>`<div class="stock-key"><span class="cut-key" style="background:${memberColors[name]}">${memberCodes[name]}</span><span><b>${name}</b><small>${memberDescriptions[name]}</small></span></div>`).join('')+'<div class="stock-key"><span class="offcut-key"></span><span><b>Offcut</b><small>Pale space at the end = leftover pipe</small></span></div>';
 $('stockbars').innerHTML=m.bins.map((b,i)=>`<div class="stock-pipe"><div class="stock-row"><span class="stock-id">Pipe ${i+1}</span><div class="stock-track">${b.pieces.map(p=>`<span class="piece" style="width:${(p.cut+values.kerf)/(values.stock*10)}%;background:${memberColors[p.name]}" title="${memberCodes[p.name]} — ${p.name}: ${feetInches(p.cut)}">${memberCodes[p.name]} · ${feetInches(p.cut)}</span>`).join('')}</div><span class="leftover">${feetInches(values.stock*1000-b.used)} left</span></div><details class="cut-sequence"><summary>See cuts for pipe ${i+1} · ${b.pieces.length} pieces</summary><ol>${b.pieces.map(p=>`<li><span class="cut-key" style="background:${memberColors[p.name]}">${memberCodes[p.name]}</span><span>${p.name}</span><b>${feetInches(p.cut)}</b></li>`).join('')}</ol></details></div>`).join('');draw();window.currentRack={model,values:{...values,width:model.W/304.8,depth:model.rowD/304.8}};window.dispatchEvent(new CustomEvent('rackchange',{detail:window.currentRack}));
}
function draw(){const m=model,v=values,items=[];let raw;
 const real=window.PVCViewer?.available;
 $('pvcCanvas').hidden=!real;$('zoomTools').hidden=!real;$('rack').style.display=real?'none':'block';
 document.querySelector('.stage-note').textContent=real?(view==='iso'?'Drag to rotate · hover or tap a fitting / pipe to inspect':'Orthographic view · hover or tap to inspect · + / − to zoom'):'Select a fitting below to highlight';
 if(real){window.PVCViewer.update(m,v,highlight,view);return;}

 // Identical racks stand side by side, 450 mm apart, as in the 3D view.
 const offsets=Array.from({length:v.racks||1},(_,i)=>i*(m.W+450)),sceneW=m.W*offsets.length+450*(offsets.length-1);let ox=0;
 if(view==='front')raw=p=>[p.x,-p.z,p.y];else if(view==='side')raw=p=>[p.y,-p.z,p.x];else if(view==='top')raw=p=>[p.x,p.y,p.z];else raw=p=>{let x=p.x-sceneW/2,y=p.y-m.D/2;return[x*Math.cos(angle)-y*Math.sin(angle),(x*Math.sin(angle)+y*Math.cos(angle))*.4-p.z*.9,(x*Math.sin(angle)+y*Math.cos(angle))*.9+p.z*.4];};
 const shifted=q=>raw({...q,x:q.x+ox});const all=offsets.flatMap(o=>{ox=o;return m.joints.map(shifted).concat(m.segments.flatMap(s=>[shifted(s.a),shifted(s.b)]));});ox=0;const minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1]));const scale=Math.min(620/(maxX-minX+80),515/(maxY-minY+150));const point=p=>{const a=shifted(p);return[400+(a[0]-(minX+maxX)/2)*scale,315+(a[1]-(minY+maxY)/2)*scale,a[2]];};
 const poly=(pts,fill,stroke='#7b9581',op=1)=>{const q=pts.map(point);items.push({z:q.reduce((s,p)=>s+p[2],0)/q.length,html:`<polygon points="${q.map(p=>p.slice(0,2).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width=".65" opacity="${op}"/>`});};
 for(const o of offsets){ox=o;
 for(const rect of m.shelfRects){const z=rect.z,y0s=rect.y0,y1s=rect.y1;poly([{x:0,y:y0s,z},{x:m.W,y:y0s,z},{x:m.W,y:y1s,z},{x:0,y:y1s,z}],v.shelfBase==='drain'?'url(#drainCell)':'url(#mesh)',v.shelfBase==='drain'?'#50645d':'#9aa998',highlight?.2:.8);
 if(v.trays){const trays=m.trayLayout||[0,1,2,3].map(i=>({x0:m.W*(.025+i*.245),x1:m.W*(.025+i*.245)+m.W*.22,y0:m.rowD*.1,y1:m.rowD*.9}));for(const t of trays){const x0=t.x0,x1=t.x1,y0=y0s+t.y0,y1=y0s+t.y1;poly([{x:x0,y:y0,z:z+14},{x:x1,y:y0,z:z+14},{x:x1,y:y1,z:z+14},{x:x0,y:y1,z:z+14}],'#344d3c','#203b34',highlight?.15:1);poly([{x:x0+8,y:y0+8,z:z+36},{x:x1-8,y:y0+8,z:z+36},{x:x1-8,y:y1-8,z:z+36},{x:x0+8,y:y1-8,z:z+36}],'url(#leaves)','#6d914d',highlight?.15:1);}}
 }
 for(const s of m.segments){const a=point(s.a),b=point(s.b),w=Math.max(3,v.od*scale);items.push({z:(a[2]+b[2])/2,html:`<g opacity="${highlight?.25:1}"><path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke="#adb8ad" stroke-width="${w+1.5}" stroke-linecap="round"/><path d="M${a[0]-.4} ${a[1]-.4}L${b[0]-.4} ${b[1]-.4}" stroke="#f7f9f2" stroke-width="${w-1}" stroke-linecap="round"/></g>`});}
 for(const j of m.joints){const p=point(j),r=Math.max(4,v.od*scale*.72);items.push({z:p[2]+1,html:`<circle cx="${p[0]}" cy="${p[1]}" r="${r}" fill="${colors[j.t]}" stroke="#fff" stroke-width="1.3" opacity="${highlight&&highlight!==j.t?.15:1}"><title>${fittingInfo[j.t][0]} · frame ${j.f+1}</title></circle>`});}
 }
 const defs=`<defs><pattern id="mesh" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#dce5d6" fill-opacity=".5"/><path d="M0 0H8M0 0V8" stroke="#9eaf99" stroke-width=".5"/></pattern><pattern id="drainCell" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#26362e"/><rect x="3" y="3" width="10" height="10" rx="2" fill="#0e1916" stroke="#667a68" stroke-width="1.7"/></pattern><pattern id="leaves" width="13" height="11" patternUnits="userSpaceOnUse"><rect width="13" height="11" fill="#6f9250"/><ellipse cx="3" cy="4" rx="3" ry="2" fill="#9bb568"/><ellipse cx="10" cy="8" rx="3" ry="2" fill="#426d3b"/></pattern></defs>`;
 $('rack').innerHTML=defs+`<ellipse cx="400" cy="590" rx="210" ry="18" fill="#a7b49b" opacity=".15"/>`+items.sort((a,b)=>a.z-b.z).map(i=>i.html).join('')+`<text x="400" y="630" text-anchor="middle" fill="#74836d" font-size="11" font-family="system-ui">${view==='iso'?'ISOMETRIC':view.toUpperCase()+' VIEW'} · ${m.posts} POSTS · ${m.F} FRAMES${offsets.length>1?` · ${offsets.length} RACKS`:''}</text>`;
}
for(const k of [...Object.keys(defaults),'widthIn','depthIn','stockIn'])$(k).addEventListener('input',render);
document.querySelectorAll('[data-steps]').forEach(b=>b.addEventListener('click',()=>{$('steps').value=b.dataset.steps;render();}));
$('views').addEventListener('click',e=>{if(!e.target.dataset.view)return;view=e.target.dataset.view;document.querySelectorAll('#views button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));draw();});
document.addEventListener('click',e=>{const b=e.target.closest('[data-highlight]');if(b){highlight=Number(b.dataset.highlight);draw();}});
let drag=null;$('rack').addEventListener('pointerdown',e=>{if(view!=='iso')return;drag={x:e.clientX,a:angle};$('rack').setPointerCapture(e.pointerId);});$('rack').addEventListener('pointermove',e=>{if(drag){angle=drag.a+(e.clientX-drag.x)*.008;draw();}});$('rack').addEventListener('pointerup',()=>drag=null);$('rack').addEventListener('pointercancel',()=>drag=null);
// Everything the Build List shows, as plain data for the PDF export.
window.rackBuildData=()=>{const m=model,R=values.racks,stockLen=values.stock*1000,piece=p=>({code:memberCodes[p.name],color:memberColors[p.name],name:p.name,cut:feetInches(p.cut)});
 const base=m.equipment.shelfBase;const extras=[{id:'plug',label:'Top-centre socket plugs',detail:'Close the unused top socket of centre fittings',qty:m.caps},{id:'footcap',label:'Feet / end caps',detail:'One under each post',qty:m.posts},{id:base.type==='drain'?'draincell':'mesh',label:base.type==='drain'?'Drain cell panels · 20 × 10 in':'Wire mesh shelf panels',detail:base.type==='drain'?`${base.cols} × ${base.rows} per shelf; trim and support edges`:`Each ${feetInches(m.W)} × ${feetInches(m.rowD)}; trim to frame`,qty:base.total},...m.equipment.bill.filter(p=>['fan','led2','led4','nozzle'].includes(p.id)).map(p=>({id:p.id,label:p.label,detail:'',qty:p.qty}))];
 return {status:values.confirmed?'Measured fitting dimensions':'PROVISIONAL - example fitting dimensions; measure your fittings before cutting',warning:$('warning').textContent,
  summary:[['Layout',m.layout==='step'?`Stepped rack · ${m.growingShelves} steps`:`Vertical rack · ${m.growingShelves} growing shelves`],['Size (post centres)',`${feetInches(m.W)} wide × ${feetInches(m.D)} deep`],['Height to top rail',feetInches(m.top)],['Number of racks',String(R)],['Tray support rail',values.trayRail?'Yes - T joints and cross T':'No'],['Shelf base',base.type==='drain'?`Drain cell 20 × 10 in · ${base.perShelf} panels per shelf`:'Wire mesh · one panel per shelf'],['Stock pipe',feetInches(stockLen)]],
  stats:[[String(m.joints.length*R),'frame fittings'],[feetInches(m.total*R),`net cut pipe · ${m.cuts.length*R} pieces`],[m.tooLong.length?'-':String(m.bins.length*R),'stock pipes'],[String(m.posts*R),'vertical posts']],
  fittings:[...fittingTypes(m).map(t=>({label:fittingInfo[t][0],detail:fittingInfo[t][1],qty:m.counts[t]*R,img:'assets/'+fittingInfo[t][2]})),...extras.filter(x=>x.qty>0).map(x=>({label:x.label,detail:x.detail,qty:x.qty*R,img:accessoryImages[x.id]?'assets/'+accessoryImages[x.id][0]:null}))],
  cuts:m.groups.map(p=>({...piece(p),qty:p.qty*R,total:feetInches(p.cut*p.qty*R)})),
  stock:{length:feetInches(stockLen),perRack:m.bins.length,racks:R,tooLong:m.tooLong.length,bins:m.bins.map(b=>({left:feetInches(stockLen-b.used),pieces:b.pieces.map(p=>({...piece(p),frac:(p.cut+values.kerf)/stockLen}))}))}};
};
$('reset').onclick=()=>{values={...defaults};sync();highlight=0;render();};$('print').onclick=()=>window.print();$('csv').onclick=()=>{const m=model,rows=[['Thulir rack calculator'],['Status',values.confirmed?'Measured inputs':'PROVISIONAL example fitting dimensions'],['Layout',m.layout==='step'?'Staircase rows':'Vertical rack'],['Width post centres',feetInches(m.W)],['Total depth post centres',feetInches(m.D)],['Each shelf / step depth',feetInches(m.rowD)],['Length format','Feet and decimal inches; displayed to 0.01 inch'],['Number of racks',values.racks],['Growing shelves / steps per rack',m.growingShelves],['Overhead frame',m.layout==='vertical'&&values.overhead],['Centre supports',values.center],[m.layout==='step'?'Step rise inches':'Clear rail gap inches',m.layout==='step'?values.stepRise:values.gap],['Pipe OD inches',decimalInches(values.od)],['Insertion inches',decimalInches(values.insert)],['3-way centre to mouth inches',decimalInches(values.c3)],['4-way centre to mouth inches',decimalInches(values.c4)],['5-way centre to mouth inches',decimalInches(values.c5)],['Tray support rail',values.trayRail],['T joint centre to mouth inches',decimalInches(values.c6)],['Cross T centre to mouth inches',decimalInches(values.c7)],[],['Member','Cut length ft and in','Quantity','Total ft and in'],...m.groups.map(p=>[p.name,feetInches(p.cut),p.qty*values.racks,feetInches(p.cut*p.qty*values.racks)]),[],['Fitting','Quantity · all racks'],...fittingTypes(m).map(t=>[fittingInfo[t][0],m.counts[t]*values.racks]),['Top plugs',m.caps*values.racks],['Feet',m.posts*values.racks],[],['Stock length',feetInches(values.stock*1000)],['Kerf inches',decimalInches(values.kerf)],['Estimated stock pipes · all racks',m.tooLong.length?'INCOMPLETE':m.bins.length*values.racks],['Overlength pieces',m.tooLong.length],[],['Stock pipe (per rack)','Cut lengths ft and in','Offcut after kerf ft and in'],...m.bins.map((b,i)=>[i+1,b.pieces.map(p=>feetInches(p.cut)).join(' + '),feetInches(values.stock*1000-b.used)])];const data=rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8;'}));a.download='Thulir_Rack_Cut_List.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};sync();render();
}
