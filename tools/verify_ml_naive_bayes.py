"""Independent, standard-library checks for the Naive Bayes teaching chapter.

Enumerate token sequences and binary vectors, compare constrained likelihood
calculus with finite differences, and recompute worked examples using exact
fractions. These checks support the notes; they do not prove every model claim.
"""
from collections import Counter, defaultdict
from fractions import Fraction as F
from itertools import product
from math import exp, factorial, isfinite, log, prod

checks = 0
max_error = 0.0


def close(actual, expected, tolerance=2e-7):
    global checks, max_error
    error = abs(float(actual) - float(expected)) / max(1., abs(float(actual)), abs(float(expected)))
    assert error < tolerance, (actual, expected, error)
    max_error = max(max_error, error)
    checks += 1


def require(condition):
    global checks
    assert condition
    checks += 1


def finite_difference(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2*h)


def objective(counts, probabilities):
    if any(n and not p for n, p in zip(counts, probabilities)):
        return float('-inf')
    return sum(n*log(p) for n, p in zip(counts, probabilities) if n)


# Independent simplex coordinates: differentiate after eliminating the last.
for counts in ([2, 3, 5], [4, 4, 1], [7, 1, 2]):
    p = [.23, .31, .46]
    for j in range(2):
        def f(value):
            q = p[:]
            q[j] = value
            q[-1] = 1-sum(q[:-1])
            return objective(counts, q)
        close(finite_difference(f, p[j]), counts[j]/p[j]-counts[-1]/p[-1])
    mle = [n/sum(counts) for n in counts]
    for j in range(2):
        def f(value):
            q = mle[:]
            q[j] = value
            q[-1] = 1-sum(q[:-1])
            return objective(counts, q)
        close(finite_difference(f, mle[j]), 0)
    optimum = objective(counts, mle)
    for a in range(1, 20):
        for b in range(1, 20-a):
            require(objective(counts, [a/20, b/20, 1-(a+b)/20]) <= optimum+1e-10)
# Boundary maximum and unidentified zero-token class.
require(objective([4, 4, 0], [.5, .5, 0]) > objective([4, 4, 0], [.45, .45, .1]))
close(objective([0, 0, 0], [.2, .3, .5]), objective([0, 0, 0], [.6, .3, .1]))

# Enumerate all sequences; collect by count vector to recover the coefficient.
for theta in ([F(1, 2), F(1, 3), F(1, 6)], [F(0), F(1, 4), F(3, 4)]):
    for length in range(5):
        aggregate = defaultdict(F)
        for seq in product(range(3), repeat=length):
            x = tuple(seq.count(j) for j in range(3))
            aggregate[x] += prod((theta[j] for j in seq), start=F(1))
        close(sum(aggregate.values()), 1)
        for x, probability in aggregate.items():
            coefficient = factorial(length)//prod(factorial(n) for n in x)
            direct = coefficient*prod((p**n for p, n in zip(theta, x)), start=F(1))
            close(probability, direct)
        if length == 4:
            mean0 = sum(x[0]*p for x, p in aggregate.items())
            mean1 = sum(x[1]*p for x, p in aggregate.items())
            cov = sum(x[0]*x[1]*p for x, p in aggregate.items())-mean0*mean1
            close(cov, -length*theta[0]*theta[1])

vocabulary = ['free', 'offer', 'meeting', 'project']
corpus = {1: ['free offer free', 'offer free', 'free offer offer'],
          0: ['meeting project', 'project meeting meeting', 'project offer']}
tokens = {}; presence = {}; categorical = {}; bernoulli = {}
for c, docs in corpus.items():
    token_hist = Counter(' '.join(docs).split())
    presence_hist = Counter(word for doc in docs for word in set(doc.split()))
    tokens[c] = [token_hist[w] for w in vocabulary]
    presence[c] = [presence_hist[w] for w in vocabulary]
    categorical[c] = [F(n+1, sum(tokens[c])+4) for n in tokens[c]]
    bernoulli[c] = [F(n+1, len(docs)+2) for n in presence[c]]
    close(sum(categorical[c]), 1)
