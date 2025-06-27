## [Série temporal climática](https://api.mosqlimate.org/api/docs#/datastore/datastore_api_get_copernicus_brasil)
Através deste endpoint da API, você pode buscar diversas variáveis climáticas que foram extraídas para todos os municípios brasileiros a partir dos [dados de reanálise baseados em satélite fornecidos pela Copernicus ERA5](https://cds.climate.copernicus.eu/cdsapp#!/dataset/reanalysis-era5-land?tab=overview).

Essas séries são em escala de tempo diária. Detalhes sobre como os dados de satélite são processados e agregados no nível municipal estão disponíveis [aqui](https://github.com/AlertaDengue/satellite-weather-downloader).

## Tabela de Parâmetros
### Entrada
| Nome do Parâmetro | Obrigatório | Tipo | Descrição |
|---|---|---|---|
| *page | sim | int | Página a ser exibida |
| *per_page | sim | int | Quantos itens serão exibidos por página (até 100) |
| start | sim | str _(AAAA-mm-dd)_ | Data de início |
| end | sim | str _(AAAA-mm-dd)_ | Data de fim |
| geocode | não | int | Código de município do [IBGE](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) |
| uf | não | str _(UF)_ | Abreviação de duas letras do estado brasileiro. Ex: SP |

### Saída (itens)
| Nome do Parâmetro | Tipo | Descrição |
|---|---|---|
| date | date _(AAAA-mm-dd)_ | Dia do ano
| geocodigo | int | Código de município do [IBGE](https://www.ibge.gov.br/explica/codigos-dos-municipios.php)
| temp_min | float _(°C)_ | Temperatura mínima diária
| temp_med | float _(°C)_ | Temperatura média diária
| temp_max | float _(°C)_ | Temperatura máxima diária
| precip_min | float _(mm)_ | Precipitação diária mínima
| precip_med | float _(mm)_ | Precipitação diária média
| precip_max | float _(mm)_ | Precipitação diária máxima
| precip_tot | float _(mm)_ | Precipitação diária total
| pressao_min | float _(atm)_ | Pressão mínima diária ao nível do mar
| pressao_med | float _(atm)_ | Pressão média diária ao nível do mar
| pressao_max | float _(atm)_ | Pressão máxima diária ao nível do mar
| umid_min | float _(%)_ | Umidade relativa diária mínima
| umid_med | float _(%)_ | Umidade relativa diária média
| umid_max | float _(%)_ | Umidade relativa diária máxima

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

=== "Python"
    ```py
    import mosqlient

    mosqlient.get_climate(
        api_key = api_key,
        start_date = "2022-01-01",
        end_date = "2023-01-01",
        # uf = "RJ",
        geocode = 3304557,
    )
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    climate_api <- "https://api.mosqlimate.org/api/datastore/climate/"
    page <- "1"
    pagination <- paste0("?page=", page, "&per_page=100&")
    filters <- paste0("start=2022-12-30&end=2023-12-30")

    headers <- add_headers(
      `X-UID-Key` = API_KEY
    )

    url <- paste0(climate_api, pagination, filters)
    resp <- GET(url, headers)
    content <- content(resp, "text")
    json_content <- fromJSON(content)

    items <- json_content$items
    pagination_data <- json_content$pagination
    ```

=== "curl"
    ```sh
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/datastore/climate/?start=2022-12-30&end=2023-12-30&page=1&per_page=100' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    # Or you can add a geocode to the filters
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/datastore/climate/?start=2022-12-30&end=2023-12-30&geocode=3304557&page=1&per_page=100' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    ```


*A paginação da resposta contém informações sobre a quantidade de itens retornados pela chamada da API. Essas informações podem ser usadas para navegar entre os dados consultados alterando o parâmetro `page` na URL. [Ver detalhes](#details)
