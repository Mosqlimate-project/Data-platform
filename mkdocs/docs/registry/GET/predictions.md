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

> Note: for fetching a big amount of pages, please consider using [Async](../../tutorials/AsyncRequests.ipynb) code


## Usage examples
=== "Python3"
    ```py
    import requests

    predictions_api = "https://api.mosqlimate.org/api/registry/predictions/"

    page = 1
    per_page = 5
    pagination = "?page={page}&per_page={per_page}&"

    # List all Predictions
    requests.get(predictions_api + pagination).json()

    # Filter by predict date
    requests.get(predictions_api + pagination + "predict_date=2023-01-01").json()

    # Filter using multiple parameters; predict date range
    requests.get(predictions_api + pagination + "start=2023-01-01" + "&" + "end=2023-02-01").json()


    # Advanced usage:
    parameters = {
        "page": 1,
        "per_page": 50,
        # Add parameters here
    }

    def get_predictions(parameters: dict):
        predictions_api = "https://api.mosqlimate.org/api/registry/predictions/?"
        parameters_url = "&".join([f"{p}={v}" for p,v in parameters.items()])
        return requests.get(predictions_api + parameters_url).json()
            
    get_predictions(parameters)
    ```

=== "R"
    ```R
    library(httr)

    predictions_api <- "https://api.mosqlimate.org/api/registry/predictions/"

    page <- 1
    per_page <- 5
    pagination <- paste0("?page=", page, "&per_page=", per_page, "&")

    # List all Predictions
    response_all <- GET(paste0(predictions_api, pagination))
    predictions_all <- content(response_all, "text") |> fromJSON()

    # Filter by predict date
    predict_date <- "2023-01-01"
    response_date <- GET(paste0(predictions_api, pagination, "predict_date=", predict_date))
    predictions_date <- content(response_date, "text") |> fromJSON()

    # Filter using multiple parameters; predict date range
    start_date <- "2023-01-01"
    end_date <- "2023-02-01"
    filters_combined <- paste0("start=", start_date, "&", "end=", end_date)
    response_combined <- GET(paste0(predictions_api, pagination, filters_combined))
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
      response <- GET(paste0(predictions_api, parameters_url))
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
      -H 'accept: application/json'

    # Filter by predict date
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/predictions/?predict_date=2023-01-01&page=1&per_page=50' \
      -H 'accept: application/json'

    # Filter using multiple parameters; predict date range
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/predictions/?start=2023-01-01&end=2023-02-01&page=1&per_page=50' \
      -H 'accept: application/json'
    ```


## Examples using the mosqlient package

The mosqlient is a Python package created to facilitate the use of API. 

In the package, there is a function called `get_predictions` that returns a list of dictionaries with information about the predictions. This function accepts as filters all the parameters in the parameters table above except `page` and `per_page`. 

Below is a usable example of fetching the predictions filtering by `model_disease` and `model_ADM_level`.
```py
from mosqlient import get_predictions

get_predictions(model_disease = 'dengue', model_ADM_level = 2)
```

Also, there is a specific function that filters the predictions by any parameter. This function is called `get_models_by_{parameter}`. The example below shows how it can be used to filter all the predictions from a specific model, referred to by his`model_id`, in the platform. Below is an example. 

```py
from mosqlient import get_predictions_by_model_id

get_predictions_by_model_id(model_id = 6)
```

The functions above return a list of dictionaries, each representing the metadata associated with a single prediction. To obtain a DataFrame from the JSON prediction, you can use the code below: 

```py 
from mosqlient import get_predictions_by_model_id
    
def transform_json_to_dataframe(res:dict) -> pd.DataFrame:
  """
  A function that transforms the prediction output from the API and transforms it in a DataFrame.

  Parameters:
  rest (dict): Output of the  prediction's API.

  Returns:
  pd.DataFrame. 
  """

  json_struct = json.loads(res['prediction'])    
  df = pd.json_normalize(json_struct)
  df.dates = pd.to_datetime(df.dates)

  return df
    

preds = get_predictions_by_model_id(model_id = 6)

df_preds_0 = transform_json_to_dataframe(preds[0])
```
