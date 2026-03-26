from django.db import models
from django.utils import timezone

# Create your models here.

class Sector(models.Model):
    """Modelo para sectores geográficos"""
    
    ESTADOS_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
    ]
    
    nombre_sector = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS_CHOICES, default='activo')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sectores'
        verbose_name = 'Sector'
        verbose_name_plural = 'Sectores'
        ordering = ['nombre_sector']
    
    # Mapear campos de la base de datos
    id = models.AutoField(primary_key=True, db_column='id_sector')
    
    def __str__(self):
        return self.nombre_sector
    
    @property
    def cantidad_clientes(self):
        """Obtener cantidad de clientes en este sector"""
        return self.clientes.count()
