#!/usr/bin/env python3
"""Preserve lecture content and check the guided regression foundations (sections 1–4).

Run from any directory. Uses only Python's standard library and Git.
Browser layout and native keyboard checks remain separate from this audit.
"""
from collections import Counter
from fractions import Fraction as F
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote,urlsplit
from math import exp,log,pi,sqrt,isclose
import re,subprocess,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
PAGE=ROOT/'writing/statistical-regression-gda.html'
BASELINE='57e31ce'
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class Page(HTMLParser):
 def __init__(self,s):
  super().__init__();self.ids=[];self.links=[];self.stack=[];self.paragraphs=[];self.current=None;self.feed(s);assert not self.stack,self.stack
 def handle_starttag(self,t,a):
  a=dict(a)
  if t not in VOID:self.stack.append(t)
  if t=='p':assert self.current is None,'Nested paragraph';self.current=[]
  if 'id'in a:self.ids.append(a['id'])
  for k in ['src','href']:
   if a.get(k):self.links.append(a[k])
 def handle_data(self,s):
  if self.current is not None:self.current.append(s)
 def handle_endtag(self,t):
  assert self.stack and self.stack.pop()==t,(t,self.stack[-5:])
  if t=='p':self.paragraphs.append(' '.join(''.join(self.current).split()));self.current=None
 def handle_startendtag(self,t,a):
  self.handle_starttag(t,a)
  if t not in VOID:self.handle_endtag(t)
def equations(s):return [unescape(a or b)for a,b in re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)',s,re.S)]
def normalize(s):return re.sub(r'>\s+<','><',s).strip()
def git(path):return subprocess.check_output(['git','show',BASELINE+':'+path],cwd=ROOT)
s=PAGE.read_text();old=git('writing/statistical-regression-gda.html').decode();current,previous=Page(s),Page(old)
assert len(current.ids)==len(set(current.ids)),'Duplicate ID'
assert not(Counter(previous.paragraphs)-Counter(current.paragraphs)),'Original paragraph lost'
assert not(Counter(equations(old))-Counter(equations(s))),'Original math expression lost'
assert set(previous.ids)<=set(current.ids),'Original anchor lost'
marker='<h2 id="gaussian-mean-mle">'
assert s[s.index(marker):]==old[old.index(marker):],'Section 5 onward changed'
for pattern,label in [(r'<img[^>]+src="([^"]+)"','image asset'),(r'<figcaption[^>]*>(.*?)</figcaption>','caption'),(r'<table[^>]*>.*?</table>','table'),(r'<pre[^>]*>.*?</pre>','pseudocode')]:
 assert not(Counter(normalize(x)for x in re.findall(pattern,old,re.S))-Counter(normalize(x)for x in re.findall(pattern,s,re.S))),'Original '+label+' changed'
pages={PAGE:current}
for link in current.links:
 u=urlsplit(link)
 if u.scheme or u.netloc:continue
 target=(PAGE.parent/unquote(u.path)).resolve()if u.path else PAGE
 assert target.exists(),link
 if u.fragment and target.suffix=='.html':
  if target not in pages:pages[target]=Page(target.read_text())
  assert unquote(u.fragment)in pages[target].ids,link
assert s.count('data-learning-pilot')==1
assert s.count('data-learning-key="regression-models"')==1
assert s.count('data-learning-scope="sections 1–4"')==1
assert s.count('class="ld-unit"')==4
assert s.count('data-learning-depth')==11
assert s.count('data-solution')==36
assert s.count('data-hint')==2
assert s.count('class="exercise"')==old.count('class="exercise"')==20
assert 'assets/ml-learning.js'in s and 'assets/ml-regression-learning.css'in s
# Shared behavior and original chapter styles are unchanged.
for name in ['ml-learning.js','ml-learning.css','ml-notes.js','ml-notes.css','ml-regression.js','ml-regression.css','article-guide.js','article-notes.css']:
 assert git('writing/assets/'+name)==(ROOT/'writing/assets'/name).read_bytes(),'Shared asset changed: '+name
