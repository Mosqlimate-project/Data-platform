# Scores

Scores de previsão são métricas que quantificam quão bem previsões probabilísticas ou pontuais correspondem aos dados observados. Todos os scores são calculados semanalmente e o valor apresentado no dashboard se refere a média no período analisado.

Para o cálculo do CRPS (Continuous Probability Ranked Score) e do Log Score (score logarítmico) as previsões precisam ser parametrizadas como distribuições de probabilidade. Para o cálculo do dashboard optou-se por parametrizá-las como distribuições log-normais. Detalhes sobre a parametrização estão disponíveis [aqui](/docs/pt/vis/dashboard/details/). 


## MAE - Erro médio absoluto

Mede a magnitude absoluta média dos erros nas previsões. Valores menores significam que as previsões estão, em média, mais próximas dos dados reais. É calculado pela expressão abaixo: 

$$\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} \left| y_i - \hat{y}_i \right|,$$

na qual, $n$ é o número total de semanas analisadas (ou previsões feitas), $y_i$ é o valor real (observado) na semana $i$ e $\hat{y}_i$ é o valor previsto (estimado) para a semana $i$.

## MSE - Erro quadrático médio

Mede a média dos quadrados das diferenças entre a previsão e a observação. O MSE penaliza mais intensamente os erros maiores. Valores menores significam que as previsões estão, em média, mais próximas dos dados reais. É calculado pela expressão abaixo:

$$\text{MSE} = \frac{1}{n} \sum_{i=1}^{n} \left( y_i - \hat{y}_i \right)^2, $$
na qual, $n$ é o número total de semanas analisadas (ou previsões feitas), $y_i$ é o valor real (observado) na semana $i$ e $\hat{y}_i é o valor previsto (estimado) para a semana $i$.

## CRPS - Pontuação de probabilidade ranqueada contínua

Mensura o quão bem a função de distribuição acumulada (CDF) prevista corresponde aos dados observados. Valores menores indicam que a distribuição prevista corresponde melhor ao resultado observado. É calculado pela expressão abaixo:

$$\text{Mean CRPS} = \frac{1}{n} \sum_{i=1}^{n} \text{CRPS}(\text{LN}(\mu_i, \sigma_i), y_i), $$
sendo, 
$$ \text{CRPS}(\text{LN}(\mu_i, \sigma_i), y_i) = y_i \left[ 2\Phi(y_i) - 1 \right] - \\ 2\exp\left(\mu_i + \frac{\sigma_i^2}{2}\right) \left[ \Phi(\omega_i - \sigma_i) + \Phi\left(\frac{\sigma_i} {\sqrt{2}}\right) \right], $$ 
na qual, $\Phi$ é a função de distribuição acumulada da distribuição normal padrão e $\omega_i = \frac{\text{log}y_i - \mu_i}{\sigma_i}$, em que $y_i$ são os dados observados na semana $i$, e $\mu_i$ e $\sigma_i$ são os parâmetros da ditribuição log-normal na semana $i$. Detalhes sobre como os parâmetros da distribuição são obtidos estão disponíveis [aqui](/docs/pt/vis/dashboard/details/). 

## Log Score - Pontuação logarítmica

Mensura o log da probabilidade atribuída ao valor observado pela distribuição prevista. Valores maiores indicam que a distribuição prevista corresponde melhor ao resultado observado. É calculado pela expressão abaixo:

$$\text{Mean LogS} = \frac{1}{n} \sum_{i=1}^{n} \text{LogS}(\text{LN}(\mu_i, \sigma_i), y_i), $$
sendo, 

$$\text{LogS}(\text{LN}(\mu_i, \sigma_i), y_i) = \log y_i + \log \sigma_i + \frac{1}{2} \log (2\pi) \\ + \frac{(\log y_i - \mu_i)^2}{2\sigma_i^2},$$

na qual, $y_i$ são os dados observados na semana $i$, e $\mu_i$ e $\sigma_i$ são os parâmetros da ditribuição log-normal na semana $i$. Detalhes sobre como os parâmetros da distribuição são obtidos estão disponíveis [aqui](/docs/pt/vis/dashboard/details/).  

## Interval Score

Na análise da performance das previsões avalia os intervalos de previsão. No dashboard são utilizados os intervalos de 90% das previsões. Valores menores significam que as previsões estão, em média, mais próximas dos dados reais. É calculado pela expressão abaixo:

$$\text{Mean } S^{int}_\alpha = \frac{1}{n} \sum_{i=1}^{n} S^{int}_\alpha(l_i, u_i; y_i), $$
sendo, 
$$S^{int}_\alpha(l_i, u_i; y_i) = u_i - l_i + \cfrac{2}{\alpha}(l_i - y_i)I\{y_i < l_i\} \\ + \cfrac{2}{\alpha}(y_i - u_i)I\{y_i > u_i\}, $$

na qual $I$ é a função indicadora (tem valor 1 se a condição é verdadeira, e 0 caso contrário), $\alpha$ é o nível de significância do intervalo, $u_i$ é o limite superior do intervalo na semana $i$, e $l_i$ o limite inferior.


## Weighted Interval Score (WIS)

O WIS é calculado utilizando todos os percentis disponíveis da previsão. Seu valor é obtido a partir da equação abaixo:
$$
\text{WIS}(F, y) = \frac{1}{K + 1/2} \left( w_0|y - m| + \sum_{k=1}^K [w_K S^{int}_{\alpha_k} (l_K, u_K; y) ]\right), 
$$

por padrão, \( w_k = \frac{\alpha_k}{2} \) e \( w_0 = \frac{1}{2} \).  
Nessa equação, \( K \) representa o número de intervalos, enquanto \( l_k \) e \( u_k \) denotam, respectivamente, os limites inferior e superior do \( k \)-ésimo intervalo de confiança.  
A implementação define os valores de \( \alpha_k \) com base nos nomes das colunas de previsão.
