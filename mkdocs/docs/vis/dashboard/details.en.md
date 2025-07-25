## Parametric Approximation of Forecasts

A numerical optimization method is applied to determine the mean ($\mu^*$) and variance ($v^*$) of a log-normal distribution based on the predictions recorded on the platform, for the purpose of computing scoring metrics. The method uses the median $m$, and the lower $l$ and upper $u$ bounds of the 90% prediction interval.

For cases where $m > 0$, the optimization problem is formulated as:

$$(\mu^\star, \sigma^\star) = 
\operatorname{argmin}_{\mu \in \mathbb{R}, \sigma \in \mathbb{R}_+} \frac{|u - \hat{u}(\mu, \sigma)|}{u} + \frac{|m - \hat{m}(\mu, \sigma)|}{m},$$

where $\hat{m}(\mu, \sigma)$ and $\hat{u}(\mu, \sigma)$ are the median and the 90% upper bound of a log-normal distribution with parameters $\mu$ and $\sigma$. Additionally, $m$ is the forecast median recorded on the platform, and $u$ is the 90% upper bound of the submitted forecast.

For the specific case where $m = 0$, the optimization problem is defined as:

$$(\mu^\star, \sigma^\star) = \operatorname{argmin}_{\mu \in \mathbb{R}, \sigma \in \mathbb{R}_+} \frac{|u - \hat{u}(\mu, \sigma)|}{u}.$$
