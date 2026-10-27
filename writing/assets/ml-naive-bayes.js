/* Transparent event-model calculations for the Naive Bayes teaching chapter. */
(function(){
 'use strict';
 const words=['free','offer','meeting','project'];
 const fmt=v=>Number.isNaN(v)?'undefined':v===Infinity?'+∞':v===-Infinity?'−∞':v===0?'0':Math.abs(v)<1e-5?v.toExponential(4):Number(v.toFixed(6)).toString();
 const read=e=>e.value.trim()===''?NaN:Number(e.value);
 const output=(target,values)=>target.replaceChildren(...values.map(value=>{const p=document.createElement('p');p.textContent=value;return p;}));
 const sum=xs=>xs.reduce((a,b)=>a+b,0);
 const estimate=(counts,alpha)=>{const total=sum(counts)+alpha*counts.length;return total>0?counts.map(n=>(n+alpha)/total):null;};
 const countLab=document.getElementById('nb-count-lab');
 if(countLab){
  const fields=[0,1].map(c=>words.map((_,j)=>document.getElementById('nb-n'+c+'-'+j))),alpha=document.getElementById('nb-count-alpha'),word=document.getElementById('nb-count-word'),result=document.getElementById('nb-count-result');
  function draw(){
   const counts=fields.map(row=>row.map(read)),a=read(alpha),j=Number(word.value);
   if(!Number.isFinite(a)||a<0||a>5||counts.flat().some(n=>!Number.isInteger(n)||n<0||n>1000)){output(result,['Use integer token counts in [0,1000] and a finite pseudocount α in [0,5].']);[0,1].forEach(c=>document.getElementById('nb-total-'+c).textContent='—');return;}
   const parameters=counts.map(row=>estimate(row,a)),messages=[];
   [1,0].forEach(c=>{const total=sum(counts[c]);document.getElementById('nb-total-'+c).textContent=String(total);messages.push((c?'Spam':'Ham')+' token total = '+total+'; denominator T + 4α = '+fmt(total+4*a)+'.');messages.push(parameters[c]?'Word probabilities ['+parameters[c].map(fmt).join(', ')+']; row sum = '+fmt(sum(parameters[c]))+'.':'No token observations and α=0: this class’s token distribution is not identified by the data.');});
   if(parameters.every(Boolean))messages.push('For '+words[j]+': P(word | spam) = '+fmt(parameters[1][j])+', P(word | ham) = '+fmt(parameters[0][j])+'. Their cross-class sum is '+fmt(parameters[1][j]+parameters[0][j])+'; this sum is not a normalization constraint.');
   output(result,messages);
  }
  function reset(){[[0,1,3,3],[4,4,0,0]].forEach((row,c)=>row.forEach((v,j)=>fields[c][j].value=String(v)));alpha.value='1';word.value='0';draw();}
  fields.flat().forEach(e=>e.addEventListener('input',draw));alpha.addEventListener('input',draw);word.addEventListener('change',draw);document.getElementById('nb-count-reset').addEventListener('click',reset);document.getElementById('nb-count-empty').addEventListener('click',()=>{reset();fields[1].forEach(e=>e.value='0');alpha.value='0';draw();});draw();
 }
 const lab=document.getElementById('nb-classifier-lab');
 if(lab){
  const model=document.getElementById('nb-model'),alpha=document.getElementById('nb-alpha'),prior=document.getElementById('nb-prior'),query=document.getElementById('nb-query'),result=document.getElementById('nb-classifier-result'),body=document.getElementById('nb-evidence-body'),plot=document.getElementById('nb-evidence-plot'),desc=document.getElementById('nb-plot-desc'),ns='http://www.w3.org/2000/svg';
  const tokenize=text=>text.toLowerCase().match(/[a-z]+/g)||[];
  const corpus=[{c:1,text:'free offer free'},{c:1,text:'offer free'},{c:1,text:'free offer offer'},{c:0,text:'meeting project'},{c:0,text:'project meeting meeting'},{c:0,text:'project offer'}];
  const tokenCounts=[words.map(()=>0),words.map(()=>0)],documentPresence=[words.map(()=>0),words.map(()=>0)],documents=[0,0];
  corpus.forEach(({c,text})=>{documents[c]++;const row=words.map(()=>0);tokenize(text).forEach(w=>{const j=words.indexOf(w);if(j>=0)row[j]++;});row.forEach((n,j)=>{tokenCounts[c][j]+=n;if(n>0)documentPresence[c][j]++;});});
  function element(tag,attrs={},text){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text!==undefined)e.textContent=String(text);return e;}
  function clear(){body.replaceChildren();plot.querySelector('[data-drawing]')?.remove();}
  function chart(contributions,logPrior,logOdds){
   const g=element('g',{'data-drawing':'true','font-family':'Arial, Helvetica, sans-serif',fill:'#24344b'});plot.append(g);
   const text=(x,y,t,attrs={})=>g.append(element('text',{x,y,'font-size':13,...attrs},t));
   if(!contributions.every(Number.isFinite)||!Number.isFinite(logOdds)){text(25,80,'A finite evidence chart needs finite log-probability ratios.');text(25,112,'With α>0, all factors in this corpus are strictly positive.');return;}
   const maximum=Math.max(1,...contributions.map(Math.abs)),baseline=360,span=250;
   text(18,25,'Word evidence for spam log-odds',{'font-size':17,'font-weight':600});text(135,47,'Toward ham',{'font-size':12,fill:'#a75b2b'});text(452,47,'Toward spam',{'font-size':12,fill:'#315f91'});
   g.append(element('rect',{x:110,y:58,width:500,height:220,fill:'#fafbfc',stroke:'#dbe2ea'}));g.append(element('line',{x1:baseline,y1:58,x2:baseline,y2:278,stroke:'#9aabbc'}));
   contributions.forEach((value,j)=>{const y=85+j*55,width=Math.abs(value)/maximum*span,x=baseline+Math.min(value,0)/maximum*span;g.append(element('rect',{x,y:y-15,width,height:30,fill:value<0?'#a75b2b':'#315f91','data-word':words[j],'data-contribution':value}));text(18,y+5,words[j]);text(782,y+5,fmt(value),{'text-anchor':'end'});});
   [[110,-maximum],[360,0],[610,maximum]].forEach(([x,v])=>text(x,297,fmt(v),{'font-size':12,'text-anchor':'middle'}));text(18,329,'Prior log-odds: '+fmt(logPrior)+' · word total: '+fmt(sum(contributions))+' · total log-odds: '+fmt(logOdds),{'font-size':12});
  }
  function draw(){
   clear();const a=read(alpha),p=read(prior),binary=model.value==='bernoulli';
   if(!Number.isFinite(a)||a<0||a>5||!Number.isFinite(p)||p<.05||p>.95||query.value.length>2000){const warning='Use α in [0,5], prior in [0.05,0.95], and at most 2,000 text characters.';output(result,[warning]);desc.textContent=warning;return;}
   const tokens=tokenize(query.value),counts=words.map(()=>0),unknown=[];
   tokens.forEach(w=>{const j=words.indexOf(w);if(j>=0)counts[j]++;else unknown.push(w);});
   const parameters=[0,1].map(c=>binary?documentPresence[c].map(d=>(d+a)/(documents[c]+2*a)):estimate(tokenCounts[c],a));
   const terms=[0,1].map(c=>words.map((_,j)=>{if(binary)return Math.log(counts[j]>0?parameters[c][j]:1-parameters[c][j]);return counts[j]>0?counts[j]*Math.log(parameters[c][j]):0;}));
   const logLikelihoods=terms.map(sum),scores=[Math.log(1-p)+logLikelihoods[0],Math.log(p)+logLikelihoods[1]],contributions=words.map((_,j)=>terms[1][j]===-Infinity&&terms[0][j]===-Infinity?NaN:terms[1][j]-terms[0][j]);
   words.forEach((w,j)=>{const tr=document.createElement('tr');[w,String(counts[j]),counts[j]>0?'1':'0',fmt(parameters[1][j]),fmt(parameters[0][j]),fmt(contributions[j])].forEach((t,i)=>{const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.textContent=t;tr.append(cell);});body.append(tr);});
   const messages=[binary?'Bernoulli model: parameters are document-presence probabilities ρ; all absent features are included.':'Multinomial model: parameters are token probabilities θ; scores use ordered-token likelihoods. The count-vector coefficient cancels from class posteriors.','Retained counts [free, offer, meeting, project] = ['+counts.join(', ')+']; retained token length = '+sum(counts)+'.','Ignored tokens: '+(unknown.length?[...new Set(unknown)].join(', ')+' ('+unknown.length+' occurrences).':'none.'),'Log likelihoods [ham, spam] = ['+logLikelihoods.map(fmt).join(', ')+'].','Log prior + likelihood scores [ham, spam] = ['+scores.map(fmt).join(', ')+'].'];
   if(scores.every(v=>v===-Infinity)){messages.push('Posterior undefined: both class likelihoods are zero under this unsmoothed model. Positive smoothing on the fixed vocabulary restores support.');desc.textContent='No normalized posterior because both likelihoods are zero.';chart(contributions,Math.log(p/(1-p)),NaN);output(result,messages);return;}
   const maximum=Math.max(...scores),weights=scores.map(s=>Math.exp(s-maximum)),posterior=weights[1]/sum(weights);
   const predicted=scores[1]===-Infinity?0:scores[0]===-Infinity?1:scores[1]-scores[0]>=-1e-12*Math.max(1,...scores.map(Math.abs))?1:0;
   messages.push('Posterior P(spam | representation) = '+fmt(posterior)+'; P(ham | representation) = '+fmt(1-posterior)+'. Prediction: '+(predicted?'spam':'ham')+' (numerical ties go to spam).');
   desc.textContent=(binary?'Presence':'Count')+' model. Spam posterior '+fmt(posterior)+'. Retained counts '+counts.join(', ')+'.';chart(contributions,Math.log(p/(1-p)),scores[1]-scores[0]);output(result,messages);
  }
  [alpha,prior,query].forEach(e=>e.addEventListener('input',draw));model.addEventListener('change',draw);
  document.getElementById('nb-reset').addEventListener('click',()=>{model.value='multinomial';alpha.value='1';prior.value='0.5';query.value='free offer';draw();});document.getElementById('nb-repeat').addEventListener('click',()=>{query.value='free free offer';draw();});document.getElementById('nb-zero').addEventListener('click',()=>{alpha.value='0';query.value='meeting free';draw();});document.getElementById('nb-unknown').addEventListener('click',()=>{query.value='curious galaxies';draw();});draw();
 }
})();
