> **WARNING**  
> The methods presented in this documentation generate real objects in database. To test Mosqlimate API request methods without inserting data, please refer to [API Demo](https://api.mosqlimate.org/api/docs)

## Input parameters 
| Parameter name | Type | Description |
|--|--|--|
| model_id | int | Model ID | 
| description | str or None | Prediction description |
| commit | str | Git commit hash to lastest version of Prediction's code in the Model's repository |
| predict_date | date _(YYYY-mm-dd)_ | Date when Prediction were generated |
| predict | dict _(JSON)_ | The Prediction result data |

## X-UID-Key
POST requests require [User API Token](uid-key.md) to be called.

## Usage examples

=== "Python"
    ```py
    # Warning: this method generates real object in database if called with
    # the correct UID Key
    def post_prediction(
        model_id: int, 
        description: str, 
        commit: str, 
        predict_date: str, 
        predict: dict
    ):
        url = "https://api.mosqlimate.org/api/registry/predictions/"
        headers = {"X-UID-Key": "See X-UID-Key documentation"}
        prediction = {
            "model": model_id,
            "description": description,
            "commit": commit,
            "predict_date": predict_date,
            "prediction": predict
        }
        return requests.post(url, json=prediction, headers=headers)
    ```

=== "R"
    ```R
    library(httr)

    # Warning: this method generates real object in database if called with
    # the correct UID Key
    post_prediction <- function(
        model_id,
        description,
        commit,
        predict_date,
        predict,
    ) {
      url <- "https://api.mosqlimate.org/api/registry/predictions/"
      headers <- c("X-UID-Key" = "See X-UID-Key documentation")
      prediction <- list(
        model_id = model_id,
        description = description,
        commit = commit,
        predict_date = predict_date,
        predict = predict
      )
      
      response <- POST(url, body = toJSON(model), add_headers(.headers = headers))
      return(response)
    }
    ```

=== "curl"
    ```sh
    # Warning: this request generates real object in database if called with
    # the correct UID Key
    curl -X 'POST' \
      'https://api.mosqlimate.org/api/registry/predictions/' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation' \
      -H 'Content-Type: application/json' \
      -d '{
      "model": 0,
      "description": "string",
      "commit": "string",
      "predict_date": "2023-01-01",
      "prediction": {}
    }'   
    ```
