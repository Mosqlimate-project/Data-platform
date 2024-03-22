import os
from django.http import HttpResponse, Http404
from django.conf import settings


def aedes_egg_dataset_file(request):
    filename = "aedes_eggs_data.zip"

    file_path = os.path.join(settings.STATIC_ROOT, f"data/{filename}")

    print(file_path)

    if not os.path.exists(file_path):
        raise Http404("File not available")

    with open(file_path, "rb") as pdf_file:
        response = HttpResponse(
            pdf_file.read(), content_type="application/zip"
        )

    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    return response
