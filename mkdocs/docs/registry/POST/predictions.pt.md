Para registrar uma previsão, você precisa de pelo menos duas informações antes de usar os exemplos de código abaixo. Você precisará do ID do commit da versão exata do seu código (o modelo deve estar disponível em um repositório GitHub ou GitLab) que gerou as previsões. Para descobrir isso, você pode usar o seguinte código no terminal (Linux ou Mac):

```bash
git show | sed -n '1p' | sed 's/commit \(.*\)/\1/'
``` 

Se você usa Windows, você pode [instalar o WSL](https://ubuntu.com/tutorials/install-ubuntu-on-wsl2-on-windows-11-with-gui-support#1-overview).

A previsão em si deve ser fornecida como um objeto JSON. Ela deve necessariamente conter as chaves apresentadas na tabela abaixo:

| Nome | Tipo | Descrição |
|---|---|---|
| date | str _(AAAA-mm-dd)_ | Data da previsão |
| lower_95 | float | Intervalo preditivo inferior de 95% |
| lower_90 | float | Intervalo preditivo inferior de 90% |
| lower_80 | float | Intervalo preditivo inferior de 80% |
| lower_50 | float | Intervalo preditivo inferior de 50% |
| pred | float | Estimativa mediana |
| upper_50 | float | Intervalo preditivo superior de 50% |
| upper_80 | float | Intervalo preditivo superior de 80% |
| upper_90 | float | Intervalo preditivo superior de 90% |
| upper_95 | float | Intervalo preditivo superior de 95% |

Exemplo do objeto JSON:

```
[
    {
      "date": "2010-01-03",
      "pred": 100,
      "lower_95": 65,
      "lower_90": 70,
      "lower_80": 80,
      "lower_50": 90,
      "upper_50": 110,
      "upper_80": 120,
      "upper_90": 130,
      "upper_95": 135
    },
    {
      "date": "2010-01-10",
      "pred": 100,
      "lower_95": 85,
      "lower_90": 90,
      "lower_80": 100,
      "lower_50": 110,
      "upper_50": 130,
      "upper_80": 140,
      "upper_90": 150,
      "upper_95": 175
    }, ...
  ]
```

> **AVISO**  
> Os métodos apresentados nesta documentação geram objetos reais no banco de dados. Para testar os métodos de requisição da API Mosqlimate sem inserir dados, consulte a [Demonstração da API](https://api.mosqlimate.org/api/docs).

## Parâmetros de Entrada
A tabela abaixo lista os parâmetros necessários para registrar uma previsão. Se o seu modelo se refere a `adm_level = 1`, você só precisa preencher o parâmetro `adm_1` e deixar `adm_2` como nulo. O oposto se aplica se o seu modelo se refere a `adm_level = 2`.


| Nome do Parâmetro | Tipo | Descrição |
|---|---|---|
| repository | str | Repositório do modelo. Formato: "{proprietário ou org}/{nome}" |
| description | str ou None | Descrição da predição |
| commit | str | Hash do commit Git para a versão mais recente do código da predição no repositório do modelo |
| case_definition | str | "reported" (notificado) ou "probable" (provável). A definição de caso usada para os dados da predição. |
| published | bool (True) | Se esta predição está visível para o público. |
| adm_0 | str (BRA) | Isocódigo do país. Padrão: "BRA" |
| adm_1 | int (UF) | Geocódigo do estado. Exemplo: 33 para RJ |
| adm_2 | int (IBGE) | Geocódigo da cidade. Exemplo: 3304557 |
| adm_3 | int (IBGE) | Geocódigo do sub-município. |
| prediction | dict (JSON) | Os dados da Predição. |


## X-UID-Key
Requisições POST exigem [Token de API do Usuário](uid-key.pt.md) para serem chamadas.

## Exemplos de uso

O pacote `mosqlient` também aceita um DataFrame do pandas com as chaves necessárias como alternativa a um JSON no parâmetro de previsão. Para mais detalhes, consulte a [documentação aqui](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).


=== "Python3"
    ```py
    from mosqlient import upload_prediction

    repository = "luabida/.config" 
    description = "test client prediction test client prediction"
    commit = "553f9072811f486631ef2ef1b8cce9b0b93fdd0d"
    adm_1 = 33  

    prediction = [
        {
            "date": "2024-01-01",
            "lower_95": 0.1,
            "lower_90": 0.2,
            "lower_80": 0.3,
            "lower_50": 0.4,
            "pred": 1,
            "upper_50": 1.1,
            "upper_80": 1.2,
            "upper_90": 1.3,
            "upper_95": 1.4,
        }
    ] # Can also be a pandas DataFrame

    pred = upload_prediction(
        api_key=api_key,
        repository=repository,
        description=description,
        commit=commit,
        case_definition="probable",
        published=True,
        adm_1=adm_1,
        prediction=prediction
    )
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    post_prediction <- function(
        api_key,
        repository,
        description,
        commit,
        adm_1,
        prediction,
        case_definition = "probable",
        published = TRUE
    ) {
      
      url <- "https://api.mosqlimate.org/api/registry/predictions/"
      
      headers <- add_headers(
        `Authorization` = paste("Bearer", api_key),
        `Content-Type` = "application/json"
      )
      
      body_list <- list(
        repository = repository,
        description = description,
        commit = commit,
        case_definition = case_definition,
        published = published,
        adm_1 = adm_1,
        prediction = prediction
      )
      
      body_json <- toJSON(body_list, auto_unbox = TRUE, null = "null")
      
      response <- POST(url, headers, body = body_json, encode = "json")
      
      if (http_status(response)$category != "Success") {
        stop("Request failed: ", content(response, "text", encoding = "UTF-8"))
      }
      
      return(content(response, "parsed"))
    }

    prediction_data <- list(
      list(
        date = "2024-01-01",
        lower_95 = 0.1,
        lower_90 = 0.2,
        lower_80 = 0.3,
        lower_50 = 0.4,
        pred = 1,
        upper_50 = 1.1,
        upper_80 = 1.2,
        upper_90 = 1.3,
        upper_95 = 1.4
      )
    )

    post_prediction(
      api_key = "your_api_key_here",
      repository = "luabida/.config",
      description = "test client prediction test client prediction",
      commit = "553f9072811f486631ef2ef1b8cce9b0b93fdd0d",
      adm_1 = 33,
      prediction = prediction_data
    )
    ```
