"""Deterministic independent checks for the regression/GDA chapter (stdlib only).

Compare analytic likelihood derivatives with central finite differences, fit
joint and conditional regression separately, and compare discriminant scores
with normalized Gaussian densities. No website runtime dependency is needed.
"""
from math import exp, log, pi, sqrt, isclose
from itertools import product

count=0
max_scaled_error=0.0

def close(actual,expected,tol=2e-7):
    global count,max_scaled_error
    err=abs(actual-expected)/max(1,abs(actual),abs(expected))
    assert err<tol,(actual,expected,err)
    count+=1;max_scaled_error=max(max_scaled_error,err)

def transpose(a):return list(map(list,zip(*a)))
def mm(a,b):return [[sum(x*y for x,y in zip(row,col)) for col in zip(*b)] for row in a]
def mv(a,v):return [sum(x*y for x,y in zip(row,v)) for row in a]
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def outer(a,b):return [[x*y for y in b] for x in a]
def subtract(a,b):return [x-y for x,y in zip(a,b)]
def identity(n):return [[float(i==j) for j in range(n)]for i in range(n)]

def inverse(a):
    n=len(a);rows=[list(row)+unit for row,unit in zip(a,identity(n))]
    for i in range(n):
        j=max(range(i,n),key=lambda j:abs(rows[j][i]))
        assert abs(rows[j][i])>1e-12,'singular matrix'
        rows[i],rows[j]=rows[j],rows[i];p=rows[i][i];rows[i]=[x/p for x in rows[i]]
        for j in range(n):
            if j!=i:
                p=rows[j][i];rows[j]=[x-p*y for x,y in zip(rows[j],rows[i])]
    return [r[n:] for r in rows]

def determinant(a):
    rows=[list(r)for r in a];n=len(rows);value=1.
    for i in range(n):
        j=max(range(i,n),key=lambda j:abs(rows[j][i]))
        if abs(rows[j][i])<1e-14:return 0.
        if i!=j:rows[i],rows[j]=rows[j],rows[i];value=-value
        p=rows[i][i];value*=p
        for j in range(i+1,n):
            t=rows[j][i]/p
            for k in range(i+1,n):rows[j][k]-=t*rows[i][k]
    return value

def stats(data):
    n=len(data);p=len(data[0]);mean=[sum(r[j] for r in data)/n for j in range(p)]
    cov=[[sum((r[i]-mean[i])*(r[j]-mean[j])for r in data)/n for j in range(p)]for i in range(p)]
    return mean,cov

def gaussian_log(x,mean,cov):
    delta=subtract(x,mean)
    return -.5*(len(x)*log(2*pi)+log(determinant(cov))+dot(delta,mv(inverse(cov),delta)))

def precision_objective(data,mean,precision):
    return len(data)/2*log(determinant(precision))-.5*sum(dot(subtract(z,mean),mv(precision,subtract(z,mean)))for z in data)

def fd(f,x,h=1e-5):return (f(x+h)-f(x-h))/(2*h)

# Full likelihood derivatives: means and symmetric precision coordinates.
data=[[0,1],[1,2],[2,2],[3,5]];mean=[.8,1.4];P=[[1.7,.3],[.3,.9]];n=len(data)
r=[subtract(z,mean)for z in data];T=mm(transpose(r),r);invP=inverse(P)
for j in range(2):
    def f(value):
        m=mean[:];m[j]=value;return precision_objective(data,m,P)
    close(fd(f,mean[j]),mv(P,[sum(z[k]for z in r)for k in range(2)])[j])
for i in range(2):
    for j in range(i,2):
        def f(value):
            p=[row[:]for row in P];p[i][j]=p[j][i]=value
            return precision_objective(data,mean,p)
        analytic=(n/2*invP[i][j]-.5*T[i][j])*(1 if i==j else 2)
        close(fd(f,P[i][j]),analytic)
mu,S=stats(data);Pinv=inverse(S)
for j in range(2):
    def f(value):
        m=mu[:];m[j]=value;return precision_objective(data,m,Pinv)
    close(fd(f,mu[j]),0)
