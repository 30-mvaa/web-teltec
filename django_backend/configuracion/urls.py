from django.urls import path
from . import views

urlpatterns = [
    # Configuración del sistema
    path('api/configuracion/', views.obtener_configuracion, name='obtener_configuracion'),
    path('api/configuracion/guardar/', views.guardar_configuracion, name='guardar_configuracion'),
    path('api/configuracion/inicializar/', views.inicializar_configuracion, name='inicializar_configuracion'),
    
    # Gestión de planes
    path('api/configuracion/planes/', views.listar_planes, name='listar_planes'),
    path('api/configuracion/planes/crear/', views.crear_plan, name='crear_plan'),
    path('api/configuracion/planes/<int:plan_id>/actualizar/', views.actualizar_plan, name='actualizar_plan'),
    path('api/configuracion/planes/<int:plan_id>/eliminar/', views.eliminar_plan, name='eliminar_plan'),
    path('api/configuracion/planes/<int:plan_id>/desactivar/', views.desactivar_plan, name='desactivar_plan'),
    path('api/configuracion/planes/<int:plan_id>/activar/', views.activar_plan, name='activar_plan'),
    
    # Gestión de sectores
    path('api/configuracion/sectores/', views.listar_sectores, name='listar_sectores'),
    path('api/configuracion/sectores/crear/', views.crear_sector, name='crear_sector'),
    path('api/configuracion/sectores/<int:sector_id>/actualizar/', views.actualizar_sector, name='actualizar_sector'),
    path('api/configuracion/sectores/<int:sector_id>/eliminar/', views.eliminar_sector, name='eliminar_sector'),
    path('api/configuracion/sectores/<int:sector_id>/desactivar/', views.desactivar_sector, name='desactivar_sector'),
    path('api/configuracion/sectores/<int:sector_id>/activar/', views.activar_sector, name='activar_sector'),
]
