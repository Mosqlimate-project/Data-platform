## Parameters Table 
| Nome do parâmetro | Obrigatório | Tipo | Descrição |
|--|--|--|--|
| *page | sim | int | Página a ser exibida |
| *per_page | sim | int | Quantidade de predições exibidas por página |
| id | não | int | ID do modelo |
| repository_owner | não | str (icontains) | Proprietário do repositório do modelo |
| repository_organization | não | str (icontains) | Organização do repositório do modelo |
| repository_name | não | str (icontains) | Nome do repositório do modelo {owner ou org}/{nome} |
| disease | não | str ("A90", "A92.0", "A92.5") | Código da doença |
| adm_level | não | int (0, 1, 2 ou 3) | Nível administrativo, opções: 0, 1, 2, 3 (Nacional, Estadual, Municipal, Sub-municipal) |
| time_resolution | não | str (iexact) | Opções: day (dia), week (semana), month (mês) ou year (ano) |
| category | não | str (iexact) | Categoria do modelo |
| sprint | não | int/null | Ano IMDC do modelo |

#### Detalhes
`page` consiste no total de modelos retornados pela requisição dividido por `per_page`. A informação de `pagination` é retornada junto com os modelos. Ex.:
```py
'pagination': {
	'items': 10,                    # Quantidade de Modelos sendo exibidos 
	'total_items': 10,  		# Quantidade total de Modelos retornados na requisição
	'page': 1,			             # *parâmetro da requisição
	'total_pages': 1,   		# Quantidade total de páginas retornadas na requisição
	'per_page': 50		    	# *parâmetro da requisição
},
```

## Exemplos de uso

Os exemplos em Python utilizam o pacote `mosqlient`, especificamente desenvolvido para interagir com a API. Para mais informações sobre como utilizá-lo, consulte a [documentação aqui](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).

=== "Python3"
    ```py
    import mosqlient

    # List all Models
    mosqlient.get_all_models(X-UID-Key)

    # get specific Model
    mosqlient.get_model_by_id(X-UID-Key, id)

    # get models with filters
    mosqlient.get_models(X-UID-Key, **kwargs)
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    models_api <- "https://api.mosqlimate.org/api/registry/models/"
    headers <- add_headers(
      `X-UID-Key` = X-UID-Key
    )

    page <- 1
    per_page <- 5
    pagination <- paste0("?page=", page, "&per_page=", per_page, "&")

    # List all Models
    response_all <- GET(paste0(models_api, pagination), headers)
    all_models <- content(response_all, "text") |> fromJSON()

    # Get specific Model
    response_specific <- GET(paste0(models_api, "1"), headers) # Model id
    specific_model <- content(response_specific, "text") |> fromJSON()

    # Advanced Usage
    parameters <- list(
      page = 1,
      per_page = 2
      # Add parameters here
    )

    get_models <- function(parameters) {
      models_api <- "https://api.mosqlimate.org/api/registry/models/?"
      parameters_url <- paste0(names(parameters), "=", unlist(parameters), collapse = "&")
      response <- GET(paste0(models_api, parameters_url), headers)
      models <- content(response, "text") |> fromJSON()
      return(models)
    }

    get_models(parameters)
    ```

=== "curl"
    ```sh
    # List all models
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/models/?page=1&per_page=5' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    # Get specific Model
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/models/1' \ # Model id
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    # Combining filters
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/models/?id=1&name=test&page=1&per_page=5' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'
    ```
