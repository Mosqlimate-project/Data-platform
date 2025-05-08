> **WARNING**  
> The methods presented in this documentation generate real objects in database. To test Mosqlimate API request methods without inserting data, please refer to [API Demo](https://api.mosqlimate.org/api/docs)

## Input parameters 
| Parameter name | Type | Description |
|--|--|--|
| name | str | Model name | 
| description | str or None | Model description |
| repository | str | Github repository URL |
| implementation_language | str | Implementation language |
| disease | str _(iexact)_ | Model disease. Options: Dengue, Zika and Chikungunya |
| temporal | bool | Is the model temporal? |
| spatial | bool | Is the model spatial? |
| categorical | bool | Is the model categorical? |
| ADM_level | str _(iexact)_ | Administrative level, options: 0, 1, 2, 3 (National, State, Municipality, Sub Municipality) |
| time_resolution | str _(iexact)_ | Options are: day, week, month or year |
| sprint | bool | Model for Sprint 2024/25 |


### Implementation Language
Currently, Mosqlimate supports the following implementation languages:

|||||
|--|--|--|--|
| Python | C | C# | C++ | 
| CoffeeScript | .NET | Erlang | Go |
| Haskell | JavaScript | Java | Kotlin |
| Lua | R | Ruby | Rust |
| Zig |
||||

If you don't see your Implementation Language in the list, please contact the moderation.

## X-UID-Key
POST requests require [User API Token](uid-key.md) to be called.

## Usage examples

The `mosqlient` package also accepts a pandas DataFrame with the required keys as an alternative to a JSON in the prediction parameter. For more details, refer to the [documentation here](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).

=== "Python3"
    ```py
    
    from mosqlient import upload_model 

    upload_model(
        name = "My Nowcasting Model",
        description = "My Model description",
        repository = "https://github.com/Mosqlimate-project/Data-platform",
        implementation_language = "Python",
        disease = "dengue",
        temporal = False,
        spatial = True,
        categorical = False,
        adm_level = 0, # National
        time_resolution = "week",
        sprint = False
    )
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    # Warning: this method generates real object in the database if called with
    # the correct UID Key
    post_model <- function(
        name,
        description,
        repository,
        implementation_language,
        disease,
        spatial,
        temporal,
        categorical,
        adm_level,
        time_resolution,
        sprint
    ) {
    url <- "https://api.mosqlimate.org/api/registry/models/"
    
    headers <- add_headers(
        `X-UID-Key` = X-UID-Key)
    
    model <- list(
        name = name,
        description = description,
        repository = repository,
        implementation_language = implementation_language,
        disease = disease,
        spatial = spatial,
        temporal = temporal,
        categorical = categorical,
        adm_level = adm_level,
        time_resolution = time_resolution,
        sprint = sprint
        )

    response <- POST(url, headers, body = model,  encode = "json")
    return(content(response, "text"))
    }

    # Example
    post_model(
      name = "My Nowcasting Model",
      description = "My Model description",
      repository = "https://github.com/Mosqlimate-project/Data-platform",
      implementation_language = "R",
      disease = "dengue",
      spatial = TRUE,
      temporal = FALSE,
      categorical = TRUE,
      adm_level = 0,
      time_resolution = "week",
      sprint = FALSE
    )
    ```

=== "CURL"
    ```sh
    curl -X 'POST' \
        'https://api.mosqlimate.org/api/registry/models/' \
        -H 'accept: application/json' \
        -H 'X-UID-Key: See X-UID-Key documentation' \
        -H 'Content-Type: application/json' \
        -d '{
        "name": "My Nowcasting Model",
        "description": "My Model description",
        "repository": "https://github.com/Mosqlimate-project/Data-platform",
        "implementation_language": "Python",
        "disease": "dengue",
        "spatial": true,
        "temporal": true,
        "categorical": true,
        "ADM_level": 0,
        "time_resolution": "week",
        "sprint": false
    }'
    ```
