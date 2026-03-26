"""
URL configuration for teltec_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', lambda request: HttpResponse("¡Servidor Django activo!"), name='inicio'),
    path('', include('deudas.urls')),  # Mover deudas antes que pagos
    path('', include('clientes.urls')),
    path('', include('pagos.urls')),
    path('', include('gastos.urls')),
    path('', include('notificaciones.urls')),
    path('', include('sitio_web.urls')),
    path('', include('reportes_app.urls')),
    path('', include('configuracion.urls')),
    path('', include('sectores_app.urls')),
    path('', include('planes_app.urls')),
    path('api/auth/', include('usuarios.urls')),
    path('', include('usuarios.urls')),
    path('', include('chatbot.urls'))
]

# Servir archivos media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
