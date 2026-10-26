/* Small tools for inspecting fixed dropout masks and BN's forward computation. */
(function(){
 'use strict';
 const fmt=x=>Number(x.toFixed(5)).toString();
 function lines(target,items){target.replaceChildren(...items.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));}
 function number(input){return input.value.trim()===''?NaN:Number(input.value);}
 const drop=document.getElementById('dropout-lab-tool');
 if(drop){
  const qControl=document.getElementById('drop-q'),convention=document.getElementById('drop-convention'),rows=document.getElementById('drop-rows');
  const fields=[],masks=[],cells=[];
  [2,-1,3,4].forEach((a,i)=>{
   const row=document.createElement('tr'),inputCell=document.createElement('td'),maskCell=document.createElement('td');
   const input=document.createElement('input');input.type='number';input.step='any';input.value=String(a);input.setAttribute('aria-label','Dropout activation '+(i+1));inputCell.append(input);fields.push(input);
   const mask=document.createElement('input');mask.type='checkbox';mask.checked=i%2===0;mask.setAttribute('aria-label','Keep activation '+(i+1));maskCell.append(mask);masks.push(mask);
   const outputs=Array.from({length:4},()=>document.createElement('td'));row.append(inputCell,maskCell,...outputs);rows.append(row);cells.push(outputs);
   input.addEventListener('input',draw);mask.addEventListener('change',draw);
  });
  function draw(){
   const q=Number(qControl.value),inverted=convention.value==='inverted',values=fields.map(number),result=document.getElementById('drop-result');
   if(!values.every(Number.isFinite)){lines(result,['Enter a finite number for every activation.']);cells.flat().forEach(cell=>cell.textContent='—');return;}
   let sampled=0,expected=0,inference=0;
   values.forEach((a,i)=>{const m=masks[i].checked?1:0,factor=inverted?m/q:m,train=a*factor,mean=inverted?a:q*a,test=inverted?a:q*a;sampled+=train;expected+=mean;inference+=test;[train,mean,test,factor].forEach((v,j)=>cells[i][j].textContent=fmt(v));masks[i].disabled=q===1;});
   lines(result,['Keep q = '+q+'; drop probability = '+fmt(1-q)+'. '+(inverted?'Inverted: retain and divide by q during training.':'Ordinary: compensate by q at inference.'),'Sum of sampled activations: '+fmt(sampled)+'. Exact expected sum: '+fmt(expected)+'. Inference sum: '+fmt(inference)+'.']);
  }
  function sample(){const q=Number(qControl.value);masks.forEach(mask=>mask.checked=Math.random()<q);draw();}
  qControl.addEventListener('change',sample);convention.addEventListener('change',draw);document.getElementById('drop-sample').addEventListener('click',sample);
  document.getElementById('drop-reset').addEventListener('click',()=>{qControl.value='0.5';convention.value='inverted';fields.forEach((field,i)=>field.value=String([2,-1,3,4][i]));masks.forEach((mask,i)=>{mask.checked=i%2===0;mask.disabled=false;});draw();});draw();
 }
 const bn=document.getElementById('batchnorm-lab');
 if(bn){
  const mode=document.getElementById('bn-mode'),gamma=document.getElementById('bn-gamma'),beta=document.getElementById('bn-beta'),eps=document.getElementById('bn-eps'),runningMean=document.getElementById('bn-mean'),runningVar=document.getElementById('bn-var');
  const fields=[],cells=[],rows=document.getElementById('bn-rows'),result=document.getElementById('bn-result');
  [1,3,5,7].forEach((x,i)=>{const row=document.createElement('tr'),cell=document.createElement('td'),input=document.createElement('input');input.type='number';input.step='any';input.value=String(x);input.setAttribute('aria-label','BN input '+(i+1));cell.append(input);const normalized=document.createElement('td'),output=document.createElement('td');row.append(cell,normalized,output);rows.append(row);fields.push(input);cells.push([normalized,output]);input.addEventListener('input',draw);});
  function draw(){
   const train=mode.value==='train';runningMean.disabled=train;runningVar.disabled=train;
   const values=fields.map(number),g=number(gamma),b=number(beta),e=number(eps),rm=number(runningMean),rv=number(runningVar);
   if(![...values,g,b,e,...(train?[]:[rm,rv])].every(Number.isFinite)||e<=0||(!train&&rv<0)){lines(result,['Use finite values, a positive epsilon, and a nonnegative running variance.']);cells.flat().forEach(cell=>cell.textContent='—');return;}
   const batchMean=values.reduce((a,b)=>a+b,0)/values.length,batchVar=values.reduce((a,x)=>a+(x-batchMean)**2,0)/values.length;
   const mean=train?batchMean:rm,variance=train?batchVar:rv,denominator=Math.sqrt(variance+e),out=values.map((x,i)=>{const normalized=(x-mean)/denominator,y=g*normalized+b;cells[i][0].textContent=fmt(normalized);cells[i][1].textContent=fmt(y);return y;});
   const outputMean=out.reduce((a,b)=>a+b,0)/out.length,outputVar=out.reduce((a,y)=>a+(y-outputMean)**2,0)/out.length;
   lines(result,[(train?'Training uses this batch: ':'Inference uses stored values: ')+'mean = '+fmt(mean)+', variance = '+fmt(variance)+', denominator = '+fmt(denominator)+'.','Current outputs: mean = '+fmt(outputMean)+', variance = '+fmt(outputVar)+'.',train?'Change a companion value to see the first output change; statistics are shared within the group.':'Changing a companion value leaves the first output unchanged when its own input and the stored statistics stay fixed.']);
  }
  [gamma,beta,eps,runningMean,runningVar].forEach(input=>input.addEventListener('input',draw));mode.addEventListener('change',draw);
  document.getElementById('bn-reset').addEventListener('click',()=>{mode.value='train';gamma.value='2';beta.value='1';eps.value='0.00001';runningMean.value='3';runningVar.value='4';fields.forEach((field,i)=>field.value=String([1,3,5,7][i]));draw();});draw();
 }
})();
