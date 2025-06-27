> **AVISO**  
> Os métodos apresentados nesta documentação geram objetos reais no banco de dados. Para testar os métodos de requisição da API Mosqlimate sem inserir dados, consulte a [Demonstração da API](https://api.mosqlimate.org/api/docs).

## Parâmetros de entrada
| Nome do Parâmetro | Tipo | Descrição |
|---|---|---|
| name | str | Nome do modelo |
| description | str ou None | Descrição do modelo |
| repository | str | URL do repositório Github |
| implementation_language | str | Linguagem de implementação |
| disease | str _(iexact)_ | Doença do modelo. Opções: Dengue, Zika e Chikungunya |
| temporal | bool | O modelo é temporal? |
| spatial | bool | O modelo é espacial? |
| categorical | bool | O modelo é categórico? |
| adm_level | int _(0, 1, 2 ou 3)_ | Nível administrativo, opções: 0, 1, 2, 3 (Nacional, Estadual, Municipal, Submunicipal) |
| time_resolution | str _(iexact)_ | Opções: dia, semana, mês ou ano |
| sprint | bool | Modelo para o Sprint 2024/25 |

### Linguagem de Implementação
Atualmente, o Mosqlimate suporta as seguintes linguagens de implementação:

|||||
|---|---|---|---|
| Python | C | C# | C++ |
| CoffeeScript | .NET | Erlang | Go |
| Haskell | JavaScript | Java | Kotlin |
| Lua | R | Ruby | Rust |
| Zig |
||||

Se a sua Linguagem de Implementação não estiver na lista, entre em contato com a moderação.

## X-UID-Key
Requisições POST exigem [Token de API do Usuário](uid-key.pt.md) para serem chamadas.

## Exemplos de uso

O pacote `mosqlient` também aceita um DataFrame do pandas com as chaves necessárias como alternativa a um JSON no parâmetro de previsão. Para mais detalhes, consulte a [documentação aqui](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).

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
        "adm_level": 0,
        "time_resolution": "week",
        "sprint": false
    }'
    ```
