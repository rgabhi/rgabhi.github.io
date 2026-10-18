/* Guide controls: palette, answers, code copy, reading position. */
(function(){
 'use strict';
 const paletteButtons=Array.from(document.querySelectorAll('[data-accent-option]'));
 function applyPalette(value,persist){
  const palette=value==='orange'?'orange':'blue';
  document.documentElement.dataset.accent=palette;
  paletteButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.accentOption===palette)));
  document.querySelectorAll('img[data-blue-src]').forEach(img=>{
   const source=palette==='orange'?img.dataset.orangeSrc:img.dataset.blueSrc;
   if(img.getAttribute('src')!==source)img.setAttribute('src',source);
   const link=img.closest('a');if(link)link.setAttribute('href',source);
  });
  if(persist){try{localStorage.setItem('learning-guide-accent',palette)}catch{}}
 }
 paletteButtons.forEach(button=>button.addEventListener('click',()=>applyPalette(button.dataset.accentOption,true)));
 applyPalette(document.documentElement.dataset.accent,false);
 const answers=Array.from(document.querySelectorAll('details'));
 const answerToggle=document.getElementById('solutions');
 if(answerToggle)answerToggle.addEventListener('click',()=>{
  const open=answers.some(answer=>!answer.open);answers.forEach(answer=>answer.open=open);
  answerToggle.textContent=open?'Hide all answers':'Reveal all answers';
 });
 document.querySelectorAll('.cell').forEach(cell=>{
  const code=cell.querySelector('code'),button=cell.querySelector('.copy');
  if(!code||!button)return;
  button.addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(code.textContent);button.textContent='Copied';setTimeout(()=>button.textContent='Copy',1500)}
   catch{button.textContent='Select to copy'}
  });
 });
 const progress=document.querySelector('.progress'),header=document.querySelector('.topbar');
 const headings=Array.from(document.querySelectorAll('main h2'));
 function updateReadingPosition(){
  const height=header?header.getBoundingClientRect().height:76;
  if(progress){progress.style.top=(height-1)+'px';const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max>0?scrollY/max*100:0)+'%'}
  document.documentElement.style.scrollPaddingTop=(height+25)+'px';
  let active=headings[0]?.id;for(const heading of headings)if(heading.getBoundingClientRect().top<height+70)active=heading.id;
  document.querySelectorAll('.rail nav a').forEach(link=>link.classList.toggle('active',link.hash==='#'+active));
 }
 addEventListener('scroll',updateReadingPosition,{passive:true});addEventListener('resize',updateReadingPosition);
 if(typeof ResizeObserver!=='undefined'&&header)new ResizeObserver(updateReadingPosition).observe(header);
 updateReadingPosition();
})();
