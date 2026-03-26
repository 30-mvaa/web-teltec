from django.urls import path 
from . import views

urlpatterns = [
    # Rutas existentes
    path('api/reportes/', views.reporte_general, name='reporte_general'),
    path('api/reportes/clientes/', views.reporte_clientes, name='reporte_clientes'),
    path('api/reportes/pagos/', views.reporte_pagos, name='reporte_pagos'),
    path('api/reportes/gastos/', views.reporte_gastos, name='reporte_gastos'),
    path('api/reportes/anual-clientes/', views.reporte_anual_clientes, name='reporte_anual_clientes'),
    path('api/reportes/sectores/', views.obtener_sectores, name='obtener_sectores'),
    path('api/reportes/utilidades-anuales/', views.utilidades_anuales, name='utilidades_anuales'),
    path('api/reportes/grafico-anual-recaudacion/', views.reporte_grafico_anual_recaudacion, name='reporte_grafico_anual_recaudacion'),
    path('api/reportes/descargar-grafico-pdf/', views.descargar_reporte_grafico_pdf, name='descargar_reporte_grafico_pdf'),
    path('api/reportes/debug-pagos/', views.debug_pagos_reales, name='debug_pagos_reales'),
    path('api/reportes/debug-gastos/', views.debug_gastos_reales, name='debug_gastos_reales'),
    
    # Nuevas rutas con base de datos normalizada
    path('api/reportes/dashboard/', views.reporte_dashboard, name='reporte_dashboard'),
    path('api/reportes/deudas-resumen/', views.reporte_deudas_resumen, name='reporte_deudas_resumen'),
    path('api/reportes/deudas-detalle/', views.reporte_deudas_detalle, name='reporte_deudas_detalle'),
    path('api/reportes/top-deudores/', views.reporte_top_deudores, name='reporte_top_deudores'),
    path('api/reportes/sectores-deuda/', views.reporte_sectores_deuda, name='reporte_sectores_deuda'),
    path('api/reportes/recaudacion-mensual/', views.reporte_recaudacion_mensual, name='reporte_recaudacion_mensual'),
    path('api/reportes/recaudacion-anual/', views.reporte_recaudacion_anual, name='reporte_recaudacion_anual'),
    path('api/reportes/clientes-estado/', views.reporte_clientes_estado, name='reporte_clientes_estado'),
    path('api/reportes/morosidad/', views.reporte_morosidad, name='reporte_morosidad'),
    path('api/reportes/eficiencia-cobranza/', views.reporte_eficiencia_cobranza, name='reporte_eficiencia_cobranza'),
    path('api/reportes/proyecciones/', views.reporte_proyecciones, name='reporte_proyecciones'),
    path('api/reportes/exportar-excel/', views.exportar_reporte_excel, name='exportar_reporte_excel'),
    path('api/reportes/exportar-pdf/', views.exportar_reporte_pdf, name='exportar_reporte_pdf'),
    
    # Rutas para reportes de pagos y gastos reales
    path('api/reportes/pagos-reales/', views.pagos_reales, name='pagos_reales'),
    path('api/reportes/gastos-reales/', views.gastos_reales, name='gastos_reales'),
] 