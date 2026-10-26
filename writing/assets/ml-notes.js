/* Reading tools and the deliberately small, dependency-free CNN calculators. */
(function(){
 'use strict';
 if(window.renderMathInElement)window.renderMathInElement(document.getElementById('article'),{
  delimiters:[{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false}],throwOnError:false,strict:'warn',trust:false
 });
 const solutionButton=document.querySelector('[data-toggle-solutions]');
 function toggleSolutions(){const items=[...document.querySelectorAll('details[data-solution]')];const open=items.some(el=>!el.open);items.forEach(el=>el.open=open);if(solutionButton)solutionButton.textContent=open?'Hide solutions':'Reveal solutions';}
 if(solutionButton)solutionButton.addEventListener('click',toggleSolutions);
 document.querySelectorAll('[data-print]').forEach(button=>button.addEventListener('click',async()=>{
  const previous=[...document.querySelectorAll('details')].map(el=>[el,el.open]);
  document.querySelectorAll('details[data-solution]').forEach(el=>el.open=true);
  const restore=()=>{previous.forEach(([el,open])=>el.open=open);window.removeEventListener('afterprint',restore);};
  window.addEventListener('afterprint',restore);
  await Promise.allSettled([...document.querySelectorAll('figure img')].map(image=>{image.loading='eager';return image.decode();}));
  window.print();
 }));
 const pageKey='ml-notes:'+location.pathname;
 const checks=[...document.querySelectorAll('.checklist input')];
 try{const saved=JSON.parse(localStorage.getItem(pageKey+':checks')||'[]');checks.forEach((box,i)=>box.checked=!!saved[i]);}catch{}
 checks.forEach(box=>box.addEventListener('change',()=>{try{localStorage.setItem(pageKey+':checks',JSON.stringify(checks.map(el=>el.checked)));}catch{}}));
 const resume=document.querySelector('[data-resume]');
 try{const saved=localStorage.getItem(pageKey+':section');const heading=saved&&document.getElementById(saved);if(heading&&resume){resume.href='#'+saved;resume.textContent='Continue: '+heading.textContent;resume.hidden=false;}}catch{}
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){try{localStorage.setItem(pageKey+':section',entry.target.id);}catch{}}},{rootMargin:'-15% 0px -65% 0px'});document.querySelectorAll('main h2[id]').forEach(el=>observer.observe(el));}
 const lab=document.getElementById('convolution-lab');
 if(lab){
  const initial=[[1,2,0,3,1],[4,1,2,0,2],[0,3,1,2,4],[2,0,4,1,3],[1,2,3,0,1]];
  const presets={edge:[[1,0,-1],[1,0,-1],[1,0,-1]],identity:[[0,0,0],[0,1,0],[0,0,0]],blur:[[1/9,1/9,1/9],[1/9,1/9,1/9],[1/9,1/9,1/9]],sharpen:[[0,-1,0],[-1,5,-1],[0,-1,0]]};
  const imageGrid=document.getElementById('input-grid'),kernelGrid=document.getElementById('kernel-grid'),outputGrid=document.getElementById('output-grid');
  const stride=document.getElementById('lab-stride'),padding=document.getElementById('lab-padding'),preset=document.getElementById('lab-preset'),flip=document.getElementById('lab-flip');
  let X=initial.map(row=>row.slice()),K=presets.edge.map(row=>row.slice()),selected=0;
  const fmt=value=>Number(value.toFixed(4)).toString();
  function inputGrid(container,values,name,onEdit){container.replaceChildren();container.style.gridTemplateColumns='repeat('+values[0].length+',1fr)';values.forEach((row,r)=>row.forEach((value,c)=>{
   const input=document.createElement('input');input.type='number';input.step='any';input.value=fmt(value);input.setAttribute('aria-label',name+' row '+(r+1)+', column '+(c+1));input.addEventListener('input',()=>{const number=Number(input.value);values[r][c]=Number.isFinite(number)?number:0;onEdit();});container.append(input);
  }));}
  function draw(){
   const s=Number(stride.value),p=Number(padding.value),size=Math.floor((5+2*p-3)/s)+1;selected=Math.min(selected,size*size-1);
   const row=Math.floor(selected/size),col=selected%size;outputGrid.replaceChildren();outputGrid.style.gridTemplateColumns='repeat('+size+',1fr)';
   const kernel=(r,c)=>flip.checked?K[2-r][2-c]:K[r][c];
   for(let r=0;r<size;r++)for(let c=0;c<size;c++){
    let value=0;for(let a=0;a<3;a++)for(let b=0;b<3;b++){const ir=r*s+a-p,ic=c*s+b-p;value+=(X[ir]?.[ic]||0)*kernel(a,b);}
    const button=document.createElement('button');button.type='button';button.textContent=fmt(value);button.setAttribute('aria-label','Output row '+(r+1)+', column '+(c+1)+': '+fmt(value));button.setAttribute('aria-pressed',String(r*size+c===selected));button.classList.toggle('selected',r*size+c===selected);button.addEventListener('click',()=>{selected=r*size+c;draw();});outputGrid.append(button);
   }
   [...imageGrid.children].forEach((input,i)=>{const r=Math.floor(i/5),c=i%5;input.classList.toggle('in-window',r>=row*s-p&&r<row*s-p+3&&c>=col*s-p&&c<col*s-p+3);});
   const terms=[];let sum=0;for(let a=0;a<3;a++)for(let b=0;b<3;b++){const ir=row*s+a-p,ic=col*s+b-p,x=X[ir]?.[ic]||0,k=kernel(a,b);sum+=x*k;terms.push('('+fmt(x)+' × '+fmt(k)+')');}
   document.getElementById('lab-window').textContent='Output ('+row+', '+col+'), zero-based · '+size+' × '+size+' map · '+(flip.checked?'kernel rotated 180°':'kernel as displayed');
   document.getElementById('lab-calculation').textContent=terms.join(' + ')+' = '+fmt(sum);
   document.getElementById('lab-shape').textContent='⌊(5 + 2×'+p+' − 3) / '+s+'⌋ + 1 = '+size;
  }
  function setup(){inputGrid(imageGrid,X,'Input',draw);inputGrid(kernelGrid,K,'Kernel',()=>{preset.value='custom';draw();});draw();}
  preset.addEventListener('change',()=>{if(presets[preset.value]){K=presets[preset.value].map(row=>row.slice());inputGrid(kernelGrid,K,'Kernel',()=>{preset.value='custom';draw();});draw();}});
  [stride,padding,flip].forEach(control=>control.addEventListener('change',()=>{selected=0;draw();}));
  document.getElementById('lab-next').addEventListener('click',()=>{const n=Math.floor((5+2*Number(padding.value)-3)/Number(stride.value))+1;selected=(selected+1)%(n*n);draw();});
  document.getElementById('lab-reset').addEventListener('click',()=>{X=initial.map(row=>row.slice());K=presets.edge.map(row=>row.slice());stride.value='1';padding.value='0';preset.value='edge';flip.checked=false;selected=0;setup();});setup();
 }
 const shapeForm=document.getElementById('shape-calculator');
 if(shapeForm){
  function calculate(){const read=id=>Number(document.getElementById(id).value);const n=read('shape-n'),f=read('shape-f'),s=read('shape-s'),p=read('shape-p'),cin=read('shape-cin'),cout=read('shape-cout');const result=document.getElementById('shape-result');
   if(![n,f,s,p,cin,cout].every(Number.isInteger)||Math.min(n,f,s,cin,cout)<1||p<0||n+2*p<f){result.textContent='Use positive integer sizes, channels and stride, nonnegative padding, and a filter that fits the padded input.';return;}
   const out=Math.floor((n+2*p-f)/s)+1,params=(f*f*cin+1)*cout,remainder=(n+2*p-f)%s;result.textContent='Output: '+out+' × '+out+' × '+cout+'. Parameters: '+params.toLocaleString()+' (including one bias per output channel).'+(remainder?' The last '+remainder+' padded position'+(remainder===1?' is':'s are')+' unused along each axis.':' Every stride lands on a complete final window.');
  }shapeForm.addEventListener('input',calculate);calculate();
 }
})();
