from typing import Union
import pandas as pd
import geopandas as gpd

from django.contrib.gis.geos import Polygon, MultiPolygon
from shapely.geometry import Polygon as sPolygon
from shapely.geometry import MultiPolygon as sMultiPolygon
from django.contrib.gis.db import models as geomodels
from django.db import models


def merge_uri_params(values: list, param: str) -> str:
    params = set()
    for value in values:
        params.add(param + "=" + str(value))
    return "?" + "&".join(params)


def obj_to_dataframe(obj: models.Model) -> pd.DataFrame:
    columns = [_field.name for _field in obj._meta._get_fields(reverse=False)]
    fields = [obj.serializable_value(column) for column in columns]
    return pd.DataFrame(dict(zip(columns, fields)), index=[0])


def geo_obj_to_dataframe(obj: geomodels.Model) -> gpd.GeoDataFrame:
    columns = [_field.name for _field in obj._meta._get_fields(reverse=False)]
    fields = [obj.serializable_value(column) for column in columns]
    df = gpd.GeoDataFrame(dict(zip(columns, fields)))
    df["geometry"] = df["geometry"].apply(
        lambda x: parse_gis_types_to_shapely(x)
    )
    df.set_geometry("geometry")
    return df


def parse_gis_types_to_shapely(
    value: Union[MultiPolygon, Polygon]
) -> Union[sPolygon, sMultiPolygon]:
    if isinstance(value, Polygon):
        value = sPolygon(value.shell)
    elif isinstance(value, MultiPolygon):
        value = sMultiPolygon(value)
    return value
