from django.db import models
from django.utils import timezone

# Create your models here.

class ClientePlan(models.Model):
    """Modelo para la relación entre clientes y planes con histórico"""
    
    ESTADOS_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('suspendido', 'Suspendido'),
    ]
    
    id_cliente = models.ForeignKey('clientes.Cliente', on_delete=models.CASCADE, db_column='id_cliente')
    id_plan = models.ForeignKey('planes_app.Plan', on_delete=models.CASCADE, db_column='id_plan')
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS_CHOICES, default='activo')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'clientes_planes'
        verbose_name = 'Plan del Cliente'
        verbose_name_plural = 'Planes de Clientes'
        ordering = ['-fecha_inicio']
        unique_together = ['id_cliente', 'id_plan', 'estado']
    
    # Mapear campos de la base de datos
    id = models.AutoField(primary_key=True, db_column='id_cliente_plan')
    
    def __str__(self):
        return f"{self.id_cliente} - {self.id_plan} ({self.estado})"
    
    @property
    def es_activo(self):
        """Verificar si el plan está activo"""
        return self.estado == 'activo'
    
    @property
    def duracion_dias(self):
        """Calcular duración en días"""
        if self.fecha_fin:
            return (self.fecha_fin - self.fecha_inicio).days
        return (timezone.now().date() - self.fecha_inicio).days
