#!/usr/bin/env python3
"""Preservation and exact-example audit for the probability-language redesign.

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
assert source[source.index('<h2 id="moments">'):] == base[base.index('<h2 id="moments">'):], 'Content after section 5 changed'
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
assert source.count('data-learning-pilot') == 1
assert source.count('class="ld-unit"') == 5
assert source.count('class="exercise"') == base.count('class="exercise"') == 18
assert 'data-learning-key="probability-language"' in source
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

for name in ['cnn-foundations', 'cnn-training', 'statistical-regression-gda', 'naive-bayes', 'factor-models-pca', 'decision-trees-pruning', 'machine-learning']:
    original = subprocess.check_output(['git', 'show', BASELINE + ':writing/' + name + '.html'], cwd=ROOT)
    assert original == (ROOT / 'writing' / (name + '.html')).read_bytes(), 'Unrelated chapter changed: ' + name
print('Source preserved:', len(old.paragraphs), 'paragraphs,', len(math(base)), 'math expressions,', len(old.ids), 'anchors; section 6 onward byte-identical.')
print('HTML and local references pass:', len(page.ids), 'unique IDs,', len(page.links), 'references,', len(math(source)), 'math expressions.')
print('Exact examples pass; five teaching units, 100 correctly grouped cases, and all 18 original exercises retained.')
