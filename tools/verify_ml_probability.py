"""Independent numerical checks for the probability/Gaussian learning chapter.

Run with Python 3; no third-party packages are required. Quadrature uses finite
intervals with explicitly negligible Gaussian/exponential tails. Pareto moments
use x=b*exp(t), making tail behavior visible rather than hiding a cutoff.
"""
from math import comb, exp, erf, log, pi, sqrt, cos, sin

checks = 0
largest_error = 0.0


def close(actual, expected, tolerance=2e-8):
    global checks, largest_error
    error = abs(actual - expected)
    assert error <= tolerance * max(1, abs(expected)), (actual, expected, error)
    checks += 1
    largest_error = max(largest_error, error)


def quad(f, a, b, n=4000):
    """Composite Simpson quadrature, including both endpoints."""
    h = (b-a)/n
    return h/3*(f(a)+f(b)+sum((4 if i % 2 else 2)*f(a+i*h)
                            for i in range(1, n)))


def normal(x, mean=0, variance=1):
    return exp(-(x-mean)**2/(2*variance))/sqrt(2*pi*variance)


def moments_discrete(pairs, mean, variance):
    pairs = list(pairs)
    close(sum(p for x, p in pairs), 1)
    close(sum(x*p for x, p in pairs), mean)
    close(sum((x-mean)**2*p for x, p in pairs), variance)


for p in (0, .1, .3, .75, 1):
    moments_discrete([(0, 1-p), (1, p)], p, p*(1-p))
    for n in (1, 5, 10):
        moments_discrete(((k, comb(n,k)*p**k*(1-p)**(n-k))
                          for k in range(n+1)), n*p, n*p*(1-p))
for p in (.1, .25, .8, 1):
    # At p=.1 the omitted tail past 1000 has mass .9**1000 < 2e-46.
    moments_discrete(((k, p*(1-p)**(k-1)) for k in range(1,1001)),
                     1/p, (1-p)/p**2)
for a,b in ((0,.2), (-2,4), (1,7)):
    close(quad(lambda x: 1/(b-a),a,b),1)
    close(quad(lambda x: x/(b-a),a,b),(a+b)/2)
    close(quad(lambda x: (x-(a+b)/2)**2/(b-a),a,b),(b-a)**2/12)
for rate in (.5,2,4):
    # Scaled t=rate*x; e^-40 times the polynomial tail is negligible.
    for r in (0,1,2):
        expected=(1,1/rate,2/rate**2)[r]
        close(quad(lambda t:(t/rate)**r*exp(-t),0,40),expected)
for alpha,b in ((3,2),(4,1),(1.5,2)):
    for r in (0,1,2):
        if r < alpha:
            # Transformed integrand alpha*b^r*exp((r-alpha)*t).
            cutoff=40/(alpha-r)
            close(quad(lambda t:alpha*b**r*exp((r-alpha)*t),0,cutoff),
                  alpha*b**r/(alpha-r))
# At and above the moment threshold, truncated integrals grow unbounded.
for alpha,r in ((1,1),(1.5,2),(.5,1),(2,2)):
    f=lambda t:alpha*2**r*exp((r-alpha)*t)
    assert quad(f,0,20) > quad(f,0,10)*1.9
    checks += 1
for mean,variance in ((0,1),(2,9),(-1,.25)):
    sigma=sqrt(variance);lo=mean-10*sigma;hi=mean+10*sigma
    close(quad(lambda x:normal(x,mean,variance),lo,hi),1)
    close(quad(lambda x:x*normal(x,mean,variance),lo,hi),mean)
    close(quad(lambda x:(x-mean)**2*normal(x,mean,variance),lo,hi),variance)
close(quad(lambda z:exp(-z*z/2),-10,10),sqrt(2*pi))
close(quad(normal,-.5,1),(erf(1/sqrt(2))+erf(.5/sqrt(2)))/2)
close(quad(lambda x:normal(x,2,9),-1,5),erf(1/sqrt(2)))
close(.7*quad(lambda x:x*x,0,1)-(.7/2)**2,133/1200)
close(18/30,.6);close(18/25,.72);close(.18-.3*.25,.105)
close(4+4*9+4*3,52)


def transpose(a): return list(map(list,zip(*a)))
def mm(a,b): return [[sum(x*y for x,y in zip(row,col)) for col in zip(*b)] for row in a]
def mv(a,v): return [sum(x*y for x,y in zip(row,v)) for row in a]
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def det(a): return a[0][0]*a[1][1]-a[0][1]*a[1][0]
def inv(a):
    d=det(a)
    return [[a[1][1]/d,-a[0][1]/d],[-a[1][0]/d,a[0][0]/d]]


def density2(x,mean,cov):
    delta=[a-b for a,b in zip(x,mean)]
    return exp(-dot(delta,mv(inv(cov),delta))/2)/(2*pi*sqrt(det(cov)))


