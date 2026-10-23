/* Geometry and bill of materials share these exact accessory routes. Millimetres internally. */
(function(root){
function equipment(m,v){
 const vertical=m.layout==='vertical',fans=[],lights=[],water=[],cables=[],nozzles=[],lightSupports=[];
 const fanCount=vertical&&v.fans?Math.max(1,Math.min(4,Math.round(v.fansPerShelf))):0;
 const lightCount=vertical&&v.lights?Math.max(1,Math.min(4,Math.round(v.lightsPerShelf))):0;
 const p=(x,y,z)=>({x,y,z}),route=(list,a,b)=>{if(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>.01)list.push({a,b});};
 const offset=v.od/2+7,ledLength=v.ledFeet*304.8,perRow=Math.max(1,Math.ceil((m.W-.001)/ledLength));
 for(const s of m.shelfRects){
  const upper=s.z+m.P,ceiling=upper-55;
  for(let i=0;i<fanCount;i++){
   const at=p(-v.od/2-18,s.y0+m.rowD*(i+1)/(fanCount+1),upper-v.od/2-65);
   fans.push({at,top:upper,shelf:s.f+1});
   route(cables,p(-offset,at.y,upper),p(at.x,at.y,at.z+55));
  }
  if(fanCount)route(cables,p(-offset,s.y0,upper),p(-offset,s.y1,upper));
  for(let row=0;row<lightCount;row++){
   const y=s.y0+m.rowD*(row+1)/(lightCount+1),start=(m.W-perRow*ledLength)/2;
   lightSupports.push({a:p(0,y,upper-v.od/2-5),b:p(m.W,y,upper-v.od/2-5)});
   for(let section=0;section<perRow;section++){
    const a=p(start+section*ledLength,y,ceiling),b=p(start+(section+1)*ledLength,y,ceiling);
    lights.push({a,b,shelf:s.f+1,row:row+1});
   }
   route(cables,p(-offset,s.y0,upper),p(-offset,y,upper));
   route(cables,p(-offset,y,upper),p(start,y,ceiling));
  }
  if(v.irrigation){
   // Strap every water line to an existing frame member. No free-spanning tray branches.
   const railZ=vertical?upper:s.z;
   for(const segment of m.segments){
    if(Math.abs(segment.a.z-railZ)<.01&&Math.abs(segment.b.z-railZ)<.01&&Math.abs(segment.a.y-s.y1)<.01&&Math.abs(segment.b.y-s.y1)<.01&&segment.a.x!==segment.b.x)
     route(water,p(segment.a.x+offset,segment.a.y+offset,railZ),p(segment.b.x+offset,segment.b.y+offset,railZ));
   }
   for(let t=0;t<4;t++){
    const x=m.W*(.14+t*.24);
    nozzles.push({at:p(x,s.y1+offset,railZ),target:p(x,s.y0+m.rowD*.5,s.z+v.od/2+110),shelf:s.f+1,tray:t+1});
   }
  }
 }
 if(cables.length)route(cables,p(-offset,0,20),p(-offset,0,m.top));
 if(v.irrigation)for(const segment of m.segments){
  const {a,b}=segment;
  if(a.x!==m.W||b.x!==m.W)continue;
  const main=vertical?(a.y===m.D&&b.y===m.D&&a.z!==b.z):
   (segment.name==='Depth rail'||segment.name==='Depth half-rail'||segment.name==='Step riser'||(segment.name==='Bottom leg'&&a.y===m.D));
  if(main)route(water,p(a.x+offset,a.y+offset,a.z),p(b.x+offset,b.y+offset,b.z));
 }
 const length=list=>list.reduce((n,s)=>n+Math.hypot(s.a.x-s.b.x,s.a.y-s.b.y,s.a.z-s.b.z),0);
 const bill=[],add=(id,label,qty,unit='each')=>{if(qty>0)bill.push({id,label,qty,unit});};
 add('stock-'+v.stock,`PVC stock pipe · ${Number((v.stock/0.3048).toFixed(2))} ft`,m.bins.length,'length');
 for(const t of [3,4,5])add('joint'+t,t+'-way PVC fitting',m.counts[t]);
 add('jointT','PVC T joint (equal tee)',m.counts[6]||0);add('jointX','PVC cross T joint',m.counts[7]||0);
 add('plug','Top socket plug',m.caps);add('footcap','Post foot / end cap',m.posts);add('mesh','Mesh shelf panel · cut to shelf size',m.growingShelves);
 add('tray','Growing tray (4 per shelf)',m.growingShelves*4);
 add('fan','120 mm PC fan',fans.length);add('fanmount','120 mm fan mounting bracket',fans.length);
 add('led'+v.ledFeet,v.ledFeet+' ft LED grow light',lights.length);add('lightclips','LED mounting clip pair',lights.length,'pair');add('lightchannel','Full-width LED mounting channel',lightSupports.length,'length');
 if(fans.length)add('fanpower','Fan power supply / distribution kit (size to total load)',1,'kit');
 if(lights.length)add('lightpower','LED power / timer / connection kit (match selected lights)',1,'kit');
 add('cable','Electrical cable allowance (+10%)',Math.ceil(length(cables)*1.1/304.8),'ft');
 add('cableclips','Cable clips',Math.ceil(length(cables)/300));
 add('nozzle','Tray micro-sprinkler / mist nozzle',nozzles.length);
 add('tube','Irrigation tubing allowance (+10%)',Math.ceil(length(water)*1.1/304.8),'ft');
 if(nozzles.length){add('watertee','Irrigation branch tee',m.growingShelves*5);add('watercap','Irrigation line end plug',m.growingShelves+1);add('valve','Shelf flow-control valve',m.growingShelves);add('waterclips','Tubing support clips',water.reduce((n,line)=>n+Math.max(1,Math.ceil(Math.hypot(line.a.x-line.b.x,line.a.y-line.b.y,line.a.z-line.b.z)/250)),0));add('irrigationsource','Water supply kit: filter, regulator, inlet & timer',1,'kit');}
 const warnings=[];
 if(lights.length&&perRow*ledLength>m.W+.1)warnings.push('Whole LED fixtures overhang this rack width. Adjust the width or light length for an exact fit.');
 if(fans.length&&m.rowD/(fanCount+1)<130)warnings.push('Fans are too close along the left side. Reduce fans per shelf or increase rack depth.');
 if(fans.length&&m.P<220)warnings.push('Shelf spacing is too tight for the illustrated fan and crop clearance.');
 if(nozzles.length&&m.layout==='vertical'&&m.P<210)warnings.push('Increase shelf spacing for the sprinkler branches and crops.');
 return{fans,lights,lightSupports,water,cables,nozzles,bill,warnings,waterOffset:offset,lightsPerRow:perRow,lightRows:lightCount};
}
if(typeof module!=='undefined')module.exports=equipment;else root.buildEquipment=equipment;
})(typeof window==='undefined'?globalThis:window);
