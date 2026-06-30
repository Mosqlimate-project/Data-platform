# Vegetation Indices

This API endpoint provides vegetation index metrics extracted for Brazilian municipalities from satellite imagery acquired by the **MODIS (Moderate Resolution Imaging Spectroradiometer)** sensor onboard the **Terra** satellite.

The metrics are obtained from the **MOD13Q1 v6.1** product, available through the **WTSS (Web Time Series Service)** maintained by the Brazilian National Institute for Space Research (INPE).

The MOD13Q1 product provides the **NDVI** and **EVI** vegetation indices directly, as well as spectral reflectance bands used to derive additional indicators such as **SAVI** and **NDWI**.

Each observation in the original product corresponds to a **16-day composite**, generated using a *best-pixel compositing* algorithm that prioritizes observations with:

- lower cloud coverage;
- lower viewing angle;
- higher spectral quality.

Before being made available through this endpoint, the original observations are spatially aggregated to Brazilian municipalities using the official IBGE municipal boundaries while preserving the original temporal resolution of the product.

---

## Source Product

| Characteristic | Value |
| --- | --- |
| Source | INPE / WTSS |
| Product | MOD13Q1 v6.1 |
| Sensor | MODIS (Terra) |
| Spatial resolution | 250 meters |
| Temporal resolution | 16 days |
| Geographic coverage | Brazil |
| Data type | Raster |

---

## Data Processing

Before publication through the API, the data undergo the following processing steps.

### Spatial aggregation

For each Brazilian municipality:

1. the municipal geometry is obtained from IBGE;
2. the geometry is converted to WGS84 (EPSG:4326);
3. a spatial query is performed against the WTSS service;
4. summary statistics are computed considering all pixels within the municipality.

### Duplicate removal

Duplicate records are removed considering:

- observation date;
- attribute;
- collection.

Only the first valid occurrence is retained.

### Derived indices

In addition to the indices directly provided by MOD13Q1, the following derived indices are calculated:

- **SAVI (Soil Adjusted Vegetation Index)**
- **NDWI (Normalized Difference Water Index)**

These indices are computed from the spectral reflectance bands provided by the original product.

### Numerical safeguards

To prevent division-by-zero during the computation of derived indices, a minimum value of

```python
1e-6
```

is applied to the following reflectance bands:

- NIR Reflectance;
- Red Reflectance;
- MIR Reflectance.

---

## Available Metrics

Each observation contains spatial summary statistics computed over the municipality.

Available statistics include:

- mean (`mean`)
- standard deviation (`std`)
- median (`median`)
- first quartile (`q25`)
- third quartile (`q75`)
- minimum (`min`)
- maximum (`max`)

---

## Available Indices

### NDVI

Index used to estimate vegetation vigor and density.

\[
NDVI = \frac{NIR - RED}{NIR + RED}
\]

### EVI

Vegetation index designed to reduce atmospheric effects and minimize saturation in densely vegetated areas.

\[
EVI = 2.5 \times \frac{NIR - RED}{NIR + 6 \times RED - 7.5 \times BLUE + 1}
\]

### SAVI

Vegetation index designed to reduce the influence of exposed soil.

\[
SAVI = 1.5 \times \frac{NIR - RED}{NIR + RED + 0.5}
\]

### NDWI

Index used to estimate vegetation and surface water content.

\[
NDWI = \frac{NIR - MIR}{NIR + MIR}
\]

---

## Endpoint

```
GET /api/datastore/vegetation/
```

---

## Input Parameters

| Parameter | Required | Type | Description |
| --- | --- | --- | --- |
| page | Yes | int | Page number |
| per_page | Yes | int | Number of items per page (maximum 100) |
| start | Yes | string (YYYY-mm-dd) | Start date |
| end | Yes | string (YYYY-mm-dd) | End date |
| geocode | No | int | IBGE municipality code |
| uf | No | string | Two-letter Brazilian state abbreviation |
| collection | No | string | Satellite data collection |
| attribute | No | string | Vegetation index or spectral band |

---

## Response Structure

### Items

| Field | Type | Description |
| --- | --- | --- |
| date | date | Observation date |
| geocode | int | IBGE municipality code |
| collection | string | Source collection |
| attribute | string | Vegetation index or spectral band |
| mean | float | Mean value across the municipality |
| std | float | Standard deviation |
| median | float | Median |
| q25 | float | First quartile |
| q75 | float | Third quartile |
| min | float | Minimum value |
| max | float | Maximum value |

All numeric values are rounded to four decimal places.

---

## Pagination

Pagination information is included in the response.

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

## Examples

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

Querying a specific municipality:

```bash
curl -X GET \
'https://api.mosqlimate.org/api/datastore/vegetation/?start=2024-01-01&end=2024-02-01&geocode=3304557&page=1&per_page=100' \
-H 'accept: application/json' \
-H 'X-UID-Key: YOUR_API_KEY'
```

---

## Notes

- The data originate from the **MOD13Q1 v6.1** product derived from the **MODIS/Terra** sensor.
- The original spatial resolution is **250 meters**.
- The original temporal resolution is **16 days**.
- Statistics are computed over the entire area of each Brazilian municipality.
- Municipal boundaries are based on the official IBGE municipal boundary dataset.
- **NDVI** and **EVI** are directly provided by the MOD13Q1 product.
- **SAVI** and **NDWI** are derived during preprocessing from the spectral reflectance bands.
- All metrics are spatially aggregated before being published through the API.
