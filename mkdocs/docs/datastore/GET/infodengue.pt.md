## [Dados do Infodengue](https://api.mosqlimate.org/api/docs#/infodengue/datastore_api_get_infodengue)
Este endpoint dá acesso a dados do projeto [Infodengue](https://info.dengue.mat.br/), que fornece uma série de variáveis epidemiológicas para todos os municípios brasileiros em uma escala de tempo semanal. Os parâmetros de requisição e as variáveis dos dados são descritos abaixo.

Para um exemplo de uso da API no Mosqlimate, consulte [Demonstração da API](https://api.mosqlimate.org/api/docs#/infodengue/datastore_api_get_infodengue). Exemplos em Python são encontrados abaixo.

## Tabela de Parâmetros
### Entrada
| Nome do Parâmetro | Obrigatório | Tipo | Descrição |
|---|---|---|---|
| *page | sim | int | Página a ser exibida |
| *per_page | sim | int | Quantos itens serão exibidos por página (até 100) |
| disease | sim | str | Dengue, Zika ou Chik[ungunya] |
| start | sim | str _(AAAA-mm-dd)_ | Data de início (semana epidemiológica) |
| end | sim | str _(AAAA-mm-dd)_ | Data de fim (semana epidemiológica) |
| uf | não | str _(UF)_ | Abreviação de duas letras do estado brasileiro. Ex: SP |
| geocode | não | int | Código de município do [IBGE](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) |

### Saída (itens)
| Nome do Parâmetro | Tipo | Descrição |
|---|---|---|
| data_iniSE | str _(AAAA-mm-dd)_ | Data de início da semana epidemiológica
| SE | int _(AAAASE)_ | Semana epidemiológica
| casos_est | float | Número estimado de casos por semana usando o modelo nowcasting
| casos_est_min | int | Intervalo de credibilidade de 95% do número estimado de casos
| casos_est_max | int | Intervalo de credibilidade de 95% do número estimado de casos
| casos | int | Número de casos notificados por semana (os valores são atualizados retrospectivamente a cada semana)
| municipio_geocodigo | int | Código de município do [IBGE](https://www.ibge.gov.br/explica/codigos-dos-municipios.php)
| p_rt1 | float | Probabilidade (Rt > 1)
| p_inc100k | float | Taxa de incidência estimada (casos por população x 100.000)
| Localidade_id | int | Divisão sub-municipal
| nivel | int | Nível de alerta (1 = verde, 2 = amarelo, 3 = laranja, 4 = vermelho)
| id | int | Índice numérico
| versao_modelo | str | Versão do modelo
| Rt | float | Estimativa pontual do número reprodutivo de casos
| municipio_nome | str | Nome do município
| pop | float | População (IBGE)
| receptivo | int | Indica receptividade climática, ou seja, condições para alta capacidade vetorial. 0 = desfavorável, 1 = favorável, 2 = favorável esta semana e na semana passada, 3 = favorável por pelo menos três semanas
| transmissao | int | Evidência de transmissão sustentada: 0 = sem evidência, 1 = possível, 2 = provável, 3 = altamente provável
| nivel_inc | int | Incidência estimada abaixo do limiar pré-epidêmico, 1 = acima do limiar pré-epidêmico, mas abaixo do limiar epidêmico, 2 = acima do limiar epidêmico
| umidmax | float _(%)_ | Percentagens de umidade diária máxima média ao longo da semana
| umidmed | float _(%)_ | Percentagens de umidade diária média ao longo da semana
| umidmin | float _(%)_ | Percentagens de umidade diária mínima média ao longo da semana
| tempmax | float _(°C)_ | Temperaturas diárias máximas médias ao longo da semana
| tempmed | float _(°C)_ | Temperaturas diárias médias ao longo da semana
| tempmin | float _(°C)_ | Temperaturas diárias mínimas médias ao longo da semana
| casprov | int | Número provável de casos por semana (casos - casos descartados)
| casprov_est | float | Número provável de casos estimados por semana
| casprov_est_min | int | Intervalo de credibilidade do número provável de casos
| casprov_est_max | int | Intervalo de credibilidade do número provável de casos
| casconf | int | Casos efetivamente confirmados com teste laboratorial

#### Detalhes
`page` consiste no total de itens retornados pela requisição dividido por `per_page`. A informação de `pagination` é retornada junto com a requisição. Ex.:
```py
'pagination': {
	'items': 10,                      # Quantidade de Itens sendo exibidos 
	'total_items': 10,  		# Quantidade total de Itens retornados na requisição
	'page': 1,			               # *parâmetro da requisição
	'total_pages': 1,      		 # Quantidade total de páginas retornadas na requisição
	'per_page': 100		    	# *parâmetro da requisição
},
```

## Exemplos de uso

=== "Python3"
    ```py
    import mosqlient

    mosqlient.get_infodengue(
        api_key = api_key,
        disease =  "dengue",
        start_date = "2022-01-01",
        end_date = "2023-01-01",
        uf = 'AL'
    ).head()
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    infodengue_api <- "https://api.mosqlimate.org/api/datastore/infodengue/"

    page <- "1"
    pagination <- paste0("?page=", page, "&per_page=100&")
    filters <- paste0("disease=dengue&start=2022-12-30&end=2023-12-30")

    url <- paste0(infodengue_api, pagination, filters)
    headers <- add_headers(
      `X-UID-Key` = API_KEY
    )
    resp <- GET(url, headers)
    content <- content(resp, "text")
    json_content <- fromJSON(content)

    items <- json_content$items
    pagination_data <- json_content$pagination
    ```

=== "curl"
    ```sh
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/datastore/infodengue/?disease=dengue&start=2022-12-30&end=2023-12-30&page=1&per_page=100' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'
    ```


*A paginação da resposta contém informações sobre a quantidade de itens retornados pela chamada da API. Essas informações podem ser usadas para navegar entre os dados consultados alterando o parâmetro `page` na URL.