require(tokens == {1: [4, 4, 0, 0], 0: [0, 1, 3, 3]})
require(presence == {1: [3, 3, 0, 0], 0: [0, 1, 2, 3]})
close(sum(F(n+1, 8+2) for n in tokens[1]), F(6, 5))
close(F(4, 8), F(1, 2)); close(F(4, 4+1), F(4, 5))


def likelihood(c, x, binary=False):
    if binary:
        return prod((p if n else 1-p for p, n in zip(bernoulli[c], x)), start=F(1))
    return prod((p**n for p, n in zip(categorical[c], x)), start=F(1))


def posterior(x, binary=False, prior=F(1, 2)):
    a = prior*likelihood(1, x, binary)
    b = (1-prior)*likelihood(0, x, binary)
    return a/(a+b) if a+b else None


close(likelihood(1, [2, 1, 0, 0]), F(125, 1728))
close(3*likelihood(1, [2, 1, 0, 0]), F(125, 576))
close(posterior([1, 1, 0, 0]), F(3025, 3313))
close(posterior([2, 1, 0, 0]), F(166375, 169831))
close(likelihood(1, [1, 1, 0, 0], True), F(256, 625))
close(likelihood(0, [1, 1, 0, 0], True), F(4, 625))
close(posterior([1, 1, 0, 0], True), F(64, 65))
close(posterior([0, 0, 0, 0]), F(1, 2))
close(posterior([0, 0, 0, 0], True), F(2, 5))
close(F(1, 2)/(F(1, 2)+F(1, 7)), F(7, 9))
close(F(8, 15)*F(1, 2)/(F(8, 15)*F(1, 2)+F(7, 15)*F(1, 7)), F(4, 5))
close(F(1, 8+5), F(1, 13)); close(F(4+1, 8+5), F(5, 13))

# Binary distribution normalization, independent coordinates, and sparse scores.
for c in (0, 1):
    close(sum(likelihood(c, b, True) for b in product((0, 1), repeat=4)), 1)
    base = sum(log(1-p) for p in bernoulli[c])
    for b in product((0, 1), repeat=4):
        sparse = base+sum(log(p/(1-p)) for p, value in zip(bernoulli[c], b) if value)
        close(sparse, log(likelihood(c, b, True)))
        direct = sum(log(p if value else 1-p) for p, value in zip(bernoulli[c], b))
        close(direct, log(likelihood(c, b, True)))
    for d in presence[c]:
        rho = .37; n = len(corpus[c])
        f = lambda p: d*log(p)+(n-d)*log(1-p)
        close(finite_difference(f, rho), d/rho-(n-d)/(1-rho))
        if 0 < d < n:
            close(finite_difference(f, d/n), 0)
        else:
            require(objective([d, n-d], [1, 0] if d == n else [0, 1]) > f(rho))
intercept = log(likelihood(1, [0]*4, True)/likelihood(0, [0]*4, True))
close(intercept, log(F(2, 3)))
weights = [log((a/(1-a))/(b/(1-b))) for a, b in zip(bernoulli[1], bernoulli[0])]
for a, b in zip(weights, [log(16), log(6), -log(6), -log(16)]): close(a, b)
close(intercept+weights[0]+weights[1], log(64))

# Count likelihood and affine log-ratio agree for every short count vector.
for x in product(range(4), repeat=4):
    direct = posterior(x)
    delta = sum(n*log(a/b) for n, a, b in zip(x, categorical[1], categorical[0]))
    close(1/(1+exp(-delta)), direct)
    for prior in (F(1, 10), F(3, 4)):
        odds = log(prior/(1-prior))+delta
        close(1/(1+exp(-odds)), posterior(x, prior=prior))

