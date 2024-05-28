## EpiScanner Data
Here you get access to Real-time Epidemic Scanner data from the [Epi-Scanner tool](https://info.dengue.mat.br/epi-scanner/), co-developed by the InfoDengue project. These data, described below, are based on the analyze of the expansion of dengue, zika and chikungunya in Brazil using up-to-date incidence data from Infodengue.

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
    import requests

    episcanner_api = "https://api.mosqlimate.org/api/datastore/episcanner/"

    params = {
        "disease": "dengue",
        "uf": "SP"
    }

    resp = requests.get(episcanner_api, params=params)

    items = resp.json() # JSON data in dict format
    ```

=== "R"
    ```R
    library(httr)

    episcanner_api <- "https://api.mosqlimate.org/api/datastore/episcanner/"

    params <- list(
        disease = "dengue",
        uf = "SP"
    )

    resp <- GET(episcanner_api, query = params)

    items <- fromJSON(rawToChar(resp$content))
    ```

=== "curl"
    ```sh
    curl -X 'GET' \
    'https://api.mosqlimate.org/api/datastore/episcanner/?disease=dengue&uf=SP' \
    -H 'accept: application/json' \
    -d ''
    ```
