# Índices de Vegetação

Por meio deste endpoint da API, é possível consultar métricas de índices de vegetação extraídas para municípios brasileiros a partir de imagens de satélite do sensor **MODIS (Moderate Resolution Imaging Spectroradiometer)**, embarcado no satélite **Terra**.

As métricas são obtidas da coleção **MOD13Q1 v6.1**, disponibilizada pelo serviço **WTSS (Web Time Series Service)** do Instituto Nacional de Pesquisas Espaciais (INPE).

O produto MOD13Q1 fornece diretamente os índices de vegetação **NDVI** e **EVI**, além de bandas espectrais de refletância utilizadas para o cálculo de indicadores derivados, como **SAVI** e **NDWI**.

Cada observação do produto original corresponde a uma composição temporal de **16 dias**, produzida por um algoritmo de melhor pixel (*best-pixel compositing*), que prioriza observações com:

- menor cobertura de nuvens;
- menor ângulo de visada;
- maior qualidade espectral.

Durante o processamento realizado pelo Mosqlimate, essas observações são agregadas espacialmente para os municípios brasileiros utilizando a malha municipal do IBGE e disponibilizadas neste endpoint na resolução temporal original do produto.

---

## Produto de Origem

| Característica | Valor |
| --- | --- |
| Fonte | INPE / WTSS |
| Produto | MOD13Q1 v6.1 |
| Sensor | MODIS (Terra) |
| Resolução espacial | 250 metros |
| Resolução temporal | 16 dias |
| Cobertura geográfica | Brasil |
| Tipo de dado | Raster |

---

## Processamento dos Dados

Antes da disponibilização pela API, os dados passam pelas seguintes etapas de processamento.

### Agregação espacial

Para cada município brasileiro:

1. obtém-se a geometria municipal (IBGE);
2. a geometria é convertida para WGS84 (EPSG:4326);
3. realiza-se a consulta espacial ao serviço WTSS;
4. são calculadas estatísticas agregadas considerando todos os pixels pertencentes ao município.

### Remoção de duplicidades

Registros duplicados são removidos considerando:

- data da observação;
- atributo;
- coleção.

Mantém-se apenas a primeira ocorrência válida.

### Cálculo de índices derivados

Além dos índices disponibilizados diretamente pelo MOD13Q1, são calculados:

- **SAVI (Soil Adjusted Vegetation Index)**
- **NDWI (Normalized Difference Water Index)**

Esses índices são derivados matematicamente a partir das bandas de refletância do produto.

### Tratamento numérico

Para evitar divisões por zero durante o cálculo dos índices derivados, é aplicado um limite inferior de:

```python
1e-6
```

às bandas:

- NIR Reflectance;
- Red Reflectance;
- MIR Reflectance.

---

## Métricas Disponíveis

Cada observação contém estatísticas espaciais calculadas para toda a área do município.

As métricas disponíveis são:

- média (`mean`)
- desvio padrão (`std`)
- mediana (`median`)
- primeiro quartil (`q25`)
- terceiro quartil (`q75`)
- mínimo (`min`)
- máximo (`max`)

---

## Índices Disponíveis

### NDVI

Índice utilizado para estimar vigor e densidade da vegetação.

\[
NDVI = \frac{NIR - RED}{NIR + RED}
\]

### EVI

Índice desenvolvido para reduzir efeitos atmosféricos e minimizar saturação em áreas de vegetação densa.

\[
EVI = 2.5 \times \frac{NIR - RED}{NIR + 6 \times RED - 7.5 \times BLUE + 1}
\]

### SAVI

Índice que reduz a influência do solo exposto.

\[
SAVI = 1.5 \times \frac{NIR - RED}{NIR + RED + 0.5}
\]

### NDWI

Índice utilizado para estimar o conteúdo hídrico da vegetação.

\[
NDWI = \frac{NIR - MIR}{NIR + MIR}
\]

---

## Endpoint

```
GET /api/datastore/vegetation/
```

---

## Parâmetros de Entrada

| Nome | Obrigatório | Tipo | Descrição |
| --- | --- | --- | --- |
| page | Sim | int | Página retornada |
| per_page | Sim | int | Número de itens por página (máximo 100) |
| start | Sim | string (AAAA-mm-dd) | Data inicial |
| end | Sim | string (AAAA-mm-dd) | Data final |
| geocode | Não | int | Código IBGE do município |
| uf | Não | string | Sigla da unidade federativa |
| collection | Não | string | Nome da coleção de satélite |
| attribute | Não | string | Índice ou banda desejada |

---

## Estrutura da Resposta

### Items

| Campo | Tipo | Descrição |
| --- | --- | --- |
| date | date | Data da observação |
| geocode | int | Código IBGE do município |
| collection | string | Coleção de origem |
| attribute | string | Índice ou banda observada |
| mean | float | Média do município |
| std | float | Desvio padrão |
| median | float | Mediana |
| q25 | float | Primeiro quartil |
| q75 | float | Terceiro quartil |
| min | float | Valor mínimo |
| max | float | Valor máximo |

Todos os valores numéricos são arredondados para quatro casas decimais.

---

## Paginação

A resposta inclui informações de paginação.

```json
"pagination": {
    "items": 10,
    "total_items": 10,
    "page": 1,
    "total_pages": 1,
    "per_page": 100
}
```

---

## Exemplos de Uso

=== "Python"

```python
import mosqlient

mosqlient.get_vegetation(
    api_key=api_key,
    start_date="2024-01-01",
    end_date="2024-02-01",
    geocode=3304557,
)
```

=== "R"

```R
library(httr)
library(jsonlite)

veg_api <- "https://api.mosqlimate.org/api/datastore/vegetation/"
page <- "1"

pagination <- paste0("?page=", page, "&per_page=100&")
filters <- paste0("start=2024-01-01&end=2024-02-01")

headers <- add_headers(
    `X-UID-Key` = API_KEY
)

url <- paste0(veg_api, pagination, filters)

resp <- GET(url, headers)

content <- content(resp, "text")

json_content <- fromJSON(content)

items <- json_content$items
pagination_data <- json_content$pagination
```

=== "curl"

```bash
curl -X GET \
'https://api.mosqlimate.org/api/datastore/vegetation/?start=2024-01-01&end=2024-02-01&page=1&per_page=100' \
-H 'accept: application/json' \
-H 'X-UID-Key: YOUR_API_KEY'
```

Consultando um município específico:

```bash
curl -X GET \
'https://api.mosqlimate.org/api/datastore/vegetation/?start=2024-01-01&end=2024-02-01&geocode=3304557&page=1&per_page=100' \
-H 'accept: application/json' \
-H 'X-UID-Key: YOUR_API_KEY'
```

---

## Considerações

- Os dados têm origem na coleção **MOD13Q1 v6.1** do **MODIS/Terra**.
- A resolução espacial original é de **250 metros**.
- A resolução temporal original é de **16 dias**.
- As estatísticas são calculadas para toda a área de cada município brasileiro.
- Os limites municipais utilizados são da malha municipal do IBGE.
- Os índices **NDVI** e **EVI** são disponibilizados diretamente pelo produto MOD13Q1.
- Os índices **SAVI** e **NDWI** são calculados durante o processamento a partir das bandas de refletância.
- Todas as métricas são agregadas espacialmente antes de serem disponibilizadas pela API.
