Para registrar uma previsão, você precisa de pelo menos duas informações antes de poder usar os exemplos de código abaixo. A primeira é o número `id` do seu modelo, que você pode obter [aqui](https://api.mosqlimate.org/models/). A segunda é o ID do commit da versão exata do seu código (o modelo deve estar disponível em um repositório GitHub) que gerou as previsões. Para descobrir isso, você pode usar o seguinte código no terminal (Linux ou Mac):

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
| model | int | ID do modelo |
| description | str ou None | Descrição da previsão |
| commit | str | Hash do commit Git para a versão mais recente do código da Previsão no repositório do Modelo |
| predict_date | date _(AAAA-mm-dd)_ | Data em que a Previsão foi gerada |
| adm_1 | str _(UF)_ | Abreviação do estado. Exemplo: "RJ" |
| adm_2 | int _(IBGE)_ | Geocódigo da cidade. Exemplo: 3304557 |
| prediction | dict _(JSON)_ | Os dados da Previsão. |

## X-UID-Key
Requisições POST exigem [Token de API do Usuário](uid-key.pt.md) para serem chamadas.

## Exemplos de uso

O pacote `mosqlient` também aceita um DataFrame do pandas com as chaves necessárias como alternativa a um JSON no parâmetro de previsão. Para mais detalhes, consulte a [documentação aqui](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).


=== "Python3"
    ```py
    from mosqlient import upload_prediction

    upload_prediction(
      model_id = 0, # Check the ID in models list or profile
      description = "My Prediction description",
      commit = "3d1d2cd016fe38b6e7d517f724532de994d77618",
      predict_date = "2023-10-31",
      adm_1 = "RJ",
      prediction = [
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
    }], 
      api_key = "X-UID-Key"
      )
    ```

=== "R"
    ```R
    library(httr)
    library(jsonlite)

    # Warning: this method generates a real object in the database if called with
    # the correct UID Key
    post_prediction <- function(
        model_id,
        description,
        commit,
        predict_date,
        prediction,
        adm_1 = NULL
    ) {
      
      url <- "https://api.mosqlimate.org/api/registry/predictions/"
      
      headers <- add_headers(
        `X-UID-Key` = X-UID-Key)
      
      predict <- list(
        model = model_id,
        description = description,
        commit = commit,
        predict_date = predict_date,
        prediction = prediction,
        adm_1 = adm_1, 
        adm_2 = NULL,
        )
      
      predict_json <- toJSON(predict, auto_unbox = TRUE, null = "null")
      
      with_verbose(response <- POST(url, headers, body = predict_json, encode = "json"))
      
      if (http_status(response)$category != "Success") {
      # print(content(response, "text", encoding = "UTF-8"))
        stop("Request failed: ", http_status(response)$message)
      }
      
      return(content(response, "text"))
    }

    # Example
    post_prediction(
      model_id = 16, # Check the ID in models list or profile
      description = "My prediction description",
      commit = "9b8d3afd84a5f77ac457c43af31e09be0b6d04af",
      predict_date = "2023-10-31",
      adm_1 = "RJ",
      prediction = list(
        list(
          date = "2010-01-03",
          pred= 100,
          lower_95= 65,
          lower_90= 70,
          lower_80= 80,
          lower_50= 90,
          upper_50= 110,
          upper_80= 120,
          upper_90= 130,
          upper_95= 135),
        list(
          date="2010-01-10",
          pred= 120,
          lower_95=85,
          lower_90= 90,
          lower_80= 100,
          lower_50= 110,
          upper_50= 130,
          upper_80= 140,
          upper_90= 150,
          upper_95= 175)
      )
    )
    ```
