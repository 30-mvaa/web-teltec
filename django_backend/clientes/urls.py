from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClienteViewSet, buscar_cliente_cedula, clientes_por_sector, bulk_import_clientes
)

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet)

urlpatterns = [
    # URLs personalizadas para funcionalidades específicas (deben estar ANTES del router)
    path('api/clientes/buscar/<str:cedula>/', buscar_cliente_cedula, name='buscar_cliente_cedula'),
    path('api/clientes/sector/<int:id_sector>/', clientes_por_sector, name='clientes_por_sector'),
    path('api/clientes/bulk-import/', bulk_import_clientes, name='bulk_import_clientes'),
    # Router debe estar al final para no interceptar otras URLs
    path('api/', include(router.urls)),
] 