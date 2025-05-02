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
    import mosqlient

    mosqlient.get_authors(api_key)
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    authors_api <- "https://api.mosqlimate.org/api/registry/authors/"
    headers <- add_headers(
      `X-UID-Key` = API_KEY
    )
    fromJSON(content(GET(authors_api, headers=headers), "text"))
    ```

=== "curl"
    ```sh
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/authors/' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/authors/luabida' \ # GET specific user
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'
    ```
