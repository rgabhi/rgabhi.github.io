#!/usr/bin/env python3
"""Numerical checks of the ML training notes; Python standard library only."""
from itertools import product
from math import sqrt, isclose

ERRORS = []
COUNT = 0

def close(actual, expected, label, tol=2e-7):
    global COUNT
    COUNT += 1
    error = abs(actual - expected)
    ERRORS.append(error)
    assert isclose(actual, expected, rel_tol=tol, abs_tol=tol), (label, actual, expected)


def central(mapping, loss, analytic, label):
    step = 1e-5
    for key in mapping:
        original = mapping[key]
        mapping[key] = original + step
        plus = loss()
        mapping[key] = original - step
        minus = loss()
        mapping[key] = original
        close((plus - minus) / (2 * step), analytic[key], (label, key))


def conv(x, w, bias, shape):
    height, width, cin, cout, fh, fw, stride, pad = shape
    oh = (height + 2 * pad - fh) // stride + 1
    ow = (width + 2 * pad - fw) // stride + 1
    z = {}
    for r, c, q in product(range(oh), range(ow), range(cout)):
        z[r, c, q] = bias[q] + sum(
            w[u, v, d, q] * x.get((r * stride + u - pad, c * stride + v - pad, d), 0)
            for u, v, d in product(range(fh), range(fw), range(cin))
        )
    return z


def backward(x, w, bias, delta, shape):
    _, _, cin, _, fh, fw, stride, pad = shape
    dx, dw, db = {k: 0.0 for k in x}, {k: 0.0 for k in w}, {k: 0.0 for k in bias}
    for (r, c, q), upstream in delta.items():
        db[q] += upstream
        for u, v, d in product(range(fh), range(fw), range(cin)):
            pos, key = (r * stride + u - pad, c * stride + v - pad, d), (u, v, d, q)
            dw[key] += upstream * x.get(pos, 0)
            if pos in dx:
                dx[pos] += upstream * w[key]
    return dx, dw, db


def check_conv(shape, relu=False):
    height, width, cin, cout, fh, fw, _, _ = shape
    x = {k: (i % 9 - 3) / 7 for i, k in enumerate(product(range(height), range(width), range(cin)))}
    w = {k: (i % 7 - 2) / 11 for i, k in enumerate(product(range(fh), range(fw), range(cin), range(cout)))}
    b = {q: .137 + .113 * q for q in range(cout)}
    z = conv(x, w, b, shape)
    upstream = {k: (i % 5 - 2) / 3 for i, k in enumerate(z)}
    if relu:
        assert min(abs(value) for value in z.values()) > 1e-3, 'avoid activation kink'
    delta = {k: g * (not relu or z[k] > 0) for k, g in upstream.items()}
    dx, dw, db = backward(x, w, b, delta, shape)
    def loss():
        values = conv(x, w, b, shape)
        return sum(upstream[k] * (max(0, value) if relu else value) for k, value in values.items())
    for mapping, analytic, label in [(x, dx, 'conv input'), (w, dw, 'conv weights'), (b, db, 'conv biases')]:
        central(mapping, loss, analytic, label)


def bn(x, gamma, beta, eps, stored=None):
    values = list(x.values())
    mean = sum(values) / len(values)
    var = sum((v - mean) ** 2 for v in values) / len(values)
    if stored is not None:
        mean, var = stored
    scale = sqrt(var + eps)
    normalized = {k: (v - mean) / scale for k, v in x.items()}
    return {k: gamma * v + beta for k, v in normalized.items()}, normalized, var


def check_bn(values, gamma, beta, eps, gradient):
    x = dict(enumerate(values))
    g = dict(enumerate(gradient))
    params = {'gamma': gamma, 'beta': beta}
    _, xhat, var = bn(x, gamma, beta, eps)
    mean_g = sum(g.values()) / len(x)
    mean_gx = sum(g[k] * xhat[k] for k in x) / len(x)
    dx = {k: gamma / sqrt(var + eps) * (g[k] - mean_g - xhat[k] * mean_gx) for k in x}
    dp = {'gamma': sum(g[k] * xhat[k] for k in x), 'beta': sum(g.values())}
    def loss():
        y, _, _ = bn(x, params['gamma'], params['beta'], eps)
        return sum(y[k] * g[k] for k in y)
    central(x, loss, dx, 'BN training input')
    central(params, loss, dp, 'BN affine parameters')
    close(sum(dx.values()), 0, 'BN translation sensitivity')
    return dx, dp


