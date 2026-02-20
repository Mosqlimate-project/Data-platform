## Tabela de Parâmetros
| Nome do parâmetro | Obrigatório | Tipo | Descrição |
|--|--|--|--|
| *page | sim | int | Página a ser exibida |
| *per_page | sim | int | Quantidade de predições exibidas por página |
| id | não | int | ID da predição |
| model_id | não | int | ID do modelo |
| model_owner | não | str (icontains) | Proprietário do repositório do modelo |
| model_organization | não | str (icontains) | Organização do repositório do modelo |
| model_name | não | str (icontains) | Nome do repositório do modelo {proprietário ou org}/{nome} |
| model_adm_level | não | int (0, 1, 2 ou 3) | Nível administrativo, opções: 0, 1, 2, 3 (Nacional, Estadual, Municipal, Sub-municipal) |
| model_time_resolution | não | str (iexact) | Opções: day (dia), week (semana), month (mês) ou year (ano) |
| model_disease | não | str ("A90", "A92.0", "A92.5") | Código da doença do modelo |
| model_category | não | str (iexact) | Categoria do modelo |
| model_sprint | não | int/null | Ano IMDC do modelo |
| start | não | str (AAAA-mm-dd) | Data de modelagem da predição após (maior que) |
| end | não | str (AAAA-mm-dd) | Data de modelagem da predição antes de (menor que) |

#### Detalhes
`page` consiste no total de Previsões retornadas pela requisição dividido por `per_page`. A informação de `pagination` é retornada junto com as Previsões. Ex.:
```py
'pagination': {
	'items': 10,                    # Quantidade de Previsões sendo exibidas 
	'total_items': 10,  	  # Quantidade total de Previsões retornadas na requisição
	'page': 1,			             # *parâmetro da requisição
	'total_pages': 1,   	   # Quantidade total de páginas retornadas na requisição
	'per_page': 50		       # *parâmetro da requisição
},
```
## Exemplos de uso

Os exemplos em Python utilizam o pacote `mosqlient`, especificamente desenvolvido para interagir com a API. Para mais informações sobre como utilizá-lo, consulte a [documentação aqui](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).

=== "Python3"
    ```py
    import mosqlient

    # List all Predictions
    mosqlient.get_predictions(X-UID-Key)

    # Filter using multiple parameters; predict date range
    mosqlient.get_predictions(
        X-UID-Key,
        start="2023-01-01",
        end="2023-02-01"
    )

    # get a single prediction by id
    pred = mosqlient.get_predictions(
        X-UID-Key,
        id = id
    )

    # transform into a DataFrame: 
    pred[0].to_dataframe()
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    predictions_api <- "https://api.mosqlimate.org/api/registry/predictions/"
    headers <- add_headers(
      `X-UID-Key` = X-UID-Key
    )

    page <- 1
    per_page <- 5
    pagination <- paste0("?page=", page, "&per_page=", per_page, "&")

    # List all Predictions
    response_all <- GET(paste0(predictions_api, pagination), headers)
    predictions_all <- content(response_all, "text") |> fromJSON()

    # Filter by predict date
    predict_date <- "2023-01-01"
    response_date <- GET(paste0(predictions_api, pagination, "predict_date=", predict_date), headers)
    predictions_date <- content(response_date, "text") |> fromJSON()

    # Filter using multiple parameters; predict date range
    start_date <- "2023-01-01"
    end_date <- "2023-02-01"
    filters_combined <- paste0("start=", start_date, "&", "end=", end_date)
    response_combined <- GET(paste0(predictions_api, pagination, filters_combined), headers)
    predictions_combined <- content(response_combined, "text") |> fromJSON()

    # Advanced Usage
    parameters <- list(
      page = 1,
      per_page = 50
      # Add parameters here
    )

    get_predictions <- function(parameters) {
      predictions_api <- "https://api.mosqlimate.org/api/registry/predictions/?"
      parameters_url <- paste0(names(parameters), "=", unlist(parameters), collapse = "&")
      response <- GET(paste0(predictions_api, parameters_url), headers)
      predictions <- content(response, "text") |> fromJSON()
      return(predictions)
    }

    get_predictions(parameters)
    ```

=== "curl"
    ```sh
    # List all Predictions
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/predictions/?page=1&per_page=50' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    # Filter by predict date
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/predictions/?predict_date=2023-01-01&page=1&per_page=50' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'

    # Filter using multiple parameters; predict date range
    curl -X 'GET' \
      'https://api.mosqlimate.org/api/registry/predictions/?start=2023-01-01&end=2023-02-01&page=1&per_page=50' \
      -H 'accept: application/json' \
      -H 'X-UID-Key: See X-UID-Key documentation'
    ```
