#!/usr/bin/env python3
"""Preservation and exact-example audit for the probability-language, moments and Gaussian redesign.

Run from any directory. Requires only Python's standard library and Git.
Browser checks cover interaction, responsive layout and printing separately.
"""
from collections import Counter
from fractions import Fraction as F
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'writing/probability-gaussians.html'
BASELINE = '8d75b2b'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids, self.links, self.stack, self.paragraphs = [], [], [], []
        self.current = None
        self.cases = Counter()
        self.counts = {}
        self.cell = None
        self.feed(text)
        assert not self.stack, self.stack

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag not in VOID:
            self.stack.append(tag)
        if tag == 'p':
            assert self.current is None, 'Nested paragraph'
            self.current = []
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for attr in ['href', 'src']:
            if attrs.get(attr):
                self.links.append(attrs[attr])
        classes = attrs.get('class', '').split()
        if 'prob-case' in classes:
            assert len(classes) == 2
            self.cases[classes[1]] += 1
        if 'data-prob-count' in attrs:
            self.cell = attrs['data-prob-count']

    def handle_data(self, data):
        if self.current is not None:
            self.current.append(data)
        if self.cell is not None and data.strip():
            self.counts[self.cell] = F(data.strip())

    def handle_endtag(self, tag):
        assert self.stack and self.stack.pop() == tag, (tag, self.stack[-5:])
        if tag == 'p':
            self.paragraphs.append(' '.join(''.join(self.current).split()))
            self.current = None
        if tag == 'td':
            self.cell = None

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)


def math(text):
    return [unescape(a or b) for a, b in re.findall(r'\\\[(.*?)\\\]|\\\((.*?)\\\)', text, re.S)]


def normalize(markup):
    return re.sub(r'>\s+<', '><', markup).strip()


source = PAGE.read_text()
base = subprocess.check_output(['git', 'show', BASELINE + ':writing/probability-gaussians.html'], cwd=ROOT, text=True)
page, old = Page(source), Page(base)
assert len(page.ids) == len(set(page.ids)), 'Duplicate ID'
assert not (Counter(old.paragraphs) - Counter(page.paragraphs)), 'An original paragraph was lost'
assert not (Counter(math(base)) - Counter(math(source))), 'An original equation was lost'
assert set(old.ids) <= set(page.ids), 'An original anchor was lost'
assert source[source.index('<h2 id="gaussian-conditioning">'):] == base[base.index('<h2 id="gaussian-conditioning">'):], 'Content after section 12 changed'
prior = subprocess.check_output(['git', 'show', '493a0eb:writing/probability-gaussians.html'], cwd=ROOT, text=True)
prior_page = Page(prior)
assert set(prior_page.ids) <= set(page.ids), 'A first-block anchor was lost'
assert not (Counter(prior_page.paragraphs) - Counter(page.paragraphs)), 'A first-block paragraph was lost'
assert not (Counter(math(prior)) - Counter(math(source))), 'A first-block equation was lost'
first_marker = '<section class="ld-pilot prob-language" id="probability-language-path"'
old_first = prior[prior.index(first_marker):prior.index('<h2 id="moments">')].strip()
new_first = source[source.index(first_marker):source.index('<section class="ld-pilot prob-language prob-moments"')].strip()
assert new_first == old_first.replace('href="#moments"', 'href="#probability-moments-path"'), 'First block changed beyond its two forward links'
moments_prior = subprocess.check_output(['git', 'show', '72a74af:writing/probability-gaussians.html'], cwd=ROOT, text=True)
moments_prior_page = Page(moments_prior)
assert set(moments_prior_page.ids) <= set(page.ids), 'An earlier guided anchor was lost'
assert not (Counter(moments_prior_page.paragraphs) - Counter(page.paragraphs)), 'An earlier paragraph was lost'
assert not (Counter(math(moments_prior)) - Counter(math(source))), 'An earlier equation was lost'
moment_marker = '<section class="ld-pilot prob-language prob-moments"'
previous_moments = moments_prior[moments_prior.index(moment_marker):moments_prior.index('<h2 id="normal">')].strip()
current_moments = source[source.index(moment_marker):source.index('<section class="ld-pilot prob-language prob-gaussian"')].strip()
expected_moments = previous_moments.replace('<a href="#normal">Continue to Gaussians</a>', '<a href="#probability-gaussian-path">Continue to Gaussians</a>').replace('<a href="#normal">derive the normal distribution and build Gaussian geometry</a>', '<a href="#probability-gaussian-path">derive the normal distribution and build Gaussian geometry</a>')
assert current_moments == expected_moments, 'Moments block changed beyond its two forward links'
for pattern, label in [
    (r'<img[^>]+src="([^"]+)"', 'figure asset'),
    (r'<figcaption[^>]*>(.*?)</figcaption>', 'figure caption'),
    (r'<table[^>]*>.*?</table>', 'table'),
    (r'<pre[^>]*>.*?</pre>', 'pseudocode'),
]:
    required = Counter(normalize(x) for x in re.findall(pattern, base, re.S))
    current = Counter(normalize(x) for x in re.findall(pattern, source, re.S))
    assert not (required - current), 'Lost or changed ' + label
