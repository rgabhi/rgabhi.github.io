#!/usr/bin/env python3
"""Audit the complete decision-tree learning redesign against both source baselines.

Uses the standard library and Git. Retains all published paragraphs, equations
and anchors; the first pilot's temporary navigation paragraph is replaced by the
chapter study route. Browser interactions and print rendering are checked apart.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
from collections import Counter
import re,json,html,subprocess
root=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self,s):
  super().__init__();self.ids=[];self.links=[];self.stack=[];self.paragraphs=[];self.current=None;self.feed(s);assert not self.stack,self.stack
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t not in ['meta','link','input','br','img','hr']:self.stack.append(t)
  if t=='p':assert self.current is None;self.current=[]
  if 'id'in a:self.ids.append(a['id'])
  for name in ['href','src']:
   if a.get(name):self.links.append(a[name])
 def handle_data(self,data):
  if self.current is not None:self.current.append(data)
 def handle_endtag(self,t):
  assert self.stack and self.stack.pop()==t,(t,self.stack[-4:])
  if t=='p':self.paragraphs.append(' '.join(''.join(self.current).split()));self.current=None
 def handle_startendtag(self,t,a):
  self.handle_starttag(t,a)
  if t not in ['meta','link','input','br','img','hr']:self.handle_endtag(t)
s=(root/'writing/decision-trees-pruning.html').read_text();page=Page(s);assert max(Counter(page.ids).values())==1
pages={root/'writing/decision-trees-pruning.html':page}
for link in page.links:
 u=urlsplit(link)
 if u.scheme or u.netloc:continue
 target=(root/'writing'/unquote(u.path)).resolve()if u.path else root/'writing/decision-trees-pruning.html'
 assert target.exists(),link
 if u.fragment and target.suffix=='.html':
  if target not in pages:pages[target]=Page(target.read_text())
  assert unquote(u.fragment)in pages[target].ids,link
for revision in ['0963f5e','d63c928']:
 base=subprocess.check_output(['git','show',revision+':writing/decision-trees-pruning.html'],cwd=root,text=True)
 old=Page(base);required=Counter(old.paragraphs)
 if revision=='d63c928':required.pop('New guided learning: counts → impurity → split gainSections 4–8 · learn, revise, or go deeper.',None)
 missing=required-Counter(page.paragraphs)
 assert not missing,[(x[:150],n)for x,n in missing.items()]
 def math(text):return [html.unescape(a or b)for a,b in re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)',text,re.S)]
 assert not(Counter(math(base))-Counter(math(s))),('Lost equation',revision)
 assert set(old.ids)<=set(page.ids),('Lost anchor',revision)
 for pattern,label in [(r'<img[^>]+src="([^"]+)"','figure asset'),(r'<figcaption[^>]*>(.*?)</figcaption>','figure caption'),(r'<table[^>]*>.*?</table>','table'),(r'<pre[^>]*>.*?</pre>','pseudocode')]:
  def normalize(x):return re.sub(r'>\s+<','><',x).strip()
  required_items=Counter(normalize(x)for x in re.findall(pattern,base,re.S))
  current_items=Counter(normalize(x)for x in re.findall(pattern,s,re.S))
  assert not(required_items-current_items),('Lost or changed '+label,revision)

 print('Source preservation:',revision,len(old.paragraphs),'paragraphs;',len(math(base)),'math expressions;',len(old.ids),'anchors.')
assert len(math(s))==101, 'Recheck the equation inventory after a content change.'
print('HTML, IDs and links pass:',len(page.ids),'IDs,',len(page.links),'references,',len(math(s)),'math expressions.')

from fractions import Fraction as F

def mean(v):return sum(v,F(0))/len(v)
def sse(v):return sum((x-mean(v))**2 for x in v)
y=list(map(F,[0,2,8,10]))
assert mean(y)==5 and sse(y)==68
assert mean(y[:2])==1 and mean(y[2:])==9
assert sse(y[:2])+sse(y[2:])==4
assert sse(y)-4==64 and F(4,len(y))==1
for alpha,expected in [(F(2,25),(F(47,100),F(53,100))),(F(3,25),(F(63,100),F(57,100)))]:
 assert (F(6,40)+4*alpha,F(18,40)+alpha)==expected
assert F(40)*F(1,10)==4
assert F(1,5)+F(4,5)/10==F(7,25)
nominal={min(m,31^m)for m in range(1,31)}
assert len(nominal)==15
predict=lambda x,y:(0 if y<=3.5 else 1)if x<=2.5 else(1 if y<=5 else 0)
assert predict(2.5,3.5)==0 and predict(2.6,3.5)==1
training=[2,6];validation=[3,1];replacement=int(training[0]>training[1])
assert replacement==0 and validation[0]==3
assert len(re.findall('class="ld-unit"',s))==22
assert len(re.findall('data-learning-pilot',s))==5
assert len(re.findall('class="exercise"',s))==26
assert len(set(re.findall('data-learning-key="([^"]+)"',s)))==5
for i in range(1,27):assert 'tree-practice-'+str(i).zfill(2) in page.ids
# Probability now has its own source-preservation audit in verify_ml_probability_learning.py.
for name in ['cnn-foundations','cnn-training','statistical-regression-gda','naive-bayes','factor-models-pca','machine-learning']:
 original=subprocess.check_output(['git','show','0963f5e:writing/'+name+'.html'],cwd=root)
 assert original==(root/'writing'/f'{name}.html').read_bytes(),('Unrelated learning page changed',name)
print('Exact new examples pass; five independent blocks, 22 teaching units and all 26 original exercises are present.')
