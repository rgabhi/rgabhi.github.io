/* Joint probabilities and bivariate Gaussian geometry, with explicit conventions. */
(function(){
 'use strict';
 const fmt=x=>x===0?'0':Math.abs(x)<1e-4?x.toExponential(3):Number(x.toFixed(6)).toString();
 const read=el=>el.value.trim()===''?NaN:Number(el.value);
 function lines(target,values){target.replaceChildren(...values.map(value=>{const p=document.createElement('p');p.textContent=value;return p;}));}
 const joint=document.getElementById('joint-lab-tool');
 if(joint){
  const fields=['joint-a','joint-b','joint-c','joint-d'].map(id=>document.getElementById(id)),result=document.getElementById('joint-result');
  function draw(){
   const [a,b,c,d]=fields.map(read),total=a+b+c+d;
   if(![a,b,c,d,total].every(Number.isFinite)||Math.min(a,b,c,d)<0||total<=0){lines(result,['Enter nonnegative finite weights with a positive finite total.']);['joint-r1','joint-r0','joint-l1','joint-l0','joint-total'].forEach(id=>document.getElementById(id).textContent='—');return;}
   const rain=(a+b)/total,late=(a+c)/total,both=a/total,product=rain*late,cov=both-product;
   [['joint-r1',a+b],['joint-r0',c+d],['joint-l1',a+c],['joint-l0',b+d],['joint-total',total]].forEach(([id,x])=>document.getElementById(id).textContent=fmt(x));
   const conditional=(numerator,denominator)=>denominator>0?fmt(numerator/denominator):'undefined (conditioning total is zero)';
   lines(result,['P(rain) = '+fmt(rain)+', P(late) = '+fmt(late)+', P(rain and late) = '+fmt(both)+'.','P(late | rain) = '+conditional(a,a+b)+'; P(rain | late) = '+conditional(a,a+c)+'.','Independence check: joint '+fmt(both)+' versus product of marginals '+fmt(product)+'. '+(Math.abs(cov)<1e-10?'They agree within numerical rounding.':'They differ; these binary variables are dependent.'),'Cov(R, L) = '+fmt(cov)+'.']);
  }
  fields.forEach(field=>field.addEventListener('input',draw));
  function set(values){fields.forEach((field,i)=>field.value=String(values[i]));draw();}
  document.getElementById('joint-reset').addEventListener('click',()=>set([18,12,7,63]));document.getElementById('joint-independent').addEventListener('click',()=>set([15,15,35,35]));draw();
 }
 const lab=document.getElementById('gaussian-lab-tool');
 if(lab){
  const names=['mx','my','sx','sy','rho','observed','probe'],fields=Object.fromEntries(names.map(name=>[name,document.getElementById('gauss-'+name)]));
  const root=document.getElementById('gauss-plot'),result=document.getElementById('gauss-result'),ns='http://www.w3.org/2000/svg';
  function el(tag,attributes={},text){const node=document.createElementNS(ns,tag);Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase()),String(value)));if(text!==undefined)node.textContent=String(text);return node;}
  function draw(){
   const v=Object.fromEntries(names.map(name=>[name,read(fields[name])]));root.querySelector('[data-drawing]')?.remove();
   const valid=Object.values(v).every(Number.isFinite)&&Math.abs(v.mx)<=1&&Math.abs(v.my)<=1&&v.sx>=.5&&v.sx<=1.5&&v.sy>=.5&&v.sy<=1.5&&Math.abs(v.rho)<=.95&&Math.abs(v.observed)<=4&&Math.abs(v.probe)<=4;
   if(!valid){lines(result,['Use means in [−1,1], standard deviations in [0.5,1.5], |correlation| ≤ 0.95, and observed/probe values in [−4,4].']);return;}
   const {mx,my,sx,sy,rho,observed,probe}=v,one=1-rho*rho,varx=sx*sx,vary=sy*sy,cov=rho*sx*sy,det=varx*vary*one;
   const conditionalMean=mx+rho*sx/sy*(observed-my),conditionalVariance=varx*one,u=(probe-mx)/sx,w=(observed-my)/sy,dm2=(u*u-2*rho*u*w+w*w)/one;
   const density=Math.exp(-dm2/2)/(2*Math.PI*sx*sy*Math.sqrt(one));document.getElementById('gauss-rho-value').textContent=fmt(rho);
   lines(result,['Σ = [['+fmt(varx)+', '+fmt(cov)+'], ['+fmt(cov)+', '+fmt(vary)+']]; determinant = '+fmt(det)+'.','Marginal X: mean '+fmt(mx)+', variance '+fmt(varx)+'. Conditional X | Y = '+fmt(observed)+': mean '+fmt(conditionalMean)+', variance '+fmt(conditionalVariance)+'.','At probe ('+fmt(probe)+', '+fmt(observed)+'): squared Mahalanobis distance = '+fmt(dm2)+', joint density ≈ '+fmt(density)+'.']);
   document.getElementById('gauss-plot-desc').textContent='Joint Gaussian contours at correlation '+fmt(rho)+'. The marginal X mean is '+fmt(mx)+' and variance '+fmt(varx)+'. Conditional on Y equal to '+fmt(observed)+', X has mean '+fmt(conditionalMean)+' and variance '+fmt(conditionalVariance)+'.';
   const g=el('g',{'data-drawing':'true',fontFamily:'Arial, Helvetica, sans-serif',fill:'#24344b'});root.append(g);
   const left=48,top=52,size=400,right=528,rightWidth=250,bottom=452;
   const px=x=>left+(x+6)/12*size,py=y=>top+(6-y)/12*size,rx=x=>right+(x+6)/12*rightWidth;
   const defs=el('defs'),clip=el('clipPath',{id:'gauss-joint-clip'}),rclip=el('clipPath',{id:'gauss-density-clip'});clip.append(el('rect',{x:left,y:top,width:size,height:size}));rclip.append(el('rect',{x:right,y:95,width:rightWidth,height:357}));defs.append(clip,rclip);g.append(defs);
   const label=(x,y,text,attrs={})=>g.append(el('text',{x,y,fontSize:12,...attrs},text));
   g.append(el('rect',{x:left,y:top,width:size,height:size,fill:'#fff',stroke:'#cbd9e9'}));g.append(el('rect',{x:right,y:95,width:rightWidth,height:357,fill:'#fff',stroke:'#cbd9e9'}));
   label(left,27,'Joint Gaussian contours',{fontSize:17,fontWeight:600});label(right,65,'X densities',{fontSize:17,fontWeight:600});
   for(let tick=-6;tick<=6;tick+=2){g.append(el('line',{x1:px(tick),y1:top,x2:px(tick),y2:bottom,stroke:tick===0?'#becbd8':'#edf0f4'}));g.append(el('line',{x1:left,y1:py(tick),x2:left+size,y2:py(tick),stroke:tick===0?'#becbd8':'#edf0f4'}));label(px(tick),bottom+22,tick,{'text-anchor':'middle'});label(left-10,py(tick)+4,tick,{'text-anchor':'end'});label(rx(tick),bottom+22,tick,{'text-anchor':'middle'});}
   label(left+size/2,bottom+45,'X',{'text-anchor':'middle',fontSize:15});label(8,top+size/2,'Y',{fontSize:15});label(right+rightWidth/2,bottom+45,'X',{'text-anchor':'middle',fontSize:15});
   const jointGroup=el('g',{'clip-path':'url(#gauss-joint-clip)'});g.append(jointGroup);
   [3,2,1].forEach((radius,i)=>{const points=[];for(let j=0;j<=240;j++){const angle=j/240*2*Math.PI,x=mx+radius*sx*Math.cos(angle),y=my+radius*sy*(rho*Math.cos(angle)+Math.sqrt(one)*Math.sin(angle));points.push((j?'L':'M')+px(x).toFixed(3)+','+py(y).toFixed(3));}jointGroup.append(el('path',{d:points.join(' ')+' Z',fill:i===0?'#edf3fa':'none',stroke:'#315f91','stroke-width':i===2?2.3:1.4,'data-contour-radius':radius}));});
   jointGroup.append(el('line',{x1:left,y1:py(observed),x2:left+size,y2:py(observed),stroke:'#a75b2b','stroke-width':2,'stroke-dasharray':'6 4'}));jointGroup.append(el('circle',{cx:px(probe),cy:py(observed),r:4.5,fill:'#a75b2b'}));jointGroup.append(el('circle',{cx:px(mx),cy:py(my),r:4,fill:'#315f91'}));
   const norm=(x,mean,variance)=>Math.exp(-.5*(x-mean)**2/variance)/Math.sqrt(2*Math.PI*variance),peak=1.15/Math.sqrt(2*Math.PI*Math.min(varx,conditionalVariance)),dy=y=>bottom-y/peak*335;
   const densityGroup=el('g',{'clip-path':'url(#gauss-density-clip)'});g.append(densityGroup);
   [[mx,varx,'#315f91',false],[conditionalMean,conditionalVariance,'#a75b2b',true]].forEach(([mean,variance,color,dashed])=>{const points=[];for(let j=0;j<=500;j++){const x=-6+j/500*12;points.push((j?'L':'M')+rx(x).toFixed(3)+','+dy(norm(x,mean,variance)).toFixed(3));}densityGroup.append(el('path',{d:points.join(' '),fill:'none',stroke:color,'stroke-width':2.3,...(dashed?{'stroke-dasharray':'6 3'}:{})}));});
   label(right+8,115,'Marginal X',{fill:'#315f91'});label(right+8,135,'Conditional X | Y',{fill:'#a75b2b'});label(right+8,bottom-8,'Density ≥ 0',{fill:'#526172',fontSize:11});label(left,512,'Blue: joint contours / marginal. Orange: observation / conditional.',{fontSize:12});
  }
  Object.values(fields).forEach(field=>field.addEventListener('input',draw));document.getElementById('gauss-reset').addEventListener('click',()=>{[0,0,1,1,.6,1,1].forEach((value,i)=>fields[names[i]].value=String(value));draw();});draw();
 }
})();
