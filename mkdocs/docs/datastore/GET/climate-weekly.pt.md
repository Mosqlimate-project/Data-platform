## [Série temporal climática semanal](https://api.mosqlimate.org/api/docs#/datastore/datastore_api_get_copernicus_brasil_weekly)
Este endpoint é uma agregação do endpoint [Climate](/docs/datastore/GET/climate/) por Epiweek (Semana Epidemiológica).

## Tabela de Parâmetros
### Entrada
| Nome do Parâmetro | Obrigatório | Tipo | Descrição |
|---|---|---|---|
| *page | sim | int | Página a ser exibida |
| *per_page | sim | int | Quantos itens serão exibidos por página (até 300) |
| start | sim | int _(AAAASE)_ | Semana epidemiológica inicial |
| end | sim | int _(AAAASE)_ | Semana epidemiológica final |
| geocode | não* | int | Código de município do [IBGE](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) |
| uf | não* | str _(UF)_ | Abreviação de duas letras do estado brasileiro. Ex: SP |
| macro_health_code | não* | int | Geocódigo de 5 dígitos da região Macro de Saúde brasileira. |

### Saída (items)
| Nome do Parâmetro | Tipo | Descrição |
|---|---|---|
| epiweek | int _(AAAASE)_ | Semana Epidemiológica
| geocodigo | int | Código de município do [IBGE](https://www.ibge.gov.br/explica/codigos-dos-municipios.php)
| temp_min_avg | float _(°C)_ | Temperatura mínima diária média
| temp_med_avg | float _(°C)_ | Temperatura mediana diária média
| temp_max_avg | float _(°C)_ | Temperatura máxima diária média
| temp_amplit_avg | float _(°C)_ | Temperatura média diária de amplitude
| precip_tot_sum | float _(mm)_ | Soma da precipitação diária total
| umid_min | float _(%)_ | Umidade relativa diária mínima média
| umid_med | float _(%)_ | Umidade relativa diária mediana média
| umid_max | float _(%)_ | Umidade relativa diária máxima média

#### Detalhes
Um dos seguintes parâmetros é obrigatório: `geocode`, `uf` ou `macro_health_code`.
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

=== "Python"
    ```py
    import mosqlient

    mosqlient.get_climate_weekly(
        api_key = api_key,
        start = "202201",
        end = "202301",
        # uf = "RJ",
        geocode = 3304557,
    )
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    climate_weekly_api <- "https://api.mosqlimate.org/api/datastore/climate/weekly/"

    params <- list(
      page = 1,
      per_page = 300,
      start = YYYYWW,
      end = YYYYWW,
      geocode = MUNICIPALITY_GEOCODE,
      uf = UF,
      macro_health_code = MACROHEALTH_CODE
    )

    headers <- add_headers(
      `X-UID-Key` = API_KEY
    )

    resp <- GET(climate_weekly_api, query = params, headers)
    items <- fromJSON(content(resp, "text", encoding = "UTF-8"))
    ```

=== "curl"
    ```sh
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/datastore/climate/weekly/?start=YYYYWW&end=YYYYWW&page=1&per_page=300' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    # Or you can add a geocode and other filters
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/datastore/climate/weekly/?start=YYYYWW&end=YYYYWW&geocode=MUNICIPALITY_GEOCODE&uf=UF&macro_health_code=MACROHEALTH_CODE&page=1&per_page=300' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'
    ```

*A paginação da resposta contém informações sobre a quantidade de itens retornados pela chamada da API. Essas informações podem ser usadas para navegar entre os dados consultados alterando o parâmetro `page` na URL. [Ver detalhes](#details)
