`api/datastore/contaovos/` is the API call that retrieves information from [Contaovos](https://contaovos.dengue.mat.br/pt-br/api/) API.
The request requires an API key provided by Contaovos moderation. To more information, please access
[Contaovos website](https://contaovos.dengue.mat.br/pt-br/).

## Parameters Table 
### Input
| Parameter name | Required | Type | Description |
|--|--|--|--|
| key | yes | str | ContaOvos API key |
| page | yes | int | Page to be displayed |

### Output
| Parameter name | Type | Description |
| -- | -- | -- |
| complement | str | Location complement
| district | str | Location district
| eggs | int | Eggs count
| latitude | float | Ovitrap latitude
| loc_inst | str | Ovitrap local specification
| longitude | float | Ovitrap longitude
| municipality | str | Municipality name
| number | str | Location number
| ovitrap_id | str | Ovitrap ID
| ovitrap_website_id | int | 
| sector | str _(optional)_ | Location sector
| street | str | Location street
| time | str _(date)_ | RFC 1123 date format 
| user | str | ContaOvos user
| week | int | Epidemiological week
| year | int | Year


## Usage examples

=== "Python"
    ```py
    import requests

    contaovos_api = "https://api.mosqlimate.org/api/datastore/contaovos/"

    key = "contaovos-api-key"
    page = 1
    parameters = f"?page={page}&key={key}&"

    resp = requests.post(contaovos_api + parameters)

    items = resp.json() # JSON data in dict format
    ```

=== "R"
    ```R
    library(httr)

    contaovos_api <- "https://api.mosqlimate.org/api/datastore/contaovos/"

    key <- "contaovos-api-key"
    page <- 1

    url <- paste0(contaovos_api, "?page=", page, "&key=", key)
    resp <- POST(url)

    if (http_type(resp) == "application/json") {
      items <- content(resp, "parsed")
    } else {
      cat("Request failed with status code:", resp$status_code, "\n")
    }
    ```

=== "curl"
    ```sh
    curl -X 'POST' \
    'https://api.mosqlimate.org/api/datastore/contaovos/?key=contaovos-api-key&page=50' \
    -H 'accept: application/json' \
    -d ''
    ```
