from django.db import models
from django.utils import timezone

class ConfiguracionSistema(models.Model):
    """Modelo para almacenar configuraciones del sistema"""
    clave = models.CharField(max_length=100, unique=True, primary_key=True)
    valor = models.TextField()
    descripcion = models.TextField(blank=True, null=True)
    categoria = models.CharField(max_length=50, default='general')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'configuracion_sistema'
        verbose_name = 'Configuración del Sistema'
        verbose_name_plural = 'Configuraciones del Sistema'
    
    def __str__(self):
        return f"{self.clave}: {self.valor}"

# NOTA: Los modelos Plan y Sector se eliminaron porque ya existen en:
# - planes_app.models.Plan (tabla 'planes')
# - sectores_app.models.Sector (tabla 'sectores')
# 
# Para usar estos modelos, importarlos desde sus respectivas apps:
# from planes_app.models import Plan
# from sectores_app.models import Sector