# Conditional laws tested against normalized slices of the full joint density.
for sx,sy,rho in ((1,1,0),(1,1,.8),(2,3,.5),(.5,1.5,-.95)):
    mean=[1,2];cov=[[sx*sx,rho*sx*sy],[rho*sx*sy,sy*sy]]
    for y in (mean[1]-sy,mean[1]+sy):
        cm=mean[0]+rho*sx/sy*(y-mean[1]);cv=sx*sx*(1-rho*rho)
        low,high=cm-10*sqrt(cv),cm+10*sqrt(cv)
        marginal=quad(lambda x:density2([x,y],mean,cov),low,high)
        close(marginal,normal(y,mean[1],sy*sy))
        close(quad(lambda x:x*density2([x,y],mean,cov)/marginal,low,high),cm)
        close(quad(lambda x:(x-cm)**2*density2([x,y],mean,cov)/marginal,low,high),cv)
        for offset in (-2,0,1):
            x=cm+offset*sqrt(cv)
            close(density2([x,y],mean,cov)/marginal,normal(x,cm,cv))
    # All Cholesky-generated ellipse points must obey the inverse quadratic form.
    for radius in (1,2,3):
        for j in range(16):
            angle=j*pi/8
            delta=[radius*sx*cos(angle),radius*sy*(rho*cos(angle)+sqrt(1-rho*rho)*sin(angle))]
            close(dot(delta,mv(inv(cov),delta)),radius*radius)

# Affine covariance checked by enumerating a non-Gaussian random vector, so
# this tests the moment identity without assuming Gaussian closure.
samples=[([-1,-1],.25),([-1,1],.25),([1,-1],.25),([1,1],.25)]
A=[[2,1],[0,1]];b=[1,-1]
transformed=[([t+u for t,u in zip(mv(A,z),b)],p) for z,p in samples]
expected=mm(A,transpose(A))
for i in range(2):
    close(sum(x[i]*p for x,p in transformed),b[i])
    for j in range(2):
        close(sum((x[i]-b[i])*(x[j]-b[j])*p for x,p in transformed),expected[i][j])
close(det(expected),4)
inverse_A=inv(A)
restored=mm(mm(inverse_A,expected),transpose(inverse_A))
for i in range(2):
    for j in range(2): close(restored[i][j],float(i==j))
close(quad(lambda x:x*x*x/2,-1,1),0)  # Cov(X,X²), symmetric uniform X.
close(quad(lambda x:x*x/2,-1,1),1/3)
# A 2+1 block conditional: residual cross-covariance vanishes and its
# covariance equals the Schur complement, verified with a full linear map.
L=[[2,0,0],[.5,1,0],[1,-.2,1.5]];S=mm(L,transpose(L));s22=S[2][2]
B=[S[i][2]/s22 for i in range(2)]
T=[[1,0,-B[0]],[0,1,-B[1]],[0,0,1]];residual=mm(mm(T,S),transpose(T))
for i in range(2):
    close(residual[i][2],0)
    for j in range(2): close(residual[i][j],S[i][j]-S[i][2]*S[2][j]/s22)

# General precision expansion (nonzero means and off-diagonal covariance).
cov=[[4,1],[1,2]];mean=[2,-1];precision=inv(cov);eta=mv(precision,mean)
kappa=-.5*(2*log(2*pi)-log(det(precision))+dot(eta,mv(cov,eta)))
for x in ([0,0],[1,2],[-3,.5],mean):
    close(kappa+dot(eta,x)-.5*dot(x,mv(precision,x)),log(density2(x,mean,cov)))
close(.5**2/.25,1);close(.5**2*.25,1/16)
# Matrix product identity with different, noncommuting covariances.
ca=[[2,.6],[.6,1]];cb=[[1,-.2],[-.2,3]];ma=[1,-1];mb=[-2,.5]
pa,pb=inv(ca),inv(cb)
combined=inv([[pa[i][j]+pb[i][j] for j in range(2)] for i in range(2)])
weighted=[x+y for x,y in zip(mv(pa,ma),mv(pb,mb))]
product_mean=mv(combined,weighted)
cov_sum=[[ca[i][j]+cb[i][j] for j in range(2)] for i in range(2)]
constant=density2(ma,mb,cov_sum)
for x in ([0,0],[1,-1],[-2,.5],[3,2]):
    close(density2(x,ma,ca)*density2(x,mb,cb),
          constant*density2(x,product_mean,combined),tolerance=1e-12)
# Products: integrate the unnormalized product and its first two moments.
for a,va,b,vb in ((0,1,2,1),(-1,.5,2,4),(1,2,1,3)):
    product=lambda x:normal(x,a,va)*normal(x,b,vb)
    c=(a/va+b/vb)/(1/va+1/vb);v=1/(1/va+1/vb)
    lo,hi=c-10*sqrt(v),c+10*sqrt(v);mass=quad(product,lo,hi)
    close(mass,normal(a,b,va+vb))
    close(quad(lambda x:x*product(x),lo,hi)/mass,c)
    close(quad(lambda x:(x-c)**2*product(x),lo,hi)/mass,v)
    # Independent sum density is a convolution, not a pointwise product.
    for s in (-1,0,3):
        close(quad(lambda x:normal(x,a,va)*normal(s-x,b,vb),
                   a-12*sqrt(va),a+12*sqrt(va)),normal(s,a+b,va+vb))
for r in (1,2,sqrt(-2*log(.05))):
    close(quad(lambda t:t*exp(-t*t/2),0,r),1-exp(-r*r/2))
print(f"Passed {checks} probability/Gaussian checks; largest absolute discrepancy {largest_error:.3g}.")
