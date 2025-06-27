## [Dados do EpiScanner](https://api.mosqlimate.org/api/docs#/episcanner/datastore_api_get_episcanner)
Aqui você tem acesso a dados em tempo real do Epi-Scanner. A ferramenta  [Epi-Scanner](https://info.dengue.mat.br/epi-scanner/) foi co-desenvolvida pelo projeto InfoDengue. O conjunto de dados fornece estimativas de parâmetros epidemiológicos para cada cidade e ano no Brasil, com foco em Dengue e Chikungunya. Informações detalhadas sobre a metodologia usada para calcular esses parâmetros podem ser encontradas [aqui](https://royalsocietypublishing.org/doi/full/10.1098/rsos.241261).

## Tabela de Parâmetros
### Entrada
| Nome do Parâmetro | Obrigatório | Tipo | Descrição |
|---|---|---|---|
| disease | sim | str | Doença específica. Opções: dengue, zika, chik |
| uf | sim | str _(UF)_ | Abreviação de duas letras do estado brasileiro. Ex: SP |
| year | não | int | Ano específico. Padrão: ano atual |

### Saída
| Nome do Parâmetro | Tipo | Descrição |
|---|---|---|
| disease | str | dengue, zika ou chik
| CID10 | str | Código CID da doença
| year | int | Ano analisado
| geocode | int | Código geográfico da cidade
| muni_name | str | Nome da cidade
| peak_week | float | Semana epidemiológica estimada do pico da epidemia
| beta | float | Taxa de transmissibilidade
| gamma | float | Taxa de recuperação
| R0 | float | Número reprodutivo básico
| total_cases | int | Número total anual de casos
| alpha | float | Parâmetro do modelo de Richard
| sum_res | float | Soma dos resíduos (ver documentação)
| ep_ini | str | Semana de início estimada da epidemia. Formato: AAAAAS
| ep_end | str | Semana de término estimada da epidemia. Formato: AAAAAS
| ep_dur | int | Duração estimada da epidemia em semanas

## Exemplos de uso

=== "Python3"
    ```py
    import mosqlient

    mosqlient.get_episcanner(
        api_key = api_key,
        disease = "dengue",
        uf = "SP"
    )
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    episcanner_api <- "https://api.mosqlimate.org/api/datastore/episcanner/"

    params <- list(
        disease = "dengue",
        uf = "SP"
    )

    headers <- add_headers(
      `X-UID-Key` = API_KEY
    )

    resp <- GET(episcanner_api, query = params, headers)

    items <- fromJSON(rawToChar(resp$content))
    ```

=== "curl"
    ```sh
    curl -X 'GET' \
    'https://api.mosqlimate.org/api/datastore/episcanner/?disease=dengue&uf=SP' \
    -H 'accept: application/json' \
    -H 'X-UID-Key: See X-UID-Key documentation' \
    -d ''
    ```
