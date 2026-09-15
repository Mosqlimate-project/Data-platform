# Fazendo requisições assíncronas em R

Requisições assíncronas são úteis quando há muitas `pages` para buscar de forma síncrona. Elas aceleram a requisição várias vezes e podem ser usadas em qualquer requisição paginada da API do Mosqlimate. O exemplo abaixo é escrito em R.

Requisitos:

- [httr2](https://httr2.r-lib.org/) (requisições HTTP assíncronas)
- [jsonlite](https://cran.r-project.org/web/packages/jsonlite/index.html) (análise de JSON)
- [dplyr](https://dplyr.tidyverse.org/) (manipulação de dados)

As requisições da API exigem um token `X-UID-Key`. Obtenha o seu na [página de perfil do usuário](https://mosqlimate.org/profile/auth), conforme descrito na seção [Autorização](../uid-key.pt.md).

## 1. Configure os parâmetros da requisição

A primeira coisa importante a observar é que a paginação da resposta varia de acordo com os parâmetros da requisição. Então, primeiramente, vamos anotar os parâmetros que comporão a URL da chamada.

```R
library(httr2)
library(jsonlite)
library(dplyr)

# Sua chave de API: https://mosqlimate.org/profile/auth
api_key <- "SUA_X_UID_KEY"

# URL base de qualquer endpoint paginado. Aqui usamos o endpoint de métricas
# de vegetação, mas o mesmo padrão vale para todos os endpoints do datastore.
base_url <- "https://api.mosqlimate.org/api/datastore/vegetation/"

# Parâmetros da requisição. Filtros opcionais (intervalo de datas, estado,
# ...) podem ser adicionados aqui — quanto mais específicos os filtros,
# menos páginas haverá para buscar.
parameters <- list(
  per_page = 100L,          # até 100 itens por página
  start    = "2024-01-01",  # AAAA-mm-dd
  end      = "2024-12-31",
  uf       = "SP"           # opcional: apenas resultados do estado de SP
)

# Auxiliar para compor a URL da requisição com o parâmetro de página.
compose_url <- function(base_url, parameters, page = 1L) {
  url <- httr2::url_parse(base_url)
  url$query <- c(parameters, page = as.character(page))
  httr2::url_build(url)
}
```

## 2. Inspecione a paginação

Toda resposta carrega um campo `pagination` descrevendo quantos itens, quantas páginas e quantos itens por página a requisição retorna. Vamos buscar a primeira página para lê-lo:

```R
resp <- httr2::request(compose_url(base_url, parameters)) |>
  httr2::req_headers(`X-UID-Key` = api_key) |>
  httr2::req_perform()

payload <- httr2::resp_body_json(resp)
pagination <- payload$pagination
pagination
```

que resulta em algo como:

```
$items
[1] 100

$total_items
[1] 59340

$page
[1] 1

$total_pages
[1] 594

$per_page
[1] 100
```

Para obter todos os dados da requisição, seria necessário percorrer todas as 594 páginas — o que leva um (bom) tempo se chamado de forma síncrona. Adicionar filtros (como um estado `uf` ou um intervalo de datas) ajuda a reduzir o número de páginas e o tempo de busca dos dados.

## 3. Faça as requisições de forma concorrente

Em vez de percorrer página por página, construímos uma requisição para cada página restante e enviamos todas de uma vez. O pacote `httr2` cuida da concorrência e ainda oferece novas tentativas e limitação de taxa (rate limiting) embutidas.

```R
# Construa uma requisição para cada página restante (da página 2 até a última).
requests <- lapply(2:pagination$total_pages, function(page) {
  httr2::request(compose_url(base_url, parameters, page)) |>
    # inclua a chave da API em todas as requisições
    httr2::req_headers(`X-UID-Key` = api_key) |>
    # tente novamente requisições com falha (ex.: limites 429 e erros 5xx)
    httr2::req_retry(max_tries = 3, backoff = ~ 0.2) |>
    # limite a taxa para respeitar o limite da API
    # (contas logadas têm por padrão 10 requisições por segundo)
    httr2::req_throttle(capacity = 10, fill_time_s = 1)
})

# Envie todas as requisições de forma concorrente. `on_error = "continue"`
# mantém as respostas que não falharam em vez de abortar todo o lote.
responses <- httr2::req_perform_parallel(requests, on_error = "continue")
```

Buscar todas as 594 páginas leva cerca de um minuto em uma conta logada (que tem por padrão 10 requisições por segundo), enquanto um loop síncrono página por página levaria muito mais tempo. A abordagem concorrente também aproveita ao máximo o seu limite de taxa disponível.

> **WARNING**  
> Os limites de taxa dependem do tipo de conta: usuários logados têm por padrão **10 requisições por segundo**, enquanto chaves de convidado temporárias são limitadas a **100 requisições por dia** e não conseguem buscar todo este conjunto de dados. Ajuste as configurações do `req_throttle()` e os filtros da requisição para corresponder ao limite da sua conta.

## 4. Combine os resultados em um data.frame

Os itens de cada página estão no campo `items` da resposta. Nós os achatamos em uma única lista de linhas e os unimos em um único `data.frame`:

```R
items <- responses |>
  lapply(httr2::resp_body_json) |>
  lapply(`[[`, "items") |>
  unlist(recursive = FALSE) |>
  lapply(as.data.frame) |>
  dplyr::bind_rows()

head(items)
```

```
        date geocode  collection attribute      mean       std    median
1 2024-01-09 5003702 myd13q1-6.1      SAVI 0.5700181 0.1336494 0.5860384
2 2024-01-09 5003751 myd13q1-6.1      SAVI 0.4769734 0.1385892 0.4787536
3 2024-01-09 5003801 myd13q1-6.1      SAVI 0.5167235 0.1071886 0.5276168
...
```

Todo o conjunto de dados agora está disponível em um único `data.frame` para manipulação posterior. O mesmo padrão funciona para todos os endpoints paginados da API do Mosqlimate — basta trocar a `base_url` e os `parameters`.