for name in ['cnn-foundations','cnn-training','probability-gaussians','naive-bayes','factor-models-pca','decision-trees-pruning','machine-learning']:
 assert git('writing/'+name+'.html')==(ROOT/'writing'/(name+'.html')).read_bytes(),'Unrelated chapter changed: '+name
# Independently recompute the new finite examples.
normal=lambda z,m,v:exp(-(z-m)**2/(2*v))/sqrt(2*pi*v)
likelihood=lambda m:normal(0,m,1)*normal(2,m,1)
assert isclose(likelihood(0),0.021539279301848634,abs_tol=1e-12)
assert isclose(likelihood(1),0.05854983152431917,abs_tol=1e-12)
assert isclose(likelihood(2),likelihood(0),abs_tol=1e-12)
for m in [-1,0,.5,1,2,3]:assert isclose(log(likelihood(m)),-log(2*pi)-1-(m-1)**2,abs_tol=1e-12)
assert likelihood(1)>likelihood(0)
assert isclose(log(likelihood(0)),-3.8378770664093453,abs_tol=1e-12)
assert isclose(log(likelihood(1)),-2.8378770664093453,abs_tol=1e-12)
# The likelihood curve integrates over candidate means to a value other than 1.
assert isclose(exp(-1)/(2*sqrt(pi)),0.10377687435514868,abs_tol=1e-12)
# Dropping a variance-dependent normalizer can change a comparison.
assert normal(1,0,1)>normal(1,0,4)
assert exp(-F(1,2))<exp(-F(1,8))
my,mx,vary,varx,cov=F(5,2),F(3,2),F(9,4),F(5,4),F(3,2)
beta=cov/varx;a=my-beta*mx;tau2=vary-cov*cov/varx
assert vary*varx-cov*cov==F(9,16)>0
assert(beta,a,tau2)==(F(6,5),F(7,10),F(9,20))
assert a+beta*F(5,2)==F(37,10)
assert a+beta*0==F(7,10)
assert F(3,4)==F(3)/4 and 2-F(3,4)==F(5,4)
assert 9-F(3)**2/4==F(27,4) and F(5,4)+F(3,4)*3==F(7,2)
for d,means,covs,total in [(1,2,3,5),(2,3,6,9),(3,4,10,14)]:
 assert d+1==means and(d+1)*(d+2)//2==covs and means+covs==total
halfwidth=1.96*sqrt(.45)
assert isclose(3.7-halfwidth,2.385192029230124,abs_tol=2e-8)
assert isclose(3.7+halfwidth,5.014807970769876,abs_tol=2e-8)
mixture=lambda y:(normal(y,-2,.25)+normal(y,2,.25))/2
assert mixture(0)<mixture(2) and isclose(mixture(2),mixture(-2),abs_tol=1e-12)
def integrate(f,lo=-6,hi=6,n=6000):
 h=(hi-lo)/n
 return h/3*(f(lo)+f(hi)+sum((4 if i%2 else 2)*f(lo+i*h)for i in range(1,n)))
assert isclose(integrate(mixture),1,abs_tol=1e-10)
assert isclose(integrate(lambda y:y*mixture(y)),0,abs_tol=1e-10)
assert isclose(integrate(lambda y:y*y*mixture(y)),4.25,abs_tol=1e-10)
for c in [0,1,2,-2]:assert isclose(integrate(lambda y:(y-c)**2*mixture(y)),4.25+c*c,abs_tol=1e-9)
for name in ['regression-density-view','regression-likelihood-view','regression-bimodal-conditional','regression-squared-risk']:
 ET.parse(ROOT/('writing/assets/ml-notes/'+name+'.svg'))
print('Source preserved:',len(previous.paragraphs),'paragraphs,',len(equations(old)),'math expressions,',len(previous.ids),'anchors; section 5 onward byte-identical.')
print('HTML and references pass:',len(current.ids),'unique IDs,',len(current.links),'references,',len(equations(s)),'math expressions.')
print('Numerical examples pass; one guided block, four teaching units, 11 explanations and all 20 original exercises retained.')
