## [Índices de Vegetação](https://api.mosqlimate.org/api/docs#/datastore/datastore_api_get_vegetation_metrics)
Por meio deste endpoint da API, você pode buscar diversas métricas de índices de vegetação (como NDVI ou EVI) que foram extraídas para municípios brasileiros a partir de imagens de satélite.

Essas séries estão em uma escala temporal diária. Detalhes sobre como os dados de satélite são processados e agregados em nível municipal estão disponíveis em nosso repositório de documentação.

## Tabela de Parâmetros 
### Entrada
| Nome do parâmetro | Obrigatório | Tipo | Descrição |
|--|--|--|--|
| *page | sim | int | Página a ser exibida |
| *per_page | sim | int | Quantos itens serão exibidos por página (até 100) |
| start | sim | str _(AAAA-mm-dd)_ | Data de início |
| end | sim | str _(AAAA-mm-dd)_ | Data de término |
| geocode | não | int | Código do município do [IBGE](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) |
| uf | não | str _(UF)_ | Sigla de duas letras do estado brasileiro. Ex: SP |
| collection | não | str | Nome específico da coleção de dados de satélite |
| attribute | não | str | Nome específico da métrica ou banda do índice de vegetação |

### Saída (items)
| Nome do parâmetro | Tipo | Descrição |
| -- | -- | -- |
| date | date _(AAAA-mm-dd)_ | Dia da observação |
| geocode | int | Código do município do [IBGE](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) |
| collection | str | Identificador da coleção de dados de satélite |
| attribute | str | Tipo de métrica observada (ex: ndvi, evi) |
| mean | float | Valor médio do atributo dentro da área do município, arredondado para 4 casas decimais |
| std | float | Valor do desvio padrão, arredondado para 4 casas decimais |
| median | float | Valor da mediana, arredondado para 4 casas decimais |
| q25 | float | Primeiro quartil (percentil 25), arredondado para 4 casas decimais |
| q75 | float | Terceiro quartil (percentil 75), arredondado para 4 casas decimais |
| min | float | Valor mínimo registrado, arredondado para 4 casas decimais |
| max | float | Valor máximo registrado, arredondado para 4 casas decimais |

#### Detalhes
A `page` consiste na quantidade total de itens retornados pela requisição dividida pelo `per_page`. As informações de `pagination` são retornadas junto com a resposta da requisição. Ex.:

```json
"pagination": {
    "items": 10,
    "total_items": 10,
    "page": 1,
    "total_pages": 1,
    "per_page": 100
}
```

## Exemplos de uso

=== "Python"
    ```python
    import mosqlient

    mosqlient.get_vegetation(
        api_key = api_key,
        start_date = "2024-01-01",
        end_date = "2024-02-01",
        geocode = 3304557,
    )
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    veg_api <- "[https://api.mosqlimate.org/api/datastore/vegetation/](https://api.mosqlimate.org/api/datastore/vegetation/)"
    page <- "1"
    pagination <- paste0("?page=", page, "&per_page=100&")
    filters <- paste0("start=2024-01-01&end=2024-02-01")

    headers <- add_headers(
      `X-UID-Key` = API_KEY
    )

    url <- paste0(veg_api, pagination, filters)
    resp <- GET(url, headers)
    content <- content(resp, "text")
    json_content <- fromJSON(content)

    items <- json_content$items
    pagination_data <- json_content$pagination
    ```

=== "curl"
    ```sh
    curl -X 'GET' \
      '[https://api.mosqlimate.org/api/datastore/vegetation/?start=2024-01-01&end=2024-02-01&page=1&per_page=100](https://api.mosqlimate.org/api/datastore/vegetation/?start=2024-01-01&end=2024-02-01&page=1&per_page=100)' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    curl -X 'GET' \
      '[https://api.mosqlimate.org/api/datastore/vegetation/?start=2024-01-01&end=2024-02-01&geocode=3304557&page=1&per_page=100](https://api.mosqlimate.org/api/datastore/vegetation/?start=2024-01-01&end=2024-02-01&geocode=3304557&page=1&per_page=100)' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'
    ```

*A paginação da resposta contém informações sobre a quantidade de itens retornados pela chamada da API. Essas informações podem ser usadas para navegar entre os dados consultados, alterando o parâmetro `page` na URL. [Ver detalhes](#detalhes)
