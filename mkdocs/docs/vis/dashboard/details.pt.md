## Aproximação Paramétrica das Previsões

As previsões do Mosqlimate podem fornecer quantis correspondentes à mediana e aos intervalos de predição de 50%, 80%, 90% e 95%. Para obter uma distribuição preditiva completa a partir desses quantis, ajustamos uma distribuição log-normal utilizando **estimação por correspondência de quantis** (*quantile-matching estimation*).

Seja

$$
\boldsymbol{\alpha} = (\alpha_1, \ldots, \alpha_L)
$$

o vetor dos níveis de probabilidade acumulada associados aos quantis disponíveis, e seja

$$
\boldsymbol{q} = (q_1, \ldots, q_L)
$$

o vetor dos valores previstos correspondentes. Nosso objetivo é estimar os parâmetros $(\mu, \sigma)$ de uma distribuição log-normal cujos quantis teóricos melhor correspondam aos quantis previstos.

Assuma que

$$
X \sim \text{LogNormal}(\mu, \sigma^2).
$$

Então,

$$
\log(X) \sim \mathcal{N}(\mu, \sigma^2).
$$

Para um determinado nível de probabilidade $(\alpha_i)$, o quantil teórico correspondente satisfaz

$$
q_i = \exp\left(\mu + \sigma z_i\right),
$$

onde

$$
z_i = \Phi^{-1}(\alpha_i)
$$

e $\Phi^{-1}$ denota a função distribuição acumulada inversa (função quantil) da distribuição normal padrão.

Aplicando logaritmo em ambos os lados, obtemos

$$
\log(q_i) = \mu + \sigma z_i.
$$

Portanto, estimar uma distribuição log-normal a partir de um conjunto de quantis previstos pode ser formulado como um simples problema de regressão linear:

$$
\log(q_i) = \mu + \sigma z_i + \varepsilon_i,
$$

onde:

* $\log(q_i)$ é a variável resposta;
* $z_i = \Phi^{-1}(\alpha_i)$ é a variável preditora;
* o intercepto estima $(\mu)$;
* a inclinação estima $(\sigma)$.

Os parâmetros podem então ser estimados utilizando mínimos quadrados ordinários. Seja

$$
y_i = \log(q_i),
$$

e definam-se, sendo $L$ o número de quantis,

$$
\bar y = \frac{1}{L}\sum_{i=1}^{L} y_i,
\qquad
\bar z = \frac{1}{L}\sum_{i=1}^{L} z_i,
$$

onde $L$ representa o número de quantis disponíveis. As estimativas de mínimos quadrados são

$$
\hat{\sigma}
=
\frac{\sum_{i=1}^{L}(z_i-\bar z)(y_i-\bar y)}
     {\sum_{i=1}^{L}(z_i-\bar z)^2},
$$

e

$$
\hat{\mu}
=
\bar y - \hat{\sigma}\,\bar z.
$$

Substituindo $y_i = \log(q_i)$, obtemos

$$
\hat{\sigma}
=
\frac{\sum_{i=1}^{L}(z_i-\bar z)\left[\log(q_i)-\overline{\log(q)}\right]}
     {\sum_{i=1}^{L}(z_i-\bar z)^2},
$$

e

$$
\hat{\mu}
=
\overline{\log(q)}
-
\hat{\sigma}\,\bar z.
$$

---

## Antes do IMDC 2025

Antes do IMDC 2025, as previsões forneciam apenas três quantidades: a previsão mediana (`pred`) e os limites inferior e superior do intervalo de predição de 90%. A distribuição log-normal era então reconstruída utilizando o procedimento descrito abaixo.

Um método de otimização numérica é aplicado para determinar a média ($\mu^\star$) e a variância ($v^\star$) de uma distribuição log-normal com base nas previsões registradas na plataforma, com o objetivo de calcular métricas de avaliação (*scoring metrics*). O método utiliza a mediana $m$ e os limites inferior $l$ e superior $u$ do intervalo de predição de 90%.

Para os casos em que $m > 0$, o problema de otimização é formulado como:

$$
(\mu^\star, \sigma^\star) =
\operatorname{argmin}_{\mu \in \mathbb{R}, \sigma \in \mathbb{R}_+}
\frac{|u - \hat{u}(\mu, \sigma)|}{u}
+
\frac{|m - \hat{m}(\mu, \sigma)|}{m},
$$

onde $\hat{m}(\mu, \sigma)$ e $\hat{u}(\mu, \sigma)$ são, respectivamente, a mediana e o limite superior do intervalo de predição de 90% de uma distribuição log-normal com parâmetros $\mu$ e $\sigma$. Além disso, $m$ é a mediana prevista registrada na plataforma e $u$ é o limite superior do intervalo de predição de 90% da previsão submetida.

Para o caso específico em que $m = 0$, o problema de otimização é definido como:

$$
(\mu^\star, \sigma^\star)
=
\operatorname{argmin}_{\mu \in \mathbb{R}, \sigma \in \mathbb{R}_+}
\frac{|u - \hat{u}(\mu, \sigma)|}{u}.
$$
