"""Generate Research Object Crate (RO-Crate) metadata for the datastore datasets.

Each dataset exposed by the datastore API is described as a Web-based Data
Entity (``schema.org`` Dataset) whose ``distribution`` points to the API
endpoint that serves it. The resulting JSON-LD document follows the
RO-Crate 1.1 specification (https://w3id.org/ro/crate/1.1).
"""

from typing import Any, Dict, List, Optional

RO_CRATE_CONTEXT = "https://w3id.org/ro/crate/1.1/context"
RO_CRATE_SPEC = "https://w3id.org/ro/crate/1.1"

BASE_URL = "https://api.mosqlimate.org/api/datastore"

# Wikidata URI for Brazil
BRAZIL_ID = "https://www.wikidata.org/wiki/Q155"

DATASETS: Dict[str, Dict[str, Any]] = {
    "infodengue": {
        "name": "Infodengue alerts",
        "description": (
            "Weekly epidemiological data on dengue, chikungunya and zika for "
            "all Brazilian municipalities, produced by the Infodengue project "
            "(info.dengue.mat.br). Includes notified and estimated cases, "
            "reproductive number (Rt), nowcasting estimates and climate "
            "receptivity indicators."
        ),
        "path": "/infodengue/",
        "keywords": ["dengue", "zika", "chikungunya", "epidemiology"],
        "creator": {"@id": "#infodengue"},
    },
    "climate": {
        "name": "Copernicus climate",
        "description": (
            "Weekly climate telemetry for Brazilian municipalities derived "
            "from the Copernicus Climate Data Store (ERA5). Includes "
            "temperature, precipitation, humidity and atmospheric pressure "
            "averages."
        ),
        "path": "/climate/",
        "keywords": ["climate", "temperature", "precipitation", "ERA5"],
        "creator": {"@id": "#copernicus"},
    },
    "climate-weekly": {
        "name": "Copernicus climate (weekly)",
        "description": (
            "Weekly aggregated Copernicus climate telemetry for Brazilian "
            "municipalities, organized by epidemiological week."
        ),
        "path": "/climate/weekly/",
        "keywords": ["climate", "epiweek", "ERA5"],
        "creator": {"@id": "#copernicus"},
    },
    "vegetation": {
        "name": "Vegetation index metrics",
        "description": (
            "Satellite-derived vegetation index metrics (mean, median, "
            "quartiles, standard deviation) over Brazilian regions."
        ),
        "path": "/vegetation/",
        "keywords": ["vegetation index", "satellite", "remote sensing"],
    },
    "mosquito": {
        "name": "Mosquito ovitrap monitoring",
        "description": (
            "Ovitrap monitoring data for Aedes aegypti across Brazilian "
            "municipalities, including egg counts, density and positivity "
            "indicators."
        ),
        "path": "/mosquito/",
        "keywords": ["aedes aegypti", "ovitrap", "mosquito"],
    },
    "episcanner": {
        "name": "Episcanner parameters",
        "description": (
            "Estimated SIR-like epidemiological parameters (R0 and "
            "susceptibility) for arboviral diseases in Brazilian "
            "municipalities, computed with the Episcanner model."
        ),
        "path": "/episcanner/",
        "keywords": ["R0", "susceptibility", "SIR", "episcanner"],
    },
}


def _contextual_entities() -> List[Dict[str, Any]]:
    return [
        {
            "@id": "#mosqlimate",
            "@type": "Organization",
            "name": "Mosqlimate",
            "url": "https://mosqlimate.org",
        },
        {
            "@id": "#infodengue",
            "@type": "Organization",
            "name": "Infodengue",
            "url": "https://info.dengue.mat.br/",
        },
        {
            "@id": "#copernicus",
            "@type": "Organization",
            "name": "Copernicus Climate Change Service (C3S)",
            "url": "https://cds.climate.copernicus.eu/",
        },
        {
            "@id": BRAZIL_ID,
            "@type": "Place",
            "name": "Brazil",
        },
    ]


def _distribution_entity(
    slug: str, metadata: Dict[str, Any]
) -> Dict[str, Any]:
    url = BASE_URL + metadata["path"]
    return {
        "@id": url + "#distribution",
        "@type": "DataDownload",
        "name": f"{metadata['name']} - API",
        "contentUrl": url,
        "encodingFormat": "application/json",
    }


def _dataset_entity(slug: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    url = BASE_URL + metadata["path"]
    entity: Dict[str, Any] = {
        "@id": url,
        "@type": "Dataset",
        "name": metadata["name"],
        "description": metadata["description"],
        "url": url,
        "keywords": metadata["keywords"],
        "sdPublisher": {"@id": "#mosqlimate"},
        "spatialCoverage": {"@id": BRAZIL_ID},
        "distribution": {"@id": url + "#distribution"},
    }
    creator = metadata.get("creator")
    if creator:
        entity["creator"] = creator
    return entity


def build_ro_crate(dataset: Optional[str] = None) -> Dict[str, Any]:
    """Build an RO-Crate JSON-LD document.

    When ``dataset`` is None, the returned crate describes every datastore
    dataset. Otherwise it only describes the requested dataset.
    """
    if dataset is not None and dataset not in DATASETS:
        raise ValueError(f"Unknown dataset '{dataset}'")

    slugs = [dataset] if dataset is not None else list(DATASETS.keys())

    graph: List[Dict[str, Any]] = [
        {
            "@id": "ro-crate-metadata.json",
            "@type": "CreativeWork",
            "conformsTo": {"@id": RO_CRATE_SPEC},
            "about": {"@id": "./"},
        },
        {
            "@id": "./",
            "@type": "Dataset",
            "name": "Mosqlimate Datastore",
            "description": (
                "Public health, climate and epidemiological datasets for "
                "Brazilian municipalities maintained by the Mosqlimate "
                "project."
            ),
            "sdPublisher": {"@id": "#mosqlimate"},
            "hasPart": [
                {"@id": BASE_URL + DATASETS[slug]["path"]} for slug in slugs
            ],
        },
    ]

    for slug in slugs:
        metadata = DATASETS[slug]
        graph.append(_dataset_entity(slug, metadata))
        graph.append(_distribution_entity(slug, metadata))

    graph.extend(_contextual_entities())

    return {"@context": RO_CRATE_CONTEXT, "@graph": graph}
