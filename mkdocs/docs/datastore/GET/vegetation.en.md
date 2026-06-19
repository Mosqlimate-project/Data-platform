## [Vegetation Indices](https://api.mosqlimate.org/api/docs#/datastore/datastore_api_get_vegetation_metrics)
Through this API endpoint, you can fetch several vegetation index metrics (such as NDVI or EVI) that have been extracted for Brazilian municipalities from satellite imagery.

These series are on a daily timescale. Details about how the satellite data are processed and aggregated at municipality level are available on our documentation repository.

## Parameters Table 
### Input
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many items will be displayed per page (up to 100) |
| start | yes | str _(YYYY-mm-dd)_ | Start date |
| end | yes | str _(YYYY-mm-dd)_ | End date |
| geocode | no | int | [IBGE's](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) municipality code |
| uf | no | str _(UF)_ | Two letters Brazilian's state abbreviation. E.g: SP |
| collection | no | str | Specific satellite dataset collection name |
| attribute | no | str | Specific vegetation index metric or bands name |

### Output (items)
| Parameter name | Type | Description |
| -- | -- | -- |
| date | date _(YYYY-mm-dd)_ | Day of the observation |
| geocode | int | [IBGE's](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) municipality code |
| collection | str | Satellite dataset collection identifier |
| attribute | str | Observed metric type (e.g., ndvi, evi) |
| mean | float | Mean value of the attribute inside the municipality area, rounded to 4 decimals |
| std | float | Standard deviation value, rounded to 4 decimals |
| median | float | Median value, rounded to 4 decimals |
| q25 | float | First quartile (25th percentile) value, rounded to 4 decimals |
| q75 | float | Third quartile (75th percentile) value, rounded to 4 decimals |
| min | float | Minimum recorded value, rounded to 4 decimals |
| max | float | Maximum recorded value, rounded to 4 decimals |

#### Details
`page` consists in the total amount of Items returned by the request divided by `per_page`. The `pagination` information is returned alongside with the returned request. E.g.:

```json
"pagination": {
    "items": 10,
    "total_items": 10,
    "page": 1,
    "total_pages": 1,
    "per_page": 100
}
```

## Usage examples

=== "Python"
    ```python
    import mosqlient

    mosqlient.get_vegetation(
        api_key = api_key,
        start_date = "2024-01-01",
        end_date = "2024-02-01",
        geocode = 3304557,
    )
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    veg_api <- "https://api.mosqlimate.org/api/datastore/vegetation/"
    page <- "1"
    pagination <- paste0("?page=", page, "&per_page=100&")
    filters <- paste0("start=2024-01-01&end=2024-02-01")

    headers <- add_headers(
      `X-UID-Key` = API_KEY
    )

    url <- paste0(veg_api, pagination, filters)
    resp <- GET(url, headers)
    content <- content(resp, "text")
    json_content <- fromJSON(content)

    items <- json_content$items
    pagination_data <- json_content$pagination
    ```

=== "curl"
    ```sh
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/datastore/vegetation/?start=2024-01-01&end=2024-02-01&page=1&per_page=100' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    curl -X 'GET' \
      'https://api.mosqlimate.org/api/datastore/vegetation/?start=2024-01-01&end=2024-02-01&geocode=3304557&page=1&per_page=100' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'
    ```

*The response's pagination contain information about the amount of items returned by the API call. These information can be used to navigate between the queried data by changing the `page` parameter on the URL. [See details](#details)
