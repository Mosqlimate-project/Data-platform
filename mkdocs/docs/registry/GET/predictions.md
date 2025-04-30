## Parameters Table 
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many predictions will be displayed per page |
| id | no | int | Prediction ID |
| model_id | no | int | Model ID |
| model_name | no | str _(icontains)_ | Model name | 
| model_ADM_level | no | int _(0, 1, 2 or 3)_ | Administrative level, options: 0, 1, 2, 3 (National, State, Municipality, Sub Municipality) |
| model_time_resolution | no | str _(iexact)_ | Options are: day, week, month or year |
| author_name | no | str _(icontains)_ | Author name |
| author_username | no | str | Author username |
| author_institution | no | str _(icontains)_ | Author institution |
| repository | no | str (icontains) | Github repository |
| implementation_language | no | str _(icontains)_ | Implementation language |
| temporal | no | bool | Is the predition's model temporal? |
| spatial | no | bool | Is the predition's model spatial? |
| categorical | no | bool | Is the predition's model categorical? |
| commit | no | str | Prediction git commit |
| predict_date | no | str _(YYYY-mm-dd)_ | Prediction modeling date |
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
=== "Python3"
    ```py
    import mosqlient

    # List all Predictions
    mosqlient.get_predictions(api_key)

    # Filter using multiple parameters; predict date range
    mosqlient.get_predictions(
        api_key,
        start="2023-01-01",
        end="2023-02-01"
    )
    ```

=== "R"
    ```R
    library(httr)

    predictions_api <- "https://api.mosqlimate.org/api/registry/predictions/"
    headers <- add_headers(
      `X-UID-Key` = API_KEY
    )

    page <- 1
    per_page <- 5
    pagination <- paste0("?page=", page, "&per_page=", per_page, "&")

    # List all Predictions
    response_all <- GET(paste0(predictions_api, pagination), headers=headers)
    predictions_all <- content(response_all, "text") |> fromJSON()

    # Filter by predict date
    predict_date <- "2023-01-01"
    response_date <- GET(paste0(predictions_api, pagination, "predict_date=", predict_date), headers=headers)
    predictions_date <- content(response_date, "text") |> fromJSON()

    # Filter using multiple parameters; predict date range
    start_date <- "2023-01-01"
    end_date <- "2023-02-01"
    filters_combined <- paste0("start=", start_date, "&", "end=", end_date)
    response_combined <- GET(paste0(predictions_api, pagination, filters_combined), headers=headers)
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
      response <- GET(paste0(predictions_api, parameters_url), headers=headers)
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
