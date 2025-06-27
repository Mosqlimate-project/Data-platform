## [Dados de Abundância de Mosquitos](https://api.mosqlimate.org/api/docs#/datastore/datastore_api_get_contaovos)
Aqui você tem acesso a dados de abundância de mosquitos do projeto [Contaovos](https://contaovos.dengue.mat.br/), co-desenvolvido pelo projeto Mosqlimate. Esses dados, descritos abaixo, são baseados em armadilhas de ovos distribuídas por todo o Brasil de acordo com um desenho de monitoramento especificado pelo Ministério da Saúde.

Para mais informações, acesse a página da [API Contaovos](https://contaovos.com/pt-br/api/).

## Tabela de Parâmetros
### Entrada
| Nome do Parâmetro | Obrigatório | Tipo | Descrição |
|---|---|---|---|
| date_start | não | date | Formato ISO. Exemplo: "2024-01-01" |
| date_end | não | date | Formato ISO. Exemplo: "2025-01-01" |
| state | não | str | UF. Exemplo: "MG" |
| page | não | int | Página a ser exibida |
| municipality | não | str | Nome da cidade. Exemplo: "Ponta Porã" |

### Saída
| Nome do Parâmetro | Tipo | Descrição |
|---|---|---|
| counting_id | int ||
| date | str ||
| date_collect | str ||
| eggs | int | Contagem de ovos |
| latitude | float | Latitude da ovitrampa |
| longitude | float | Longitude da ovitrampa |
| municipality | str | Nome do município |
| municipality_code | str | Geocódigo. Exemplo: 3304557 |
| ovitrap_id | str | ID da ovitrampa |
| ovitrap_website_id | int |
| state_code | str | Geocódigo. Exemplo: 33 |
| state_name | str ||
| time | str _(date)_ | Formato de data RFC 1123 |
| week | int | Semana epidemiológica |
| year | int | Ano |

## Exemplos de uso

=== "Python3"
    ```py
    import mosqlient

    mosqlient.get_mosquito(
        api_key = api_key,
        date_start = "2024-01-01",
        date_end = "2024-12-31",
        state = "MG",
    )
    ```

=== "R"
    ```R
    library(httr)

    contaovos_api <- "https://api.mosqlimate.org/api/datastore/mosquito"

    params <- list(
      date_start = "YYYY-MM-DD",
      date_end = "YYYY-MM-DD",
      page = 1,
      state = "STATE_CODE",
      municipality = "MUNICIPALITY_NAME"
    )

    headers <- add_headers(
      `X-UID-Key` = API_KEY
    )

    resp <- GET(contaovos_api, query = params, headers)

    if (http_type(resp) == "application/json") {
      items <- content(resp, "parsed")
    } else {
      cat("Request failed with status code:", resp$status_code, "\n")
    }
    ```

=== "curl"
    ```sh
    curl -X 'GET' \
    'https://contaovos.com/pt-br/api/lastcountingpublic?date_start=YYYY-MM-DD&date_end=YYYY-MM-DD&page=1&state=STATE_CODE&municipality=MUNICIPALITY_NAME' \
    -H 'accept: application/json' \
    -H 'X-UID-Key: See X-UID-Key documentation' \
    -d ''
    ```

### Busca de todas as páginas (provisório)
Como este endpoint é uma API de terceiros, `mosqlient` não consegue buscar todas as páginas de forma assíncrona. Para buscar todas as páginas, será necessário fazer um loop até que não haja mais páginas para buscar. Um loop `while` simples pode resolver o problema:
```py
import pandas as pd
import mosqlient

params = dict(
  api_key = api_key,
  date_start = "2024-01-01",
  date_end = "2024-12-31",
  state = "MG",
)
results = []
page = 1
while True:
    df = mosqlient.get_mosquito(**params, page=page)
    if df.empty:
        break
    results.append(df)
    page += 1

result = pd.concat(results)
```
