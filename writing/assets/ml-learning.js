/* Optional depth controls and explicitly self-reported local study records. */
(function(){
 'use strict';
 const pilot=document.querySelector('[data-learning-pilot]');if(!pilot)return;
 const controls=pilot.querySelector('[data-learning-controls]'),tracker=pilot.querySelector('[data-learning-tracker]'),depth=[...pilot.querySelectorAll('[data-learning-depth]')],modeButtons=[...pilot.querySelectorAll('[data-learning-mode]')],expand=pilot.querySelector('[data-learning-expand]'),help=pilot.querySelector('#ld-mode-help'),status=pilot.querySelector('#ld-review-status'),checks=[...pilot.querySelectorAll('[data-learning-progress]')];
 const key='ml-learning:v1:'+location.pathname+':tree-splits',modes=new Set(['learn','revise','deep']);let state={mode:'learn',progress:{},review:null},storage=true;
 try{const parsed=JSON.parse(localStorage.getItem(key)||'null');if(parsed&&typeof parsed==='object'){if(modes.has(parsed.mode))state.mode=parsed.mode;if(parsed.progress&&typeof parsed.progress==='object')state.progress=parsed.progress;if(parsed.review&&[1,3,7].includes(parsed.review.gap)&&Number.isFinite(Date.parse(parsed.review.at)))state.review=parsed.review;}}catch{storage=false;}
 function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{storage=false;}renderReview();}
 const format=d=>new Date(d).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
 function renderReview(){
  const suffix=storage?' Your record stays in this browser.':' Storage is unavailable; changes work for this visit only.';
  if(state.review){const due=new Date(state.review.at);due.setDate(due.getDate()+state.review.gap);status.textContent='Review recorded '+format(state.review.at)+'. Suggested return: '+format(due)+'. A self-chosen '+state.review.gap+'-day gap is a practical heuristic, not an optimal schedule or notification.'+suffix;}
  else status.textContent='After trying the questions, choose a suggested return gap. The intervals are practical heuristics, not an optimal schedule or reminder service.'+suffix;
 }
 function updateExpand(){expand.textContent=depth.every(d=>d.open)?'Close all derivations':'Open all derivations';}
 function applyMode(value,persist){const mode=modes.has(value)?value:'learn';pilot.dataset.ldMode=mode;state.mode=mode;modeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.learningMode===mode)));depth.forEach(d=>d.open=mode==='deep');help.textContent=({learn:'Learn: follow the examples; open each derivation when ready.',revise:'Revise: examples are folded away; definitions, assumptions, derivation links and recall questions remain. Open any derivation for the full steps.',deep:'Go deeper: all derivations and qualifications are expanded; examples remain visible.'})[mode]+' These controls affect sections 4–8 only.';updateExpand();if(persist)save();}
 controls.hidden=false;tracker.hidden=false;
 modeButtons.forEach(b=>b.addEventListener('click',()=>applyMode(b.dataset.learningMode,true)));
 expand.addEventListener('click',()=>{const open=depth.some(d=>!d.open);depth.forEach(d=>d.open=open);updateExpand();});depth.forEach(d=>d.addEventListener('toggle',updateExpand));
 checks.forEach(box=>{box.checked=state.progress[box.dataset.learningProgress]===true;box.addEventListener('change',()=>{state.progress[box.dataset.learningProgress]=box.checked;save();});});
 pilot.querySelectorAll('[data-learning-review]').forEach(button=>button.addEventListener('click',()=>{state.review={at:new Date().toISOString(),gap:Number(button.dataset.learningReview)};save();}));
 pilot.querySelector('[data-learning-reset]').addEventListener('click',()=>{state={mode:'learn',progress:{},review:null};checks.forEach(b=>b.checked=false);try{localStorage.removeItem(key);}catch{storage=false;}applyMode('learn',false);renderReview();});
 let printState=null;
 window.addEventListener('beforeprint',()=>{if(printState)return;printState={mode:pilot.dataset.ldMode,depth:depth.map(d=>d.open)};pilot.dataset.ldMode='deep';depth.forEach(d=>d.open=true);});
 window.addEventListener('afterprint',()=>{if(!printState)return;pilot.dataset.ldMode=printState.mode;depth.forEach((d,i)=>d.open=printState.depth[i]);printState=null;updateExpand();});
 applyMode(state.mode,false);renderReview();
})();
