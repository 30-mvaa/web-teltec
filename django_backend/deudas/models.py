from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from clientes.models import Cliente
from planes_app.models import Plan

class Deuda(models.Model):
    """
    Modelo para gestionar las deudas de los clientes
    """
    
    ESTADO_CHOICES = [
        ('al_dia', 'Al Día'),
        ('proximo_vencimiento', 'Próximo Vencimiento'),
        ('vencido', 'Vencido'),
        ('pagado', 'Pagado'),
    ]
    
    # Relaciones
    cliente = models.ForeignKey(
        Cliente, 
        on_delete=models.CASCADE, 
        related_name='deudas',
        verbose_name='Cliente'
    )
    plan = models.ForeignKey(
        Plan, 
        on_delete=models.CASCADE, 
        related_name='deudas',
        verbose_name='Plan'
    )
    
    # Información de la deuda
    mes_anio = models.DateField(
        verbose_name='Mes/Año de la deuda',
        help_text='Fecha del mes por el cual se debe el pago'
    )
    fecha_vencimiento = models.DateField(
        verbose_name='Fecha de vencimiento',
        help_text='Fecha límite para el pago'
    )
    
    # Montos
    monto_deuda = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Monto de la deuda'
    )
    monto_pagado = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Monto pagado'
    )
    
    # Estado y control
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='vencido',
        verbose_name='Estado de la deuda'
    )
    meses_atraso = models.PositiveIntegerField(
        default=0,
        verbose_name='Meses de atraso'
    )
    
    # Metadatos
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de creación'
    )
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name='Fecha de última actualización'
    )
    observaciones = models.TextField(
        blank=True,
        verbose_name='Observaciones'
    )
    
    class Meta:
        db_table = 'deudas'
        verbose_name = 'Deuda'
        verbose_name_plural = 'Deudas'
        unique_together = ['cliente', 'plan', 'mes_anio']
        ordering = ['-mes_anio', 'cliente__nombres']
        indexes = [
            models.Index(fields=['cliente', 'estado']),
            models.Index(fields=['fecha_vencimiento']),
            models.Index(fields=['estado', 'meses_atraso']),
        ]
    
    def __str__(self):
        return f"{self.cliente.nombres} {self.cliente.apellidos} - {self.mes_anio.strftime('%B %Y')} - ${self.monto_deuda}"
    
    @property
    def monto_pendiente(self):
        """Calcula el monto pendiente de pago"""
        from decimal import Decimal
        return Decimal(str(self.monto_deuda)) - Decimal(str(self.monto_pagado))
    
    @property
    def esta_pagada(self):
        """Verifica si la deuda está completamente pagada"""
        return self.monto_pendiente <= 0
    
    @property
    def dias_vencida(self):
        """Calcula los días que lleva vencida la deuda"""
        from django.utils import timezone
        from datetime import datetime
        
        # Obtener fecha_vencimiento como objeto date
        fecha_vencimiento = self.fecha_vencimiento
        if isinstance(fecha_vencimiento, str):
            fecha_vencimiento = datetime.strptime(fecha_vencimiento, '%Y-%m-%d').date()
        
        if fecha_vencimiento < timezone.now().date():
            return (timezone.now().date() - fecha_vencimiento).days
        return 0
    
    def calcular_estado(self):
        """Calcula automáticamente el estado de la deuda"""
        from django.utils import timezone
        from datetime import timedelta, datetime
        
        hoy = timezone.now().date()
        
        # Obtener fecha_vencimiento como objeto date (sin modificar el campo)
        fecha_vencimiento = self.fecha_vencimiento
        if isinstance(fecha_vencimiento, str):
            fecha_vencimiento = datetime.strptime(fecha_vencimiento, '%Y-%m-%d').date()
        
        if self.esta_pagada:
            self.estado = 'pagado'
        elif fecha_vencimiento > hoy:
            self.estado = 'al_dia'
        elif fecha_vencimiento == hoy:
            self.estado = 'proximo_vencimiento'
        else:
            self.estado = 'vencido'
            # Calcular meses de atraso
            meses_atraso = 0
            fecha_temp = fecha_vencimiento
            while fecha_temp < hoy:
                fecha_temp += timedelta(days=30)  # Aproximación
                meses_atraso += 1
            self.meses_atraso = meses_atraso
        
        return self.estado
    
    def registrar_pago(self, monto, fecha_pago=None):
        """Registra un pago parcial o total de la deuda"""
        from django.utils import timezone
        from decimal import Decimal
        
        if fecha_pago is None:
            fecha_pago = timezone.now().date()
        
        self.monto_pagado = Decimal(str(self.monto_pagado)) + Decimal(str(monto))
        self.calcular_estado()
        self.save()
        
        return self.estado
    
    def save(self, *args, **kwargs):
        """Sobrescribe save para calcular automáticamente el estado"""
        if not self.pk:  # Nueva deuda
            self.calcular_estado()
        super().save(*args, **kwargs)

class HistorialDeuda(models.Model):
    """
    Modelo para mantener el historial de cambios en las deudas
    """
    
    TIPO_CAMBIO_CHOICES = [
        ('creacion', 'Creación'),
        ('pago', 'Pago'),
        ('ajuste', 'Ajuste'),
        ('cambio_estado', 'Cambio de Estado'),
        ('eliminacion', 'Eliminación'),
    ]
    
    deuda = models.ForeignKey(
        Deuda, 
        on_delete=models.CASCADE, 
        related_name='historial',
        verbose_name='Deuda'
    )
    
    tipo_cambio = models.CharField(
        max_length=20,
        choices=TIPO_CAMBIO_CHOICES,
        verbose_name='Tipo de cambio'
    )
    
    descripcion = models.TextField(
        verbose_name='Descripción del cambio'
    )
    
    monto_anterior = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Monto anterior'
    )
    
    monto_nuevo = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Monto nuevo'
    )
    
    estado_anterior = models.CharField(
        max_length=20,
        choices=Deuda.ESTADO_CHOICES,
        null=True,
        blank=True,
        verbose_name='Estado anterior'
    )
    
    estado_nuevo = models.CharField(
        max_length=20,
        choices=Deuda.ESTADO_CHOICES,
        null=True,
        blank=True,
        verbose_name='Estado nuevo'
    )
    
    fecha_cambio = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha del cambio'
    )
    
    usuario = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Usuario que realizó el cambio'
    )
    
    class Meta:
        db_table = 'historial_deudas'
        verbose_name = 'Historial de Deuda'
        verbose_name_plural = 'Historial de Deudas'
        ordering = ['-fecha_cambio']
    
    def __str__(self):
        return f"{self.deuda} - {self.tipo_cambio} - {self.fecha_cambio}"
