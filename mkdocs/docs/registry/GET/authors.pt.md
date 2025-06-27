## Tabela de Parâmetros
| Nome do Parâmetro | Obrigatório | Tipo | Descrição |
|---|---|---|---|
| *page | sim | int | Página a ser exibida |
| *per_page | sim | int | Quantas previsões serão exibidas por página |
| name | não | str _(icontains)_ | Nome do autor |
| username | não | str | Nome de usuário do autor |
| institution | não | str _(icontains)_ | Instituição do autor |

## Exemplos de uso

Os exemplos em Python utilizam o pacote `mosqlient`, especificamente desenvolvido para interagir com a API. Para mais informações sobre como utilizá-lo, consulte a [documentação aqui](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).

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
