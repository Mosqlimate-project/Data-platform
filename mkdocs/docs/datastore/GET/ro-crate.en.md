# RO-Crate

This endpoint exposes **[RO-Crate](https://www.researchobject.org/ro-crate/)**
(Research Object Crate) metadata for the datastore datasets.

An RO-Crate is a standard, machine-readable way of packaging and documenting
research data. Its core is a **JSON-LD** document (`ro-crate-metadata.json`)
that describes the dataset, its provenance (creator, publisher), its
geographic/temporal coverage, and how the data can be downloaded.

The datastore serves its datasets live over HTTP, so the RO-Crates generated
here describe the data as **Web-based Data Entities**: each dataset is a
`schema.org` `Dataset` whose `distribution` points to the API endpoint that
serves it.

## Endpoints

| Endpoint | Description |
| --- | --- |
| `/api/datastore/ro-crate/` | RO-Crate catalog describing all datastore datasets |
| `/api/datastore/ro-crate/{dataset}/` | RO-Crate describing a single dataset |

The following `dataset` values are available:

| dataset | Description |
| --- | --- |
| `infodengue` | Weekly dengue, zika and chikungunya data |
| `climate` | Copernicus climate telemetry (ERA5) |
| `climate-weekly` | Copernicus climate telemetry aggregated by epidemiological week |
| `vegetation` | Vegetation index metrics (MODIS/INPE) |
| `mosquito` | Aedes aegypti ovitrap monitoring (ContaOvos) |
| `episcanner` | Episcanner SIR-like parameters (R0, susceptibility) |

!!! warning
    The new `ro-crate` endpoints will only be available after this feature is
    deployed. Until then, they are only present on this documentation branch.

## Response

The response is a valid **JSON-LD** document conforming to the
[RO-Crate 1.1 specification](https://w3id.org/ro/crate/1.1). For example:

```py
import requests

url = "https://api.mosqlimate.org/api/datastore/ro-crate/infodengue/"

headers = {
    "accept": "application/json",
    "X-UID-Key": "See X-UID-Key documentation",
}

resp = requests.get(url, headers=headers)
print(resp.json()["@context"])  # https://w3id.org/ro/crate/1.1/context
print(resp.json()["@graph"])    # list of RO-Crate entities
```

Every entity in the response graph describes:

- the **metadata descriptor** (`ro-crate-metadata.json`), which declares the
  crate as conforming to the RO-Crate spec;
- the **root dataset** (`./`), which lists each available dataset via `hasPart`;
- one **Dataset** entity per endpoint, including `name`, `description`,
  `spatialCoverage` (Brazil), `sdPublisher`, optional `creator` and keywords;
- one **DataDownload** distribution per dataset, whose `contentUrl` is the
  actual API endpoint from which the data can be fetched;
- contextual entities (e.g. organizations, place) referenced by the datasets.
