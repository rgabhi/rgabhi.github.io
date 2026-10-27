#!/usr/bin/env python3
"""Independent numerical checks for the decision-tree notes; Python stdlib only.

Enumeration validates finite examples and recurrences, not population guarantees.
The HTML's numerical tables are checked against independently computed quantities.
"""
from fractions import Fraction as F
from itertools import product
from math import log2, log, sqrt, isclose
from pathlib import Path
import random

checks = 0
max_scaled_error = 0.0

def check(condition, label):
    global checks
    checks += 1
    assert condition, label

def close(actual, expected, label, tolerance=1e-10):
    global max_scaled_error
    error = abs(float(actual) - float(expected)) / max(1.0, abs(float(expected)))
    max_scaled_error = max(max_scaled_error, error)
    check(error <= tolerance, (label, actual, expected, error))

def entropy(counts):
    total = sum(counts)
    return -sum(n / total * log2(n / total) for n in counts if n)

def gini(counts):
    return 1 - sum(F(n, sum(counts)) ** 2 for n in counts)

def error(counts):
    return F(sum(counts) - max(counts), sum(counts))

def gain(children, criterion):
    parent = tuple(map(sum, zip(*children)))
    return criterion(parent) - sum(F(sum(c), sum(parent)) * criterion(c) for c in children)

def counts(rows):
    return [sum(y == 1 for x, y in rows), sum(y == 0 for x, y in rows)]

# Curvature calculations, endpoints, K-class maxima, and sample-distribution bounds.
for i in range(1, 100):
    p = i / 100
    eps = 1e-6
    derivative = (entropy([p + eps, 1 - p - eps]) - entropy([p - eps, 1 - p + eps])) / (2 * eps)
    close(derivative, log2((1-p)/p), 'entropy derivative', 3e-9)
    derivative_g = (gini([F(i, 100) + F(1, 1000000), 1-F(i, 100)-F(1, 1000000)]) - gini([F(i, 100)-F(1, 1000000), 1-F(i, 100)+F(1, 1000000)])) / F(2, 1000000)
    close(derivative_g, 2-4*p, 'Gini derivative')
close(entropy([0, 4]), 0, 'pure endpoint')
close(entropy([1, 1]), 1, 'binary entropy maximum')
for k in range(2, 8):
    close(entropy([1]*k), log2(k), 'uniform entropy maximum')
    check(gini([1]*k) == 1-F(1,k), 'uniform Gini maximum')
    for c in product(range(3), repeat=k):
        if not sum(c):
            continue
        check(entropy(c) <= log2(k)+1e-12, 'entropy upper bound')
        check(0 <= gini(c) <= 1-F(1,k), 'Gini upper bound')

# Exhaust every pair of nonempty binary child count tables with entries 0..7.
for values in product(range(8), repeat=4):
    left, right = values[:2], values[2:]
    if not sum(left) or not sum(right):
        continue
    parent = tuple(a+b for a,b in zip(left,right))
    n = sum(parent)
    p = F(parent[0], n)
    variance = sum(F(sum(c),n)*(F(c[0],sum(c))-p)**2 for c in (left,right))
    check(gain([left,right], gini) == 2*variance, 'Gini weighted variance identity')
    check(gain([left,right], error) >= 0, 'majority error nonincrease')
    check(gain([left,right], entropy) >= -1e-12, 'entropy concavity')
    check(sum(max(c) for c in (left,right)) >= max(parent), 'training correct-count monotonicity')

# Recompute source and printed worked examples from counts, not rounded entropies.
examples = [
    ([(21,5),(8,30)], .2658748685429416),
    ([(18,33),(11,2)], .12143188346323375),
    ([(2,3),(4,0),(3,2)], .24674981977443933),
    ([(3,4),(6,1)], .15183550136234159),
    ([(6,2),(3,3)], .04812703040826949),
    ([(2,2),(4,2),(3,1)], .02922256565895487),
    ([(28,42),(12,38)], .020641204212381914),
]
for children, expected in examples:
    close(gain(children, entropy), expected, 'source information gain')
close(entropy([29,35]), .9936507116910404, 'attribute example parent')
close(entropy([9,5]), .9402859586706311, 'weather parent')
close(gain([(0,3),(2,0)], entropy), .9709505944546686, 'sunny conditional gain')
check(gain([(28,42),(12,38)],error) == 0, 'zero majority-error gain')
check(gain([(28,42),(12,38)],gini) == F(14,1125), 'positive Gini source gain')
check(gini([3,5]) == F(15,32), 'practice Gini')

