## Parameters Table 
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many predictions will be displayed per page |
| id | no | int | Model ID |
| name | no | str _(icontains)_ | Model name | 
| author_name | no | str _(icontains)_ | Author name |
| author_username | no | str | Author username |
| author_institution | no | str _(icontains)_ | Author institution |
| repository | no | str (icontains) | Github repository |
| implementation_language | no | str _(icontains)_ | Implementation language |
| temporal | no | bool | Is the model temporal? |
| spatial | no | bool | Is the model spatial? |
| categorical | no | bool | Is the model categorical? |
| type | no | str _(icontains)_ | Model type. E.g: nowcast / forecast |
| ADM_level | no | int _(0, 1, 2 or 3)_ | Administrative level, options: 0, 1, 2, 3 (National, State, Municipality, Sub Municipality) |
| time_resolution | no | str _(iexact)_ | Options are: day, week, month or year |

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

> Note: for fetching a big amount of pages, please consider using [Async](../../tutorials/AsyncRequests.ipynb) code

## Usage examples

=== "Python3"
    ```py
    import requests

    models_api = "https://api.mosqlimate.org/api/registry/models/"

    page = 1
    per_page = 5
    pagination = "?page={page}&per_page={per_page}&"

    # List all Models
    requests.get(models_api + pagination).json()

    # get specific Model
    requests.get(models_api + "1").json() # Model id

    # Filter by implementation language
    requests.get(models_api + pagination + "implementation_language=python").json()

    # combining filters
    requests.get(models_api + pagination + "implementation_language=python" + "&" + "name=test").json()


    # Advanced Usage:
    parameters = {
        "page": 1,
        "per_page": 2,
        # Add parameters here
    }

    def get_models(parameters: dict):
        models_api = "https://api.mosqlimate.org/api/registry/models/?"
        parameters_url = "&".join([f"{p}={v}" for p,v in parameters.items()])
        return requests.get(models_api + parameters_url).json()
            
    get_models(parameters)
    ```

=== "R"
    ```R
    library(httr)

    models_api <- "https://api.mosqlimate.org/api/registry/models/"

    page <- 1
    per_page <- 5
    pagination <- paste0("?page=", page, "&per_page=", per_page, "&")

    # List all Models
    response_all <- GET(paste0(models_api, pagination))
    all_models <- content(response_all, "text") |> fromJSON()

    # Get specific Model
    response_specific <- GET(paste0(models_api, "1")) # Model id
    specific_model <- content(response_specific, "text") |> fromJSON()

    # Filter by implementation language
    response_python <- GET(paste0(models_api, pagination, "implementation_language=python"))
    models_python <- content(response_python, "text") |> fromJSON()

    # Combining filters
    filters_combined <- paste0("implementation_language=python", "&", "name=test")
    response_combined <- GET(paste0(models_api, pagination, filters_combined))
    models_multi_filters <- content(response_combined, "text") |> fromJSON()


    # Advanced Usage
    parameters <- list(
      page = 1,
      per_page = 2
      # Add parameters here
    )

    get_models <- function(parameters) {
      models_api <- "https://api.mosqlimate.org/api/registry/models/?"
      parameters_url <- paste0(names(parameters), "=", unlist(parameters), collapse = "&")
      response <- GET(paste0(models_api, parameters_url))
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
      -H 'accept: application/json'

    # Get specific Model
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/models/1' \ # Model id
      -H 'accept: application/json'

    # Filter by implementation language
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/models/?implementation_language=python&page=1&per_page=5' \
      -H 'accept: application/json'

    # Combining filters
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/models/?id=1&name=test&implementation_language=python&page=1&per_page=5' \
      -H 'accept: application/json'

    ```

## Examples using the mosqlient package

The mosqlient is a Python package created to facilitate the use of API. 

In the package, there is a function called `get_models` that returns a list of dictionaries with information about the models. This function accepts as filters all the parameters in the parameters table above except `page` and `per_page`. 

Below is a usable example of fetching the models filtering by `implementation_language` and `author_name`.
```py
from mosqlient import get_models

get_models(implementation_language = 'Python', 
          author_name = 'Eduardo Correa Araujo')
```

Also, there is a specific function that filters the models by any parameter. This function is called `get_models_by_{parameter}`. The example below shows how it can be used to filter all the `dengue` models in the platform. 

```py
from mosqlient import get_models_by_disease

get_models_by_disease(disease = 'dengue')
```
