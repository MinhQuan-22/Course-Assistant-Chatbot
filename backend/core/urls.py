from django.urls import path
from .views import (
    get_users,
    register_user,
    login_user,
    get_me,
    send_chat_message,
    get_conversations,
    get_conversation_messages,
    get_documents,
    upload_document,
)

urlpatterns = [
    path('users/', get_users),
    path('auth/register/', register_user),
    path('auth/login/', login_user),
    path('auth/me/', get_me),

    path('chat/send/', send_chat_message),
    path('chat/conversations/', get_conversations),
    path('chat/conversations/<int:conversation_id>/', get_conversation_messages),

    path('documents/', get_documents),
    path('documents/upload/', upload_document),
]