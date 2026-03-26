from django.urls import path
from . import views
  
urlpatterns = [
    path('api/gastos/', views.list_gastos, name='list_gastos'),
    path('api/gastos/create/', views.create_gasto, name='create_gasto'),
    path('api/gastos/update/', views.update_gasto, name='update_gasto'),
    path('api/gastos/delete/', views.delete_gasto, name='delete_gasto'),
    path('api/gastos/stats/', views.get_gasto_stats, name='get_gasto_stats'),
    path('api/gastos/tendencias/', views.get_gasto_tendencias, name='get_gasto_tendencias'),
    path('api/gastos/balance/', views.get_balance_mensual, name='get_balance_mensual'),
]