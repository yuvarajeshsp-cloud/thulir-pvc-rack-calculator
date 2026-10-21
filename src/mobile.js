import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
if(Capacitor.isNativePlatform()){
 document.body.classList.add('native-app');
 window.shareRackFile=async(name,data)=>{
  try {const {uri}=await Filesystem.writeFile({path:name,data,directory:Directory.Cache,encoding:Encoding.UTF8});await Share.share({title:name,files:[uri],dialogTitle:'Save or share your rack file'});}
  catch(e){if(!/cancel/i.test(String(e?.message)))alert('Could not share this file. Please try again.');}
 };
 document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a&&/^https?:/.test(a.href)){e.preventDefault();Browser.open({url:a.href}).catch(()=>alert('Could not open this link.'));}});
 window.print=async()=>{
  const estimate=document.body.classList.contains('printing-estimate');
  try {
   const node=document.getElementById(estimate?'customerEstimatePrint':'buildPage').cloneNode(true);
   node.hidden=false;node.removeAttribute('hidden');node.querySelectorAll('button,input,canvas,script').forEach(x=>x.remove());node.querySelectorAll('details').forEach(x=>x.open=true);
   const css=await (await fetch('style.css')).text();
   const data='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Thulir Rack '+(estimate?'Estimate':'Build List')+'</title><style>'+css+'\nbody{padding:24px!important}#customerEstimatePrint{display:block!important}section[hidden]{display:block!important}button{display:none!important}</style></head><body>'+node.outerHTML+'</body></html>';
   await window.shareRackFile(estimate?'Thulir_Estimate.html':'Thulir_Build_List.html',data);
  }catch(e){alert('Could not prepare the document. Please try again.');}
  finally{document.body.classList.remove('printing-estimate');}
 };
 document.getElementById('print').textContent='Share build list';
 const estimateButton=document.getElementById('printEstimate');if(estimateButton)estimateButton.textContent='Share printable estimate';
 App.addListener('backButton',()=>{
  const close=document.querySelector('.inspect-close');if(close){close.click();return;}
  if(document.body.classList.contains('rack-fullscreen')){document.querySelector('.fullscreenToggle').click();return;}
  const configure=document.querySelector('[data-page="configurePage"]');
  if(configure?.getAttribute('aria-selected')!=='true'){configure?.click();return;}
  App.minimizeApp();
 });
 App.addListener('appStateChange',({isActive})=>{if(isActive)window.dispatchEvent(new Event('resize'));});
}
