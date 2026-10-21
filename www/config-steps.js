(()=>{
 // Configure controls are split into steps; Back / Next walk through them and the last Next opens the build list.
 const tabs=[...document.querySelectorAll('.step-tabs [role="tab"]')];
 const back=document.getElementById('stepBack'),next=document.getElementById('stepNext');
 if(!tabs.length||!back||!next)return;
 let current=0;
 function select(i,focus=false){
  current=Math.max(0,Math.min(tabs.length-1,i));
  tabs.forEach((tab,n)=>{const active=n===current;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;tab.classList.toggle('done',n<current);document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;});
  if(focus)tabs[current].focus();
  back.disabled=current===0;
  next.textContent=current===tabs.length-1?'See build list →':'Next →';
 }
 tabs.forEach((tab,i)=>{
  tab.addEventListener('click',()=>select(i));
  tab.addEventListener('keydown',event=>{let n;if(event.key==='ArrowRight')n=(i+1)%tabs.length;else if(event.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=tabs.length-1;else return;event.preventDefault();select(n,true);});
 });
 const keepInView=()=>{const box=document.querySelector('.controls');if(box.getBoundingClientRect().top<0)box.scrollIntoView({behavior:'smooth',block:'start'});};
 back.addEventListener('click',()=>{select(current-1);keepInView();});
 next.addEventListener('click',()=>{if(current<tabs.length-1){select(current+1);keepInView();}else{document.getElementById('tab-buildPage')?.click();window.scrollTo({top:0});}});
 document.getElementById('reset')?.addEventListener('click',()=>select(0));
 select(0);
})();
