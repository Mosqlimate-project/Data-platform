> **WARNING**  
> The methods presented in this documentation generate real objects in database. To test Mosqlimate API request methods without inserting data, please refer to [API Demo](https://api.mosqlimate.org/api/docs)

## Input parameters 
| Parameter name | Type | Description |
|--|--|--|
| name | str | Model name | 
| description | str or None | Model description |
| repository | str | Github repository URL |
| implementation_language | str | Implementation language |
| type | str _(icontains)_ | Model type. E.g: nowcast / forecast |


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
        mtype: str
    ):
        url = "https://api.mosqlimate.org/api/registry/models/"
        headers = {"X-UID-Key": "See X-UID-Key documentation"}
        model = {
            "name": name,
            "description": description,
            "repository": repository,
            "implementation_language": implementation_language,
            "type": mtype
        }
        return requests.post(url, json=model, headers=headers)


    # Example
    types = ["nowcast", "forecast"]

    post_model(
        name = "My Nowcasting Model",
        description = "My Model description",
        repository = "https://github.com/Mosqlimate-project/Data-platform",
        implementation_language = "Python",
        mtype = types[0]
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
      mtype
    ) {
      url <- "https://api.mosqlimate.org/api/registry/models/"
      headers <- add_headers("X-UID-Key" = "See X-UID-Key documentation")
      model <- list(
        name = name,
        description = description,
        repository = repository,
        implementation_language = implementation_language,
        type = mtype
      )
      response <- POST(url, body = list(model), encode = "json", headers = headers)
      return(content(response, "text"))
    }

    # Example
    types <- c("nowcast", "forecast")

    post_model(
      name = "My Nowcasting Model",
      description = "My Model description",
      repository = "https://github.com/Mosqlimate-project/Data-platform",
      implementation_language = "R",
      mtype = types[1]
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
        "type": "nowcast"
    }'
    ```
