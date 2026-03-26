from django.urls import path
from . import views

urlpatterns = [
    path('api/chatbot/mensaje/', views.procesar_mensaje_chatbot, name='chatbot_mensaje'),
    path('api/chatbot/health/', views.chatbot_health, name='chatbot_health'),
]

