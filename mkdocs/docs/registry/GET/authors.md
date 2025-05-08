## Parameters Table 
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many predictions will be displayed per page |
| name | no | str _(icontains)_ | Author name |
| username | no | str | Author username |
| institution | no | str _(icontains)_ | Author institution |

## Usage examples

The Python examples use the `mosqlient` package, specifically designed for interacting with the API. For more information on how to use it, refer to the [documentation here](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).

=== "Python3"
    ```py
    import mosqlient

    mosqlient.get_authors(X-UID-Key)
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    authors_api <- "https://api.mosqlimate.org/api/registry/authors/"

    response <- GET(authors_api, add_headers(`X-UID-Key` = X-UID-Key))

    if (status_code(response) != 200) {
      stop("Request failed: ", status_code(response), "\n", content(response, "text"))
    }

    authors <- fromJSON(content(response, "text"))
    print(authors)
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
