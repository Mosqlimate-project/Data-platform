import os
import json
from django.db import migrations
from django.contrib.gis.geos import GEOSGeometry


def import_city_geometries(apps, schema_editor):
    City = apps.get_model("vis", "City")
    GeoCity = apps.get_model("vis", "GeoCity")

    migration_dir = os.path.dirname(__file__)
    json_path = os.path.join(migration_dir, "fixtures", "br_cities.json")

    if not os.path.exists(json_path):
        print(f"Fixture not found at {json_path}, skipping migration logic.")
        return

    with open(json_path, "r") as f:
        data = json.load(f)

    for feature in data["features"]:
        geocode = feature["properties"].get("CD_MUN")

        if not geocode:
            continue

        try:
            city_obj = City.objects.get(geocode=geocode)
            geometry_data = feature["geometry"]

            geom = GEOSGeometry(json.dumps(geometry_data))

            GeoCity.objects.update_or_create(
                city=city_obj, defaults={"geometry": geom}
            )
        except City.DoesNotExist:
            continue


def remove_city_geometries(apps, schema_editor):
    GeoCity = apps.get_model("vis", "GeoCity")
    GeoCity.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("vis", "0018_alter_totalcases_year_alter_totalcases100khab_year"),
    ]

    operations = [
        migrations.RunPython(
            import_city_geometries, reverse_code=remove_city_geometries
        ),
    ]