pages = {PAGE: page}
for link in page.links:
    url = urlsplit(link)
    if url.scheme or url.netloc:
        continue
    target = (PAGE.parent / unquote(url.path)).resolve() if url.path else PAGE
    assert target.exists(), link
    if url.fragment and target.suffix == '.html':
        if target not in pages:
            pages[target] = Page(target.read_text())
        assert unquote(url.fragment) in pages[target].ids, link
assert source.count('data-learning-pilot') == 3
assert source.count('class="ld-unit"') == 12
assert source.count('class="exercise"') == base.count('class="exercise"') == 18
assert 'data-learning-key="probability-language"' in source
assert 'data-learning-key="probability-moments"' in source
assert 'data-learning-key="probability-gaussian"' in source
assert 'assets/ml-learning.js' in source
expected_counts = {'rain-late': 18, 'rain-on-time': 12, 'dry-late': 7, 'dry-on-time': 63}
assert page.cases == Counter(expected_counts), '100-case visual differs from the stated model'
assert page.counts == {key: F(value) for key, value in expected_counts.items()}, 'Static count table mismatch'

# Independent computations of the authored examples, not calls to the teaching JS.
p = F(3, 4)
weights = [p*p, p*(1-p), (1-p)*p, (1-p)*(1-p)]
assert sum(weights) == 1 and weights[1] + weights[2] == F(3, 8)
assert F(5) * (F(10, 100) - F(4, 100)) == F(3, 10)
assert F(3, 4) - F(1, 4) == F(1, 2)  # Fair head-count CDF, zero excluded.
assert F(3, 10) + F(7, 10) * F(1, 2) == F(65, 100)
assert F(65, 100) - F(3, 10) == F(35, 100)
a, b, c, d = map(F, [18, 12, 7, 63])
n = a + b + c + d
rain, late, joint = (a+b)/n, (a+c)/n, a/n
assert (rain, late, joint) == (F(3, 10), F(1, 4), F(9, 50))
assert a/(a+b) == F(3, 5) and a/(a+c) == F(18, 25)
assert rain * a/(a+b) + (1-rain) * c/(c+d) == late
assert rain * a/(a+b)/late == F(18, 25)
assert rain * late == F(3, 40) != joint
assert F(0)/(c+0) == 0  # Reverse conditional after deleting the rainy cases.
# Independent preset in the existing workbench has its own marginals.
a, b, c, d = map(F, [15, 15, 35, 35])
assert a/(a+b+c+d) == (a+b)*(a+c)/(a+b+c+d)**2

# Exact new moment examples and matrix feasibility checks.
head_values = [F(0), F(1), F(2)]
head_mass = [F(1,4), F(1,2), F(1,4)]
def moment(values, probabilities, power=1):
    return sum((x**power)*p for x,p in zip(values,probabilities))
