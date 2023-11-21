from django.contrib import admin

from django.contrib.auth.decorators import login_required
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

if not settings.DEBUG:
    admin.site.login = login_required(admin.site.login)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("main.urls")),
    path("vis/", include("vis.urls")),
]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler404 = "main.views.error_404"
handler500 = "main.views.error_500"
