import os
import json
from django.db import migrations
from django.contrib.gis.geos import GEOSGeometry


def import_states_geometries(apps, schema_editor):
    State = apps.get_model("vis", "State")
    GeoState = apps.get_model("vis", "GeoState")

    migration_dir = os.path.dirname(__file__)
    json_path = os.path.join(migration_dir, "fixtures", "br_states.json")

    if not os.path.exists(json_path):
        print(f"Fixture not found at {json_path}, skipping migration logic.")
        return

    with open(json_path, "r") as f:
        data = json.load(f)

    for feature in data["features"]:
        uf = feature["properties"].get("sigla")

        if not uf:
            continue

        try:
            state_obj = State.objects.get(uf=uf)
            geometry_data = feature["geometry"]

            geom = GEOSGeometry(json.dumps(geometry_data))

            GeoState.objects.update_or_create(
                state=state_obj, defaults={"geometry": geom}
            )
        except State.DoesNotExist:
            continue


def remove_states_geometries(apps, schema_editor):
    GeoState = apps.get_model("vis", "GeoCity")
    GeoState.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("vis", "0019_populate_br_geojson"),
    ]

    operations = [
        migrations.RunPython(
            import_states_geometries, reverse_code=remove_states_geometries
        ),
    ]
