"""Independent standard-library numerical checks for the factor-model/PCA notes.

Use a Jacobi eigensolver, finite differences, exact discrete moments, numerical
quadrature and direct pixel reconstruction. The website uses a different 2D
analytic formula and a precomputed SVD, so these are cross-checks rather than
calls into the teaching implementation.
"""
from itertools import product
from math import cos, sin, sqrt, pi, log, exp
from pathlib import Path
import json

checks=0
max_scaled_error=0.

def close(a,b,tol=2e-7):
    global checks,max_scaled_error
    error=abs(a-b)/max(1,abs(a),abs(b))
    assert error<tol,(a,b,error)
    checks+=1;max_scaled_error=max(max_scaled_error,error)

def require(condition):
    global checks
    assert condition
    checks+=1

def dot(a,b):return sum(x*y for x,y in zip(a,b))
def transpose(a):return list(map(list,zip(*a)))
def mm(a,b):return [[dot(row,col)for col in zip(*b)]for row in a]
def mv(a,v):return [dot(row,v)for row in a]
def identity(n):return [[float(i==j)for j in range(n)]for i in range(n)]
def norm2(v):return dot(v,v)
def subtract(a,b):return [x-y for x,y in zip(a,b)]
def matrix_close(a,b,tol=2e-7):
    require(len(a)==len(b)and all(len(x)==len(y)for x,y in zip(a,b)))
    for x,y in zip(a,b):
        for u,v in zip(x,y):close(u,v,tol)

def stats(rows):
    mean=[sum(col)/len(rows)for col in zip(*rows)]
    z=[subtract(row,mean)for row in rows];S=[[sum(r[i]*r[j]for r in z)/len(z)for j in range(len(mean))]for i in range(len(mean))]
    return mean,z,S

def jacobi(matrix):
    a=[row[:]for row in matrix];n=len(a);q=identity(n)
    for iteration in range(300):
        p,r=max(((i,j)for i in range(n)for j in range(i+1,n)),key=lambda ij:abs(a[ij[0]][ij[1]]))
        if abs(a[p][r])<1e-12:break
        tau=(a[r][r]-a[p][p])/(2*a[p][r]);t=(1 if tau>=0 else -1)/(abs(tau)+sqrt(1+tau*tau));c=1/sqrt(1+t*t);s=t*c
        app,arr,apr=a[p][p],a[r][r],a[p][r];a[p][p]=app-t*apr;a[r][r]=arr+t*apr;a[p][r]=a[r][p]=0.
        for j in range(n):
            if j not in (p,r):
                ajp,ajr=a[j][p],a[j][r];a[j][p]=a[p][j]=c*ajp-s*ajr;a[j][r]=a[r][j]=s*ajp+c*ajr
            qjp,qjr=q[j][p],q[j][r];q[j][p]=c*qjp-s*qjr;q[j][r]=s*qjp+c*qjr
    else:raise AssertionError('Jacobi iteration did not converge')
    order=sorted(range(n),key=lambda j:a[j][j],reverse=True)
    return [a[j][j]for j in order],[[row[j]for j in order]for row in q]

def projector(U):return mm(U,transpose(U))
def trace(a):return sum(a[i][i]for i in range(len(a)))
def fd(f,x,h=1e-5):return (f(x+h)-f(x-h))/(2*h)

# Mean decomposition and orthogonal reconstruction on the chapter dataset.
raw=[[7,19],[9,17],[11,23],[13,21]];mean,z,S=stats(raw)
matrix_close([mean],[[10,20]]);matrix_close(S,[[5,3],[3,5]])
values,Q=jacobi(S);matrix_close(mm(transpose(Q),Q),identity(2));close(values[0],8);close(values[1],2)
for candidate in ([0,0],[10,20],[9,23]):
    close(sum(norm2(subtract(row,candidate))for row in raw),sum(map(norm2,z))+len(z)*norm2(subtract(candidate,mean)))
