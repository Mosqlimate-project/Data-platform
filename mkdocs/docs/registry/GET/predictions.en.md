## Parameters Table 
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many predictions will be displayed per page |
| id | no | int | Prediction ID |
| model_id | no | int | Model ID |
| model_owner | no | str _(icontains)_ | Model repo owner | 
| model_organization | no | str _(icontains)_ | Model repo org | 
| model_name | no | str _(icontains)_ | Model repo name {owner or org}/{name} | 
| model_adm_level | no | int _(0, 1, 2 or 3)_ | Administrative level, options: 0, 1, 2, 3 (National, State, Municipality, Sub Municipality) |
| model_time_resolution | no | str _(iexact)_ | Options are: day, week, month or year |
| model_disease | no | str ("A90", "A92.0", "A92.5") | Model disease code |
| model_category | no | str (iexact) | Model category |
| model_sprint | no | int/null | Model IMDC year |
| start | no | str _(YYYY-mm-dd)_ | Prediction modeling date after than |
| end | no | str _(YYYY-mm-dd)_ | Prediction modeling date before than |

#### Details
`page` consists in the total amount of Predictions returned by the request divided by `per_page`.  The `pagination` information is returned alongside with the returned Predictions. E.g.:
```py
'pagination': {
	'items': 10,                    # Amout of Predictions being displayed 
	'total_items': 10,  	  # Total amount of Predictions returned in the request
	'page': 1,			             # *request parameter
	'total_pages': 1,   	   # Total amount of pages returned in the request
	'per_page': 50		       # *request parameter
},
```  

## Usage examples

The Python examples use the `mosqlient` package, specifically designed for interacting with the API. For more information on how to use it, refer to the [documentation here](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).

=== "Python3"
    ```py
    import mosqlient

    # List all Predictions
    mosqlient.get_predictions(X-UID-Key)

    # Filter using multiple parameters; predict date range
    mosqlient.get_predictions(
        X-UID-Key,
        start="2023-01-01",
        end="2023-02-01"
    )

    # get a single prediction by id
    pred = mosqlient.get_predictions(
        X-UID-Key,
        id = id
    )

    # transform into a DataFrame: 
    pred[0].to_dataframe()
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    predictions_api <- "https://api.mosqlimate.org/api/registry/predictions/"
    headers <- add_headers(
      `X-UID-Key` = X-UID-Key
    )

    page <- 1
    per_page <- 5
    pagination <- paste0("?page=", page, "&per_page=", per_page, "&")

    # List all Predictions
    response_all <- GET(paste0(predictions_api, pagination), headers)
    predictions_all <- content(response_all, "text") |> fromJSON()

    # Filter by predict date
    predict_date <- "2023-01-01"
    response_date <- GET(paste0(predictions_api, pagination, "predict_date=", predict_date), headers)
    predictions_date <- content(response_date, "text") |> fromJSON()

    # Filter using multiple parameters; predict date range
    start_date <- "2023-01-01"
    end_date <- "2023-02-01"
    filters_combined <- paste0("start=", start_date, "&", "end=", end_date)
    response_combined <- GET(paste0(predictions_api, pagination, filters_combined), headers)
    predictions_combined <- content(response_combined, "text") |> fromJSON()

    # Advanced Usage
    parameters <- list(
      page = 1,
      per_page = 50
      # Add parameters here
    )

    get_predictions <- function(parameters) {
      predictions_api <- "https://api.mosqlimate.org/api/registry/predictions/?"
      parameters_url <- paste0(names(parameters), "=", unlist(parameters), collapse = "&")
      response <- GET(paste0(predictions_api, parameters_url), headers)
      predictions <- content(response, "text") |> fromJSON()
      return(predictions)
    }

    get_predictions(parameters)
    ```

=== "curl"
    ```sh
    # List all Predictions
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/predictions/?page=1&per_page=50' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    # Filter by predict date
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/predictions/?predict_date=2023-01-01&page=1&per_page=50' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    # Filter using multiple parameters; predict date range
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/predictions/?start=2023-01-01&end=2023-02-01&page=1&per_page=50' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'
    ```
