/* Projection geometry and a fixed, original PCA patch reconstruction demo. */
(function(){
 'use strict';
 const ns='http://www.w3.org/2000/svg';
 const fmt=x=>!Number.isFinite(x)?'undefined':x===0?'0':Math.abs(x)<1e-3?x.toExponential(5):Number(x.toFixed(6)).toString();
 const axisFmt=x=>Number(x.toPrecision(3)).toString();
 const sum=a=>a.reduce((x,y)=>x+y,0),dot=(a,b)=>sum(a.map((v,j)=>v*b[j])),read=e=>e.value.trim()===''?NaN:Number(e.value);
 const output=(node,lines)=>node.replaceChildren(...lines.map(line=>{const p=document.createElement('p');p.textContent=line;return p;}));
 const svg=(tag,attrs={},text)=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=String(text);return e;};
 function drawing(plot){plot.querySelector('[data-drawing]')?.remove();const g=svg('g',{'data-drawing':'true',fill:'#24344b','font-family':'Arial, Helvetica, sans-serif'});plot.append(g);return g;}
 const text=(g,x,y,label,attrs={})=>g.append(svg('text',{x,y,'font-size':16,...attrs},label));
 const line=(g,x1,y1,x2,y2,attrs={})=>g.append(svg('line',{x1,y1,x2,y2,stroke:'#c5cfdb',...attrs}));
 const path=(g,points,attrs={})=>g.append(svg('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#315f91','stroke-width':2,...attrs}));
 const geometry=document.getElementById('pca-geometry-lab');
 if(geometry){
  const input=document.getElementById('pca-points'),mode=document.getElementById('pca-mode'),angle=document.getElementById('pca-angle'),angleValue=document.getElementById('pca-angle-value'),queries=[1,2].map(j=>document.getElementById('pca-query-'+j)),result=document.getElementById('pca-geometry-result'),plot=document.getElementById('pca-geometry-plot'),desc=document.getElementById('pca-geometry-desc');
  function fit(){
   const rows=input.value.trim().split(/\n/).map(s=>s.trim()).filter(Boolean).map(s=>s.split(/[\s,]+/).map(Number));
   if(input.value.length>2000||rows.length<2||rows.length>40||rows.some(r=>r.length!==2||r.some(x=>!Number.isFinite(x)||Math.abs(x)>1000)))return null;
   const mean=[0,1].map(j=>sum(rows.map(r=>r[j]))/rows.length),offset=mode.value==='centered'?mean:[0,0],z=rows.map(r=>r.map((x,j)=>x-offset[j]));
   const a=sum(z.map(r=>r[0]*r[0]))/rows.length,b=sum(z.map(r=>r[0]*r[1]))/rows.length,c=sum(z.map(r=>r[1]*r[1]))/rows.length,trace=a+c,gap=Math.hypot(a-c,2*b),eigenvalues=[(trace+gap)/2,Math.max(0,(trace-gap)/2)],tied=gap<=1e-12*Math.max(trace,Number.MIN_VALUE),best=tied?0:Math.atan2(2*b,a-c)/2;
   return {rows,mean,offset,z,a,b,c,trace,eigenvalues,tied,best};
  }
  function draw(){
   const g=drawing(plot),f=fit(),theta=read(angle),q=queries.map(read);angleValue.textContent=fmt(theta);
   if(!f||!Number.isFinite(theta)||theta< -90||theta>90||q.some(x=>!Number.isFinite(x)||Math.abs(x)>1000)){const warning='Use 2–40 lines of two finite coordinates in [−1000,1000], query coordinates in the same bounds, and a line angle in [−90°,90°].';output(result,[warning]);desc.textContent=warning;text(g,35,80,'Enter valid observations and query coordinates to draw the projection.');return;}
   const radians=theta*Math.PI/180,u=[Math.cos(radians),Math.sin(radians)],v=[Math.cos(f.best),Math.sin(f.best)],project=z=>u.map(x=>x*dot(u,z)),projections=f.z.map(project),scores=f.z.map(z=>dot(u,z));
   const retained=sum(scores.map(t=>t*t))/f.rows.length,error=sum(f.z.map((z,i)=>sum(z.map((x,j)=>(x-projections[i][j])**2))))/f.rows.length,qz=q.map((x,j)=>x-f.offset[j]),qt=dot(u,qz),qp=project(qz),qr=qz.map((x,j)=>x-qp[j]),qx=qp.map((x,j)=>x+f.offset[j]);
   output(result,[f.rows.length+' observations; '+(mode.value==='centered'?'centered covariance':'uncentered second-moment')+' matrix = [['+fmt(f.a)+', '+fmt(f.b)+'], ['+fmt(f.b)+', '+fmt(f.c)+']].',
    'Training mean = ['+f.mean.map(fmt).join(', ')+']; fitted offset = ['+f.offset.map(fmt).join(', ')+'].',
    'Eigenvalues = ['+f.eigenvalues.map(fmt).join(', ')+']; total '+(mode.value==='centered'?'variance':'energy about origin')+' = '+fmt(f.trace)+'.',
    'Chosen angle = '+fmt(theta)+'°; retained '+(mode.value==='centered'?'variance':'energy')+' = '+fmt(retained)+'; average squared vector error = '+fmt(error)+'.',
    'Retained fraction = '+(f.trace>0?fmt(retained/f.trace):'undefined (zero total)')+'; best possible retained value = '+fmt(f.eigenvalues[0])+'; minimum error = '+fmt(f.eigenvalues[1])+'.',
    f.tied?'The eigenvalues are tied within numerical tolerance: no unique best line direction.':'Best direction angle = '+fmt(f.best*180/Math.PI)+'° (equivalent modulo 180°).',
    'Query transformed coordinates = ['+qz.map(fmt).join(', ')+']; chosen-line score = '+fmt(qt)+'; reconstruction in original units = ['+qx.map(fmt).join(', ')+'].',
    'Query residual = ['+qr.map(fmt).join(', ')+']; squared error = '+fmt(dot(qr,qr))+'.']);
   desc.textContent=(mode.value==='centered'?'Centered':'Through-origin')+' projection at '+fmt(theta)+' degrees. Retained value '+fmt(retained)+', residual error '+fmt(error)+'.';
   const extent=Math.max(1,...f.z.flat().map(Math.abs),...qz.map(Math.abs))*1.18,px=x=>75+(x/extent+1)*160,py=y=>65+(1-y/extent)*160;
   text(g,60,24,mode.value==='centered'?'Centered coordinates and projections':'Raw coordinates and origin projection',{'font-size':20,'font-weight':600});
   g.append(svg('rect',{x:75,y:65,width:320,height:320,fill:'#fafbfc',stroke:'#dbe2ea'}));
   line(g,75,py(0),395,py(0));line(g,px(0),65,px(0),385);
   for(const tick of [-extent,0,extent]){text(g,px(tick),404,axisFmt(tick),{'font-size':14,'text-anchor':'middle'});text(g,67,py(tick)+4,axisFmt(tick),{'font-size':14,'text-anchor':'end'});}
   text(g,235,434,'Feature 1 →',{'text-anchor':'middle'});text(g,75,51,'Feature 2 ↑',{'font-size':14});
   if(!f.tied)line(g,px(-extent*v[0]),py(-extent*v[1]),px(extent*v[0]),py(extent*v[1]),{stroke:'#75879d','stroke-dasharray':'5 4'});
   line(g,px(-extent*u[0]),py(-extent*u[1]),px(extent*u[0]),py(extent*u[1]),{stroke:'#315f91','stroke-width':2});
   f.z.forEach((z,i)=>{const p=projections[i];line(g,px(z[0]),py(z[1]),px(p[0]),py(p[1]),{stroke:'#a75b2b','stroke-dasharray':'3 3'});g.append(svg('circle',{cx:px(p[0]),cy:py(p[1]),r:5,fill:'white',stroke:'#a75b2b'}));g.append(svg('circle',{cx:px(z[0]),cy:py(z[1]),r:4,fill:'#315f91','data-point':i}));});
   line(g,px(qz[0]),py(qz[1]),px(qp[0]),py(qp[1]),{stroke:'#267c78','stroke-width':2});g.append(svg('circle',{cx:px(qz[0]),cy:py(qz[1]),r:6,fill:'#267c78','data-query':'original'}));g.append(svg('circle',{cx:px(qp[0]),cy:py(qp[1]),r:6,fill:'white',stroke:'#267c78','stroke-width':2,'data-query':'projection'}));
   text(g,430,100,'Blue: observations',{'font-size':14});text(g,430,122,'Hollow: projections',{'font-size':14});text(g,430,144,'Teal: query',{'font-size':14});text(g,430,166,'Dashed: best line',{'font-size':14});
   const left=610,top=75,width=335,height=280,scale=f.trace>0?f.trace:1,xp=t=>left+(t+90)/180*width,yp=value=>top+height-value/scale*height;
   text(g,610,24,'Retained value and residual error',{'font-size':20,'font-weight':600});text(g,610,49,'Blue: retained · orange: residual',{'font-size':14});g.append(svg('rect',{x:left,y:top,width,height,fill:'#fafbfc',stroke:'#dbe2ea'}));
   const energy=t=>{const a=t*Math.PI/180,co=Math.cos(a),si=Math.sin(a);return f.a*co*co+2*f.b*co*si+f.c*si*si;},angles=Array.from({length:181},(_,i)=>i-90);
   path(g,angles.map(t=>[xp(t),yp(energy(t))]));path(g,angles.map(t=>[xp(t),yp(Math.max(0,f.trace-energy(t)))]),{stroke:'#a75b2b'});line(g,xp(theta),top,xp(theta),top+height,{stroke:'#8398af','stroke-dasharray':'4 4'});
   g.append(svg('circle',{cx:xp(theta),cy:yp(retained),r:5,fill:'#315f91','data-current-retained':retained}));g.append(svg('circle',{cx:xp(theta),cy:yp(error),r:5,fill:'#a75b2b'}));
   for(const t of [-90,-45,0,45,90])text(g,xp(t),380,t+'°',{'font-size':14,'text-anchor':'middle'});
   text(g,left-8,top+4,fmt(scale),{'font-size':14,'text-anchor':'end'});text(g,left-8,top+height+4,'0',{'font-size':14,'text-anchor':'end'});text(g,777,411,'Direction angle θ',{'text-anchor':'middle'});
  }
  function reset(){input.value='7,19\n9,17\n11,23\n13,21';mode.value='centered';angle.value='45';queries[0].value='13';queries[1].value='20';draw();}
  [input,angle,...queries].forEach(e=>e.addEventListener('input',draw));mode.addEventListener('change',draw);document.getElementById('pca-reset').addEventListener('click',reset);
  document.getElementById('pca-best').addEventListener('click',()=>{const f=fit();if(f)angle.value=String(f.best*180/Math.PI);draw();});
  document.getElementById('pca-tied').addEventListener('click',()=>{reset();input.value='9,20\n10,19\n10,21\n11,20';draw();});document.getElementById('pca-constant').addEventListener('click',()=>{reset();input.value='10,20\n10,20\n10,20';draw();});draw();
 }
 const patchLab=document.getElementById('pca-patch-lab'),data=window.ML_PCA_PATCHES;
 if(patchLab&&data){
  const slider=document.getElementById('pca-k'),value=document.getElementById('pca-k-value'),result=document.getElementById('pca-patch-result'),plot=document.getElementById('pca-spectrum-plot'),desc=document.getElementById('pca-spectrum-desc'),d=data.patch**2,total=sum(data.eigenvalues),cumulative=[0];data.eigenvalues.forEach(x=>cumulative.push(cumulative[cumulative.length-1]+x));
  function paint(id,values,error=false){const destination=document.getElementById(id),source=document.createElement('canvas');source.width=data.width;source.height=data.height;const ctx=source.getContext('2d'),image=ctx.createImageData(data.width,data.height);values.forEach((v,i)=>{const gray=Math.round(255*Math.max(0,Math.min(1,error?v/.25:v)));image.data[4*i]=gray;image.data[4*i+1]=gray;image.data[4*i+2]=gray;image.data[4*i+3]=255;});ctx.putImageData(image,0,0);const target=destination.getContext('2d');target.imageSmoothingEnabled=false;target.drawImage(source,0,0,destination.width,destination.height);}
  paint('pca-original',data.original);
  function draw(){
   const k=read(slider),g=drawing(plot);value.textContent=String(k);
   if(!Number.isInteger(k)||k<0||k>d){output(result,['Choose an integer component count from 0 to '+d+'.']);desc.textContent='Invalid component count.';return;}
   const reconstructed=new Array(data.original.length),patchColumns=data.width/data.patch;
   for(let i=0;i<data.count;i++){const block=data.mean.slice();for(let j=0;j<k;j++){const coefficient=data.scores[i][j],basis=data.basis[j];for(let p=0;p<d;p++)block[p]+=coefficient*basis[p];}const row=Math.floor(i/patchColumns)*data.patch,col=(i%patchColumns)*data.patch;for(let r=0;r<data.patch;r++)for(let c=0;c<data.patch;c++)reconstructed[(row+r)*data.width+col+c]=block[r*data.patch+c];}
   const errors=reconstructed.map((v,i)=>Math.abs(v-data.original[i])),mse=sum(errors.map(x=>x*x))/errors.length,tail=sum(data.eigenvalues.slice(k)),slots=d+(d+data.count)*k,originalSlots=data.count*d;
   paint('pca-reconstructed',reconstructed);paint('pca-error',errors,true);
   output(result,['192 patches × 144 coordinates; k = '+k+' shared '+(k===1?'direction':'directions')+' and '+k+' '+(k===1?'score':'scores')+' per patch.',
    'Retained centered variance fraction = '+fmt(cumulative[k]/total)+'; discarded fraction = '+fmt(tail/total)+'.',
    'Measured pixel MSE = '+fmt(mse)+'; discarded eigenvalue sum / 144 = '+fmt(tail/d)+' (up to stored-coefficient rounding).',
    'Scalar slots: mean '+d+' + basis '+(d*k)+' + scores '+(data.count*k)+' = '+slots+'; original = '+originalSlots+'; storage fraction = '+fmt(slots/originalSlots)+'.',
    k===0?'Each patch is reconstructed from the same mean patch; no individual scores are retained.':k===d?'All directions retained: numerical reconstruction is exact up to coefficient rounding.':'The shared basis stays fixed as k changes. Small/zero eigenvalues can make this structured example reconstruct accurately before k reaches 144.']);
   desc.textContent=k+' components. Retained variance fraction '+fmt(cumulative[k]/total)+'. Pixel MSE '+fmt(mse)+'.';document.getElementById('pca-reconstructed').setAttribute('aria-label','Synthetic image reconstructed with '+k+' PCA '+(k===1?'component':'components')+'; pixel MSE '+fmt(mse));
   const panels=[{x:70,y:70,w:365,h:240,title:'Eigenvalues of the fixed patch dataset',max:data.eigenvalues[0]},{x:595,y:70,w:350,h:240,title:'Cumulative retained variance',max:1}];
   for(const p of panels){text(g,p.x,25,p.title,{'font-size':20,'font-weight':600});g.append(svg('rect',{x:p.x,y:p.y,width:p.w,height:p.h,fill:'#fafbfc',stroke:'#dbe2ea'}));for(const t of [0,36,72,108,144])text(g,p.x+t/144*p.w,333,t,{'font-size':14,'text-anchor':'middle'});text(g,p.x-8,p.y+4,fmt(p.max),{'font-size':14,'text-anchor':'end'});text(g,p.x-8,p.y+p.h+4,'0',{'font-size':14,'text-anchor':'end'});text(g,p.x+p.w/2,365,'Component count',{'text-anchor':'middle'});}
   const a=panels[0],b=panels[1];path(g,data.eigenvalues.map((v,j)=>[a.x+(j+1)/144*a.w,a.y+a.h*(1-v/a.max)]));path(g,cumulative.map((v,j)=>[b.x+j/144*b.w,b.y+b.h*(1-v/total)]),{stroke:'#267c78'});
   for(const p of panels)line(g,p.x+k/144*p.w,p.y,p.x+k/144*p.w,p.y+p.h,{stroke:'#a75b2b','stroke-dasharray':'4 4'});
   g.append(svg('circle',{cx:b.x+k/144*b.w,cy:b.y+b.h*(1-cumulative[k]/total),r:5,fill:'#a75b2b','data-retained-fraction':cumulative[k]/total}));
  }
  slider.addEventListener('input',draw);document.querySelectorAll('[data-pca-k]').forEach(button=>button.addEventListener('click',()=>{slider.value=button.dataset.pcaK;draw();}));draw();
 }
})();
