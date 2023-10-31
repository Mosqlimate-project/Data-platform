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
| model_id | int | Model ID | 
| description | str or None | Prediction description |
| commit | str | Git commit hash to lastest version of Prediction's code in the Model's repository |
| ADM_level | int | One of the following options: 0, 1, 2 or 3 (National, State, Municipality or Sub Municipality respectively) |
| predict_date | date _(YYYY-mm-dd)_ | Date when Prediction was generated |
| predict | dict _(JSON)_ | The Prediction result data |

## X-UID-Key
POST requests require [User API Token](uid-key.md) to be called.

## Usage examples

=== "Python3"
    ```py
    # Warning: this method generates real object in database if called with
    # the correct UID Key
    def post_prediction(
        model_id: int, 
        description: str, 
        commit: str, 
        adm_level: int,
        predict_date: str, 
        predict: dict
    ):
        url = "https://api.mosqlimate.org/api/registry/predictions/"
        headers = {"X-UID-Key": "See X-UID-Key documentation"}
        prediction = {
            "model": model_id,
            "description": description,
            "commit": commit,
            "ADM_level": adm_level,
            "predict_date": predict_date,
            "prediction": predict
        }
        return requests.post(url, json=prediction, headers=headers)


    # Example
    post_prediction(
        model_id = 0, # Check the ID in models list or profile
        description = "My Prediction description",
        commit = "3d1d2cd016fe38b6e7d517f724532de994d77618",
        adm_level = 0, # National
        predict_date = "2023-10-31",
        predict = {
            "prediction": "example"
        }
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
      adm_level,
      predict_date,
      predict
    ) {
      url <- "https://api.mosqlimate.org/api/registry/predictions/"
      headers <- add_headers("X-UID-Key" = "See X-UID-Key documentation")
      prediction <- list(
        model = model_id,
        description = description,
        commit = commit,
        ADM_level = adm_level,
        predict_date = predict_date,
        prediction = predict
      )
      response <- POST(url, body = list(prediction), encode = "json", headers = headers)
      return(content(response, "text"))
    }

    # Example
    post_prediction(
      model_id = 0, # Check the ID in models list or profile
      description = "My Prediction description",
      commit = "3d1d2cd016fe38b6e7d517f724532de994d77618",
      adm_level = 0, # National
      predict_date = "2023-10-31",
      predict = list(
        prediction = "example"
      )
    )
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
      "description": "My Prediction description",
      "commit": "3d1d2cd016fe38b6e7d517f724532de994d77618",
      "ADM_level": 0,
      "predict_date": "2023-10-31",
      "prediction": {"prediction": "example"}
    }'   
    ```
