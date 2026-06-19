## Parametric Approximation of Forecasts

Mosqlimate forecasts may provide quantiles corresponding to the median, 50%, 80%, 90%, and 95% prediction intervals. To obtain a full predictive distribution from these quantiles, we fit a log-normal distribution using **quantile-matching estimation**.

Let

$$
\boldsymbol{\alpha} = (\alpha_1, \ldots, \alpha_L)
$$

be the cumulative probability levels associated with the available quantiles, and let

$$
\boldsymbol{q} = (q_1, \ldots, q_L)
$$

be the corresponding forecasted values.. Our goal is to estimate the parameters ($\mu$, $\sigma$) of a log-normal distribution whose theoretical quantiles best match the forecasted quantiles.

Assume that

$$
X \sim \text{LogNormal}(\mu, \sigma^2).
$$

Then

$$
\log(X) \sim \mathcal{N}(\mu, \sigma^2).
$$

For a given probability level ($\alpha_i$), the corresponding theoretical quantile satisfies

$$
q_i = \exp\left(\mu + \sigma z_i\right),
$$

where

$$
z_i = \Phi^{-1}(\alpha_i)
$$

and $\Phi^{-1}$ denotes the inverse cumulative distribution function (quantile function) of the standard normal distribution.

Taking logarithms yields

$$
\log(q_i) = \mu + \sigma z_i.
$$

Therefore, estimating a log-normal distribution from a set of forecasted quantiles can be formulated as a simple linear regression problem:

$$
\log(q_i) = \mu + \sigma z_i + \varepsilon_i,
$$

where:

* $\log(q_i)$ is the response variable;
* $z_i = \Phi^{-1}(\alpha_i)$ is the predictor;
* the intercept estimates ($\mu$);
* the slope estimates ($\sigma$).

The parameters can then be estimated using ordinary least squares. Let

$$
y_i = \log(q_i),
$$

and define, being $L$ the number of quantiles

$$
\bar y = \frac{1}{L}\sum_{i=1}^{L} y_i,
\qquad
\bar z = \frac{1}{L}\sum_{i=1}^{L} z_i,
$$

where $L$ denotes the number of available quantiles. The least-squares estimates are

$$
\hat{\sigma}
=
\frac{\sum_{i=1}^{L}(z_i-\bar z)(y_i-\bar y)}
     {\sum_{i=1}^{L}(z_i-\bar z)^2},
$$

and

$$
\hat{\mu}
=
\bar y - \hat{\sigma}\,\bar z.
$$

Substituting $y_i = \log(q_i)$ gives

$$
\hat{\sigma}
=
\frac{\sum_{i=1}^{L}(z_i-\bar z)\left[\log(q_i)-\overline{\log(q)}\right]}
     {\sum_{i=1}^{L}(z_i-\bar z)^2},
$$

and

$$
\hat{\mu}
=
\overline{\log(q)}
-
\hat{\sigma}\,\bar z.
$$



## Before IMDC 2025

Prior to IMDC 2025, forecasts provided only three quantities: the median prediction (`pred`) and the lower and upper bounds of the 90% prediction interval. The log-normal distribution was therefore reconstructed using the procedure described below.

A numerical optimization method is applied to determine the mean ($\mu^*$) and variance ($v^*$) of a log-normal distribution based on the predictions recorded on the platform, for the purpose of computing scoring metrics. The method uses the median $m$, and the lower $l$ and upper $u$ bounds of the 90% prediction interval.

For cases where $m > 0$, the optimization problem is formulated as:

$$(\mu^\star, \sigma^\star) = 
\operatorname{argmin}_{\mu \in \mathbb{R}, \sigma \in \mathbb{R}_+} \frac{|u - \hat{u}(\mu, \sigma)|}{u} + \frac{|m - \hat{m}(\mu, \sigma)|}{m},$$

where $\hat{m}(\mu, \sigma)$ and $\hat{u}(\mu, \sigma)$ are the median and the 90% upper bound of a log-normal distribution with parameters $\mu$ and $\sigma$. Additionally, $m$ is the forecast median recorded on the platform, and $u$ is the 90% upper bound of the submitted forecast.

For the specific case where $m = 0$, the optimization problem is defined as:

$$(\mu^\star, \sigma^\star) = \operatorname{argmin}_{\mu \in \mathbb{R}, \sigma \in \mathbb{R}_+} \frac{|u - \hat{u}(\mu, \sigma)|}{u}.$$
