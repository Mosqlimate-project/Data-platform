from django.contrib import admin
from django.contrib.auth.decorators import login_required
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

admin.site.login = login_required(admin.site.login)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("main.urls")),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
