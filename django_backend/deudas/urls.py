from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router para el ViewSet
router = DefaultRouter()
router.register(r'deudas-nuevas', views.DeudaViewSet, basename='deuda')

# URLs del módulo de deudas
urlpatterns = [
    # Incluir las rutas del router
    path('', include(router.urls)),
    
    # Endpoints públicos
    path('api/deudas-nuevas/stats/', views.get_deudas_stats, name='deudas_stats'),
    path('api/deudas-nuevas/cliente/<int:cliente_id>/', views.get_deudas_cliente, name='deudas_cliente'),
    
    # Endpoints adicionales
    path('api/deudas-nuevas/recalcular-estados/', views.DeudaViewSet.as_view({'post': 'recalcular_estados'}), name='recalcular_estados'),
]
