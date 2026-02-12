from django.contrib import admin
from django.urls import path
from .api_views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", health),
]
