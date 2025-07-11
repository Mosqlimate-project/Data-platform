## [Infodengue data](https://api.mosqlimate.org/api/docs#/infodengue/datastore_api_get_infodengue)
This endpoint gives access to data from the [Infodengue](https://info.dengue.mat.br/) project, which provide a number of epidemiological variables for all the Brazilian municipalities on a weekly time scale. The request parameters and data variables are described below.


For an example of API usage in Mosqlimate, please refer to [API Demo](https://api.mosqlimate.org/api/docs#/infodengue/datastore_api_get_infodengue). Python examples are found below.

## Parameters Table 
### Input
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many items will be displayed per page (up to 100) |
| disease | yes | str | Dengue, Zika or Chik[ungunya] |
| start | yes | str _(YYYY-mm-dd)_ | Start date (epidemiological week) |
| end | yes | str _(YYYY-mm-dd)_ | End date (epidemiological week) |
| uf | no | str _(UF)_ | Two letters brazilian's state abbreviation. E.g: SP |
| geocode | no | int | [IBGE's](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) municipality code |

### Output (items)
| Parameter name | Type | Description |
| -- | -- | -- |
| data_iniSE | str _(YYYY-mm-dd)_ | Start date of epidemiological week
| SE | int _(YYYYWW)_| Epidemiological week
| casos_est | float | Estimated number of cases per week using the nowcasting model
| casos_est_min | int | 95% credibility interval of the estimated number of cases
| casos_est_max | int | 95% credibility interval of the estimated number of cases
| casos | int | Number of notified cases per week (values are retrospectively updated every week)
| municipio_geocodigo | int | [IBGE's](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) municipality code
| p_rt1 | float | Probability (Rt > 1)
| p_inc100k | float | Estimated incidence rate (cases per pop x 100.00
| Localidade_id | int | Sub-municipality division
| nivel | int | Alert level (1 = green, 2 = yellow, 3 = orange, 4 = red)
| id | int | Numeric index
| versao_modelo | str | Model version
| Rt | float | Point estimate of the reproductive number of cases
| municipio_nome | str | Municipality's name
| pop | float | Population (IBGE)
| receptivo | int | Indicates climate receptivity, i.e., conditions for high vectorial capacity. 0 = unfavorable, 1 = favorable, 2 = favorable this week and last week, 3 = favorable for at least three weeks
| transmissao | int | Evidence of sustained transmission: 0 = no evidence, 1 = possible, 2 = likely, 3 = highly likely
| nivel_inc | int | Estimated incidence below pre-epidemic threshold, 1 = above pre-epidemic threshold but below epidemic threshold, 2 = above epidemic threshold
| umidmax | float _(%)_ | Average daily maximum humidity percentages along the week
| umidmed | float _(%)_ | Average daily humidity percentages along the week
| umidmin | float _(%)_ | Average daily minimum humidity percentages along the week
| tempmax | float _(°C)_ | Average daily maximum temperatures along the week
| tempmed | float _(°C)_ | Average daily temperatures along the week
| tempmin | float _(°C)_ | Average daily minimum temperatures along the week
| casprov | int | Probable number of cases per week (cases - discarded cases)
| casprov_est | float | Probable number of estimated cases per week 
| casprov_est_min | int | credibility interval of the probable number of cases
| casprov_est_max | int | credibility interval of the probable number of cases
| casconf | int | Cases effectively confirmed with laboratory testing

#### Details
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


*The response's pagination contains information about the amount of items returned
by the API call. These information can be used to navigate between the queried
data by changing the `page` parameter on the URL. [See details](#details)
