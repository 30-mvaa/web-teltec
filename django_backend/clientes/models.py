from django.db import models
from django.core.validators import RegexValidator
from django.utils import timezone
from datetime import datetime, timedelta

class Cliente(models.Model):
    """Modelo de Cliente siguiendo arquitectura MVC"""
    
    ESTADOS_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('suspendido', 'Suspendido'),
    ]
    
    # Validadores
    cedula_validator = RegexValidator(
        regex=r'^\d{10}$',
        message='La cédula debe tener exactamente 10 dígitos numéricos.'
    )
    
    telefono_validator = RegexValidator(
        regex=r'^\d{10}$',
        message='El teléfono debe tener exactamente 10 dígitos numéricos.'
    )
    
    # Campos del modelo
    cedula = models.CharField(max_length=10, unique=True, validators=[cedula_validator])
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    fecha_nacimiento = models.DateField()
    direccion = models.TextField()
    email = models.EmailField()
    telefono = models.CharField(max_length=10, validators=[telefono_validator])
    telegram_chat_id = models.CharField(max_length=50, blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS_CHOICES, default='activo')
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    # Relaciones normalizadas
    id_sector = models.ForeignKey('sectores_app.Sector', on_delete=models.SET_NULL, null=True, blank=True, db_column='id_sector')
    
    class Meta:
        db_table = 'clientes'
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['-fecha_registro']
    
    def __str__(self):
        return f"{self.nombres} {self.apellidos} - {self.cedula}"
    
    @property
    def nombre_completo(self):
        """Obtener nombre completo del cliente"""
        return f"{self.nombres} {self.apellidos}"
    
    @property
    def edad(self):
        """Calcular edad del cliente"""
        today = timezone.now().date()
        return today.year - self.fecha_nacimiento.year - (
            (today.month, today.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
        )
    
    @property
    def sector_nombre(self):
        """Obtener nombre del sector"""
        return self.id_sector.nombre_sector if self.id_sector else None
    
    @property
    def plan_actual(self):
        """Obtener el plan actual del cliente"""
        from clientes_planes_app.models import ClientePlan
        return ClientePlan.objects.filter(
            id_cliente=self.id,
            estado='activo'
        ).first()
    
    @property
    def tipo_plan_actual(self):
        """Obtener tipo de plan actual"""
        plan = self.plan_actual
        return plan.id_plan.tipo_plan if plan else None
    
    @property
    def precio_plan_actual(self):
        """Obtener precio del plan actual"""
        plan = self.plan_actual
        return float(plan.id_plan.precio) if plan else 0.0