assert moment(head_values, head_mass) == 1
assert moment(head_values, head_mass, 2) == F(3,2)
assert moment(head_values, head_mass, 2) - 1 == F(1,2)
values, probs = [F(-1),F(2)], [F(2,3),F(1,3)]
assert moment(values,probs) == 0 and moment(values,probs,2) == 2
transformed = [3-2*x for x in values]
assert moment(transformed,probs) == 3
assert moment(transformed,probs,2) - moment(transformed,probs)**2 == 8
assert 4*F(1,4)*F(3,4) == F(3,4)
assert 16*F(1,4)*F(3,4) == 3
assert F(2+8,2) == 5 and F((8-2)**2,12) == 3
assert F(1)/F(1,4) == 4 and F(3,4)/F(1,4)**2 == 12
assert F(1)/2 == F(1,2) and F(1)/4 == F(1,4)
assert F(3,5)*F(4,3) - F(3,5)**2 == F(11,25)
assert F(3)*2/(3-1) == 3 and F(3)*4/((3-1)**2*(3-2)) == 3
assert F(3,2)*2/(F(3,2)-1) == 6
vr, vl, cov = F(21,100),F(3,16),F(21,200)
assert vr+vl+2*cov == F(243,400)
assert vr+vl-2*cov == F(3,16)
assert vr*vl-cov**2 == F(567,20000)
assert cov**2/(vr*vl) == F(7,25)
def quadratic(matrix, vector):
    return sum(vector[i]*matrix[i][j]*vector[j] for i in range(2) for j in range(2))
assert quadratic([[1,F(3,2)],[F(3,2),1]],[1,-1]) == -1
assert quadratic([[1,2],[2,4]],[2,-1]) == 0
assert F(1,5)-F(1,3)**2 == F(4,45) > 0  # Var(X²), X uniform[-1,1].
for key,expected in [('variance-r',vr),('variance-l',vl),('covariance-rl',cov)]:
    cell = re.search(r'data-moment-value="'+key+r'">([^<]+)',source)
    assert cell and F(cell.group(1)) == expected, key
import xml.etree.ElementTree as ET
for name in ['linear','nonlinear']:
    ET.parse(ROOT / ('writing/assets/ml-notes/probability-covariance-'+name+'.svg'))

# New Gaussian examples: independent scalar integration, matrix and geometry checks.
from math import erf,exp,log,pi,sqrt,isclose
Phi = lambda x: (1+erf(x/sqrt(2)))/2
assert isclose(Phi(1)-Phi(-1),0.6826894921370859,abs_tol=1e-12)
assert isclose(Phi(2)-Phi(-1),0.8185946141203637,abs_tol=1e-12)
assert isclose(1/(0.1*sqrt(2*pi)),3.989422804014327,abs_tol=1e-12)
L = [[F(2),F(0)],[F(1),F(1)]]
Sigma = [[sum(L[i][k]*L[j][k] for k in range(2))for j in range(2)]for i in range(2)]
assert Sigma == [[4,2],[2,2]]
assert Sigma[0][0]*Sigma[1][1]-Sigma[0][1]**2 == 4
assert F(2)**2/4 == F(1)**2 == 1
assert F(3)**2/9 == 1 and F(2)**2 == 4
assert isclose(exp(-F(3,2)),0.22313016014842982,abs_tol=1e-12)
assert isclose(1-exp(-0.5),0.3934693402873666,abs_tol=1e-12)
radius95 = sqrt(-2*log(0.05))
assert isclose(radius95,2.4477468306808166,abs_tol=1e-12)
assert isclose(1-exp(-radius95**2/2),0.95,abs_tol=1e-12)
assert 1-F(99,100)**2 == F(199,10000)
assert 1-F(95,100)**2 == F(39,400)
# The sign-mixture standardized sum has variance one but retains a half-mass atom.
assert F(1,2)*0 + F(1,2)*2 == 1
assert quadratic([[F(1),F(-1,2)],[F(-1,2),F(1,4)]],[1,2]) == 0
for name in ['gaussian-standardization','gaussian-whitening-ellipse','gaussian-whitening-circle','gaussian-normal-marginals']:
    ET.parse(ROOT / ('writing/assets/ml-notes/'+name+'.svg'))

for name in ['cnn-foundations', 'cnn-training', 'statistical-regression-gda', 'naive-bayes', 'factor-models-pca', 'decision-trees-pruning', 'machine-learning']:
    original = subprocess.check_output(['git', 'show', BASELINE + ':writing/' + name + '.html'], cwd=ROOT)
    assert original == (ROOT / 'writing' / (name + '.html')).read_bytes(), 'Unrelated chapter changed: ' + name
print('Source preserved:', len(old.paragraphs), 'paragraphs,', len(math(base)), 'math expressions,', len(old.ids), 'anchors; section 13 onward byte-identical; earlier blocks preserved apart from forward links.')
print('HTML and local references pass:', len(page.ids), 'unique IDs,', len(page.links), 'references,', len(math(source)), 'math expressions.')
print('Exact examples pass; three blocks, twelve teaching units, 100 correctly grouped cases, and all 18 original exercises retained.')