# The analytic MLE must beat all tested nonsingular candidate distributions.
opt=sum(gaussian_log(z,mu,S)for z in data)
for shift0,shift1,l0,l1,off in product((-.5,0,.5),(-.5,0,.5),(.5,1,2),(.5,1,2),(-.4,.3)):
    L=[[l0,0],[off,l1]];cov=mm(L,transpose(L));m=[mu[0]+shift0,mu[1]+shift1]
    assert sum(gaussian_log(z,m,cov)for z in data)<=opt+1e-10
    count+=1
close(mu[0],1.5);close(mu[1],2.5);close(S[0][0],1.25);close(S[0][1],1.5);close(S[1][1],2.25)
# Direct least squares versus the conditional of a fitted JOINT Gaussian.
for features,targets in [([[0],[1],[2],[3]],[1,2,2,5]),
                         ([[0,0],[1,0],[0,1],[1,1],[2,-1],[-1,2]],[1,3,0,2,7,-2])]:
    design=[[1]+x for x in features];t=transpose(design)
    coefficients=mv(inverse(mm(t,design)),mv(t,targets))
    z=[x+[y]for x,y in zip(features,targets)];m,cov=stats(z);d=len(features[0]);N=len(z)
    cxx=[row[:d]for row in cov[:d]];cxy=[row[d]for row in cov[:d]]
    beta=mv(inverse(cxx),cxy);intercept=m[d]-dot(beta,m[:d]);variance=cov[d][d]-dot(cxy,beta)
    close(intercept,coefficients[0])
    for a,b in zip(beta,coefficients[1:]):close(a,b)
    residuals=[y-dot(row,coefficients)for row,y in zip(design,targets)];sse=dot(residuals,residuals)
    close(variance,sse/N)
    for column in t:close(dot(column,residuals),0)
    for row,y in zip(design,targets):
        close(gaussian_log([y], [dot(row,coefficients)],[[variance]])+
              gaussian_log(row[1:],m[:d],cxx),gaussian_log(row[1:]+[y],m,cov))
    close(fd(lambda v: -N/2*log(v)-sse/(2*v),variance),0)
# Degrees of freedom: enumerate all independent +/-1 noise vectors; each has
# mean zero, variance one. Average residual SSE equals N - fitted rank.
A=[[1,0],[1,1],[1,2],[1,3]];At=transpose(A);fit_matrix=mm(inverse(mm(At,A)),At)
sses=[]
for noise in product((-1,1),repeat=4):
    fitted=mv(A,mv(fit_matrix,noise));residual=subtract(noise,fitted);sses.append(dot(residual,residual))
close(sum(sses)/len(sses),2)
# Unknown-mean Gaussian unbiased covariance: same finite noise enumeration.
close(sum(sum((v-sum(e)/4)**2 for v in e)for e in product((-1,1),repeat=4))/16,3)
# Singular covariance likelihood increases as unused variance shrinks.
singular_data=[[-1,-1],[0,0],[1,1]]
likelihoods=[]
for epsilon in (.1,.01,.001):
    # Eigenvalues 2 (along the observed line) and epsilon orthogonal to it.
    cov=[[(2+epsilon)/2,(2-epsilon)/2],[(2-epsilon)/2,(2+epsilon)/2]]
    likelihoods.append(sum(gaussian_log(z,[0,0],cov)for z in singular_data))
assert likelihoods[0]<likelihoods[1]<likelihoods[2];count+=1
# Constrained shared-mean counterexample: joint optimum differs.
close(fd(lambda t:-.5*((10-t)**2+t*t),5),0)
close(fd(lambda t:-.5*t*t,0),0)

def fit_gda(points,labels):
    N=len(points);d=len(points[0]);groups=[[x for x,y in zip(points,labels)if y==k]for k in (0,1)]
    means=[stats(group)[0]for group in groups]
    residual=[subtract(x,means[y])for x,y in zip(points,labels)]
    cov=[[sum(r[i]*r[j]for r in residual)/N for j in range(d)]for i in range(d)]
    return sum(labels)/N,means,cov

def gda_loglike(points,labels,prior,means,cov):
    return sum(log(prior if y else 1-prior)+gaussian_log(x,means[y],cov)for x,y in zip(points,labels))

