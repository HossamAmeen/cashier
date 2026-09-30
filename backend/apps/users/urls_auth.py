"""Auth URLs matching docs/api/openapi.yaml."""

from django.urls import path

from .views_auth import GetMeView, LoginView, LogoutView, RefreshSessionView

urlpatterns = [
    path("login", LoginView.as_view(), name="auth-login"),
    path("refresh", RefreshSessionView.as_view(), name="auth-refresh"),
    path("logout", LogoutView.as_view(), name="auth-logout"),
    path("me", GetMeView.as_view(), name="auth-me"),
]
