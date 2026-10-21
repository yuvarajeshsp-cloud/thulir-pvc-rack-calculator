(() => {
 const tabs=[...document.querySelectorAll('.page-tabs [role="tab"]')];
 const ids=tabs.map(tab=>tab.dataset.page);
 function select(id,focus=false){
  if(!ids.includes(id))id='configurePage';
  for(const tab of tabs){const active=tab.dataset.page===id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById(tab.dataset.page).hidden=!active;if(active&&focus)tab.focus();}
  try{sessionStorage.setItem('thulirActivePage',id);}catch(_){}
  if(id==='configurePage')requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
 }
 for(const tab of tabs){tab.addEventListener('click',()=>select(tab.dataset.page));tab.addEventListener('keydown',event=>{const i=tabs.indexOf(tab);let next;if(event.key==='ArrowRight')next=(i+1)%tabs.length;else if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();select(tabs[next].dataset.page,true);});}
 let saved;try{saved=sessionStorage.getItem('thulirActivePage');}catch(_){}select(saved);
})();