# Threshold candidates evaluated by full partitions, with duplicate-value constraints.
rows = list(zip(range(1,9), [0,0,1,1,1,0,0,1]))
def partitions(sample, minimum=1):
    values = sorted(set(x for x,y in sample))
    result = []
    for a,b in zip(values,values[1:]):
        t = F(a+b,2)
        children = [[r for r in sample if r[0]<=t], [r for r in sample if r[0]>t]]
        if min(map(len,children)) >= minimum:
            result.append((t,gain([counts(c) for c in children],entropy)))
    return result

def best_partition(sample, minimum=1):
    candidates = partitions(sample,minimum)
    top = max(v for t,v in candidates)
    return min(t for t,v in candidates if abs(v-top)<1e-12)

close(best_partition(rows), 2.5, 'best numeric threshold')
check([t for t,v in partitions(rows,3)] == [F(7,2),F(9,2),F(11,2)], 'minimum-size candidates')
close(best_partition(rows,3),3.5,'minimum-size tie')
close(partitions(rows)[1][1],.31127812445913283,'best entropy gain')
check(gain([[0,2],[4,2]],gini)==F(1,6),'Gini best split')
check(gain([[0,2],[4,2]],error)==F(1,4),'majority best split')
check(not partitions([(1,0),(1,1)],1),'identical contradictory values')
close(partitions([(1,0),(1,1),(3,1),(3,1)])[0][1], .31127812445913283,'mixed duplicates')
check(not partitions(rows,5),'child-size impossibility')
for x in range(1,9):
    check((x<=F(5,2)) == (x in [1,2]),'threshold routing')
check(F(5,2)<=F(5,2),'threshold equality left')
for labels in product([0,1],repeat=8):
    sample=list(zip([0,0,1,2,2,3,4,4],labels))
    for t,value in partitions(sample):
        check(all((x<=t)==(xx<=t) for x,y in sample for xx,yy in sample if x==xx), 'equal values travel together')

# Regression mean, strict minimum and between/within decomposition in exact arithmetic.
def mean(values): return sum(values,F(0))/len(values)
def sse(values, center=None):
    center=mean(values) if center is None else center
    return sum((v-center)**2 for v in values)
y = list(map(F,[1,2,2,8,9,8]))
check(mean(y)==5 and sse(y)==68,'regression parent')
check(mean(y[:3])==F(5,3) and mean(y[3:])==F(25,3),'regression means')
check(sse(y[:3])+sse(y[3:])==F(4,3),'regression child SSE')
check(sse(y)-sse(y[:3])-sse(y[3:])==F(200,3),'regression improvement')
rng=random.Random(734)
for trial in range(500):
    sample=[F(rng.randint(-10,10)) for _ in range(rng.randint(2,20))]
    j=rng.randint(1,len(sample)-1);left,right=sample[:j],sample[j:]
    check(sse(sample)-sse(left)-sse(right)==F(len(left)*len(right),len(sample))*(mean(left)-mean(right))**2,'SSE decomposition')
    a=mean(sample)+F(rng.randint(-10,10),7)
    check(sse(sample,a)==sse(sample)+len(sample)*(a-mean(sample))**2,'constant mean minimum')

# XOR, Boolean truth-table tree sizes, and unordered nominal partitions.
xor=[((a,b),a^b) for a,b in product([0,1],repeat=2)]
for j in [0,1]:
    check(gain([counts([(0,y) for x,y in xor if x[j]==v]) for v in [0,1]],entropy)==0,'XOR root gain')
check(all(entropy([int(y==1),int(y==0)])==0 for x,y in xor),'XOR final purity')
for d in range(1,9):
    check(sum(2**j for j in range(d+1))==2**(d+1)-1,'complete Boolean tree nodes')
for r in range(2,10):
    partitions_set={min(mask,((1<<r)-1)^mask) for mask in range(1,(1<<r)-1)}
    check(len(partitions_set)==2**(r-1)-1,'nominal grouping count')

# Every pruning is represented by a frontier of nodes of a fixed initial tree.
# Exhaustive frontiers and the bottom-up recurrence are independently implemented.
def frontiers(node, internal_count):
    if node>=internal_count:
        return [(node,)]
    return [(node,)]+[a+b for a in frontiers(2*node+1,internal_count) for b in frontiers(2*node+2,internal_count)]

def tree_counts(leaves):
    internal=len(leaves)-1
    nodes=[None]*internal+[tuple(c) for c in leaves]
    for node in range(internal-1,-1,-1):
        nodes[node]=tuple(a+b for a,b in zip(nodes[2*node+1],nodes[2*node+2]))
    return nodes

def label(c): return 0 if c[0]<=c[1] else 1 # counts positive first; tie class 0

def mistakes(train,val): return val[1] if label(train)==1 else val[0]

