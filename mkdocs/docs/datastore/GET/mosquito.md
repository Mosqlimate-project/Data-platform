## Mosquito Abundance Data
Here you get access to mosquito abundance data from the [Contaovos project](https://contaovos.dengue.mat.br/), co-developed by the Mosqlimate project. These data, described below, are based on eggtraps distributed throughout Brasil according to a monitoring design specified by the Ministry of Health.

To more information, please access
[Contaovos API](https://contaovos.com/pt-br/api/) page.

## Parameters Table 
### Input
| Parameter name | Required | Type | Description |
|--|--|--|--|
| date_start | no | date | ISO Format. Example: "2024-01-01" |
| date_end | no | date | ISO Format. Example: "2025-01-01" |
| state | no | str | UF. Example: "MG" |
| page | no | int | Page to be displayed |
| municipality | no | str | City name. Example: "Ponta Porã" |

### Output
| Parameter name | Type | Description |
| -- | -- | -- |
| counting_id | int ||
| date | str ||
| date_collect | str ||
| eggs | int | Eggs count |
| latitude | float | Ovitrap latitude |
| longitude | float | Ovitrap longitude |
| municipality | str | Municipality name |
| municipality_code | str | Geocode. Example: 3304557 |
| ovitrap_id | str | Ovitrap ID |
| ovitrap_website_id | int |
| state_code | str | Geocode. Example: 33 |
| state_name | str ||
| time | str _(date)_ | RFC 1123 date format |
| week | int | Epidemiological week |
| year | int | Year |


## Usage examples

=== "Python3"
    ```py
    import requests

    contaovos_api = "https://contaovos.com/pt-br/api/lastcountingpublic"

    params = {
        "date_start": "YYYY-MM-DD",
        "date_end": "YYYY-MM-DD",
        "page": 1,
        "state": "STATE_CODE",
        "municipality": "MUNICIPALITY_NAME",
    }

    resp = requests.get(contaovos_api, params=params)

    items = resp.json() # JSON data in dict format
    ```

=== "R"
    ```R
    library(httr)

    contaovos_api <- "https://contaovos.com/pt-br/api/lastcountingpublic"

    params <- list(
      date_start = "YYYY-MM-DD",
      date_end = "YYYY-MM-DD",
      page = 1,
      state = "STATE_CODE",
      municipality = "MUNICIPALITY_NAME"
    )

    resp <- GET(contaovos_api, query = params)

    if (http_type(resp) == "application/json") {
      items <- content(resp, "parsed")
    } else {
      cat("Request failed with status code:", resp$status_code, "\n")
    }
    ```

=== "curl"
    ```sh
    curl -X 'GET' \
    'https://contaovos.com/pt-br/api/lastcountingpublic?date_start=YYYY-MM-DD&date_end=YYYY-MM-DD&page=1&state=STATE_CODE&municipality=MUNICIPALITY_NAME' \
    -H 'accept: application/json' \
    -d ''
    ```