uncentered=[[sum(row[i]*row[j]for row in raw)/4 for j in range(2)]for i in range(2)]
matrix_close(uncentered,[[105,203],[203,405]])
U=[[1/sqrt(2)],[1/sqrt(2)]];P=projector(U)
matrix_close(mm(P,P),P);matrix_close(transpose(P),P)
reconstructions=[mv(P,row)for row in z]
for point,rec in zip(z,reconstructions):
    residual=subtract(point,rec);close(dot(U[0]+U[1],residual),0)
    close(norm2(point),norm2(rec)+norm2(residual));close(norm2(residual),2)
    score=dot([1/sqrt(2)]*2,point)
    close(fd(lambda t:norm2(subtract(point,[t/sqrt(2)]*2)),score),0)
matrix_close([[rec[j]+mean[j]for j in range(2)]for rec in reconstructions],[[8,18],[8,18],[12,22],[12,22]])
close(sum(norm2(subtract(p,r))for p,r in zip(z,reconstructions)),8)
close(sum(norm2(subtract(p,r))for p,r in zip(z,reconstructions))/8,1)
query=[3,0];close(norm2(subtract(query,mv(P,query))),4.5)
# Arbitrary full-column-rank A cannot be projected by transpose alone.
A=[[2],[0]];least_squares=dot([2,0],[3,4])/4;close(least_squares,1.5)
matrix_close([mv(A,[least_squares])],[[3,0]]);require(mv(projector(A),[3,4])==[12,0])
# Direct angle enumeration verifies Rayleigh objective and error equivalence.
for degrees in range(-180,181):
    angle=degrees*pi/180;v=[cos(angle),sin(angle)];retained=dot(v,mv(S,v))
    close(retained,8*cos(angle-pi/4)**2+2*sin(angle-pi/4)**2)
    error=sum(norm2(subtract(row,[a*dot(v,row)for a in v]))for row in z)/4
    close(error,trace(S)-retained);require(2-1e-10<=retained<=8+1e-10)
for degrees,expected in [(0,5),(45,8),(-45,2)]:
    a=degrees*pi/180;v=[cos(a),sin(a)];close(dot(v,mv(S,v)),expected)
close(fd(lambda a:dot([cos(a),sin(a)],mv(S,[cos(a),sin(a)])),pi/4),0)
# Full 3D covariance and alternative orthonormal subspaces.
base=[[1/sqrt(2),-1/sqrt(6),1/sqrt(3)],[1/sqrt(2),1/sqrt(6),-1/sqrt(3)],[0,2/sqrt(6),1/sqrt(3)]]
matrix_close(mm(transpose(base),base),identity(3))
C=mm(mm(base,[[9,0,0],[0,4,0],[0,0,1]]),transpose(base));lam,eig=jacobi(C)
for actual,expected in zip(lam,[9,4,1]):close(actual,expected)
matrix_close(mm(C,eig),[[eig[i][j]*lam[j]for j in range(3)]for i in range(3)])
for k in [1,2,3]:
    best=sum(lam[:k]);Uk=[row[:k]for row in eig]
    close(trace(mm(mm(transpose(Uk),C),Uk)),best)
    for angle in [j*pi/24 for j in range(48)]:
        R=[[cos(angle),0,sin(angle)],[0,1,0],[-sin(angle),0,cos(angle)]];candidate=[row[:k]for row in mm(eig,R)]
        require(trace(mm(mm(transpose(candidate),C),candidate))<=best+1e-10)
# Signs and within-subspace rotations preserve projector.
rot=[[cos(.7),-sin(.7)],[sin(.7),cos(.7)]];Uk=[row[:2]for row in eig]
matrix_close(projector(mm(Uk,rot)),projector(Uk));matrix_close(projector([[-x for x in row]for row in Uk]),projector(Uk))
# Isotropic covariance: every tested direction is equally good.
for angle in [j*pi/12 for j in range(24)]:
    v=[cos(angle),sin(angle)];close(dot(v,mv([[2,0],[0,2]],v)),2)
