#!/usr/bin/env python3
"""Audit the first guided-learning pilot against the published source baseline.

Checks content retention in sections 4–8, untouched following sections, exact
new examples and static local links. Browser mode/storage/print checks are
recorded separately. Update the scoped baseline checks when expanding the pilot.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
from collections import Counter
from fractions import Fraction as F
from math import log2
import re,json,html,subprocess
root=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self,p):super().__init__();self.ids=[];self.links=[];self.stack=[];self.feed(p.read_text());assert not self.stack,(p,self.stack)
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t not in ['meta','link','input','br','img','hr']:self.stack.append(t)
  if 'id'in a:self.ids.append(a['id'])
  for name in ['href','src']:
   if a.get(name):self.links.append(a[name])
 def handle_endtag(self,t):assert self.stack and self.stack.pop()==t,(t,self.stack[-4:])
 def handle_startendtag(self,t,a):
  self.handle_starttag(t,a)
  if t not in ['meta','link','input','br','img','hr']:self.handle_endtag(t)
p=root/'writing/decision-trees-pruning.html';s=p.read_text();page=Page(p);assert max(Counter(page.ids).values())==1
pages={p:page}
for link in page.links:
 u=urlsplit(link)
 if u.scheme or u.netloc:continue
 target=(p.parent/unquote(u.path)).resolve()if u.path else p
 assert target.exists(),link
 if u.fragment and target.suffix=='.html':
  if target not in pages:pages[target]=Page(target)
  assert unquote(u.fragment)in pages[target].ids,link
before=subprocess.check_output(['git','show','0963f5e:writing/decision-trees-pruning.html'],cwd=root,text=True);ids=['leaf-predictions','gini','entropy','weighted-gain','error-trap']
for i,key in enumerate(ids):
 a=before.index('<h2 id="'+key+'">');b=before.index('<h2 id="'+(ids[i+1]if i+1<len(ids)else'growing')+'">');chunk=before[a:b]
 for original in re.findall(r'<p[^>]*>.*?</p>|<div class="math-block">.*?</div>|<figure.*?</figure>',chunk,re.S):assert original in s,(key,original[:80])
assert s[s.index('<h2 id="growing">'):]==before[before.index('<h2 id="growing">'):],'Unrelated chapter content changed'
for name in ['cnn-foundations','cnn-training','probability-gaussians','statistical-regression-gda','naive-bayes','factor-models-pca','machine-learning']:
 data=subprocess.check_output(['git','show','HEAD:writing/'+name+'.html'],cwd=root)
 assert data==(root/'writing'/f'{name}.html').read_bytes(),name
# Independent exact arithmetic for the new worked, completion and review examples.
def g(c):return 1-sum(F(n,sum(c))**2 for n in c)
def h(c):return -sum(n/sum(c)*log2(n/sum(c))for n in c if n)
assert g([3,1])==F(3,8)
assert g([4,4])==F(1,2)and g([4,2])==F(4,9)
assert F(2,8)*g([0,2])+F(6,8)*g([4,2])==F(1,3)
assert g([4,4])-F(1,3)==F(1,6)
assert g([1,1])*F(2,8)+g([3,3])*F(6,8)==F(1,2)
assert g([3,3])-F(1,2)*g([3,0])-F(1,2)*g([0,3])==F(1,2)
assert h([3,3])==1 and h([3,0])==h([0,3])==0
assert abs(h([3,1])-.8112781244591328)<1e-12
assert abs(-log2(.75)-.4150374992788438)<1e-12
assert 'COL7341'not in s and '{{'not in s
math=[html.unescape(a or b)for a,b in re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)',s,re.S)]
assert len(math)==101, 'Recheck the math inventory after changing the pilot.'
print('PASS: original pilot paragraphs, equations, figures and anchors retained; remaining chapter/other pages unchanged.')
print('PASS: exact worked-example arithmetic, balanced HTML, unique IDs and',len(page.links),'links;',len(math),'math expressions.')
