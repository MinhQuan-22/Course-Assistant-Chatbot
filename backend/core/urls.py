from django.urls import path
from .views import get_users, register_user, login_user, get_me

urlpatterns = [
    path('users/', get_users),
    path('auth/register/', register_user),
    path('auth/login/', login_user),
    path('auth/me/', get_me),
]