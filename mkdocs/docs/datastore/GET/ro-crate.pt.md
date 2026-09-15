# RO-Crate

Este endpoint expõe metadados **[RO-Crate](https://www.researchobject.org/ro-crate/)**
(Research Object Crate) para os conjuntos de dados (datasets) do datastore.

Um RO-Crate é uma forma padrão e legível por máquina de empacotar e documentar
dados de pesquisa. Seu núcleo é um documento **JSON-LD**
(`ro-crate-metadata.json`) que descreve o conjunto de dados, sua proveniência
(criador, publicador), cobertura geográfica/temporal e como os dados podem ser
baixados.

O datastore serve seus dados ao vivo via HTTP, então os RO-Crates gerados aqui
descrevem os dados como **Web-based Data Entities**: cada dataset é um
`Dataset` de `schema.org` cuja `distribution` aponta para o endpoint da API que
o serve.

## Endpoints

| Endpoint | Descrição |
| --- | --- |
| `/api/datastore/ro-crate/` | Catálogo RO-Crate descrevendo todos os datasets do datastore |
| `/api/datastore/ro-crate/{dataset}/` | RO-Crate descrevendo um único dataset |

Os seguintes valores de `dataset` estão disponíveis:

| dataset | Descrição |
| --- | --- |
| `infodengue` | Dados semanais de dengue, zika e chikungunya |
| `climate` | Telemetria climática do Copernicus (ERA5) |
| `climate-weekly` | Telemetria climática do Copernicus agregada por semana epidemiológica |
| `vegetation` | Métricas de índice de vegetação (MODIS/INPE) |
| `mosquito` | Monitoramento de ovitrampas de Aedes aegypti (ContaOvos) |
| `episcanner` | Parâmetros SIR-like do Episcanner (R0, susceptibilidade) |

!!! warning
    Os novos endpoints `ro-crate` só estarão disponíveis após o deploy deste
    recurso. Até lá, eles existem apenas neste branch da documentação.

## Resposta

A resposta é um documento **JSON-LD** válido, em conformidade com a
[especificação RO-Crate 1.1](https://w3id.org/ro/crate/1.1). Por exemplo:

```py
import requests

url = "https://api.mosqlimate.org/api/datastore/ro-crate/infodengue/"

headers = {
    "accept": "application/json",
    "X-UID-Key": "Veja a documentação X-UID-Key",
}

resp = requests.get(url, headers=headers)
print(resp.json()["@context"])  # https://w3id.org/ro/crate/1.1/context
print(resp.json()["@graph"])    # lista de entidades RO-Crate
```

Cada entidade no grafo da resposta descreve:

- o **descritor de metadados** (`ro-crate-metadata.json`), que declara o crate
  como conforme à especificação RO-Crate;
- o **dataset raiz** (`./`), que lista cada dataset disponível via `hasPart`;
- uma entidade **Dataset** por endpoint, incluindo `name`, `description`,
  `spatialCoverage` (Brasil), `sdPublisher`, `creator` e keywords opcionais;
- uma distribuição **DataDownload** por dataset, cujo `contentUrl` é o endpoint
  real da API pelo qual os dados podem ser obtidos;
- entidades contextuais (ex.: organizações, local) referenciadas pelos datasets.
