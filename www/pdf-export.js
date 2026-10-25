(function(root){
 // Build List and Customer Estimate as downloadable A4 PDFs (jsPDF + AutoTable, bundled in vendor/ and loaded on first use).
 const GREEN=[41,72,57],INK=[32,59,52],MUTED=[112,122,108],LINE=[221,226,215],SOFT=[238,242,232];
 const PAGE_W=210,PAGE_H=297,M=14,W=PAGE_W-2*M;
 // Standard PDF fonts only cover Latin-1; swap the few symbols the app uses that fall outside it.
 const txt=s=>String(s??'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/₹/g,'Rs ').replace(/[−–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/…/g,'...').replace(/[^\x00-\xff]/g,'');
 const rs=n=>'Rs '+new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
 const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
 const today=()=>new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});

 function header(doc,title,subtitle){
  doc.setFillColor(...GREEN);doc.rect(0,0,PAGE_W,24,'F');
  doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('THULIR',M,11);
  doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text('GROW SYSTEMS',M,15.5);
  doc.setFontSize(13);doc.setFont('helvetica','bold');doc.text(txt(title),PAGE_W-M,11,{align:'right'});
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(txt(subtitle),PAGE_W-M,16.5,{align:'right'});
  doc.setTextColor(...INK);return 32;
 }
 function footers(doc){
  const n=doc.getNumberOfPages();
  for(let i=1;i<=n;i++){doc.setPage(i);doc.setDrawColor(...LINE);doc.line(M,PAGE_H-12,PAGE_W-M,PAGE_H-12);doc.setFontSize(7);doc.setTextColor(...MUTED);
   doc.text('Thulir Rack Calculator · all calculations made on your device',M,PAGE_H-7.5);doc.text(`Page ${i} of ${n}`,PAGE_W-M,PAGE_H-7.5,{align:'right'});}
 }
 function heading(doc,y,text){y=room(doc,y,14);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...INK);doc.text(txt(text),M,y);return y+3;}
 function room(doc,y,need){if(y+need>PAGE_H-18){doc.addPage();return 18;}return y;}
 function paragraph(doc,y,text,{size=8,color=MUTED,style='normal'}={}){
  doc.setFont('helvetica',style);doc.setFontSize(size);doc.setTextColor(...color);
  const lines=doc.splitTextToSize(txt(text),W);for(const line of lines){y=room(doc,y,size*.45);doc.text(line,M,y);y+=size*.42;}return y+1.5;
 }
 const tableStyle={theme:'grid',rowPageBreak:'avoid',margin:{left:M,right:M,top:18,bottom:18},styles:{font:'helvetica',fontSize:8.5,textColor:INK,lineColor:LINE,lineWidth:.2,cellPadding:2.2,valign:'middle'},headStyles:{fillColor:SOFT,textColor:INK,fontStyle:'bold',fontSize:8},alternateRowStyles:{fillColor:[250,251,248]}};

 function buildList(doc,d,images={},views={}){
  let y=header(doc,'Rack Build List',today());
  y=paragraph(doc,y,d.status,{size:8.5,color:d.status.startsWith('PROVISIONAL')?[128,99,52]:GREEN,style:'bold'});
  doc.autoTable({...tableStyle,startY:y,theme:'plain',styles:{...tableStyle.styles,cellPadding:1.4},columnStyles:{0:{textColor:MUTED,cellWidth:42},1:{fontStyle:'bold'}},body:d.summary.map(r=>r.map(txt))});
  y=doc.lastAutoTable.finalY+4;
  // Four headline figures, as on screen.
  const gap=3,bw=(W-3*gap)/4;
  d.stats.forEach(([value,label],i)=>{const x=M+i*(bw+gap);doc.setFillColor(...(i?SOFT:GREEN));doc.roundedRect(x,y,bw,19,2,2,'F');
   doc.setTextColor(...(i?INK:[255,255,255]));doc.setFont('helvetica','bold');doc.setFontSize(12.5);doc.text(txt(value),x+3.5,y+8.5);
   doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...(i?MUTED:[205,220,198]));doc.text(doc.splitTextToSize(txt(label),bw-7),x+3.5,y+14);});
  y+=24;
  if(d.warning)y=paragraph(doc,y,d.warning,{size:7.5});
  // Rack pictures captured from the 3D viewer: a wide 3D view, then front, side and top.
  if(views.iso){
   const isoH=W*820/1500,gapX=4,smallW=(W-2*gapX)/3,smallH=smallW*.75;
   y=heading(doc,room(doc,y+2,isoH+smallH+14),'Rack views');
   const tag=(label,x,ty)=>{doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(255);doc.text(label,x+3,ty+5);};
   doc.addImage(views.iso,'JPEG',M,y,W,isoH);tag('3D VIEW',M,y);y+=isoH+gapX;
   [['front','FRONT'],['side','SIDE'],['top','TOP']].forEach(([k,label],i)=>{if(!views[k])return;const x=M+i*(smallW+gapX);doc.addImage(views[k],'JPEG',x,y,smallW,smallH);tag(label,x,y);});
   y+=smallH+4;
  }
  y=heading(doc,y+2,'Fittings & accessories');
  doc.autoTable({...tableStyle,startY:y,head:[['','Item','Where it goes','Qty']],
   body:d.fittings.map(f=>[{content:'',img:f.img},txt(f.label),txt(f.detail),String(f.qty)]),
   columnStyles:{0:{cellWidth:17},1:{fontStyle:'bold',cellWidth:52},3:{halign:'right',cellWidth:16,fontStyle:'bold'}},bodyStyles:{minCellHeight:16},
   didDrawCell:c=>{if(c.section==='body'&&c.column.index===0){const img=images[c.cell.raw?.img];if(img)doc.addImage(img,'JPEG',c.cell.x+1.5,c.cell.y+1.5,13,13);}}});
  y=heading(doc,doc.lastAutoTable.finalY+8,'Pipe cut list');
  doc.autoTable({...tableStyle,startY:y,head:[['','Member','Cut length','Qty','Total length']],
   body:d.cuts.map(c=>[{content:txt(c.code),color:c.color},txt(c.name),txt(c.cut),String(c.qty),txt(c.total)]),
   columnStyles:{0:{cellWidth:9,halign:'center',fontStyle:'bold',textColor:[255,255,255]},2:{halign:'right'},3:{halign:'right',cellWidth:14},4:{halign:'right'}},
   didParseCell:c=>{if(c.section==='body'&&c.column.index===0&&c.cell.raw?.color)c.cell.styles.fillColor=hex(c.cell.raw.color);}});
  y=doc.lastAutoTable.finalY+4;
  y=paragraph(doc,y,'Cut = centre span - fitting take-outs + insertions. Bottom legs include one insertion; feet are counted separately. '+(d.lengthNote||'Lengths in feet and decimal inches, rounded to 0.01 in.'),{size:7});
  const st=d.stock;
  y=heading(doc,y+4,st.racks>1?`Stock pipe cutting plan · all ${st.racks} racks`:'Stock pipe cutting plan');
  y=paragraph(doc,y+1,st.tooLong?'Incomplete plan: some pieces are longer than the stock pipe and are not packed.':`${st.total} × ${st.length} stock pipes${st.racks>1?` for all ${st.racks} racks, cut together so offcuts are reused`:''} · ${st.runs.length} cutting pattern${st.runs.length>1?'s':''} · ${st.offcut} total offcut. Each bar is one stock pipe, or a set of identical pipes; letters match the cut list. Pale space at the end is leftover pipe.`,{size:7.5});
  const labelW=21,leftW=26,barW=W-labelW-leftW;
  st.runs.forEach(r=>{
   const n=r.to-r.from+1;
   y=room(doc,y,15);doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(...INK);doc.text(n>1?`Pipes ${r.from}-${r.to}`:`Pipe ${r.from}`,M,y+3.4);
   if(n>1){doc.setFontSize(6.5);doc.setTextColor(...GREEN);doc.text(`× ${n}`,M,y+7);}
   doc.setFillColor(240,242,236);doc.rect(M+labelW,y,barW,6.5,'F');
   let x=M+labelW;for(const p of r.pieces){const w=Math.max(.5,p.frac*barW);doc.setFillColor(...hex(p.color));doc.rect(x,y,w,6.5,'F');doc.setDrawColor(255);doc.setLineWidth(.4);doc.line(x+w,y,x+w,y+6.5);
    if(w>6){doc.setTextColor(255);doc.setFontSize(w>17?6:5.2);doc.setFont('helvetica','bold');doc.text(w>17?`${p.code} ${txt(p.cut)}`:p.code,x+w/2,y+4.2,{align:'center'});}x+=w;}
   doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...MUTED);doc.text(`${txt(r.left)} left${n>1?' each':''}`,PAGE_W-M,y+4.4,{align:'right'});
   const counts=new Map();for(const p of r.pieces){const k=`${p.code} ${txt(p.cut)}`;counts.set(k,(counts.get(k)||0)+1);}
   doc.setFontSize(6.3);doc.text(doc.splitTextToSize([...counts].map(([k,c])=>`${c} × ${k}`).join('   ·   '),barW)[0],M+labelW,y+10);
   y+=14;
  });
  y=room(doc,y,12);
  paragraph(doc,y+2,'Width and depth are post-centre dimensions. The stock plan is a first-fit estimate with one saw kerf per piece, not a guaranteed minimum. Dry-fit one frame and confirm tray clearance before batch cutting. This is a materials planner, not a structural load approval.',{size:7});
  footers(doc);return doc;
 }

 function estimate(doc,d){
  let y=header(doc,'Customer Estimate',today());
  doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...(d.status==='ESTIMATE'?GREEN:[128,99,52]));doc.text(txt(d.status),M,y);y+=6;
  doc.autoTable({...tableStyle,startY:y,theme:'plain',styles:{...tableStyle.styles,cellPadding:1.3},columnStyles:{0:{textColor:MUTED,cellWidth:36},1:{fontStyle:'bold'}},
   body:[['Customer',d.customer],['Reference',d.reference],['Date',today()],['Rack quantity',String(d.quantity)]].map(r=>r.map(txt))});
  y=paragraph(doc,doc.lastAutoTable.finalY+5,d.rack,{size:8,color:INK});
  doc.autoTable({...tableStyle,startY:y+2,head:[['Component','Qty / unit','Unit price','Amount']],
   body:d.lines.map(l=>[txt(l.label),txt(l.qty),l.unit==null?'Unpriced':rs(l.unit),l.amount==null?'Unpriced':rs(l.amount)]),
   columnStyles:{0:{cellWidth:66},2:{halign:'right'},3:{halign:'right',fontStyle:'bold'}}});
  const t=d.totals,rows=[['Components (markup included)',rs(t.components)],[`Installation (${rs(t.installationRate)} × ${d.quantity})`,rs(t.installation)],['Additional costs (estimate-wide)',rs(t.extra)],['Discount','- '+rs(t.discount)],[`Tax (${d.taxRate}%)`,rs(t.tax)]];
  y=room(doc,doc.lastAutoTable.finalY+4,48);
  doc.autoTable({...tableStyle,startY:y,theme:'plain',margin:{left:PAGE_W-M-92,right:M},tableWidth:92,styles:{...tableStyle.styles,cellPadding:1.5},columnStyles:{1:{halign:'right'}},body:rows.map(r=>r.map(txt))});
  y=doc.lastAutoTable.finalY+2;doc.setFillColor(...GREEN);doc.roundedRect(PAGE_W-M-92,y,92,11,1.5,1.5,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(10.5);
  doc.text(t.missing?'Priced items total':'Estimated total',PAGE_W-M-89,y+7.2);doc.text(rs(t.total),PAGE_W-M-3,y+7.2,{align:'right'});y+=18;
  if(d.warnings.length)y=paragraph(doc,y,d.warnings.join(' · '),{size:8,color:[128,99,52],style:'bold'});
  y=heading(doc,y+3,'Scope & terms');
  y=paragraph(doc,y+1,d.notes,{size:8.5,color:INK});
  paragraph(doc,y+1,'Includes only the priced rows above. Trays, mesh, brackets, power supplies, wiring, labour and delivery are excluded unless added as additional costs. The drip-irrigation row is one total per rack, multiplied by rack quantity; confirm its scope with the customer. Confirm fitting measurements before construction. Electrical and irrigation equipment ratings must match the selected products. Structural load capacity is not certified by this estimate.',{size:7.5});
  footers(doc);return doc;
 }

 const api={buildList,estimate,txt};
 if(typeof module!=='undefined'){module.exports=api;return;}

 // ---- Browser: load the library on first use, gather the on-screen data, save or share the file.
 const loaded={};
 const script=src=>loaded[src]||(loaded[src]=new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>{delete loaded[src];fail(new Error('Could not load '+src));};document.head.append(s);}));
 async function library(){await script('vendor/jspdf-2.5.2.umd.min.js');await script('vendor/jspdf-autotable-3.8.4.min.js');return new root.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});}
 // Fitting photos are large; shrink each to a small JPEG thumbnail before embedding.
 function thumbnail(src){return new Promise(ok=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=160;const g=c.getContext('2d');g.fillStyle='#f5f5ef';g.fillRect(0,0,160,160);g.drawImage(img,0,0,160,160);ok(c.toDataURL('image/jpeg',.85));};img.onerror=()=>ok(null);img.src=src;});}
 async function save(doc,name){
  if(root.shareRackBinary){await root.shareRackBinary(name,doc.output('datauristring').split(',')[1]);return;}
  doc.save(name);
 }
 // Preview first: pdf.js draws the generated pages (phones and the Android WebView have no built-in PDF viewer),
 // then Download / Share saves exactly that document.
 async function pageRenderer(){await script('vendor/pdfjs-3.11.174.min.js');const lib=root.pdfjsLib;lib.GlobalWorkerOptions.workerSrc='vendor/pdfjs-3.11.174.worker.min.js';return lib;}
 async function preview(doc,name,title){
  let dialog=document.getElementById('pdfPreview');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='pdfPreview';dialog.className='pdf-preview';dialog.setAttribute('aria-labelledby','pdfPreviewTitle');
   dialog.innerHTML='<div class="pdf-preview-bar"><div class="pdf-preview-title"><b id="pdfPreviewTitle"></b><span></span></div><div class="pdf-preview-actions"><button type="button" class="pdf-btn" data-act="save"></button><button type="button" class="pdf-close" data-act="close" aria-label="Close preview">×</button></div></div><div class="pdf-pages"></div>';
   document.body.append(dialog);
   dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
   dialog.addEventListener('close',()=>{dialog.task?.destroy();dialog.task=null;dialog.querySelector('.pdf-pages').innerHTML='';document.documentElement.classList.remove('pdf-previewing');});
  }
  const pages=dialog.querySelector('.pdf-pages'),meta=dialog.querySelector('.pdf-preview-title span'),saveBtn=dialog.querySelector('[data-act="save"]');
  dialog.querySelector('#pdfPreviewTitle').textContent=title;meta.textContent=name;
  saveBtn.textContent=root.shareRackBinary?'Share PDF':'Download PDF ↓';
  saveBtn.onclick=async()=>{saveBtn.disabled=true;try{await save(doc,name);}finally{saveBtn.disabled=false;}};
  dialog.querySelector('[data-act="close"]').onclick=()=>dialog.close();
  pages.innerHTML='<p class="pdf-loading">Loading preview…</p>';
  document.documentElement.classList.add('pdf-previewing');dialog.showModal();saveBtn.focus();
  try{
   const lib=await pageRenderer();if(!dialog.open)return;
   const task=lib.getDocument({data:new Uint8Array(doc.output('arraybuffer')),isEvalSupported:false});dialog.task=task;
   const pdf=await task.promise;meta.textContent=`${name} · ${pdf.numPages} page${pdf.numPages>1?'s':''}`;pages.innerHTML='';
   const ratio=Math.min(root.devicePixelRatio||1,2),width=Math.min(pages.clientWidth-24,900);
   for(let n=1;n<=pdf.numPages;n++){
    if(!dialog.open)return;
    const page=await pdf.getPage(n),scale=width/page.getViewport({scale:1}).width,view=page.getViewport({scale:scale*ratio});
    const canvas=document.createElement('canvas');canvas.width=view.width;canvas.height=view.height;canvas.className='pdf-page';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${title}, page ${n} of ${pdf.numPages}`);
    pages.append(canvas);await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
   }
  }catch(e){if(dialog.open){console.error(e);pages.innerHTML='<p class="pdf-loading">Preview is not available on this device. You can still download the PDF.</p>';}}
 }
 const stamp=()=>new Date().toISOString().slice(0,10);
 async function run(button,make){
  const label=button.textContent;button.disabled=true;button.textContent='Preparing PDF…';
  try{await make();}catch(e){console.error(e);alert('Could not create the PDF. Please try again.');}
  finally{button.disabled=false;button.textContent=label;}
 }
 root.RackPDF={...api,
  async downloadBuildList(){const d=root.rackBuildData();let views={};try{views=root.PVCViewer?.snapshot?.()||{};}catch(e){console.error(e);}const doc=await library();const images={};
   await Promise.all([...new Set(d.fittings.map(f=>f.img).filter(Boolean))].map(async src=>{images[src]=await thumbnail(src);}));
   buildList(doc,d,images,views);await preview(doc,`Thulir_Build_List_${stamp()}.pdf`,'Build List');},
  async downloadEstimate(){const d=root.rackEstimateData();if(!d)return;const doc=await library();estimate(doc,d);
   const ref=d.reference!=='Not specified'?d.reference.replace(/[^\w-]+/g,'_').slice(0,40):stamp();await preview(doc,`Thulir_Estimate_${ref}.pdf`,'Customer Estimate');}};
 const bind=(id,fn)=>{const b=document.getElementById(id);if(b)b.addEventListener('click',()=>run(b,fn));};
 bind('pdfBuild',root.RackPDF.downloadBuildList);bind('pdfRack',root.RackPDF.downloadBuildList);bind('pdfEstimate',root.RackPDF.downloadEstimate);
})(typeof window==='undefined'?globalThis:window);
