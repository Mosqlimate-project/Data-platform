In order to register a prediction, you need at least two pieces of information before you can use the code examples below. The first is the `id` number of your model, which you can obtain [here](https://api.mosqlimate.org/models/). The second is the commit id of the exact version of your code (the model must be available on a GitHub repository) that has generated the predictions. In order to find out this you can use the following code in the (Linux or Mac) terminal:

```bash
git show | sed -n '1p' | sed 's/commit \(.*\)/\1/'
``` 

If you use Windows, you can [install WSL](https://ubuntu.com/tutorials/install-ubuntu-on-wsl2-on-windows-11-with-gui-support#1-overview).

The prediction itself, must be provided as a JSON object. It must necessarily contain the keys presented in the table below:

| Name | Type | Description |
|--|--|--|
| date | str _(YYYY-mm-dd)_ | Date predict | 
| lower_95 | float | Lower predictive interval of 95% |
| lower_90 | float | Lower predictive interval of 90% |
| lower_80 | float| Lower predictive interval of 80% |
| lower_50 | float | Lower predictive interval of 50% |
| pred | float | Median estimate |
| upper_50 | float | Upper predictive interval of 50% |
| upper_80 | float | Upper predictive interval of 80% |
| upper_90 | float | Upper predictive interval of 90% |
| upper_95 | float | Upper predictive interval of 95% |

Example of the JSON object: 

```
[
    {
      "date": "2010-01-03",
      "pred": 100,
      "lower_95": 65,
      "lower_90": 70,
      "lower_80": 80,
      "lower_50": 90,
      "upper_50": 110,
      "upper_80": 120,
      "upper_90": 130,
      "upper_95": 135
    },
    {
      "date": "2010-01-10",
      "pred": 100,
      "lower_95": 85,
      "lower_90": 90,
      "lower_80": 100,
      "lower_50": 110,
      "upper_50": 130,
      "upper_80": 140,
      "upper_90": 150,
      "upper_95": 175
    }, ...
  ]
```

> **WARNING**  
> The methods presented in this documentation generate real objects in database. To test Mosqlimate API request methods without inserting data, please refer to [API Demo](https://api.mosqlimate.org/api/docs)

## Input parameters 
The table below lists the parameters required to register a forecast. If your model refers to `adm_level = 1`, you only need to fill in the `adm_1` parameter and leave `adm_2` as null. The opposite applies if your model refers to `adm_level = 2`.
| Parameter name | Type | Description |
|--|--|--|
| model | int | Model ID | 
| description | str or None | Prediction description |
| commit | str | Git commit hash to lastest version of Prediction's code in the Model's repository |
| predict_date | date _(YYYY-mm-dd)_ | Date when Prediction was generated |
| adm_1 | str _(UF)_ | State abbreviation. Example: "RJ" |
| adm_2 | int _(IBGE)_ | City geocode. Example: 3304557 |
| prediction | dict _(JSON)_ | The Prediction data.|

## X-UID-Key
POST requests require [User API Token](uid-key.en.md) to be called.

## Usage examples

The `mosqlient` package also accepts a pandas DataFrame with the required keys as an alternative to a JSON in the prediction parameter. For more details, refer to the [documentation here](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).


=== "Python3"
    ```py
    from mosqlient import upload_prediction

    upload_prediction(
      model_id = 0, # Check the ID in models list or profile
      description = "My Prediction description",
      commit = "3d1d2cd016fe38b6e7d517f724532de994d77618",
      predict_date = "2023-10-31",
      adm_1 = "RJ",
      prediction = [
    {
      "date": "2010-01-03",
      "pred": 100,
      "lower_95": 65,
      "lower_90": 70,
      "lower_80": 80,
      "lower_50": 90,
      "upper_50": 110,
      "upper_80": 120,
      "upper_90": 130,
      "upper_95": 135
    },
    {
      "date": "2010-01-10",
      "pred": 100,
      "lower_95": 85,
      "lower_90": 90,
      "lower_80": 100,
      "lower_50": 110,
      "upper_50": 130,
      "upper_80": 140,
      "upper_90": 150,
      "upper_95": 175
    }], 
      api_key = "X-UID-Key"
      )
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    # Warning: this method generates a real object in the database if called with
    # the correct UID Key
    post_prediction <- function(
        model_id,
        description,
        commit,
        predict_date,
        prediction,
        adm_1 = NULL
    ) {
      
      url <- "https://api.mosqlimate.org/api/registry/predictions/"
      
      headers <- add_headers(
        `X-UID-Key` = X-UID-Key)
      
      predict <- list(
        model = model_id,
        description = description,
        commit = commit,
        predict_date = predict_date,
        prediction = prediction,
        adm_1 = adm_1, 
        adm_2 = NULL,
        )
      
      predict_json <- toJSON(predict, auto_unbox = TRUE, null = "null")
      
      with_verbose(response <- POST(url, headers, body = predict_json, encode = "json"))
      
      if (http_status(response)$category != "Success") {
      # print(content(response, "text", encoding = "UTF-8"))
        stop("Request failed: ", http_status(response)$message)
      }
      
      return(content(response, "text"))
    }

    # Example
    post_prediction(
      model_id = 16, # Check the ID in models list or profile
      description = "My prediction description",
      commit = "9b8d3afd84a5f77ac457c43af31e09be0b6d04af",
      predict_date = "2023-10-31",
      adm_1 = "RJ",
      prediction = list(
        list(
          date = "2010-01-03",
          pred= 100,
          lower_95= 65,
          lower_90= 70,
          lower_80= 80,
          lower_50= 90,
          upper_50= 110,
          upper_80= 120,
          upper_90= 130,
          upper_95= 135),
        list(
          date="2010-01-10",
          pred= 120,
          lower_95=85,
          lower_90= 90,
          lower_80= 100,
          lower_50= 110,
          upper_50= 130,
          upper_80= 140,
          upper_90= 150,
          upper_95= 175)
      )
    )
    ```
