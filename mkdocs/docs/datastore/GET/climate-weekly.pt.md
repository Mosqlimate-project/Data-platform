## [Série temporal climática semanal](https://api.mosqlimate.org/api/docs#/datastore/datastore_api_get_copernicus_brasil_weekly)

!!! danger "Dados de precipitação: erro de cálculo conhecido no ETL legado"
    **Todas as variáveis de precipitação (`precip_min`, `precip_med`, `precip_max`, `precip_tot`) usadas por este endpoint são afetadas por um bug no ETL — o mesmo descrito no [endpoint Climate](/docs/datastore/GET/climate/). Isso impacta diretamente o campo `precip_tot_sum` no resultado semanal.**

    **Qual era o problema?**  
    A fonte dos dados é o conjunto de reanálise [ERA5-Land](https://cds.climate.copernicus.eu/cdsapp#!/dataset/reanalysis-era5-land?tab=overview), cuja convenção de acumulação difere fundamentalmente da convenção do ERA5 padrão. No ERA5-Land, as acumulações em previsões de curto prazo (steps 01 a 24) são acumuladas *desde o início da previsão* até o fim do step — ou seja, de `dia=D, hora=00:00` até o horário válido do step. No step 24, o timestamp `dia=D+1, 00:00` representa a **acumulação total das 24 horas completas do dia D**. Isso significa que os dados com timestamp `00:00` representam, na verdade, a acumulação do **dia anterior**. O pipeline de ingestão legado agregou incorretamente essas variáveis acumuladas usando a convenção do ERA5 (onde os steps horários representam a hora que *termina* no timestamp), produzindo totais diários de precipitação incorretos e deslocados temporalmente que se propagam para a agregação semanal. Consulte a [documentação do ECMWF](https://confluence.ecmwf.int/display/CKB/ERA5+family+daily+statistics+catalogue+entries%3A+methodology%2C+known+issues+and+FAQ#ERA5familydailystatisticscatalogueentries:methodology,knownissuesandFAQ-AccumulatedvariablesforERA5land) para detalhes técnicos.

    **O que foi corrigido?**  
    Na atualização mais recente, os valores de precipitação foram recalculados usando a convenção de acumulação correta do ERA5-Land.

    **Como usar os dados corrigidos:**  
    O parâmetro `precip_fixed` tem valor padrão `true` e controla todos os campos `precip_*`. Quando `precip_fixed=true` (padrão), a agregação usa os valores **corrigidos**. Defina `precip_fixed=false` para obter os valores **legados (incorretos)** para compatibilidade retroativa.

    **A partir de 2026-08-01**, o pipeline de ingestão foi corrigido. Dessa data em diante, `precip_fixed=true` e `precip_fixed=false` retornam os **mesmos valores corretos** — o parâmetro afeta apenas os dados históricos anteriores ao corte.

    ---

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
| precip_fixed | não | bool | Usar valores corrigidos de precipitação (padrão: `true`). Veja o aviso acima. |

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
