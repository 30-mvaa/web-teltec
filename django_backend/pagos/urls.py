from django.urls import path
from . import views

urlpatterns = [
    path('api/pagos/', views.list_pagos, name='list_pagos'),
    path('api/pagos/create/', views.create_pago, name='create_pago'),
    path('api/pagos/flexible/', views.create_pago_flexible, name='create_pago_flexible'),
    path('api/pagos/cliente/<int:cliente_id>/meses/', views.get_meses_disponibles_cliente, name='get_meses_disponibles_cliente'),
    path('api/pagos/<int:pago_id>/', views.delete_pago, name='delete_pago'),
    path('api/pagos/<int:pago_id>/descargar/', views.descargar_comprobante, name='descargar_comprobante'),
    path('api/pagos/<int:pago_id>/enviar-email/', views.enviar_comprobante_email, name='enviar_comprobante_email'),
    
    # Reportes de exportación
    path('api/reportes/pagos/excel/', views.exportar_reporte_pagos_excel, name='exportar_reporte_pagos_excel'),
    path('api/reportes/pagos/pdf/', views.exportar_reporte_pagos_pdf, name='exportar_reporte_pagos_pdf'),
    path('api/reportes/deudas/excel/', views.exportar_reporte_deudas_excel, name='exportar_reporte_deudas_excel'),
    
    # Estadísticas
    path('api/pagos/stats/', views.get_pagos_stats, name='get_pagos_stats'),
    
    # Deudas
    path('api/deudas/', views.list_deudas, name='list_deudas'),
    path('api/deudas/filtros/', views.get_deudas_filtros, name='get_deudas_filtros'),
    path('api/deudas/stats/', views.get_deudas_stats, name='get_deudas_stats'),
    path('api/deudas/cliente/<int:cliente_id>/cuotas/', views.get_cliente_cuotas, name='get_cliente_cuotas'),
    path('api/deudas/cliente/<int:cliente_id>/historial/', views.get_cliente_historial, name='get_cliente_historial'),
    path('api/deudas/actualizar-estados/', views.actualizar_estados_pago, name='actualizar_estados_pago'),
    path('api/deudas/actualizar-pagos-reales/', views.actualizar_deudas_pagos_reales, name='actualizar_deudas_pagos_reales'),
    path('api/deudas/debug-recaudacion/', views.debug_recaudacion_deudas, name='debug_recaudacion_deudas'),
    
    # Importación masiva de pagos
    path('api/pagos/import/', views.bulk_import_pagos, name='bulk_import_pagos'),
] 