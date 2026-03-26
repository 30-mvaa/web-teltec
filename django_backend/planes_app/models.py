from django.db import models
from django.utils import timezone

# Create your models here.

class Plan(models.Model):
    """Modelo para planes de servicios"""
    
    ESTADOS_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
    ]
    
    tipo_plan = models.CharField(max_length=100, unique=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    descripcion = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS_CHOICES, default='activo')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'planes'
        verbose_name = 'Plan'
        verbose_name_plural = 'Planes'
        ordering = ['precio']
    
    # Mapear campos de la base de datos
    id = models.AutoField(primary_key=True, db_column='id_plan')
    
    def __str__(self):
        return f"{self.tipo_plan} - ${self.precio}"
    
    @property
    def clientes_activos(self):
        """Obtener cantidad de clientes con este plan activo"""
        return self.clientes_planes.filter(estado='activo').count()
