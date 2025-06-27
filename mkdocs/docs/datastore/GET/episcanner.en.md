## [EpiScanner Data](https://api.mosqlimate.org/api/docs#/episcanner/datastore_api_get_episcanner)
Here you get access to Real-time Epidemic Scanner data from the [Epi-Scanner tool](https://info.dengue.mat.br/epi-scanner/), co-developed by the InfoDengue project. The dataset provides estimates of epidemiological parameters for each city and year in Brazil, focusing on Dengue and Chikungunya. Detailed information on the methodology used to compute these parameters can be found [here](https://royalsocietypublishing.org/doi/full/10.1098/rsos.241261).

## Parameters Table 
### Input
| Parameter name | Required | Type | Description |
|--|--|--|--|
| disease | yes | str | Specific disease. Options: dengue, zika, chik |
| uf | yes | str _(UF)_ | Two letters brazilian's state abbreviation. E.g: SP |
| year | no | int | Specific year. Default: current year |

### Output
| Parameter name | Type | Description |
| -- | -- | -- |
| disease | str | dengue, zika or chik
| CID10 | str | Disease's ICD code
| year | int | Year analyzed
| geocode | int | City's geocode
| muni_name | str | City's name
| peak_week | float | Estimated epidemiological week of the peak of the epidemic
| beta | float | Transmissibility rate
| gamma | float | Recovery rate
| R0 | float | Basic reproduction number
| total_cases | int | Annual total number of cases
| alpha | float | Parameter of the Richard's model
| sum_res | float | Sum of residuals (see documentation)
| ep_ini | str | Estimated starting week of the epidemic. Format: YYYYWW
| ep_end | str | Estimated Ending week of the epidemic. Format: YYYYWW
| ep_dur | int | Estimated duration of the epidemic in weeks


## Usage examples

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