points=[[-2,-1],[-1,0],[0,-1],[1,1],[2,0],[3,1]];labels=[0,0,0,1,1,1]
prior,means,cov=fit_gda(points,labels)
close(prior,.5)
for a,b in zip(means[0],[-1,-2/3]):close(a,b)
for a,b in zip(means[1],[2,2/3]):close(a,b)
for i in range(2):
    for j in range(2):close(cov[i][j],(2/3 if i==0 else 2/9)if i==j else 0)
close(fd(lambda p:gda_loglike(points,labels,p,means,cov),prior),0)
for k in (0,1):
    for j in range(2):
        def f(value):
            m=[v[:]for v in means];m[k][j]=value
            return gda_loglike(points,labels,prior,m,cov)
        close(fd(f,means[k][j]),0)
for i in range(2):
    for j in range(i,2):
        def f(value):
            c=[row[:]for row in cov];c[i][j]=c[j][i]=value
            return gda_loglike(points,labels,prior,means,c)
        close(fd(f,cov[i][j]),0)
# Within + between covariance equals total covariance on an imbalanced sample.
for pts,ys in [(points,labels),(points+[[4,2]],labels+[1])]:
    pr,m,c=fit_gda(pts,ys);total=stats(pts)[1];delta=subtract(m[1],m[0])
    for i in range(2):
        for j in range(2):close(c[i][j]+pr*(1-pr)*delta[i]*delta[j],total[i][j])
# Verify a pooled covariance can be invertible when both class scatters are singular.
pr,m,c=fit_gda([[-1,0],[1,0],[0,-1],[0,1]],[0,0,1,1]);close(determinant(c),.25)
# Discriminant coefficients agree with direct log density ratios at many points.
for cov,means,prior in [([[2/3,0],[0,2/9]],[[-1,-2/3],[2,2/3]],.5),
                        ([[2,.7],[.7,1]],[[-1,2],[2,-.5]],.2)]:
    P=inverse(cov);w=mv(P,subtract(means[1],means[0]));b=-.5*(dot(means[1],mv(P,means[1]))-dot(means[0],mv(P,means[0])))+log(prior/(1-prior))
    for x in product((-3,0,1,4),repeat=2):
        log0=log(1-prior)+gaussian_log(x,means[0],cov);log1=log(prior)+gaussian_log(x,means[1],cov)
        close(dot(w,x)+b,log1-log0)
        M=max(log0,log1);p=exp(log1-M)/(exp(log0-M)+exp(log1-M))
        close(p,1/(1+exp(-(dot(w,x)+b))))
close(1/(1+exp(-2.25)),.9046505351008906)
# The one-dimensional workbench's quadratic coefficients, independently
# compared with Gaussian log densities for separate and shared variances.
for m0,m1,s0,s1,pr in [(-1,1,1,1,.5),(-1,1,1,1,.8),(0,0,1,2,.5),(-2,1,.5,1.5,.3)]:
    v0,v1=s0*s0,s1*s1;aa=.5*(1/v0-1/v1);bb=m1/v1-m0/v0;cc=log(pr/(1-pr))-.5*log(v1/v0)-.5*(m1*m1/v1-m0*m0/v0)
    for x in (-8,-2,0,.5,3,8):
        close(aa*x*x+bb*x+cc,log(pr/(1-pr))+gaussian_log([x],[m1],[[v1]])-gaussian_log([x],[m0],[[v0]]))
root=sqrt(8*log(2)/3)
for r in (-root,root):close(gaussian_log([r],[0],[[1]]),gaussian_log([r],[0],[[4]]))
close(2*(-log(4)/2)+log(4),0);close(2*(log(4)/2),log(.8/.2))
# Repeated boundary (prior=2/3) and no crossing (prior=.95) in unequal variances.
close(log((2/3)/(1/3))-log(2),0)
assert log(.95/.05)-log(2)>0;count+=1
# Mixture moments computed from component raw second moments.
mean=.25*(-2)+.75*2
close(mean,1);close(.25*(1+4)+.75*(1+4)-mean*mean,4)
print(f'Passed {count} regression/GDA checks; largest scaled discrepancy {max_scaled_error:.3g}.')
