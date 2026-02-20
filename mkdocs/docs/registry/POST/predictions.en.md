In order to register a prediction, you need at least two pieces of information before you can use the code examples below. You will need the commit id of the exact version of your code (the model must be available on a GitHub or GitLab repository) that has generated the predictions. In order to find out this you can use the following code in the (Linux or Mac) terminal:

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
| repository | str | Model repository. Format: "{owner or org}/{name}" | 
| description | str or None | Prediction description |
| commit | str | Git commit hash to lastest version of Prediction's code in the Model's repository |
| case_definition | str | "reported" or "probable". The case definition used for the prediction data. |
| published | bool _(True)_ | Whether this prediction is visible to the public. |
| adm_0 | str _(BRA)_ | Country isocode. Default: "BRA" |
| adm_1 | int _(UF)_ | State geocode. Example: 33 for RJ |
| adm_2 | int _(IBGE)_ | City geocode. Example: 3304557 |
| adm_3 | int _(IBGE)_ | Sub-municipality geocode. |
| prediction | dict _(JSON)_ | The Prediction data.|


## X-UID-Key
POST requests require [User API Token](uid-key.en.md) to be called.

## Usage examples

The `mosqlient` package also accepts a pandas DataFrame with the required keys as an alternative to a JSON in the prediction parameter. For more details, refer to the [documentation here](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).


=== "Python3"
    ```py
    from mosqlient import upload_prediction

    repository = "luabida/.config" 
    description = "test client prediction test client prediction"
    commit = "553f9072811f486631ef2ef1b8cce9b0b93fdd0d"
    adm_1 = 33  

    prediction = [
        {
            "date": "2024-01-01",
            "lower_95": 0.1,
            "lower_90": 0.2,
            "lower_80": 0.3,
            "lower_50": 0.4,
            "pred": 1,
            "upper_50": 1.1,
            "upper_80": 1.2,
            "upper_90": 1.3,
            "upper_95": 1.4,
        }
    ] # Can also be a pandas DataFrame

    pred = upload_prediction(
        api_key=api_key,
        repository=repository,
        description=description,
        commit=commit,
        case_definition="probable",
        published=True,
        adm_1=adm_1,
        prediction=prediction
    )
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    post_prediction <- function(
        api_key,
        repository,
        description,
        commit,
        adm_1,
        prediction,
        case_definition = "probable",
        published = TRUE
    ) {
      
      url <- "https://api.mosqlimate.org/api/registry/predictions/"
      
      headers <- add_headers(
        `Authorization` = paste("Bearer", api_key),
        `Content-Type` = "application/json"
      )
      
      body_list <- list(
        repository = repository,
        description = description,
        commit = commit,
        case_definition = case_definition,
        published = published,
        adm_1 = adm_1,
        prediction = prediction
      )
      
      body_json <- toJSON(body_list, auto_unbox = TRUE, null = "null")
      
      response <- POST(url, headers, body = body_json, encode = "json")
      
      if (http_status(response)$category != "Success") {
        stop("Request failed: ", content(response, "text", encoding = "UTF-8"))
      }
      
      return(content(response, "parsed"))
    }

    prediction_data <- list(
      list(
        date = "2024-01-01",
        lower_95 = 0.1,
        lower_90 = 0.2,
        lower_80 = 0.3,
        lower_50 = 0.4,
        pred = 1,
        upper_50 = 1.1,
        upper_80 = 1.2,
        upper_90 = 1.3,
        upper_95 = 1.4
      )
    )

    post_prediction(
      api_key = "your_api_key_here",
      repository = "luabida/.config",
      description = "test client prediction test client prediction",
      commit = "553f9072811f486631ef2ef1b8cce9b0b93fdd0d",
      adm_1 = 33,
      prediction = prediction_data
    )
    ```