def main():
    # Full input/weight/bias Jacobian-vector checks, including stride and padding.
    check_conv((3, 3, 1, 1, 2, 2, 1, 0))
    check_conv((4, 5, 2, 2, 2, 3, 2, 1))
    check_conv((4, 5, 2, 2, 2, 3, 2, 1), relu=True)
    x = {(r, c, 0): value for r, row in enumerate([[1, 2, 0], [0, 1, 3], [2, 1, 1]]) for c, value in enumerate(row)}
    w = {(u, v, 0, 0): value for u, row in enumerate([[1, 0], [0, -1]]) for v, value in enumerate(row)}
    delta = {(r, c, 0): value for r, row in enumerate([[1, 2], [3, 4]]) for c, value in enumerate(row)}
    dx, dw, db = backward(x, w, {0: 0}, delta, (3, 3, 1, 1, 2, 2, 1, 0))
    assert [[dx[r, c, 0] for c in range(3)] for r in range(3)] == [[1, 2, 0], [3, 3, -2], [0, -3, -4]]
    assert [[dw[u, v, 0, 0] for v in range(2)] for u in range(2)] == [[9, 17], [12, 14]]
    close(db[0], 10, 'worked bias')

    # Overlapping pool maxima: compare the routing result to a numerical derivative.
    pool_x = {0: 1.0, 1: 4.0, 2: 2.0}
    central(pool_x, lambda: 3 * max(pool_x[0], pool_x[1]) + 5 * max(pool_x[1], pool_x[2]), {0: 0, 1: 8, 2: 0}, 'max pooling')

    # Exhaustive expectations for all 16 independent four-unit masks.
    activation = [2.0, -1.0, 3.0, 4.0]
    for q in [.25, .5, .75, 1.0]:
        for inverted in [False, True]:
            expected = [0.0] * 4
            second = [0.0] * 4
            probability_sum = 0.0
            for mask in product([0, 1], repeat=4):
                probability = q ** sum(mask) * (1 - q) ** (4 - sum(mask))
                probability_sum += probability
                for i, a in enumerate(activation):
                    value = mask[i] * a / (q if inverted else 1)
                    expected[i] += probability * value
                    second[i] += probability * value * value
            close(probability_sum, 1, 'mask probabilities')
            for i, a in enumerate(activation):
                close(expected[i], a if inverted else q * a, 'dropout exact expectation')
                predicted_variance = (1 - q) / q * a * a if inverted else q * (1 - q) * a * a
                close(second[i] - expected[i] ** 2, predicted_variance, 'dropout variance')
    a = {0: 2.0, 1: -3.0, 2: 4.0}
    mask, g = [1, 0, 1], [1, -2, 3]
    central(a, lambda: sum(g[i] * a[i] * mask[i] / .5 for i in a), {0: 2, 1: 0, 2: 6}, 'fixed dropout mask')
    close(sum(max(0, 2 * m0 - 2 * m1) for m0, m1 in product([0, 1], repeat=2)) / 4, .5, 'nonlinear expectation counterexample')

    # Nonconstant batches, finite epsilon, negative scale, and constant-batch case.
    for epsilon in [0, 1e-5, .2]:
        grads, params = check_bn([1, 3, 5, 7], 2, 1, epsilon, [1, 0, -1, 2])
        if epsilon == 0:
            for i, value in enumerate([8, -4, -16, 12]):
                close(grads[i], value / (5 * sqrt(5)), 'worked BN backward')
            close(params['gamma'], 2 / sqrt(5), 'worked gamma gradient')
    check_bn([-2, .4, 1.7, 3.2], -.7, .3, .03, [-1, .5, 2, -.3])
    grads, _ = check_bn([1, 1], 2, 0, 1, [1, 0])
    close(grads[0], 1, 'constant BN first derivative')
    close(grads[1], -1, 'constant BN second derivative')
    original = {0: 1, 1: 3, 2: 5, 3: 7}
    changed = {**original, 3: 11}
    train0 = bn(original, 2, 1, 1e-5)[0][0]
    assert abs(train0 - bn(changed, 2, 1, 1e-5)[0][0]) > .01
    close(bn(original, 2, 1, 1e-5, (3, 4))[0][0], bn(changed, 2, 1, 1e-5, (3, 4))[0][0], 'inference companion independence')
    close(.9 * 8 + .1 * 4, 7.6, 'running mean example')
    close(.9 * 9 + .1 * (4 / 3 * 5), 8.766666666666667, 'running variance example')
    assert (224 - 11) // 4 + 1 == 54
    assert (227 - 11) // 4 + 1 == (224 + 4 - 11) // 4 + 1 == 55
    print(f'PASS: {COUNT} numerical comparisons; max absolute discrepancy {max(ERRORS):.3g}.')
    print('Convolution, ReLU, overlapping pooling, dropout expectations/variance, BN derivatives and worked examples agree.')


if __name__ == '__main__':
    main()
