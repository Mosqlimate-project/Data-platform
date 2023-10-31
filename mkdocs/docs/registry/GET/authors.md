## Parameters Table 
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many predictions will be displayed per page |
| name | no | str _(icontains)_ | Author name |
| username | no | str | Author username |
| institution | no | str _(icontains)_ | Author institution |

## Usage examples

=== "Python3"
    ```py
    import requests

    authors_api = "https://api.mosqlimate.org/api/registry/authors/"

    requests.get(authors_api).json() # GET request
    requests.get(authors_api + "luabida").json() # GET request with parameter
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    authors_api <- "https://api.mosqlimate.org/api/registry/authors/"

    fromJSON(content(GET(authors_api), "text"))
    fromJSON(content(GET(authors_api, "luabida"), "text")) # GET specific user
    ```

=== "curl"
    ```sh
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/authors/' \
      -H 'accept: application/json'

    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/authors/luabida' \ # GET specific user
      -H 'accept: application/json'
    ```
