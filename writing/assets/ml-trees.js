/* Bounded, local teaching tools for one-level splits and fixed-tree pruning. */
(function(){
 'use strict';
 const ns='http://www.w3.org/2000/svg',blue='#315f91',orange='#a75b2b',teal='#267c78';
 const fmt=x=>!Number.isFinite(x)?'undefined':x===0?'0':Math.abs(x)<1e-3?x.toExponential(5):Number(x.toFixed(6)).toString();
 const axis=x=>Number(x.toPrecision(3)).toString(),sum=a=>a.reduce((x,y)=>x+y,0),read=e=>e.value.trim()===''?NaN:Number(e.value);
 const output=(e,lines)=>e.replaceChildren(...lines.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));
 const element=(tag,attrs={},text)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=String(text);return e;};
 function drawing(plot){plot.querySelector('[data-drawing]')?.remove();const g=element('g',{'data-drawing':'true','font-family':'Arial, Helvetica, sans-serif',fill:'#24344b'});plot.append(g);return g;}
 const text=(g,x,y,t,attrs={})=>g.append(element('text',{x,y,'font-size':16,...attrs},t));
 const line=(g,x1,y1,x2,y2,attrs={})=>g.append(element('line',{x1,y1,x2,y2,stroke:'#b4c1d0',...attrs}));
 const path=(g,points,attrs={})=>g.append(element('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:blue,'stroke-width':2,...attrs}));
 const count=rows=>[rows.filter(r=>r[1]===1).length,rows.filter(r=>r[1]===0).length],majority=c=>c[0]>c[1]?1:0;
 function impurity(c,criterion){const n=sum(c);if(!n)return NaN;const p=c[0]/n;if(criterion==='gini')return 2*p*(1-p);if(criterion==='error')return Math.min(p,1-p);return c.reduce((v,k)=>k?v-k/n*Math.log2(k/n):v,0);}
 const splitLab=document.getElementById('trees-split-lab');
 if(splitLab){
  const data=document.getElementById('trees-data'),criterion=document.getElementById('trees-criterion'),minimum=document.getElementById('trees-min-leaf'),threshold=document.getElementById('trees-threshold'),query=document.getElementById('trees-query'),result=document.getElementById('trees-split-result'),table=document.getElementById('trees-candidates'),plot=document.getElementById('trees-split-plot'),desc=document.getElementById('trees-split-desc');
  let candidates=[];
  function draw(forceBest=false){
   const g=drawing(plot),rows=data.value.trim().split(/\n/).map(s=>s.trim()).filter(Boolean).map(s=>(s.includes(',')?s.split(',').map(t=>t.trim()):s.split(/\s+/)).map(t=>t===''?NaN:Number(t))),min=read(minimum),q=read(query),kind=criterion.value;
   table.replaceChildren();
   if(data.value.length>2500||rows.length<2||rows.length>40||rows.some(r=>r.length!==2||!Number.isFinite(r[0])||Math.abs(r[0])>1000||![0,1].includes(r[1]))||!Number.isInteger(min)||min<1||min>40||!Number.isFinite(q)||Math.abs(q)>1000){threshold.replaceChildren();candidates=[];const warning='Use 2–40 rows of finite x in [−1000,1000] and label 0/1, an integer minimum child size in [1,40], and a finite query in [−1000,1000].';output(result,[warning]);desc.textContent=warning;text(g,30,80,'Enter valid observations and controls to compare splits.');return;}
   const parent=count(rows),n=rows.length,parentI=impurity(parent,kind),values=[...new Set(rows.map(r=>r[0]))].sort((a,b)=>a-b),old=threshold.value;
   candidates=[];
   for(let j=0;j<values.length-1;j++){const lower=values[j],upper=values[j+1];let t=lower+(upper-lower)/2;if(t>=upper)t=lower;const left=rows.filter(r=>r[0]<=t),right=rows.filter(r=>r[0]>t);if(left.length<min||right.length<min)continue;const lc=count(left),rc=count(right),after=left.length/n*impurity(lc,kind)+right.length/n*impurity(rc,kind);candidates.push({t,left:lc,right:rc,after,gain:Math.max(0,parentI-after)});}
   const best=candidates.reduce((a,b)=>!a||b.gain>a.gain+1e-12?b:a,null);
   threshold.replaceChildren(...candidates.map(c=>{const o=document.createElement('option');o.value=String(c.t);o.textContent=fmt(c.t);return o;}));threshold.disabled=candidates.length===0;
   if(candidates.length)threshold.value=String(forceBest||!candidates.some(c=>String(c.t)===old)?best.t:old);
   const selected=candidates.find(c=>String(c.t)===threshold.value),units=kind==='entropy'?' bits':'';
   for(const c of candidates){const tr=document.createElement('tr');if(c===selected)tr.className='trees-selected';[fmt(c.t),c.left.join(', '),c.right.join(', '),fmt(c.after),fmt(c.gain)].forEach((value,j)=>{const td=document.createElement(j===0?'th':'td');if(j===0)td.scope='row';td.textContent=value;tr.append(td);});table.append(tr);}
   const messages=['Parent [positive, negative] = ['+parent.join(', ')+']; n = '+n+'; impurity = '+fmt(parentI)+units+'.'];
   if(selected){const lc=selected.left,rc=selected.right,side=q<=selected.t?'left':'right',qc=side==='left'?lc:rc;messages.push('Selected test: x ≤ '+fmt(selected.t)+' goes left; larger x goes right.','Left ['+lc.join(', ')+'] has weight '+fmt(sum(lc)/n)+' and impurity '+fmt(impurity(lc,kind))+units+'; right ['+rc.join(', ')+'] has weight '+fmt(sum(rc)/n)+' and impurity '+fmt(impurity(rc,kind))+units+'.','Weighted child impurity = '+fmt(selected.after)+units+'; gain = '+fmt(selected.gain)+units+'.','Best valid threshold = '+fmt(best.t)+'; best gain = '+fmt(best.gain)+units+' (smaller threshold wins numerical ties).','Query x = '+fmt(q)+' takes the '+side+' branch; empirical P(y=1) = '+fmt(qc[0]/sum(qc))+'; majority prediction = '+majority(qc)+'.');if(parentI===0)messages.push('The parent is pure. Every displayed gain is zero; a usual tree-growing routine stops here.');}
   else messages.push('No split satisfies the distinct-value and child-size conditions. A majority leaf predicts '+majority(parent)+' with empirical P(y=1) = '+fmt(parent[0]/n)+'.');
   output(result,messages);desc.textContent=selected?'Threshold '+fmt(selected.t)+', gain '+fmt(selected.gain)+units+'. Left counts '+selected.left.join(', ')+', right '+selected.right.join(', ')+'.':'No valid split; parent majority leaf.';
   text(g,65,25,'One feature and its selected threshold',{'font-size':20,'font-weight':600});
   const lo=Math.min(...values,q),hi=Math.max(...values,q),padding=Math.max((hi-lo)*.12,1),xMin=lo-padding,xMax=hi+padding,px=x=>65+(x-xMin)/(xMax-xMin)*370,py=y=>340-y*220;
   g.append(element('rect',{x:65,y:70,width:370,height:300,fill:'#fafbfc',stroke:'#dbe2ea'}));line(g,65,py(0),435,py(0));line(g,65,py(1),435,py(1));text(g,54,py(0)+5,'0',{'text-anchor':'end'});text(g,54,py(1)+5,'1',{'text-anchor':'end'});
   rows.forEach((r,i)=>g.append(element('circle',{cx:px(r[0]),cy:py(r[1])+((i%3)-1)*4,r:5,fill:r[1]?blue:orange,'data-observation':i})));
   if(selected)line(g,px(selected.t),70,px(selected.t),370,{stroke:teal,'stroke-width':2,'stroke-dasharray':'5 4'});
   g.append(element('path',{d:'M '+px(q)+' 385 l -6 10 h 12 z',fill:teal}));text(g,250,426,'Feature x · teal marker is the query',{'text-anchor':'middle','font-size':14});
   for(const v of [lo,(lo+hi)/2,hi])text(g,px(v),410,axis(v),{'font-size':14,'text-anchor':'middle'});
   text(g,570,25,'Impurity before and after splitting',{'font-size':20,'font-weight':600});const top=70,height=300,max=impurity([1,1],kind),xp=p=>570+p*370,yp=v=>top+height*(1-v/max),prob=parent[0]/n;
   g.append(element('rect',{x:570,y:top,width:370,height,fill:'#fafbfc',stroke:'#dbe2ea'}));path(g,Array.from({length:201},(_,i)=>{const p=i/200;return[xp(p),yp(impurity([p,1-p],kind))];}));
   if(selected){const probs=[selected.left,selected.right].map(c=>c[0]/sum(c)),imps=[selected.left,selected.right].map(c=>impurity(c,kind));line(g,xp(probs[0]),yp(imps[0]),xp(probs[1]),yp(imps[1]),{'stroke-dasharray':'5 4'});probs.forEach((p,j)=>g.append(element('circle',{cx:xp(p),cy:yp(imps[j]),r:5,fill:blue})));line(g,xp(prob),yp(parentI),xp(prob),yp(selected.after),{stroke:orange,'stroke-width':4});g.append(element('circle',{cx:xp(prob),cy:yp(selected.after),r:5,fill:teal,'data-weighted-child':selected.after}));}
   g.append(element('circle',{cx:xp(prob),cy:yp(parentI),r:5,fill:orange}));for(const p of [0,.25,.5,.75,1])text(g,xp(p),397,String(p),{'text-anchor':'middle','font-size':14});text(g,560,75,fmt(max),{'text-anchor':'end','font-size':14});text(g,560,374,'0',{'text-anchor':'end','font-size':14});text(g,755,426,'Positive proportion · orange gap is gain',{'text-anchor':'middle','font-size':14});
  }
  function reset(){data.value='1,0\n2,0\n3,1\n4,1\n5,1\n6,0\n7,0\n8,1';criterion.value='entropy';minimum.value='1';query.value='6';threshold.value='';draw(true);}
  [data,minimum,query].forEach(e=>e.addEventListener('input',()=>draw()));criterion.addEventListener('change',()=>draw());threshold.addEventListener('change',()=>draw());document.getElementById('trees-best').addEventListener('click',()=>draw(true));document.getElementById('trees-reset').addEventListener('click',reset);document.getElementById('trees-duplicate').addEventListener('click',()=>{reset();data.value='2,0\n2,1\n2,0\n2,1';draw();});document.getElementById('trees-pure').addEventListener('click',()=>{reset();data.value='1,0\n2,0\n3,0\n4,0';draw();});draw(true);
 }
 const pruningLab=document.getElementById('trees-pruning-lab');
 if(pruningLab){
  const training=[[8,2],[1,9],[8,2],[1,9]],defaults=[[1,4],[4,1],[4,1],[1,4]],mode=document.getElementById('trees-pruning-mode'),alpha=document.getElementById('trees-alpha'),query=document.getElementById('trees-pruning-query'),fields=[0,1,2,3].map(i=>[0,1].map(j=>document.getElementById('trees-v'+i+'-'+j))),result=document.getElementById('trees-pruning-result'),body=document.getElementById('trees-cost-candidates'),treePlot=document.getElementById('trees-pruning-plot'),costPlot=document.getElementById('trees-cost-plot'),treeDesc=document.getElementById('trees-pruning-desc'),costDesc=document.getElementById('trees-cost-desc');
  const definitions=[{id:'full',name:'Full tree',groups:[[0],[1],[2],[3]]},{id:'left',name:'Prune left child',groups:[[0,1],[2],[3]]},{id:'right',name:'Prune right child',groups:[[0],[1],[2,3]]},{id:'both',name:'Prune both children',groups:[[0,1],[2,3]]},{id:'root',name:'Replace root',groups:[[0,1,2,3]]}],aggregate=(rows,indices)=>[0,1].map(j=>sum(indices.map(i=>rows[i][j])));
  let last=null;
  function draw(){
   const g=drawing(treePlot),cg=drawing(costPlot),validation=fields.map(row=>row.map(read)),a=read(alpha),q=read(query);body.replaceChildren();
   if(validation.flat().some(n=>!Number.isInteger(n)||n<0||n>1000)||!Number.isFinite(a)||a<0||a>.3||!Number.isFinite(q)||Math.abs(q)>1000){last=null;const warning='Use integer validation counts in [0,1000], α in [0,0.3], and a finite query in [−1000,1000].';output(result,[warning]);treeDesc.textContent=costDesc.textContent=warning;text(g,30,80,'Enter valid counts and controls to inspect a pruning.');return;}
   const validationN=sum(validation.flat()),cases=definitions.map(d=>{let trainE=0,valE=0;for(const indices of d.groups){const train=aggregate(training,indices),val=aggregate(validation,indices),prediction=majority(train);trainE+=prediction?train[1]:train[0];valE+=prediction?val[1]:val[0];}return{...d,trainE,valE,leaves:d.groups.length,cost:trainE/40+a*d.groups.length};});
   const choose=metric=>cases.reduce((best,c)=>!best||c[metric]<best[metric]-1e-12||Math.abs(c[metric]-best[metric])<=1e-12&&c.leaves<best.leaves?c:best,null),bestValidation=choose('valE'),bestCost=choose('cost'),current=cases.find(c=>c.id===mode.value)||cases[0];last={bestValidation:bestValidation.id,bestCost:bestCost.id};
   for(const c of cases){const tr=document.createElement('tr');if(c.id===current.id)tr.className='trees-selected';[c.name,String(c.leaves),c.trainE+'/40',c.valE+'/'+validationN,fmt(c.cost)].forEach((t,j)=>{const cell=document.createElement(j===0?'th':'td');if(j===0)cell.scope='row';cell.textContent=t;tr.append(cell);});body.append(tr);}
   const index=q<=2?0:q<=4?1:q<=6?2:3,group=current.groups.find(indices=>indices.includes(index)),train=aggregate(training,group),pred=majority(train),route=current.id==='root'?'Root replaced by one leaf':(q<=4?'x ≤ 4: yes':'x ≤ 4: no')+(group.length===2?' → child replaced by one leaf':q<=4?(q<=2?' → x ≤ 2: yes':' → x ≤ 2: no'):(q<=6?' → x ≤ 6: yes':' → x ≤ 6: no'));
   output(result,[current.name+': '+current.leaves+(current.leaves===1?' leaf; ':' leaves; ')+(2*current.leaves-1)+(current.leaves===1?' total node.':' total nodes.'),
    'Training errors = '+current.trainE+'/40; rate = '+fmt(current.trainE/40)+'. Validation errors = '+current.valE+'/'+validationN+'; rate = '+(validationN?fmt(current.valE/validationN):'undefined (no validation observations)')+'.',
    'Training-rate cost = '+fmt(current.trainE/40)+' + '+fmt(a)+' × '+current.leaves+' = '+fmt(current.cost)+'.',
    'Best validation choice = '+bestValidation.name+(validationN?' ('+bestValidation.valE+'/'+validationN+' errors).':' (all correct/error counts tie at zero; simplicity only).'),
    'Best cost choice at this α = '+bestCost.name+'; cost = '+fmt(bestCost.cost)+'.',
    'Query x = '+fmt(q)+': '+route+' → predict '+pred+' from training counts ['+train.join(', ')+']; empirical P(y=1) = '+fmt(train[0]/sum(train))+'.']);
   treeDesc.textContent=current.name+'. Query '+fmt(q)+' predicts '+pred+'. Training errors '+current.trainE+'; validation errors '+current.valE+' of '+validationN+'.';costDesc.textContent='Alpha '+fmt(a)+'. Cost-optimal pruning is '+bestCost.name+'.';
   treePlot.setAttribute('viewBox',current.id==='root'?'0 0 1000 260':'0 0 1000 540');text(g,500,23,'Training counts fix predictions; teal highlights the query route',{'text-anchor':'middle','font-size':19,'font-weight':600});
   const branch=(x1,y1,x2,y2,label,active)=>{line(g,x1,y1+50,x2,y2-45,{stroke:active?teal:'#b4c1d0','stroke-width':active?3:1.5});text(g,(x1+x2)/2,(y1+y2)/2,label,{'text-anchor':'middle','font-size':14});};
   function box(x,y,title,indices,leaf){const t=aggregate(training,indices),v=aggregate(validation,indices),active=indices.includes(index),label=leaf?title+' · predict '+majority(t):title;g.append(element('rect',{x:x-110,y:y-45,width:220,height:100,rx:7,fill:leaf?(majority(t)?'#edf3fa':'#f9f2ec'):'#fafbfc',stroke:active?teal:'#a9b9ca','stroke-width':active?2.5:1.2,'data-pruning-node':title}));text(g,x,y-17,label,{'text-anchor':'middle','font-size':18,'font-weight':600});text(g,x,y+10,'Train ['+t[0]+'+, '+t[1]+'−]',{'text-anchor':'middle','font-size':15});text(g,x,y+34,'Val ['+v[0]+'+, '+v[1]+'−]',{'text-anchor':'middle','font-size':15});}
   if(current.id==='root'){box(500,105,'Root leaf',[0,1,2,3],true);text(g,500,218,'A single training-majority prediction replaces every test.',{'text-anchor':'middle'});}
   else{
    branch(500,90,250,250,'yes',index<2);branch(500,90,750,250,'no',index>=2);box(500,90,'x ≤ 4?',[0,1,2,3],false);
    for(const side of [0,1]){const x=side?750:250,indices=side?[2,3]:[0,1],pruned=current.groups.some(group=>group.length===2&&group[0]===indices[0]);if(pruned)box(x,250,side?'Right leaf':'Left leaf',indices,true);else{for(const j of [0,1]){const i=indices[j],lx=125+i*250;branch(x,250,lx,420,j?'no':'yes',index===i);box(lx,420,'ABCD'[i],[i],true);}box(x,250,side?'x ≤ 6?':'x ≤ 2?',indices,false);}}
    text(g,500,510,'Counts are shown as [positive, negative] for the same original regions.',{'text-anchor':'middle','font-size':15});
   }
   const left=75,top=60,w=850,h=215,ymax=1.45,xp=x=>left+x/.3*w,yp=y=>top+h*(1-y/ymax),colors={full:blue,left:teal,right:teal,both:'#8d9caf',root:orange};
   text(cg,75,25,'Training-rate cost for each subtree',{'font-size':20,'font-weight':600});cg.append(element('rect',{x:left,y:top,width:w,height:h,fill:'#fafbfc',stroke:'#dbe2ea'}));
   const alphas=Array.from({length:121},(_,i)=>i*.3/120);
   for(const c of cases.filter(c=>c.id!=='right'))path(cg,alphas.map(a=>[xp(a),yp(c.trainE/40+a*c.leaves)]),{stroke:colors[c.id]});
   path(cg,alphas.map(a=>[xp(a),yp(Math.min(...cases.map(c=>c.trainE/40+a*c.leaves)))]),{stroke:'#24344b','stroke-width':3,opacity:.5});line(cg,xp(a),top,xp(a),top+h,{stroke:'#6c7e94','stroke-dasharray':'5 4'});cg.append(element('circle',{cx:xp(a),cy:yp(current.cost),r:6,fill:colors[current.id],'data-current-cost':current.cost}));
   for(const t of [0,.05,.1,.15,.2,.25,.3])text(cg,xp(t),299,String(t),{'text-anchor':'middle','font-size':14});for(const t of [0,.5,1])text(cg,65,yp(t)+4,fmt(t),{'text-anchor':'end','font-size':14});text(cg,500,326,'Penalty α per leaf · dot: inspected subtree · dark envelope: best cost',{'text-anchor':'middle','font-size':15});
   [['Full',blue,570],['One child',teal,650],['Both children','#8d9caf',750],['Root',orange,890]].forEach(([t,c,x])=>text(cg,x,25,t,{fill:c,'font-size':14}));
  }
  function reset(){defaults.forEach((row,i)=>row.forEach((n,j)=>fields[i][j].value=String(n)));alpha.value='.05';query.value='1.5';mode.value='full';draw();}
  fields.flat().forEach(e=>e.addEventListener('input',draw));[alpha,query].forEach(e=>e.addEventListener('input',draw));mode.addEventListener('change',draw);document.getElementById('trees-pruning-reset').addEventListener('click',reset);document.getElementById('trees-no-validation').addEventListener('click',()=>{fields.flat().forEach(e=>e.value='0');draw();});document.getElementById('trees-apply-validation').addEventListener('click',()=>{if(last){mode.value=last.bestValidation;draw();}});document.getElementById('trees-apply-cost').addEventListener('click',()=>{if(last){mode.value=last.bestCost;draw();}});draw();
 }
})();