# Singular values from a smaller Gram matrix, not the covariance implementation.
Z=transpose(z);gram=mm(transpose(Z),Z);singular2,V=jacobi(gram)
for actual,expected in zip(singular2,[32,8,0,0]):close(actual,expected)
for j in range(2):
    v=[row[j]for row in V];q=[a/sqrt(singular2[j])for a in mv(Z,v)]
    close(norm2(q),1);matrix_close([mv(S,q)],[[singular2[j]/4*a for a in q]])
close(singular2[1],8)
close(sum([9,4])/14,13/14);require(sum([9])/14<.9<sum([9,4])/14)
# Centering restricts rank to N-1, illustrated with 3 observations in 5D.
_,centered,cov=stats([[1,0,2,1,4],[0,2,3,-1,2],[2,-1,1,4,3]])
for coordinate in zip(*centered):close(sum(coordinate),0)
rankvals,_=jacobi(cov);require(sum(v>1e-9 for v in rankvals)<=2)
_,zeros,zeroCov=stats([[10,20]]*3);require(all(norm2(v)==0 for v in zeros));close(trace(zeroCov),0)
# Covariance identity from exhaustive independent non-Gaussian +/-1 variables.
# Gaussianity is not needed for this moment calculation.
load=[[1,0],[0,1],[1,1]];observations=[]
for f1,f2,e1,e2,e3 in product((-1,1),repeat=5):
    signal=mv(load,[f1,f2]);observations.append([m+a+.5*e for m,a,e in zip([2,3,1],signal,[e1,e2,e3])])
mu,_,cov=stats(observations);matrix_close([mu],[[2,3,1]])
matrix_close(cov,[[1.25,0,1],[0,1.25,1],[1,1,2.25]])
for i in range(3):
    v=[row[i]for row in identity(3)];require(dot(v,mv(cov,v))>0)
matrix_close(mm(load,transpose(load)),mm(mm(load,rot),transpose(mm(load,rot))))
# Latent Gaussian posterior mean and variance via direct 1D quadrature.
def integrate(f,a=-8,b=8,n=2400):
    h=(b-a)/n
    return h/3*(f(a)+f(b)+sum((4 if j%2 else 2)*f(a+j*h)for j in range(1,n)))
