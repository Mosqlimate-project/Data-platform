In order to register a prediction, you need at least two pieces of information before you can use the code examples below. The first is the `id` number of your model, which you can obtain [here](https://api.mosqlimate.org/models/). The second is the commit id of the exact version of your code (the model must be available on a GitHub repository) that has generated the predictions. In order to find out this you can use the following code in the (Linux or Mac) terminal:

```bash
git show | sed -n '1p' | sed 's/commit \(.*\)/\1/'
``` 

If you use Windows, you can [install WSL](https://ubuntu.com/tutorials/install-ubuntu-on-wsl2-on-windows-11-with-gui-support#1-overview).

The prediction itself, must be provided as a JSON object. Please refer to our visualization documentation examples.

> **WARNING**  
> The methods presented in this documentation generate real objects in database. To test Mosqlimate API request methods without inserting data, please refer to [API Demo](https://api.mosqlimate.org/api/docs)

## Input parameters 
| Parameter name | Type | Description |
|--|--|--|
| model | int | Model ID | 
| description | str or None | Prediction description |
| commit | str | Git commit hash to lastest version of Prediction's code in the Model's repository |
| predict_date | date _(YYYY-mm-dd)_ | Date when Prediction was generated |
| adm_0 | str _(ISO 3166-1)_ | Country code. Default: "BRA" |
| adm_1 | str _(UF)_ | State abbreviation. Example: "RJ" |
| adm_2 | int _(IBGE)_ | City geocode. Example: 3304557 |
| adm_3 | int _(IBGE)_ | - |
| prediction | dict _(JSON)_ | The Prediction result data |

## X-UID-Key
POST requests require [User API Token](uid-key.md) to be called.

## Usage examples

=== "Python3"
    ```py
    import requests

    # Warning: this method generates a real object in the database if called with
    # the correct UID Key
    def post_prediction(
        model_id: int,
        description: str,
        commit: str,
        predict_date: str,
        prediction: dict,
        adm_1: str | None = None,
        adm_2: int | None = None,
    ):
        url = "https://api.mosqlimate.org/api/registry/predictions/"
        headers = {"X-UID-Key": "See X-UID-Key documentation"}
        predict = {
            "model": model_id,
            "description": description,
            "commit": commit,
            "predict_date": predict_date,
            "prediction": prediction,
            "adm_1": adm_1,
            "adm_2": adm_2,
        }
        return requests.post(url, json=predict, headers=headers)

    # Example
    post_prediction(
        model_id=0,  # Check the ID in models list or profile
        description="My Prediction description",
        commit="3d1d2cd016fe38b6e7d517f724532de994d77618",
        predict_date="2023-10-31",
        adm_1="RJ",
        prediction={"prediction": "example"},
    )
    ```

=== "R"
    ```R
    library(httr)

    # Warning: this method generates a real object in the database if called with
    # the correct UID Key
    post_prediction <- function(
      model_id,
      description,
      commit,
      predict_date,
      prediction,
      adm_1 = NULL,
      adm_2 = NULL
    ) {
      url <- "https://api.mosqlimate.org/api/registry/predictions/"
      key = c("<USER>:<KEY>. See X-UID-Key documentation")
      names(key) <- 'X-UID-Key'
      predict <- list(
        model = model_id,
        description = description,
        commit = commit,
        predict_date = predict_date,
        prediction = prediction,
        adm_1 = adm_1,
        adm_2 = adm_2
      )
      response <- POST(url, body = predict, add_headers(.headers=key), encode = "json", verbose())
      return(content(response, "text"))
    }

    # Example
    post_prediction(
      model_id = 0, # Check the ID in models list or profile
      description = "My Prediction description",
      commit = "3d1d2cd016fe38b6e7d517f724532de994d77618",
      predict_date = "2023-10-31",
      adm_1 = "RJ",
      prediction = list(...)
    )
    ```

=== "curl"
    ```sh
    # Warning: this request generates a real object in the database if called with
    # the correct UID Key
    curl -X 'POST' \
      'https://api.mosqlimate.org/api/registry/predictions/' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation' \
      -H 'Content-Type: application/json' \
      -d '{
      "model": 0,
      "description": "My Prediction description",
      "commit": "3d1d2cd016fe38b6e7d517f724532de994d77618",
      "predict_date": "2023-10-31",
      "adm_1": "RJ",
      "prediction": {...}
    }'
    ```

## Examples using the mosqlient package

The mosqlient is a Python package created to facilitate the use of API. 

In the package, there is a function called `upload_prediction` that can be used to send the predictions to the platform. The function accepts the parameters described above, but the `prediction` parameter, instead of json, must be filled with a pandas DataFrame containing the following columns: [date, lower, pred, upper, adm_{adm_level}]. When registering your model, you must provide the output predictions' ADM Level. If your model has an ADM level—1, state level, then your predictions must contain the adm_1 column.

Below is a usable example of the function for a model that predicts a horizon of 10 weeks for adm 1 level.
```py
from mosqlient import upload_prediction

upload_prediction(
  model_id = 0, # Check the ID in models list or profile
  description = "My Prediction description",
  commit = "3d1d2cd016fe38b6e7d517f724532de994d77618",
  predict_date = "2023-10-31",
  adm_1 = "RJ",
  prediction = list(dict(...)) | pd.DataFrame(...),
  api_key = "X-UID-Key"
  )
```
