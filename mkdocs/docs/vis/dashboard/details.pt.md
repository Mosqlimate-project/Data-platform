## Aproximação paramétrica das previsões

É aplicado um método de otimização numérica para determinar a médi ($\mu^*$) e a variância ($v^*$) de uma distribuição log-normal a partir das predições registradas na plataforma para o cálculo das métricas de pontuação. São utilizadas a mediana $m$, o intervalo inferior $l$ e superior $u$ de 90% das previsões.

Para as situações em que $m > 0$, o problema de otimização é formulado como:  

$$(\mu^\star, \sigma^\star) = 
\operatorname{argmin}_{\mu \in \mathbb{R}, \sigma \in \mathbb{R}_+} \frac{|u - \hat{u}(\mu, \sigma)|}{u} + \frac{|m - \hat{m}(\mu, \sigma)|}{m}, $$ 
na qual $\hat{m}(\mu, \sigma)$ e $\hat{u}(\mu, \sigma)$ são a mediana e o intervalo superior de 90\%  de uma distribuição log-normal com parâmetros $\mu$ e $\sigma$. Além disso, $m$ é a mediana da previsão registrada na plataforma e $u$ o intervalo superior de 90% da predição registrada. 

Para o caso específico em que $m = 0$, o problema de otimização é definido como:  

$$(\mu^\star, \sigma^\star) = \text{argmin}_{\mu \in \mathbb{R}, \sigma \in \mathbb{R}_+} \frac{|u - \hat{u}(\mu, \sigma)|}{u}.$$