likelihood=lambda t:exp(-.5*t*t-.5*((3-2*t)**2+4**2))
normalizer=integrate(likelihood);posterior_mean=integrate(lambda t:t*likelihood(t))/normalizer
posterior_second=integrate(lambda t:t*t*likelihood(t))/normalizer
close(posterior_mean,6/5);close(posterior_second-posterior_mean**2,1/5)
close(fd(lambda t:-.5*t*t-.5*((3-2*t)**2+16),6/5),0)
# PCA-score covariance and whitening under the same N convention.
scores=mm(transpose(Q),Z);scoreCov=[[dot(a,b)/4 for b in scores]for a in scores]
matrix_close(scoreCov,[[8,0],[0,2]])
white=[[v/sqrt(lam)for v in row]for row,lam in zip(scores,[8,2])]
matrix_close([[dot(a,b)/4 for b in white]for a in white],identity(2))
# Uncorrelated yet dependent example.
xs=[-1,0,1];ys=[x*x for x in xs];close(sum(x*(y-2/3)for x,y in zip(xs,ys))/3,0);require(ys[1]==0 and sum(y==0 for y in ys)/3==1/3)
# Units alter covariance; original-feature standardization changes the metric.
scaled=[[100*S[0][0],10*S[0][1]],[10*S[1][0],S[1][1]]];_,directions=jacobi(scaled)
require(abs(directions[0][0])>abs(directions[1][0]))
std=[sqrt(S[i][i])for i in range(2)];correlation=[[S[i][j]/(std[i]*std[j])for j in range(2)]for i in range(2)]
matrix_close(correlation,[[1,.6],[.6,1]])
# Document matrix rank before and after centering; exact shared-pattern factors.
M=[[1,1,0,0],[1,1,0,0],[0,0,1,1],[0,0,1,1]];rawCov=mm(M,transpose(M));ev,_=jacobi(rawCov);require(sum(x>1e-9 for x in ev)==2)
_,docs,docCov=stats(transpose(M));ev,_=jacobi(docCov);require(sum(x>1e-9 for x in ev)==1)
# Lecture dimensions and all printed scalar storage counts.
N=(372//12)*(492//12);d=12**2;close(N,1271);close(N*d,183024)
for k,expected in [(60,85044),(16,22784),(6,8634),(3,4389),(1,1559)]:close(d+(d+N)*k,expected)
require(d+(d+N)*129<N*d<=d+(d+N)*130)
# Orthonormal cosine basis: direct dot products of selected 2D patterns.
p=12
patterns=[]
for u,v in product(range(4),repeat=2):
    a=sqrt(1/p)if u==0 else sqrt(2/p);b=sqrt(1/p)if v==0 else sqrt(2/p)
    patterns.append([a*b*cos(pi*(2*r+1)*u/(2*p))*cos(pi*(2*s+1)*v/(2*p))for r in range(p)for s in range(p)])
for i,first in enumerate(patterns):
    for j,second in enumerate(patterns):close(dot(first,second),int(i==j),1e-10)

# Read the published rounded dataset, independently extract patches from pixels,
# check every basis direction, and reconstruct directly in pixel space.
asset=Path(__file__).resolve().parents[1]/'writing/assets/ml-pca-patches.js'
data=json.loads(asset.read_text().split('=',1)[1].rstrip(';\n'))
h,w,p=data['height'],data['width'],data['patch'];d=p*p
pixels=data['original'];patches=[[pixels[(r+i)*w+c+j]for i in range(p)for j in range(p)]for r in range(0,h,p)for c in range(0,w,p)]
mean,centered,S=stats(patches);require(len(patches)==192 and len(mean)==144)
for actual,expected in zip(mean,data['mean']):close(actual,expected,1e-10)
basis=data['basis'];scores=data['scores'];lam=data['eigenvalues']
require(all(a+1e-12>=b>=0 for a,b in zip(lam,lam[1:])))
# Orthogonality, eigen-equations, and score identities use the independently
# recomputed covariance and pixels, not the data generator's NumPy functions.
for j,q in enumerate(basis):
    close(norm2(q),1,1e-10)
    for earlier in basis[:j]:close(dot(q,earlier),0,1e-10)
    for actual,expected in zip(mv(S,q),[lam[j]*v for v in q]):close(actual,expected,1e-9)
    for i in range(0,len(patches),7):close(dot(q,centered[i]),scores[i][j],1e-9)
close(trace(S),sum(lam),1e-9)
last=float('inf')
for k in [0,1,3,6,16,60,144]:
    recon=[[mean[j]+sum(scores[i][r]*basis[r][j]for r in range(k))for j in range(d)]for i in range(len(patches))]
    sse=sum(norm2(subtract(row,pred))for row,pred in zip(patches,recon));mse=sse/(len(patches)*d)
    close(mse,sum(lam[k:])/d,1e-10);require(mse<=last+1e-15);last=mse
    # Reassemble by spatial indexing and compare to the independent patch sum.
    assembled=[0.]*len(pixels)
    for i,row in enumerate(recon):
        r=(i//(w//p))*p;c=(i%(w//p))*p
        for a in range(p):
            for b in range(p):assembled[(r+a)*w+c+b]=row[a*p+b]
    close(sum((a-b)**2 for a,b in zip(assembled,pixels))/len(pixels),mse,1e-12)
    if k==0:
        matrix_close([recon[0]],[mean],1e-10)
    if k==144:require(mse<1e-20)
print(f'{checks} factor-model/PCA checks passed; maximum scaled discrepancy {max_scaled_error:.3g}.')
