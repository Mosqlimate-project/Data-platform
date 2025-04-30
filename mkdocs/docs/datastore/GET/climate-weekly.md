## [Climate Weekly time series](https://api.mosqlimate.org/api/docs#/datastore/datastore_api_get_copernicus_brasil_weekly)
This endpoint is an aggregation of the [Climate](/docs/datastore/GET/climate/) endpoint by Epiweek.

## Parameters Table
### Input
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many items will be displayed per page (up to 300) |
| start | yes | int _(YYYYWW)_ | Start epiweek |
| end | yes | int _(YYYYWW)_ | End epiweek |
| geocode | no* | int | [IBGE's](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) municipality code |
| uf | no* | str _(UF)_ | Two letters brazilian's state abbreviation. E.g: SP |
| macro_health_code | no* | int | 5 digit brazilian's MacroHealth region geocode. |

### Output (items)
| Parameter name | Type | Description |
| -- | -- | -- |
| epiweek | int _(YYYYWW)_ | Epidemiological Week
| geocodigo | int | [IBGE's](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) municipality code
| temp_min_avg | float _(°C)_ | Average minimum daily temperature
| temp_med_avg | float _(°C)_ | Average median daily temperature
| temp_max_avg | float _(°C)_ | Average maximum daily temperature
| temp_amplit_avg | float _(°C)_ | Average daily amplitude temperature
| precip_tot_sum | float _(mm)_ | Sum of total daily precipitation
| umid_min | float _(%)_ | Average minimum daily relative humidity 
| umid_med | float _(%)_ | Average median daily relative humidity
| umid_max | float _(%)_ | Average maximum daily relative humidity

#### Details
One of the parameters is required: `geocode`, `uf` or `macro_health_code`
`page` consists in the total amount of Items returned by the request divided by `per_page`.  The `pagination` information is returned alongside with the returned request. E.g.:
```py
'pagination': {
	'items': 10,                      # Amout of Items being displayed 
	'total_items': 10,  		# Total amount of Items returned in the request
	'page': 1,			               # *request parameter
	'total_pages': 1,      		 # Total amount of pages returned in the request
	'per_page': 100		    	# *request parameter
},
```


## Usage examples

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

*The response's pagination contain information about the amount of items returned
by the API call. These information can be used to navigate between the queried
data by changing the `page` parameter on the URL. [See details](#details)
