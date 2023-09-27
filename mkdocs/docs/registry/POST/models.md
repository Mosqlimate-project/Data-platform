> **WARNING**  
> The methods presented in this documentation generate real objects in database. To test Mosqlimate API request methods without inserting data, please refer to [API Demo](https://api.mosqlimate.org/api/docs)

## Input parameters 
| Parameter name | Type | Description |
|--|--|--|
| name | str | Model name | 
| description | str or None | Model description |
| repository | str | Github repository URL |
| implementation_language | str | Implementation language |
| type | str | Model type |

## X-UID-Key
POST requests require [User API Token](uid-key.md) to be called.

## Usage examples

=== "Python"
    ```py
    # Warning: this method generates real object in database if called with
    # the correct UID Key
    def post_model(
        name: str, 
        description: str, 
        repository: str, 
        implementation_language: str, 
        type: str
    ):
        url = "https://api.mosqlimate.org/api/registry/models/"
        headers = {"X-UID-Key": "See X-UID-Key documentation"}
        model = {
            "name": name,
            "description": description,
            "repository": repository,
            "implementation_language": implementation_language,
            "type": type
        }
        return requests.post(url, json=model, headers=headers)
    ```

=== "R"
    ```R
    library(httr)

    # Warning: this method generates real object in database if called with
    # the correct UID Key
    post_model <- function(
        name,
        description,
        repository,
        implementation_language,
        type,
    ) {
      url <- "https://api.mosqlimate.org/api/registry/models/"
      headers <- c("X-UID-Key" = "See X-UID-Key documentation")
      model <- list(
        name = name,
        description = description,
        repository = repository,
        implementation_language = implementation_language,
        type = type
      )
      
      response <- POST(url, body = toJSON(model), add_headers(.headers = headers))
      return(response)
    }
    ```

=== "curl"
    ```sh
    curl -X 'POST' \
        'https://api.mosqlimate.org/api/registry/models/' \
        -H 'accept: application/json' \
        -H 'X-UID-Key: See X-UID-Key documentation' \
        -H 'Content-Type: application/json' \
        -d '{
        "name": "string",
        "description": "string",
        "repository": "string",
        "implementation_language": "string",
        "type": "string"
    }'
    ```
