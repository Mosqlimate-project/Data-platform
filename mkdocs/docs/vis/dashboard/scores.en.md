# Scores

Forecast scores are metrics that quantify how well probabilistic or point forecasts match the observed data. All scores are calculated weekly, and the value shown in the dashboard refers to the average over the analyzed period.

For the calculation of CRPS (Continuous Ranked Probability Score) and the Log Score (logarithmic score), forecasts must be parameterized as probability distributions. For the dashboard, we chose to parameterize them as log-normal distributions. Details about the parameterization are available [here](/docs/vis/dashboard/details/).

## MAE - Mean Absolute Error

Measures the average absolute magnitude of the forecast errors. Lower values indicate that the forecasts are, on average, closer to the actual data. It is calculated by the following expression:

$$\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} \left| y_i - \hat{y}_i \right|,$$

where $n$ is the total number of weeks analyzed (or forecasts made), $y_i$ is the actual (observed) value in week $i$, and $\hat{y}_i$ is the forecasted (estimated) value for week $i$.

## MSE - Mean Squared Error 

Measures the mean of the squared differences between the forecast and the observation. MSE penalizes larger errors more heavily. Lower values indicate that the forecasts are, on average, closer to the actual data. It is calculated by the following expression:

$$\text{MSE} = \frac{1}{n} \sum_{i=1}^{n} \left( y_i - \hat{y}_i \right)^2, $$

where $n$ is the total number of weeks analyzed (or forecasts made), $y_i$ is the actual (observed) value in week $i$, and $\hat{y}_i$ is the forecasted (estimated) value for week $i$.

## CRPS - Continuous Ranked Probability Score

Measures how well the predicted cumulative distribution function (CDF) matches the observed data. Lower values indicate that the predicted distribution better matches the observed outcome. It is calculated by the following expression:

$$\text{Mean CRPS} = \frac{1}{n} \sum_{i=1}^{n} \text{CRPS}(\text{LN}(\mu_i, \sigma_i), y_i), $$

where

$$ \text{CRPS}(\text{LN}(\mu_i, \sigma_i), y_i) = y_i \left[ 2\Phi(y_i) - 1 \right] - \\ 2\exp\left(\mu_i + \frac{\sigma_i^2}{2}\right) \left[ \Phi(\omega_i - \sigma_i) + \Phi\left(\frac{\sigma_i} {\sqrt{2}}\right) \right], $$ 

in which $\Phi$ is the cumulative distribution function of the standard normal distribution and $\omega_i = \frac{\log y_i - \mu_i}{\sigma_i}$, where $y_i$ is the observed value in week $i$, and $\mu_i$ and $\sigma_i$ are the parameters of the log-normal distribution in week $i$. Details on how the distribution parameters are obtained are available [here](/docs/vis/dashboard/details/).

## Log Score

Measures the logarithm of the probability assigned to the observed value by the predicted distribution. Higher values indicate that the predicted distribution better matches the observed outcome. It is calculated by the following expression:

$$\text{Mean LogS} = \frac{1}{n} \sum_{i=1}^{n} \text{LogS}(\text{LN}(\mu_i, \sigma_i), y_i), $$

where

$$\text{LogS}(\text{LN}(\mu_i, \sigma_i), y_i) = \log y_i + \log \sigma_i + \frac{1}{2} \log (2\pi) \\ + \frac{(\log y_i - \mu_i)^2}{2\sigma_i^2},$$

in which $y_i$ is the observed value in week $i$, and $\mu_i$ and $\sigma_i$ are the parameters of the log-normal distribution in week $i$. Details on how the distribution parameters are obtained are available [here](/docs/vis/dashboard/details/).

## Interval Score

In the evaluation of forecast performance, it assesses the prediction intervals. In the dashboard, 90% prediction intervals are used. Lower values indicate that the forecasts are, on average, closer to the actual data. It is calculated by the following expression:

$$\text{Mean } S^{int}_\alpha = \frac{1}{n} \sum_{i=1}^{n} S^{int}_\alpha(l_i, u_i; y_i), $$

where

$$S^{int}_\alpha(l_i, u_i; y_i) = u_i - l_i + \cfrac{2}{\alpha}(l_i - y_i)I\{y_i < l_i\} \\ + \cfrac{2}{\alpha}(y_i - u_i)I\{y_i > u_i\}, $$

in which $I$ is the indicator function (equals 1 if the condition is true, and 0 otherwise), $\alpha$ is the significance level of the interval, $u_i$ is the upper bound of the interval in week $i$, and $l_i$ is the lower bound.


## Weighted Interval Score (WIS)

The WIS is calculated using all the available percentiles of the prediction. Its value is obtained from the equation below:

$$
\text{WIS}(F, y) = \frac{1}{K + 1/2} \left( w_0|y - m| + \sum_{k=1}^K [w_K S^{int}_{\alpha_k} (l_K, u_K; y) ]\right), 
$$

by default, \( w_k = \frac{\alpha_k}{2} \) and \( w_0 = \frac{1}{2} \). In this equation, \( K \) denotes the number of intervals, and \( l_k \) and \( u_k \) represent the lower and upper bounds of the \( k \)-th confidence interval, respectively. The implementation defines the \( \alpha_k \) values based on the names of the prediction columns.