# Pseudocount normalization and augmented likelihood maximum.
for counts in ([4, 4, 0, 0], [0, 1, 3, 3], [0]*4):
    for alpha in (F(1, 4), F(1), F(5)):
        augmented = [n+alpha for n in counts]
        fitted = [n/sum(augmented) for n in augmented]
        close(sum(fitted), 1)
        optimum = objective(augmented, fitted)
        for p in ([.25]*4, [.1, .2, .3, .4], [.4, .3, .2, .1]):
            require(objective(augmented, p) <= optimum+1e-10)
        for d in range(4):
            present = F(d+alpha, 3+2*alpha)
            absent = F(3-d+alpha, 3+2*alpha)
            close(present+absent, 1)
            require(0 < present < 1)
close(F(0+1, 3+2), F(1, 5)); close(F(1+1, 3+2), F(2, 5))
for p in [F(n+10**8, 8+4*10**8) for n in tokens[1]]: close(p, .25)
# Beta (two-outcome Dirichlet) posterior mean by exact polynomial integrals.
# Integral p^a(1-p)^b = a! b!/(a+b+1)! for integer exponents.
def beta_integral(a, b): return F(factorial(a)*factorial(b), factorial(a+b+1))
for n, N, alpha in product(range(4), (5, 8), (1, 2, 3)):
    a = n+alpha-1; b = N-n+alpha-1
    close(beta_integral(a+1, b)/beta_integral(a, b), F(n+alpha, N+2*alpha))
    if a > 0 and b > 0:
        close(finite_difference(lambda p: a*log(p)+b*log(1-p), a/(a+b)), 0)

# Zero support is distinct from small positive likelihood and arithmetic underflow.
def normalize_logs(scores):
    m = max(scores)
    if m == float('-inf'): return None
    w = [exp(s-m) for s in scores]
    return [p/sum(w) for p in w]
unsmoothed = {c: [F(n, sum(tokens[c])) for n in tokens[c]] for c in (0, 1)}
for c in (0, 1): require(prod(unsmoothed[c][j] for j in (0, 2)) == 0)
require(normalize_logs([float('-inf')]*2) is None)
require(normalize_logs([float('-inf'), -10000]) == [0, 1])
require(normalize_logs([-10000, float('-inf')]) == [1, 0])
require(exp(-10000) == 0)
close(normalize_logs([-10000, -10001])[0], 1/(1+exp(-1)))
require(all(isfinite(p) for p in normalize_logs([-1e8, -1e8-1])))

# Multiclass posterior from direct masses versus shifted log normalization.
rows = [[F(1, 2), F(1, 3), F(1, 6)], [F(1, 4), F(1, 4), F(1, 2)],
        [F(1, 5), F(3, 5), F(1, 5)]]
priors = [F(1, 6), F(1, 3), F(1, 2)]
for x in product(range(3), repeat=3):
    masses = [prior*prod((p**n for p, n in zip(row, x)), start=F(1)) for prior, row in zip(priors, rows)]
    post = normalize_logs([log(p) for p in masses])
    for a, b in zip(post, masses): close(a, b/sum(masses))
close(3*(4-1)+(3-1), 11); close(3*4+(3-1), 14)

# Enumerated conditionally independent features need not be marginally independent.
joint = defaultdict(F)
for c, a, b in product((0, 1), repeat=3):
    p = F(1, 5) if c == 0 else F(4, 5)
    joint[a, b] += F(1, 2)*(p if a else 1-p)*(p if b else 1-p)
close(joint[1, 1], F(34, 100))
close(sum(p for (a, b), p in joint.items() if a)*sum(p for (a, b), p in joint.items() if b), F(1, 4))
# Exact-copy joint probabilities versus multiplying a redundant feature again.
true1 = F(4, 5)*F(1, 10); true0 = F(1, 5)*F(4, 5)
naive1 = F(4, 5)**2*F(1, 10); naive0 = F(1, 5)**2*F(4, 5)
close(true1/(true1+true0), F(1, 3))
close(naive1/(naive1+naive0), F(2, 3))
close(F(4, 5)**2/(F(4, 5)**2+F(1, 5)**2), F(16, 17))
print(f'{checks} Naive Bayes checks passed; maximum scaled discrepancy {max_error:.3g}.')
