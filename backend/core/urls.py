from django.urls import path
from .views import (
    register_user,
    login_user,
    google_login,
    get_me,
    get_users,
    send_chat_message,
    get_conversations,
    get_conversation_messages,
    delete_conversation,
    get_documents,
    upload_document,
    forgot_password,
    verify_otp,
    reset_password,
    get_stats,
)

urlpatterns = [
    path('auth/register/', register_user),
    path('auth/signup/', register_user),
    path('auth/login/', login_user),
    path('auth/google/', google_login),
    path('auth/me/', get_me),
    path('auth/forgot-password/', forgot_password),
    path('auth/verify-otp/', verify_otp),
    path('auth/reset-password/', reset_password),

    path('users/', get_users),

    path('chat/send/', send_chat_message),
    path('chat/conversations/', get_conversations),
    path('chat/conversations/<int:conversation_id>/', get_conversation_messages),
    path('chat/conversations/<int:conversation_id>/delete/', delete_conversation),

    path('documents/', get_documents),
    path('documents/upload/', upload_document),

#path('quiz/generate/', generate_quiz_api),'
    path('stats/', get_stats),
]