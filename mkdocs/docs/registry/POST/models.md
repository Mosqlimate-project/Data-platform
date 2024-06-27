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

=== "Python3"
    ```py
    # Warning: this method generates real object in database if called with
    # the correct UID Key
    def post_model(
        name: str, 
        description: str, 
        repository: str, 
        implementation_language: str, 
        disease: Literal["dengue", "chikungunya", "zika"],
        temporal: bool,
        spatial: bool,
        categorical: bool
        adm_level: Literal[0, 1, 2, 3],
        time_resolution: Literal["day", "week", "month", "year"],
    ):
        url = "https://api.mosqlimate.org/api/registry/models/"
        headers = {"X-UID-Key": "See X-UID-Key documentation"}
        model = {
            "name": name,
            "description": description,
            "repository": repository,
            "implementation_language": implementation_language,
            "disease": disease,
            "temporal": temporal,
            "spatial": spatial,
            "categorical": categorical,
            "type": mtype,
            "ADM_level": adm_level,
            "time_resolution": time_resolution,
        }
        return requests.post(url, json=model, headers=headers)


    # Example
    post_model(
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
    )
    ```

=== "R"
    ```R
    library(httr)

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
      time_resolution
    ) {
      url <- "https://api.mosqlimate.org/api/registry/models/"
      key = c("<USER>:<KEY>. See X-UID-Key documentation")
      names(key) <- 'X-UID-Key'
      model <- list(
        name = name,
        description = description,
        repository = repository,
        implementation_language = implementation_language,
        disease = disease,
        spatial = spatial,
        temporal = temporal,
        categorical = categorical,
        ADM_level = adm_level,
        time_resolution = time_resolution
      )
      response <- POST(url, body = model, add_headers(.headers=key),  encode = "json", verbose())
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
      time_resolution = "week"
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
        "time_resolution": "week"
    }'
    ```

## Examples using the mosqlient package

The mosqlient is a Python package created to facilitate the use of API. 

In the package, there is a function called `upload_model` that can be used to save the models in the platform. 

Below is a usable example of the function.
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
    api_key = "X-UID-Key"
    )
```
