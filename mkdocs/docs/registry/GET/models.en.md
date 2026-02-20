## Parameters Table 
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many predictions will be displayed per page |
| id | no | int | Model ID |
| repository_owner | no | str _(icontains)_ | Model repo owner | 
| repository_organization | no | str _(icontains)_ | Model repo org | 
| repository_name | no | str _(icontains)_ | Model repo name {owner or org}/{name} | 
| disease | no | str ("A90", "A92.0", "A92.5") | Disease code |
| adm_level | no | int _(0, 1, 2 or 3)_ | Administrative level, options: 0, 1, 2, 3 (National, State, Municipality, Sub Municipality) |
| time_resolution | no | str _(iexact)_ | Options are: day, week, month or year |
| category | no | str (iexact) | Model category |
| sprint | no | int/null | Model IMDC year |

#### Details
`page` consists in the total amount of Models returned by the request divided by `per_page`.  The `pagination` information is returned alongside with the returned Models. E.g.:
```py
'pagination': {
	'items': 10,                    # Amout of Models being displayed 
	'total_items': 10,  		# Total amount of Models returned in the request
	'page': 1,			             # *request parameter
	'total_pages': 1,   		# Total amount of pages returned in the request
	'per_page': 50		    	# *request parameter
},
```  

## Usage examples

The Python examples use the `mosqlient` package, specifically designed for interacting with the API. For more information on how to use it, refer to the [documentation here](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).

=== "Python3"
    ```py
    import mosqlient

    # List all Models
    mosqlient.get_all_models(X-UID-Key)

    # get specific Model
    mosqlient.get_model_by_id(X-UID-Key, id)

    # get models with filters
    mosqlient.get_models(X-UID-Key, **kwargs)
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    models_api <- "https://api.mosqlimate.org/api/registry/models/"
    headers <- add_headers(
      `X-UID-Key` = X-UID-Key
    )

    page <- 1
    per_page <- 5
    pagination <- paste0("?page=", page, "&per_page=", per_page, "&")

    # List all Models
    response_all <- GET(paste0(models_api, pagination), headers)
    all_models <- content(response_all, "text") |> fromJSON()

    # Get specific Model
    response_specific <- GET(paste0(models_api, "1"), headers) # Model id
    specific_model <- content(response_specific, "text") |> fromJSON()

    # Advanced Usage
    parameters <- list(
      page = 1,
      per_page = 2
      # Add parameters here
    )

    get_models <- function(parameters) {
      models_api <- "https://api.mosqlimate.org/api/registry/models/?"
      parameters_url <- paste0(names(parameters), "=", unlist(parameters), collapse = "&")
      response <- GET(paste0(models_api, parameters_url), headers)
      models <- content(response, "text") |> fromJSON()
      return(models)
    }

    get_models(parameters)
    ```

=== "curl"
    ```sh
    # List all models
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/models/?page=1&per_page=5' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    # Get specific Model
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/models/1' \ # Model id
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    # Combining filters
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/models/?id=1&name=test&page=1&per_page=5' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'
    ```
