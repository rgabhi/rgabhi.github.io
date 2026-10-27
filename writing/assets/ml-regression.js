/* Small, deterministic estimation tools for the regression and GDA notes. */
(function(){
 'use strict';
 const fmt=x=>x===0?'0':Math.abs(x)<1e-5?x.toExponential(4):Number(x.toFixed(6)).toString();
 const read=el=>el.value.trim()===''?NaN:Number(el.value);
 const output=(target,values)=>target.replaceChildren(...values.map(value=>{const p=document.createElement('p');p.textContent=value;return p;}));
 const regression=document.getElementById('regression-lab-tool');
 if(regression){
  const xs=[0,1,2,3].map(i=>document.getElementById('reg-x-'+i)),ys=[0,1,2,3].map(i=>document.getElementById('reg-y-'+i));
  const query=document.getElementById('reg-query'),result=document.getElementById('reg-result');
  function draw(){
   const x=xs.map(read),y=ys.map(read),q=read(query),n=x.length;
   if(![...x,...y,q].every(Number.isFinite)||x.some(v=>Math.abs(v)>10)||y.some(v=>Math.abs(v)>20)||Math.abs(q)>10){output(result,['Use finite inputs/query in [−10,10] and responses in [−20,20]. Empty values are not treated as zero.']);return;}
   const mx=x.reduce((a,b)=>a+b,0)/n,my=y.reduce((a,b)=>a+b,0)/n;
   const cxx=x.reduce((sum,v)=>sum+(v-mx)**2,0),cyy=y.reduce((sum,v)=>sum+(v-my)**2,0),cxy=x.reduce((sum,v,i)=>sum+(v-mx)*(y[i]-my),0);
   const messages=['N = '+n+'; means: X = '+fmt(mx)+', Y = '+fmt(my)+'.','ML covariance in [Y, X] order: [['+fmt(cyy/n)+', '+fmt(cxy/n)+'], ['+fmt(cxy/n)+', '+fmt(cxx/n)+']].'];
   if(cxx<=1e-12*n*Math.max(1,...x.map(v=>v*v))){messages.push('Constant or numerically indistinguishable inputs: the design is rank deficient. The best fitted mean at the observed input is '+fmt(my)+', but intercept and slope are not uniquely identified. The joint covariance is singular.');output(result,messages);return;}
   const slope=cxy/cxx,intercept=my-slope*mx,residuals=x.map((v,i)=>y[i]-intercept-slope*v),sse=residuals.reduce((sum,v)=>sum+v*v,0),schur=cyy/n-cxy*cxy/(n*cxx);
   messages.push('Mean fit: y = '+fmt(intercept)+' + ('+fmt(slope)+') x. Query mean at x = '+fmt(q)+': '+fmt(intercept+slope*q)+'.','Residuals: ['+residuals.map(fmt).join(', ')+']; SSE = '+fmt(sse)+'.');
   if(sse<=1e-12*Math.max(1,cyy)){messages.push('Perfect or numerically exact fit: residual variance tends to zero. There is no finite positive-variance Gaussian MLE, and the fitted joint scatter is singular.');}
   else{messages.push('Noise variance MLE SSE/N = '+fmt(sse/n)+'; Gaussian Schur-complement variance = '+fmt(Math.max(0,schur))+'.','Unbiased residual-variance estimate SSE/(N−2) = '+fmt(sse/(n-2))+' under the stated regression assumptions. Plug-in conditional standard deviation = '+fmt(Math.sqrt(sse/n))+'.');}
   output(result,messages);
  }
  function set(x,y){xs.forEach((e,i)=>e.value=String(x[i]));ys.forEach((e,i)=>e.value=String(y[i]));query.value='2.5';draw();}
  [...xs,...ys,query].forEach(el=>el.addEventListener('input',draw));
  document.getElementById('reg-reset').addEventListener('click',()=>set([0,1,2,3],[1,2,2,5]));
  document.getElementById('reg-perfect').addEventListener('click',()=>set([0,1,2,3],[1,3,5,7]));
  document.getElementById('reg-constant').addEventListener('click',()=>set([2,2,2,2],[1,2,2,5]));draw();
 }
 const gda=document.getElementById('gda-lab-tool');
 if(gda){
  const names=['m0','m1','s0','s1','prior','threshold','query'],fields=Object.fromEntries(names.map(n=>[n,document.getElementById('gda-'+n)]));
  const mode=document.getElementById('gda-mode'),result=document.getElementById('gda-result'),root=document.getElementById('gda-plot'),desc=document.getElementById('gda-plot-desc'),ns='http://www.w3.org/2000/svg';
  const sigmoid=t=>t>=0?1/(1+Math.exp(-t)):Math.exp(t)/(1+Math.exp(t));
  function element(tag,attrs={},text){const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase()),String(value)));if(text!==undefined)el.textContent=String(text);return el;}
  function draw(){
   const values=Object.fromEntries(names.map(n=>[n,read(fields[n])])),separate=mode.value==='separate';fields.s1.disabled=!separate;
   if(!separate)values.s1=values.s0;
   root.querySelector('[data-drawing]')?.remove();
   if(!Object.values(values).every(Number.isFinite)||Math.abs(values.m0)>3||Math.abs(values.m1)>3||values.s0<.5||values.s0>2||values.s1<.5||values.s1>2||values.prior<.05||values.prior>.95||values.threshold<.05||values.threshold>.95||Math.abs(values.query)>8){const warning='Use means in [−3,3], standard deviations in [0.5,2], priors/thresholds in [0.05,0.95], and query in [−8,8].';output(result,[warning]);desc.textContent=warning;return;}
   const {m0,m1,s0,s1,prior,threshold,query}=values,v0=s0*s0,v1=s1*s1;
   const A=.5*(1/v0-1/v1),B=m1/v1-m0/v0,C=Math.log(prior/(1-prior))-.5*Math.log(v1/v0)-.5*(m1*m1/v1-m0*m0/v0),cutoff=Math.log(threshold/(1-threshold)),K=C-cutoff;
   const delta=x=>(A*x+B)*x+C,posterior=x=>sigmoid(delta(x));
   const log0=Math.log(1-prior)-.5*Math.log(2*Math.PI*v0)-.5*(query-m0)**2/v0,log1=Math.log(prior)-.5*Math.log(2*Math.PI*v1)-.5*(query-m1)**2/v1;
   const p=posterior(query),gap=delta(query)-cutoff,tieTolerance=1e-12*Math.max(1,Math.abs(delta(query)),Math.abs(cutoff)),predicted=gap>=-tieTolerance?1:0,roots=[];let boundary;
   if(Math.abs(A)<1e-12){
    if(Math.abs(B)<1e-12)boundary=Math.abs(K)<1e-12?'Every x is a boundary: the posterior equals the threshold.':'No finite boundary; the model selects class '+(K>=0?1:0)+' everywhere.';
    else{roots.push(-K/B);boundary='Boundary x = '+fmt(roots[0])+'.';}
   }else{
    const discriminant=B*B-4*A*K,tolerance=1e-12*Math.max(1,B*B,Math.abs(4*A*K));
    if(discriminant< -tolerance)boundary='No real boundary; the model selects class '+(K>=0?1:0)+' everywhere.';
    else if(Math.abs(discriminant)<=tolerance){roots.push(-B/(2*A));boundary='One repeated boundary x = '+fmt(roots[0])+'.';}
    else{const q=-.5*(B+(B>=0?1:-1)*Math.sqrt(discriminant));roots.push(q/A,K/q);roots.sort((a,b)=>a-b);boundary='Boundary values x = '+roots.map(fmt).join(', ')+'.';}
   }
   output(result,[separate?'Separate-variance extension (QDA).':'Shared-variance Gaussian classifier (core model).','Log posterior odds Δ(x) = ('+fmt(A)+') x² + ('+fmt(B)+') x + ('+fmt(C)+').','At x = '+fmt(query)+': log class scores = ['+fmt(log0)+', '+fmt(log1)+']; P(Y=1 | x) = '+fmt(p)+', P(Y=0 | x) = '+fmt(1-p)+'.','Threshold '+fmt(threshold)+' gives class '+predicted+' (numerical ties go to class 1). The posterior threshold has log-odds '+fmt(cutoff)+'.',boundary]);
   desc.textContent=(separate?'Separate':'Shared')+' variance model. At x='+fmt(query)+', class-1 posterior is '+fmt(p)+'. '+boundary;
   const g=element('g',{'data-drawing':'true',fontFamily:'Arial, Helvetica, sans-serif',fill:'#24344b'});root.append(g);
   const left=54,right=470,width=310,top=65,bottom=335,height=bottom-top;
   const px=(x,start)=>start+(x+8)/16*width,peak=1.12*((1-prior)/Math.sqrt(2*Math.PI*v0)+prior/Math.sqrt(2*Math.PI*v1)),ly=y=>bottom-y/peak*height,ry=y=>bottom-y*height;
   const label=(x,y,text,attrs={})=>g.append(element('text',{x,y,fontSize:11,...attrs},text));
   label(left,24,'Weighted class densities',{fontSize:17,fontWeight:600});label(right,24,'Posterior P(Y=1 | x)',{fontSize:17,fontWeight:600});
   const defs=element('defs');for(const [start,id]of[[left,'gda-left-clip'],[right,'gda-right-clip']]){const clip=element('clipPath',{id});clip.append(element('rect',{x:start,y:top,width,height}));defs.append(clip);g.append(element('rect',{x:start,y:top,width,height,fill:'white',stroke:'#cbd9e9'}));}g.append(defs);
   [[left,'Class 0','#315f91'],[left+98,'Class 1','#a75b2b'],[left+195,'Sum','#267c78']].forEach(([x,t,c])=>label(x,47,t,{fill:c}));
   for(const t of [-8,-4,0,4,8])for(const start of [left,right]){const x=px(t,start);g.append(element('line',{x1:x,y1:top,x2:x,y2:bottom,stroke:'#edf0f4'}));label(x,bottom+21,t,{'text-anchor':'middle'});}
   for(const fraction of [0,.5,1]){label(left-8,ly(peak*fraction)+4,fmt(Number((peak*fraction).toFixed(3))),{'text-anchor':'end'});label(right-8,ry(fraction)+4,fraction,{'text-anchor':'end'});}
   for(const start of [left,right])label(start+width/2,bottom+43,'x',{'text-anchor':'middle',fontSize:14});
   const a=element('g',{'clip-path':'url(#gda-left-clip)'}),b=element('g',{'clip-path':'url(#gda-right-clip)'});g.append(a,b);
   const density=(x,m,v)=>Math.exp(-.5*(x-m)**2/v)/Math.sqrt(2*Math.PI*v);
   function curve(parent,fun,start,vertical,color,attrs={}){const points=[];for(let i=0;i<=640;i++){const x=-8+i/640*16;points.push((i?'L':'M')+px(x,start).toFixed(3)+','+vertical(fun(x)).toFixed(3));}parent.append(element('path',{d:points.join(' '),fill:'none',stroke:color,'stroke-width':2,...attrs}));}
   curve(a,x=>(1-prior)*density(x,m0,v0),left,ly,'#315f91',{'data-curve':'class0'});curve(a,x=>prior*density(x,m1,v1),left,ly,'#a75b2b',{'data-curve':'class1'});curve(a,x=>(1-prior)*density(x,m0,v0)+prior*density(x,m1,v1),left,ly,'#267c78',{'stroke-dasharray':'5 3','data-curve':'marginal'});curve(b,posterior,right,ry,'#a75b2b',{'data-curve':'posterior'});
   b.append(element('line',{x1:right,y1:ry(threshold),x2:right+width,y2:ry(threshold),stroke:'#8c564b','stroke-dasharray':'6 4'}));
   roots.filter(x=>x>=-8&&x<=8).forEach(x=>{for(const [parent,start]of[[a,left],[b,right]])parent.append(element('line',{x1:px(x,start),y1:top,x2:px(x,start),y2:bottom,stroke:'#657960','stroke-dasharray':'3 4','data-boundary':x}));});
   for(const [parent,start]of[[a,left],[b,right]])parent.append(element('line',{x1:px(query,start),y1:top,x2:px(query,start),y2:bottom,stroke:'#9ca3a9','stroke-dasharray':'2 5'}));
   b.append(element('circle',{cx:px(query,right),cy:ry(p),r:4,fill:'#24344b','data-query-posterior':p}));label(right,47,'Dashed horizontal: decision threshold',{fill:'#8c564b'});label(left,392,'Vertical green: boundaries. Grey: query. Black point: query posterior.',{fontSize:11});
  }
  function set(model,values){mode.value=model;names.forEach((n,i)=>fields[n].value=String(values[i]));draw();}
  mode.addEventListener('change',draw);Object.values(fields).forEach(el=>el.addEventListener('input',draw));
  document.getElementById('gda-reset').addEventListener('click',()=>set('shared',[-1,1,1,2,.5,.5,0]));
  document.getElementById('gda-two-boundaries').addEventListener('click',()=>set('separate',[0,0,1,2,.5,.5,0]));
  document.getElementById('gda-identical').addEventListener('click',()=>set('shared',[0,0,1,1,.5,.5,0]));draw();
 }
})();