def dp(nodes,train,val, alpha=None):
    internal=(len(train)-1)//2;total=sum(train[0])
    def visit(node):
        leaf_value=mistakes(train[node], val[node]) if alpha is None else F(min(train[node]),total)+alpha
        leaf=(leaf_value,1,(node,))
        if node>=internal:return leaf
        a,b=visit(2*node+1),visit(2*node+2)
        keep=(a[0]+b[0],a[1]+b[1],a[2]+b[2])
        return min([leaf,keep],key=lambda t:(t[0],t[1]))
    return visit(0)

train=tree_counts([(8,2),(1,9),(8,2),(1,9)])
val=tree_counts([(1,4),(4,1),(4,1),(1,4)])
all_f=frontiers(0,3)
check(len(all_f)==5,'all five prunings')
expected={(3,4,5,6):(6,10), (1,5,6):(12,7), (3,4,2):(12,13), (1,2):(18,10),(0,):(18,10)}
for frontier in all_f:
    te=sum(min(train[n]) for n in frontier);ve=sum(mistakes(train[n],val[n]) for n in frontier)
    check((te,ve)==expected[frontier],('five-subtree errors',frontier))
check(dp(all_f,train,val)[:2]==(7,3),'default bottom-up pruning')
check(dp(all_f,train,val)[2]==(1,5,6),'default frontier')
check(train[0]==(18,22) and train[1]==train[2]==(9,11),'aggregate training counts')
close(F(18-6,40*(4-1)), .1,'root weakest link')
close(F(9-3,40),.15,'child weakest link')
for i in range(31):
    alpha=F(i,100)
    best=dp(all_f,train,val,alpha)
    check(best[2]==((3,4,5,6) if alpha<F(1,10) else (0,)),'cost path and smaller tie')
    for f in all_f:
        risk=F(sum(min(train[n]) for n in f),40)
        beta=alpha/2
        check(risk+beta*(2*len(f)-1)==risk+alpha*len(f)-beta,'node/leaf conversion')
# Compare DP with exhaustive enumeration on larger complete trees, random training
# majorities, multicount validation, zero observations, ties, and cost units.
for leaf_count in [2,4,8]:
    front=frontiers(0,leaf_count-1)
    for trial in range(100):
        train=tree_counts([(rng.randint(0,6),rng.randint(1,6)) for _ in range(leaf_count)])
        val=tree_counts([(0,0) if trial%10==0 else (rng.randint(0,6),rng.randint(0,6)) for _ in range(leaf_count)])
        exhaustive=min((sum(mistakes(train[n],val[n]) for n in f),len(f)) for f in front)
        check(dp(front,train,val)[:2]==exhaustive,'validation DP versus exhaustive frontiers')
        for alpha in [F(0),F(1,10),F(1,3),F(1)]:
            exhaustive=min((F(sum(min(train[n]) for n in f),sum(train[0]))+alpha*len(f),len(f))for f in front)
            check(dp(front,train,val,alpha)[:2]==exhaustive,'cost DP versus exhaustive frontiers')

# Fixed-table independence statistic, bootstrap enumeration, and covariance average.
observed=[[9,1],[1,9]]
chi=F(0)
for b in range(2):
    for c in range(2):
        expected_cell=F(sum(observed[b])*sum(row[c] for row in observed),20)
        check(expected_cell==5,'independence expected cell')
        chi+=(observed[b][c]-expected_cell)**2/expected_cell
check(chi==F(64,5),'Pearson statistic 12.8')
for n in [2,3,4]:
    draws=list(product(range(n),repeat=n))
    probability=F(sum(0 not in draw for draw in draws),len(draws))
    check(probability==F(n-1,n)**n,'bootstrap omission enumerated')
    unique=F(sum(len(set(draw)) for draw in draws),len(draws))
    check(unique==n*(1-probability),'expected distinct bootstrap observations')
close((.9)**10,.3486784401,'N=10 omission')
for b in range(1,8):
    # T_i = .5 Z_shared + sqrt(.75) Z_i: variance 1, covariance .25.
    outcomes=[(.5*signs[0]+sqrt(.75)*sum(signs[1:])/b)**2 for signs in product([-1,1],repeat=b+1)]
    close(sum(outcomes)/len(outcomes), .25+.75/b,'enumerated common correlation variance')
close(.2+.8/10,.28,'practice ensemble variance')

# Published count table must actually contain the same training leaf counts.
page=(Path(__file__).resolve().parents[1]/'writing/decision-trees-pruning.html').read_text()
for region,c in zip('ABCD',[(8,2),(1,9),(8,2),(1,9)]):
    check(f'<td>{region}</td><td>{c[0]}</td><td>{c[1]}</td>' in page,'published tool training counts')
for literal in ['2+1+2+1=6','0.246750','0.151836','0.048127','0.029223','200/3','0.020641']:
    check(literal in page,('published worked value',literal))
print(f'{checks:,} checks passed; maximum scaled numerical discrepancy {max_scaled_error:.3g}.')
