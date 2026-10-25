/* Self-contained WebGL PVC renderer. No external assets or dependencies. */
(function(){
const canvas=document.getElementById('pvcCanvas');const gl=canvas.getContext('webgl',{antialias:true,alpha:true,preserveDrawingBuffer:false});
if(!gl){window.PVCViewer={available:false,update(){}};return;}
const vs=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;attribute vec3 aPickColor;attribute float aGroup;uniform mat4 uMatrix;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vColor;varying vec3 vPickColor;varying float vGroup;void main(){vNormal=aNormal;vPosition=aPosition;vColor=aColor;vPickColor=aPickColor;vGroup=aGroup;gl_Position=uMatrix*vec4(aPosition,1.0);}`;
const fs=`precision highp float;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vColor;varying vec3 vPickColor;varying float vGroup;uniform float uLightOn;uniform float uAlpha;uniform vec3 uEye;uniform vec3 uHover;uniform float uHoverActive;uniform float uHoverGroup;void main(){vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-0.5,0.9,0.7));vec3 fill=normalize(vec3(0.7,0.3,-0.6));vec3 eye=normalize(uEye-vPosition);float key=max(dot(n,light),0.0);float secondary=max(dot(n,fill),0.0);float shine=pow(max(dot(n,normalize(light+eye)),0.0),48.0);vec3 col=vColor*(0.53+0.39*key+0.16*secondary)+vec3(0.025+0.165*smoothstep(0.45,0.8,min(vColor.r,min(vColor.g,vColor.b))))*shine;if(vGroup>1999.5&&vGroup<2000.5&&uLightOn>0.5)col=min(vec3(1.0),col*1.55+vec3(.08,.09,.015));if(vGroup>2000.5&&vGroup<2001.5&&uLightOn>0.5)col=vec3(1.0,.99,.76);bool hovered=(uHoverActive>0.5&&distance(vPickColor,uHover)<0.001)||(uHoverGroup>0.5&&abs(vGroup-uHoverGroup)<0.1);if(hovered)col=mix(col,vec3(0.94,0.64,0.23),0.65);gl_FragColor=vec4(col,uAlpha);}`;
const pickFS=`precision mediump float;varying vec3 vPickColor;void main(){gl_FragColor=vec4(vPickColor,1.0);}`;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
const pickProgram=gl.createProgram();gl.attachShader(pickProgram,shader(gl.VERTEX_SHADER,vs));gl.attachShader(pickProgram,shader(gl.FRAGMENT_SHADER,pickFS));gl.linkProgram(pickProgram);if(!gl.getProgramParameter(pickProgram,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pickProgram));
const buffer=gl.createBuffer(),effectBuffer=gl.createBuffer();let effectFrame=0;const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");const pickTarget=gl.createFramebuffer(),pickTexture=gl.createTexture(),pickDepth=gl.createRenderbuffer();let targetW=0,targetH=0,cameraState=null;
const encode=id=>[(id&255)/255,((id>>8)&255)/255,((id>>16)&255)/255];
let currentID=0,currentGroup=0,objects=new Map(),groups=new Map(),hoverID=0,hoverGroup=0,viewMode='iso';
const tooltip=document.getElementById('rackTooltip');let hoverFittings=true,hoverPipes=true,pinned=false;
try{const prefs=JSON.parse(localStorage.getItem('thulirInspectV1')||'null');if(prefs){hoverFittings=prefs.fittings!==false;hoverPipes=prefs.pipes!==false;}}catch(e){}
const add=(a,b)=>a.map((n,i)=>n+b[i]),sub=(a,b)=>a.map((n,i)=>n-b[i]),mul=(a,k)=>a.map(n=>n*k),dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>mul(a,1/(Math.hypot(...a)||1));
let vertices=[],count=0,model=null,values=null,selected=0,yaw=.65,pitch=.24,zoom=1;
const white=[.94,.95,.91],sleeve=[.965,.968,.94],seam=[.70,.74,.69],jointColors={3:[.83,.5,.22],4:[.26,.52,.43],5:[.45,.52,.72],6:[.72,.34,.48],7:[.54,.43,.18]};
let meshTransform=null;
function vertex(p,n,c){if(meshTransform){[p,n]=meshTransform(p,n);}vertices.push(...p,...n,...c,...encode(currentID),currentGroup);}
function tri(a,b,c,n,col){vertex(a,n,col);vertex(b,n,col);vertex(c,n,col);}
function quad(a,b,c,d,n,col){tri(a,b,c,n,col);tri(a,c,d,n,col);}
function cylinder(a,b,r,col,inner=0,steps=24){
 const axis=norm(sub(b,a));if(Math.hypot(...sub(b,a))<.01)return;
 const u=norm(cross(axis,Math.abs(axis[1])<.9?[0,1,0]:[1,0,0])),v=cross(axis,u);
 for(let i=0;i<steps;i++){
  const t=i*Math.PI*2/steps,t2=(i+1)*Math.PI*2/steps,n=add(mul(u,Math.cos(t)),mul(v,Math.sin(t))),n2=add(mul(u,Math.cos(t2)),mul(v,Math.sin(t2)));
  const p=add(a,mul(n,r)),q=add(b,mul(n,r)),p2=add(a,mul(n2,r)),q2=add(b,mul(n2,r));
  vertex(p,n,col);vertex(q,n,col);vertex(q2,n2,col);vertex(p,n,col);vertex(q2,n2,col);vertex(p2,n2,col);
  if(inner){const ia=add(a,mul(n,inner)),ib=add(b,mul(n,inner)),ia2=add(a,mul(n2,inner)),ib2=add(b,mul(n2,inner));quad(p,p2,ia2,ia,mul(axis,-1),col);quad(q,ib,ib2,q2,axis,col);const dark=col.map(n=>n*.7);quad(ia,ia2,ib2,ib,mul(n,-1),dark);}
  else{tri(a,p2,p,mul(axis,-1),col);tri(b,q,q2,axis,col);}
 }
}
function ellipsoid(p,r,col,rings=7,sectors=12){
 const sample=(a,b)=>{const n=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];return{p:add(p,n.map((v,i)=>v*r[i])),n:norm(n.map((v,i)=>v/r[i]))};};
 for(let j=0;j<rings;j++)for(let i=0;i<sectors;i++){
  const a=sample(j*Math.PI/rings,i*2*Math.PI/sectors),b=sample((j+1)*Math.PI/rings,i*2*Math.PI/sectors),c=sample((j+1)*Math.PI/rings,(i+1)*2*Math.PI/sectors),d=sample(j*Math.PI/rings,(i+1)*2*Math.PI/sectors);
  for(const q of [a,b,c,a,c,d])vertex(q.p,q.n,col);
 }
}
function box(a,b,col){const [x,y,z]=a,[X,Y,Z]=b;quad([x,y,z],[X,y,z],[X,Y,z],[x,Y,z],[0,0,-1],col);quad([x,y,Z],[x,Y,Z],[X,Y,Z],[X,y,Z],[0,0,1],col);quad([x,y,z],[x,Y,z],[x,Y,Z],[x,y,Z],[-1,0,0],col);quad([X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z],[1,0,0],col);quad([x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z],[0,1,0],col);quad([x,y,z],[x,y,Z],[X,y,Z],[X,y,z],[0,-1,0],col);}
function seedNoise(seed){const n=Math.sin(seed*12.9898+78.233)*43758.5453;return n-Math.floor(n);}
function cotyledon(base,angle,length,width,col,tilt){
 const dir=[Math.cos(angle),tilt,Math.sin(angle)],side=[-Math.sin(angle),0,Math.cos(angle)];
 const centre=add(base,mul(dir,length*.53)),outline=[];
 for(let i=0;i<10;i++){const t=i*Math.PI*2/10;outline.push(add(add(centre,mul(dir,Math.cos(t)*length*.5)),mul(side,Math.sin(t)*width)));}
 const ridge=add(centre,[0,1.5,0]);
 for(let i=0;i<10;i++){const a=outline[i],b=outline[(i+1)%10],normal=norm(cross(sub(b,ridge),sub(a,ridge)));tri(ridge,b,a,normal[1]<0?mul(normal,-1):normal,col);}
}
// Several identical racks stand side by side along the width, separated by a walkway gap.
const RACK_GAP=450;let rackOX=0;
const rackOffsets=()=>{const n=Math.max(1,Math.min(20,Math.round(values?.racks||1))),pitch=model.W+RACK_GAP;return Array.from({length:n},(_,i)=>(i-(n-1)/2)*pitch);};
const sceneW=()=>{const n=rackOffsets().length;return model.W*n+RACK_GAP*(n-1);};
const world=p=>[p.x-model.W/2+rackOX,p.z,p.y-model.D/2];
function build(){vertices=[];objects.clear();groups.clear();currentID=0;currentGroup=0;hideTooltip();hoverGroup=0;const m=model,v=values,od=v.od,r=od/2;
 const pc=selected?[.8,.83,.78]:white;
 const offsets=rackOffsets(),dense=offsets.length<=2,seedRows=dense?12:6,seedCols=dense?18:9;
 for(let rack=0;rack<offsets.length;rack++){rackOX=offsets[rack];
 // Round pipe sections continue inside the socket hubs.
 for(let i=0;i<m.segments.length;i++){
  const s=m.segments[i],cut=m.cuts[i],key=cut.name+':'+cut.cut;if(!groups.has(key))groups.set(key,groups.size+1);
  currentID=i+1;currentGroup=groups.get(key);objects.set(currentID,{kind:'pipe',label:s.name,cut:cut.cut,code:'P'+String(i+1).padStart(2,'0'),group:currentGroup});
  cylinder(world(s.a),world(s.b),r,pc);
 }
 for(let ji=0;ji<m.joints.length;ji++){const j=m.joints[ji];currentID=m.segments.length+ji+1;currentGroup=1000+j.t;objects.set(currentID,{kind:'fitting',type:j.t,frame:j.f+1,code:'F'+String(ji+1).padStart(2,'0'),group:currentGroup});
  const p=world(j),col=selected===j.t?jointColors[j.t]:selected?[.82,.85,.79]:sleeve;
  const directions=[];
  for(const s of m.segments){if(s.a===j)directions.push(norm(sub(world(s.b),p)));else if(s.b===j)directions.push(norm(sub(world(s.a),p)));}
  if(j.capped)directions.push([0,1,0]);
  const reach=Math.max(v['c'+j.t],od*.85);
  ellipsoid(p,[r*1.24,r*1.24,r*1.24],col,8,16);
  for(const d of directions){
   cylinder(p,add(p,mul(d,reach*.72)),r*1.28,col);
   cylinder(add(p,mul(d,reach*.68)),add(p,mul(d,reach)),r*1.43,col,r*1.03);
   cylinder(add(p,mul(d,reach-.7)),add(p,mul(d,reach)),r*1.435,selected===j.t?col:seam,r*1.06);
  }
  if(j.capped){cylinder(add(p,[0,reach-2,0]),add(p,[0,reach+3,0]),r*1.08,col);}
 }
 currentID=0;currentGroup=0;
 // End caps and slim steel mesh, supported at the pipe surface.
 for(const s of m.segments.filter(s=>s.name==='Bottom leg')){const p=world(s.a);cylinder(p,add(p,[0,12,0]),r*1.13,[.27,.31,.27]);}
 const wire=selected?[.77,.81,.75]:[.62,.69,.60];
 for(const shelf of m.shelfRects){
  const f=shelf.f,z=shelf.z+r+(v.shelfBase==='drain'?9:2),x0=rackOX-m.W/2,x1=rackOX+m.W/2,d0=shelf.y0-m.D/2,d1=shelf.y1-m.D/2;
  if(v.shelfBase==='drain'){
   // Removable 20 by 10 inch modular PP drain cells. Grid edges trimmed at the frame.
   const base=m.equipment.shelfBase,under=[.09,.13,.115],rib=selected?[.44,.50,.44]:[.24,.30,.27],edge=[.32,.39,.34];
   for(let row=0;row<base.rows;row++)for(let col=0;col<base.cols;col++){
    const xa=x0+col*base.panelW,xb=Math.min(x1,xa+base.panelW);
    const da=d0+row*base.panelD,db=Math.min(d1,da+base.panelD);
    if(xb-xa<=1||db-da<=1)continue;
    box([xa,z-8,da],[xb,z-5,db],under);
    const thick=Math.min(6,(xb-xa)/5,(db-da)/5);
    for(let k=0;k<=3;k++){
     const xx=xa+(xb-xa)*k/3,dd=da+(db-da)*k/3;
     box([Math.max(xa,xx-thick/2),z-5,da],[Math.min(xb,xx+thick/2),z-1,db],k===0||k===3?edge:rib);
     box([xa,z-5,Math.max(da,dd-thick/2)],[xb,z-1,Math.min(db,dd+thick/2)],k===0||k===3?edge:rib);
    }
   }
  }else{
   for(let x=x0;x<=x1+1;x+=m.W/Math.ceil(m.W/48))cylinder([x,z,d0],[x,z,d1],1.3,wire,0,6);
   for(let d=d0;d<=d1+1;d+=m.rowD/Math.ceil(m.rowD/48))cylinder([x0,z+1,d],[x1,z+1,d],1.3,wire,0,6);
  }
  if(v.trays){for(let t=0;t<4;t++){
   const a=x0+m.W*(.035+t*.24),b=a+m.W*.21,da=d0+m.rowD*.12,db=d1-m.rowD*.12,tray=selected?[.58,.64,.55]:[.13,.17,.14],soil=[.24,.18,.12];
   box([a,z+3,da],[b,z+6,db],tray);box([a,z+6,da],[a+4,z+30,db],tray);box([b-4,z+6,da],[b,z+30,db],tray);box([a,z+6,da],[b,z+30,da+4],tray);box([a,z+6,db-4],[b,z+30,db],tray);
   box([a+4,z+6,da+4],[b-4,z+22,db-4],soil);
   // Dense young seedlings with pale or pink stems and two opposing cotyledons.
   for(let i=0;i<seedRows;i++)for(let k=0;k<seedCols;k++){
    const seed=1+rack*91000+f*17000+t*2100+i*19+k,q=seedNoise(seed),q2=seedNoise(seed+13),q3=seedNoise(seed+37);
    const x=a+10+(b-a-20)*(i+.2+q*.6)/seedRows,d=da+10+(db-da-20)*(k+.2+q2*.6)/seedCols;
    const h=48+q3*36,stemBase=[x,z+22,d],tip=[x+(q-.5)*13,z+22+h,d+(q2-.5)*13],purple=t===1;
    currentGroup=2000;const stem=selected?[.69,.76,.58]:purple?[.63,.29,.39]:[.70,.78,.48];
    cylinder(stemBase,tip,.65+q*.25,stem,0,4);
    const angle=q2*Math.PI*2,len=10+q3*8,w=5+q*3;
    const leaf=selected?[.66,.74,.53]:purple&&q>.78?[.34,.25,.32]:[.20+q*.08,.39+q2*.14,.12+q3*.06];
    cotyledon(tip,angle,len,w,leaf,.12+q*.3);cotyledon(add(tip,[0,-1,0]),angle+Math.PI,len*.93,w*.95,leaf.map((c,i)=>c+(i===1?.025:0)),.12+q2*.3);
   }
   currentGroup=0;
  }}
 }
 // Equipment uses the same routes as the priced bill of materials.
 const eq=m.equipment;
 if(eq){
  for(const line of eq.cables)cylinder(world(line.a),world(line.b),2.3,[.15,.17,.16],0,8);
  for(const line of eq.water){
   const a=world(line.a),b=world(line.b);cylinder(a,b,4,[.15,.34,.39],0,10);
   const clips=Math.max(1,Math.ceil(Math.hypot(...sub(b,a))/250));
   for(let i=0;i<clips;i++){const q=add(a,mul(sub(b,a),(i+.5)/clips));cylinder(add(q,[-eq.waterOffset,0,-eq.waterOffset]),q,1.5,[.36,.40,.37],0,6);}
  }
  for(const fan of eq.fans){const [x,y,z]=world(fan.at),dark=[.13,.15,.16],edge=[.22,.24,.25];
   // Rotate the fan face to the left side, blowing across the rack width.
   meshTransform=(q,n)=>[[x+(q[2]-z),q[1],z-(q[0]-x)],[n[2],n[1],-n[0]]];
   // Exact 120 mm square housing, 25 mm deep, with a circular rotor opening.
   box([x-60,y-60,z-12.5],[x-48,y+60,z+12.5],dark);box([x+48,y-60,z-12.5],[x+60,y+60,z+12.5],dark);
   box([x-48,y-60,z-12.5],[x+48,y-48,z+12.5],dark);box([x-48,y+48,z-12.5],[x+48,y+60,z+12.5],dark);
   cylinder([x,y,z-12],[x,y,z+12],56,edge,50,32);cylinder([x,y,z-9],[x,y,z+9],15,dark,0,16);
   if(!v.fansOn)for(let i=0;i<7;i++){const a=i*Math.PI*2/7,pt=(rad,angle)=>[x+Math.cos(angle)*rad,y+Math.sin(angle)*rad,z+4];quad(pt(12,a),pt(49,a+.23),pt(47,a+.67),pt(16,a+.52),[0,0,1],[.25,.28,.29]);}
   for(const dx of [-52,52])for(const dy of [-52,52])cylinder([x+dx,y+dy,z+12.5],[x+dx,y+dy,z+14],3,[.62,.65,.64],0,8);
   box([x-5,y+59,z-3],[x+5,fan.top,z+3],[.43,.46,.43]);
   meshTransform=null;
   cylinder([x,fan.top,z],world({x:0,y:fan.at.y,z:fan.top}),3,[.43,.46,.43],0,8);
  }
  for(const support of eq.lightSupports){const a=world(support.a),b=world(support.b);box(add(a,[0,-3,-5]),add(b,[0,3,5]),[.53,.57,.56]);}
  for(const light of eq.lights){const a=world(light.a),b=world(light.b),[x,y,z]=a;
   box([x,y-12,z-15],[b[0],y+12,z+15],[.72,.76,.76]);
   currentGroup=2001;box([x+5,y-15,z-12],[b[0]-5,y-12,z+12],v.lightsOn?[1,.97,.80]:[.55,.57,.53]);currentGroup=0;
   for(const end of [x,b[0]])box([end-4,y-12,z-17],[end+4,y+12,z+17],[.25,.29,.28]);
   for(const mount of [x+35,b[0]-35])cylinder([mount,y+12,z],[mount,y+55-v.od/2-5,z],2,[.49,.52,.49],0,8);
  }
  for(const nozzle of eq.nozzles){const at=world(nozzle.at),dir=norm(sub(world(nozzle.target),at));
   cylinder(at,add(at,mul(dir,12)),6,[.13,.21,.22],0,12);cylinder(add(at,mul(dir,12)),add(at,mul(dir,18)),8,[.84,.49,.16],0,12);
  }
 }
 }
 rackOX=0;
 // A soft-looking layered contact shadow beneath the frame.
 for(let layer=5;layer>=0;layer--){const shade=.045+layer*.007,ry=model.D*.6+layer*15,rx=sceneW()*.5+model.W*.1+layer*20,y=-4-layer*.1;for(let i=0;i<64;i++){const a=i*Math.PI*2/64,b=(i+1)*Math.PI*2/64;tri([0,y,0],[rx*Math.cos(a),y,ry*Math.sin(a)],[rx*Math.cos(b),y,ry*Math.sin(b)],[0,1,0],[shade,shade+.025,shade+.035]);}}
 count=vertices.length/13;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);vertices=[];render();
}
function multiply(a,b){const out=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)out[col*4+row]+=a[k*4+row]*b[col*4+k];return out;}
function camera(eye,target,up=[0,1,0]){const z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function bindGeometry(prog,geometry=buffer){gl.useProgram(prog);gl.bindBuffer(gl.ARRAY_BUFFER,geometry);for(const [name,size,offset]of[['aPosition',3,0],['aNormal',3,12],['aColor',3,24],['aPickColor',3,36],['aGroup',1,48]]){const a=gl.getAttribLocation(prog,name);if(a<0)continue;gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,52,offset);}}
function makeCamera(aspect){
 const near=1,far=50000,height=Math.max(model.top+values.od*2+(values.trays?100:0),...((model.equipment?.nozzles||[]).map(n=>n.at.z+20))),target=[0,height*.48,0];let eye,projection,up=[0,1,0];
 if(viewMode==='iso'){
  const fov=.66,f=1/Math.tan(fov/2),radius=Math.hypot(sceneW(),height,model.D)/2,distance=radius/Math.sin(Math.min(fov/2,Math.atan(Math.tan(fov/2)*aspect)))*1.03*zoom;
  projection=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
  eye=add(target,[distance*Math.sin(yaw)*Math.cos(pitch),distance*Math.sin(pitch),distance*Math.cos(yaw)*Math.cos(pitch)]);
 }else{
  const visibleW=(viewMode==='side'?model.D:sceneW())+values.od*3,visibleH=viewMode==='top'?model.D+values.od*3:height+30;
  const hh=Math.max(visibleH/2,visibleW/(2*aspect))*1.14*zoom,hw=hh*aspect;
  projection=new Float32Array([1/hw,0,0,0,0,1/hh,0,0,0,0,-2/(far-near),0,0,0,-(far+near)/(far-near),1]);
  const distance=Math.max(sceneW(),model.D,height)*3+1000;
  if(viewMode==='front')eye=add(target,[0,0,distance]);
  else if(viewMode==='side')eye=add(target,[distance,0,0]);
  else{eye=add(target,[0,distance,0]);up=[0,0,-1];}
 }
 return{matrix:multiply(projection,camera(eye,target,up)),eye};
}
// A snapshot renders at a fixed pixel size, even while the 3D page is hidden.
let forcedSize=null;
function render(){if(!model||(canvas.hidden&&!forcedSize))return;const dpr=Math.min(window.devicePixelRatio||1,2),w=forcedSize?forcedSize.w:Math.round(canvas.clientWidth*dpr),h=forcedSize?forcedSize.h:Math.round(canvas.clientHeight*dpr);if(!w||!h)return;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);bindGeometry(program);cameraState=makeCamera(w/h);
 gl.uniform1f(gl.getUniformLocation(program,'uLightOn'),values.lights&&values.lightsOn&&model.layout==='vertical'?1:0);gl.uniform1f(gl.getUniformLocation(program,'uAlpha'),1);gl.uniformMatrix4fv(gl.getUniformLocation(program,'uMatrix'),false,cameraState.matrix);gl.uniform3fv(gl.getUniformLocation(program,'uEye'),cameraState.eye);gl.uniform3fv(gl.getUniformLocation(program,'uHover'),encode(hoverID));gl.uniform1f(gl.getUniformLocation(program,'uHoverActive'),hoverID?1:0);gl.uniform1f(gl.getUniformLocation(program,'uHoverGroup'),hoverGroup);gl.drawArrays(gl.TRIANGLES,0,count);drawEffects();
}
// Small dynamic buffer: the crop and frame stay on the GPU while accessories animate.
function drawEffects(){
 const eq=model.equipment;if(!eq)return;
 const fanOn=model.layout==='vertical'&&values.fans&&values.fansOn,lightOn=model.layout==='vertical'&&values.lights&&values.lightsOn,waterOn=values.irrigation&&values.sprinklerOn;
 if(!fanOn&&!lightOn&&!waterOn)return;
 const time=reducedMotion.matches?0:performance.now()/1000;
 currentID=0;currentGroup=0;vertices=[];
 if(fanOn)for(const ox of rackOffsets())for(const fan of eq.fans){rackOX=ox;
  const [x,y,z]=world(fan.at);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7+time*14,pt=(r,t)=>[x+5,y+Math.sin(t)*r,z-Math.cos(t)*r];quad(pt(12,a),pt(49,a+.23),pt(47,a+.67),pt(16,a+.52),[1,0,0],[.32,.36,.36]);}
 }
 uploadEffects(1);
 if(lightOn){
  for(const ox of rackOffsets())for(const led of eq.lights){rackOX=ox;const a=world(led.a),b=world(led.b),shelf=model.shelfRects.find(s=>s.f+1===led.shelf);if(!shelf)continue;const y=shelf.z+values.od/2+105;
   const x0=Math.max(rackOX-model.W/2,a[0]),x1=Math.min(rackOX+model.W/2,b[0]),spread=model.rowD/(eq.lightRows+1)*.45;
   quad([x0,a[1]-16,a[2]],[x1,a[1]-16,a[2]],[x1,y,a[2]+spread],[x0,y,a[2]+spread],[0,1,0],[1,.96,.60]);
   quad([x0,a[1]-16,a[2]],[x1,a[1]-16,a[2]],[x1,y,a[2]-spread],[x0,y,a[2]-spread],[0,1,0],[1,.96,.60]);
   quad([x0,y,a[2]-spread],[x1,y,a[2]-spread],[x1,y,a[2]+spread],[x0,y,a[2]+spread],[0,1,0],[1,.96,.65]);
  }
  uploadEffects(.12);
 }
 if(fanOn){for(const ox of rackOffsets())for(const fan of eq.fans){rackOX=ox;const a=world(fan.at),shelf=model.shelfRects.find(s=>s.f+1===fan.shelf);if(!shelf)continue;
  for(let lane=0;lane<3;lane++)for(let pulse=0;pulse<3;pulse++){
   const t=(time*.24+pulse/3+lane*.09)%1,point=u=>[a[0]+35+u*(model.W-35),a[1]+(shelf.z+values.od/2+125-a[1])*(1-Math.exp(-u*5)),a[2]+(lane-1)*24+Math.sin(u*8+lane)*7];
   const end=Math.min(1,t+.08),b=point(end);cylinder(point(t),b,1.8,[.24,.73,.85],0,5);cylinder(b,add(b,[-12,5,6]),1.6,[.24,.73,.85],0,5);cylinder(b,add(b,[-12,-5,-6]),1.6,[.24,.73,.85],0,5);
  }
 }uploadEffects(.65);}
 if(waterOn){
  for(const ox of rackOffsets())for(const nozzle of eq.nozzles){rackOX=ox;
   const origin=world(nozzle.at),target=world(nozzle.target),direction=norm(sub(target,origin));
   const start=add(origin,mul(direction,18));
   // Individual droplets fan out from the actual nozzle tip into its own tray.
   for(let stream=0;stream<9;stream++){
    const angle=stream*2.399963,spread=Math.sqrt((stream+.5)/9);
    const landing=add(target,[Math.cos(angle)*model.W*.065*spread,-12,Math.sin(angle)*model.rowD*.22*spread]);
    const point=t=>add(add(start,mul(sub(landing,start),t)),[0,Math.sin(Math.PI*t)*28,0]);
    for(let drop=0;drop<5;drop++){
     const t=(time*.8+drop/5+stream*.071)%1;
     cylinder(point(t),point(Math.min(1,t+.025)),1.6,[.52,.85,1],0,5);
    }
   }
  }
  uploadEffects(.78);
 }
 rackOX=0;
 if((fanOn||waterOn)&&!reducedMotion.matches&&!document.hidden&&!effectFrame)effectFrame=requestAnimationFrame(()=>{effectFrame=0;if(canvas.getBoundingClientRect().width&&canvas.getBoundingClientRect().height)render();});
}
function uploadEffects(alpha){if(!vertices.length)return;gl.bindBuffer(gl.ARRAY_BUFFER,effectBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);bindGeometry(program,effectBuffer);gl.uniform1f(gl.getUniformLocation(program,'uAlpha'),alpha);if(alpha<1){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}gl.drawArrays(gl.TRIANGLES,0,vertices.length/13);gl.depthMask(true);gl.disable(gl.BLEND);vertices=[];}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
function prepareTarget(){
 if(targetW===canvas.width&&targetH===canvas.height)return true;
 targetW=canvas.width;targetH=canvas.height;gl.bindTexture(gl.TEXTURE_2D,pickTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,targetW,targetH,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.bindRenderbuffer(gl.RENDERBUFFER,pickDepth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,targetW,targetH);gl.bindFramebuffer(gl.FRAMEBUFFER,pickTarget);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,pickTexture,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,pickDepth);const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);return ok;
}
function pickAt(clientX,clientY,radiusCSS=0){
 if(!cameraState||(!hoverFittings&&!hoverPipes)||canvas.hidden)return 0;
 const rect=canvas.getBoundingClientRect(),px=Math.floor((clientX-rect.left)*canvas.width/rect.width),py=Math.min(canvas.height-1,Math.floor((rect.bottom-clientY)*canvas.height/rect.height));
 if(px<0||px>=canvas.width||py<0||py>=canvas.height||!prepareTarget())return 0;
 gl.bindFramebuffer(gl.FRAMEBUFFER,pickTarget);gl.viewport(0,0,canvas.width,canvas.height);gl.disable(gl.DITHER);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);bindGeometry(pickProgram);gl.uniformMatrix4fv(gl.getUniformLocation(pickProgram,'uMatrix'),false,cameraState.matrix);gl.drawArrays(gl.TRIANGLES,0,count);
 const radius=Math.ceil(radiusCSS*canvas.width/rect.width),x0=Math.max(0,px-radius),y0=Math.max(0,py-radius),rw=Math.min(canvas.width-1,px+radius)-x0+1,rh=Math.min(canvas.height-1,py+radius)-y0+1;
 const pixels=new Uint8Array(rw*rh*4);gl.readPixels(x0,y0,rw,rh,gl.RGBA,gl.UNSIGNED_BYTE,pixels);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.enable(gl.DITHER);
 let nearest=0,best=radius?radius*radius+1:1;
 for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
  const i=(y*rw+x)*4,id=pixels[i]+(pixels[i+1]<<8)+(pixels[i+2]<<16),obj=objects.get(id);
  if(!obj||!((obj.kind==='pipe'&&hoverPipes)||(obj.kind==='fitting'&&hoverFittings)))continue;
  const distance=(x0+x-px)**2+(y0+y-py)**2;if(distance<best){best=distance;nearest=id;}
 }
 return nearest;
}
function hideTooltip(){hoverID=0;pinned=false;tooltip.hidden=true;tooltip.classList.remove('pinned');}
function showAt(x,y,pin=false,radius=0){const id=pickAt(x,y,radius),obj=objects.get(id),changed=id!==hoverID||pin!==pinned;hoverID=id;hoverGroup=0;pinned=pin&&!!obj;tooltip.classList.toggle('pinned',pinned);if(!obj){tooltip.hidden=true;if(changed)render();return;}
 const length=n=>window.feetInches?window.feetInches(n):`${(n/25.4).toFixed(2)} in`;
 const title=obj.kind==='pipe'?obj.label:({3:'3-way corner elbow',4:'4-way side-outlet tee',5:'5-way centre fitting',6:'T joint',7:'Cross T joint'})[obj.type];
 const detail=obj.kind==='pipe'?`Cut length: ${length(obj.cut)}`:`${model.layout==='step'?'Step':'Frame'} ${obj.frame} · ${model.counts[obj.type]} of this fitting in rack`;
 if(changed||tooltip.hidden)tooltip.innerHTML=`${pinned?'<button type="button" class="inspect-close" aria-label="Close part details">×</button>':''}<span class="inspect-code">${obj.code} / ${obj.kind==='pipe'?'PIPE CUT':'FITTING'}</span><strong>${title}</strong><span>${detail}</span>${obj.kind==='pipe'?`<small>${values.confirmed?'Measured fitting inputs':'Provisional — measure sockets before cutting'}</small>`:''}${pinned?'<small>Tap another part to inspect it.</small>':''}`;
 tooltip.hidden=false;const rect=canvas.getBoundingClientRect(),stage=canvas.parentElement.getBoundingClientRect();const localX=x-stage.left,localY=y-stage.top;
 const tw=tooltip.offsetWidth||240,th=tooltip.offsetHeight||110;tooltip.style.left=Math.max(8,Math.min(stage.width-tw-8,localX+15))+'px';tooltip.style.top=Math.max(8,Math.min(rect.height-th-12,localY-th-12))+'px';if(changed)render();
}
let drag=null,queued=null,raf=0;
canvas.addEventListener('pointerdown',e=>{
 if(drag&&drag.id!==e.pointerId){drag.moved=true;return;}
 const touch=e.pointerType==='touch'||e.pointerType==='pen';
 queued=null;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch,moved:false,touch};
 try{canvas.setPointerCapture(e.pointerId);}catch(error){}
 if(viewMode==='iso')canvas.style.cursor='grabbing';
});
canvas.addEventListener('pointermove',e=>{
 if(drag){
  if(e.pointerId!==drag.id)return;
  if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>(drag.touch?14:4))drag.moved=true;
  if(drag.moved&&viewMode==='iso'){hideTooltip();yaw=drag.yaw-(e.clientX-drag.x)*.008;pitch=Math.max(-.1,Math.min(1.2,drag.pitch+(e.clientY-drag.y)*.006));render();}
  return;
 }
 if(e.pointerType==='touch'||pinned)return;
 queued=[e.clientX,e.clientY];if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(queued&&!drag&&!pinned)showAt(...queued);});
});
canvas.addEventListener('pointerup',e=>{
 if(!drag||e.pointerId!==drag.id)return;
 const tap=!drag.moved,touch=drag.touch;drag=null;queued=null;canvas.style.cursor=viewMode==='iso'?'grab':'crosshair';
 if(tap)showAt(e.clientX,e.clientY,true,touch?22:4);
});
canvas.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.id)drag=null;queued=null;if(!pinned){hideTooltip();render();}});
canvas.addEventListener('pointerleave',()=>{queued=null;if(!drag&&!pinned){hideTooltip();render();}});
tooltip.addEventListener('click',e=>{if(e.target.closest('.inspect-close')){e.preventDefault();hideTooltip();render();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pinned){hideTooltip();render();}});
canvas.addEventListener('wheel',e=>{e.preventDefault();hideTooltip();zoom=Math.max(.5,Math.min(2,zoom*Math.exp(e.deltaY*.001)));render();},{passive:false});
window.addEventListener('resize',()=>{hideTooltip();render();});if(window.ResizeObserver)new ResizeObserver(render).observe(canvas);
document.getElementById('zoomIn').onclick=()=>{hideTooltip();zoom=Math.max(.5,zoom*.85);render();};document.getElementById('zoomOut').onclick=()=>{hideTooltip();zoom=Math.min(2,zoom/.85);render();};document.getElementById('reset3d').onclick=()=>{hideTooltip();yaw=.65;pitch=.24;zoom=1;render();};
const fittingToggle=document.getElementById('inspectFittings'),pipeToggle=document.getElementById('inspectPipes');fittingToggle.checked=hoverFittings;pipeToggle.checked=hoverPipes;
function updatePrefs(){hoverFittings=fittingToggle.checked;hoverPipes=pipeToggle.checked;hideTooltip();hoverGroup=0;try{localStorage.setItem('thulirInspectV1',JSON.stringify({fittings:hoverFittings,pipes:hoverPipes}));}catch(e){}render();}
fittingToggle.addEventListener('change',updatePrefs);pipeToggle.addEventListener('change',updatePrefs);
document.addEventListener('pointerover',e=>{const row=e.target.closest('[data-pipe-name],[data-fitting-type]');if(!row)return;const g=row.dataset.pipeName?(hoverPipes?groups.get(row.dataset.pipeName+':'+row.dataset.pipeCut):0):(hoverFittings?1000+Number(row.dataset.fittingType):0);if(g){hideTooltip();hoverGroup=g;render();}});
document.addEventListener('pointerout',e=>{const row=e.target.closest('[data-pipe-name],[data-fitting-type]');if(row&&!row.contains(e.relatedTarget)){hoverGroup=0;render();}});
// Images of the current rack for the PDF: each view drawn and read back in the same task, then the on-screen view restored.
function snapshot(views=[['iso',1500,820],['front',900,675],['side',900,675],['top',900,675]]){
 if(!model)return {};
 const saved={viewMode,zoom,hoverID,hoverGroup},out={};
 // A long row of racks leaves empty space in the wide 3D frame, so move closer; a single tall rack keeps the full view.
 const wide=sceneW()/Math.max(model.top,1),fill=wide>1.6?.74:wide>1?.88:1;
 hoverID=0;hoverGroup=0;
 try{
  for(const [mode,w,h] of views){
   viewMode=mode;zoom=mode==='iso'?Math.min(zoom,1)*fill:1;forcedSize={w,h};render();
   const shot=document.createElement('canvas');shot.width=w;shot.height=h;const g=shot.getContext('2d');
   const bg=g.createRadialGradient(w*.4,h*.3,0,w*.5,h*.5,Math.max(w,h)*.75);bg.addColorStop(0,'#2b3b3d');bg.addColorStop(1,'#141e21');
   g.fillStyle=bg;g.fillRect(0,0,w,h);g.drawImage(canvas,0,0,w,h);out[mode]=shot.toDataURL('image/jpeg',.9);
   zoom=saved.zoom;
  }
 }finally{forcedSize=null;viewMode=saved.viewMode;zoom=saved.zoom;hoverID=saved.hoverID;hoverGroup=saved.hoverGroup;render();}
 return out;
}
window.PVCViewer={available:true,snapshot,update(m,v,h,mode='iso'){if(viewMode!==mode){viewMode=mode;zoom=1;hideTooltip();hoverGroup=0;}canvas.style.cursor=viewMode==='iso'?'grab':'crosshair';if(m!==model||h!==selected){model=m;values=v;selected=h;build();}else render();}};
})();
