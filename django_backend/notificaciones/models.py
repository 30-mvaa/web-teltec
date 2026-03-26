from django.db import models
from django.utils import timezone
from clientes.models import Cliente


class Notificacion(models.Model):
    """
    Modelo de Notificación para TelTec Net
    """
    TIPO_CHOICES = [
        ('pago_proximo', 'Pago Próximo'),
        ('pago_vencido', 'Pago Vencido'),
        ('corte_servicio', 'Corte de Servicio'),
        ('recordatorio', 'Recordatorio'),
        ('promocion', 'Promoción'),
        ('mantenimiento', 'Mantenimiento'),
    ]
    
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('enviado', 'Enviado'),
        ('fallido', 'Fallido'),
    ]
    
    CANAL_CHOICES = [
        ('whatsapp', 'WhatsApp'),
        ('email', 'Email'),
        ('sms', 'SMS'),
    ]
    
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    mensaje = models.TextField()
    fecha_envio = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    canal = models.CharField(max_length=20, choices=CANAL_CHOICES, default='whatsapp')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_programada = models.DateTimeField(null=True, blank=True, help_text='Fecha programada para envío')
    intentos = models.IntegerField(default=0, help_text='Número de intentos de envío')
    
    class Meta:
        db_table = 'notificaciones'
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['estado'], name='notif_estado_idx'),
            models.Index(fields=['tipo'], name='notif_tipo_idx'),
            models.Index(fields=['fecha_creacion'], name='notif_fecha_crea_idx'),
            models.Index(fields=['cliente_id', 'estado'], name='notif_cliente_estado_idx'),
            models.Index(fields=['estado', 'fecha_creacion'], name='notif_estado_fecha_idx'),
        ]
    
    def __str__(self):
        return f"Notificación {self.id} - {self.cliente.nombre_completo} - {self.tipo}"
    
    @property
    def cliente_nombre(self):
        return self.cliente.nombre_completo
    
    @property
    def cliente_email(self):
        return self.cliente.email
    
    @property
    def cliente_whatsapp_number(self):
        return self.cliente.telefono
    
    def to_dict(self):
        """Convierte el modelo a diccionario para APIs"""
        return {
            'id': self.id,
            'cliente_id': self.cliente.id,
            'cliente_nombre': self.cliente_nombre,
            'cliente_email': self.cliente_email,
            'cliente_telegram_chat_id': self.cliente_telegram_chat_id,
            'tipo': self.tipo,
            'mensaje': self.mensaje,
            'fecha_envio': self.fecha_envio.isoformat() if self.fecha_envio else None,
            'estado': self.estado,
            'canal': self.canal,
            'fecha_creacion': self.fecha_creacion.isoformat(),
        }


class PlantillaNotificacion(models.Model):
    """
    Modelo de Plantillas de Notificación para TelTec Net
    Permite crear y gestionar plantillas personalizables
    """
    TIPO_CHOICES = [
        ('pago_proximo', 'Pago Próximo'),
        ('pago_vencido', 'Pago Vencido'),
        ('corte_servicio', 'Corte de Servicio'),
        ('recordatorio', 'Recordatorio'),
        ('promocion', 'Promoción'),
        ('mantenimiento', 'Mantenimiento'),
    ]
    
    nombre = models.CharField(max_length=100, unique=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    mensaje = models.TextField(
        help_text='Usa {nombre}, {deuda}, {plan}, {telefono} como variables'
    )
    variables = models.JSONField(
        default=list,
        blank=True,
        help_text='Lista de variables disponibles: ["{nombre}", "{deuda}", "{plan}"]'
    )
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'plantillas_notificacion'
        verbose_name = 'Plantilla de Notificación'
        verbose_name_plural = 'Plantillas de Notificación'
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.nombre} ({self.tipo})"
    
    def renderizar_mensaje(self, contexto: dict) -> str:
        """Renderiza el mensaje con las variables proporcionadas"""
        mensaje = self.mensaje
        for clave, valor in contexto.items():
            mensaje = mensaje.replace(f'{{{clave}}}', str(valor))
        return mensaje


class RegistroEnvio(models.Model):
    """
    Modelo para registrar intentos de envío y seguimiento de entregas
    """
    ESTADO_ENVIO_CHOICES = [
        ('enviado', 'Enviado'),
        ('entregado', 'Entregado'),
        ('leido', 'Leído'),
        ('fallido', 'Fallido'),
        ('rebotado', 'Rebotado'),
    ]
    
    notificacion = models.ForeignKey(
        Notificacion, 
        on_delete=models.CASCADE, 
        related_name='registros_envio'
    )
    estado = models.CharField(max_length=20, choices=ESTADO_ENVIO_CHOICES, default='enviado')
    proveedor = models.CharField(max_length=50, help_text='WhatsApp, Email, SMS, etc.')
    referencia_externa = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text='ID del mensaje en el proveedor'
    )
    respuesta_proveedor = models.JSONField(default=dict, blank=True)
    fecha_envio = models.DateTimeField(default=timezone.now)
    fecha_entrega = models.DateTimeField(null=True, blank=True)
    fecha_lectura = models.DateTimeField(null=True, blank=True)
    errores = models.TextField(blank=True)
    
    class Meta:
        db_table = 'registros_envio'
        verbose_name = 'Registro de Envío'
        verbose_name_plural = 'Registros de Envío'
        ordering = ['-fecha_envio']
        indexes = [
            models.Index(fields=['notificacion'], name='reg_notif_idx'),
            models.Index(fields=['estado'], name='reg_estado_idx'),
            models.Index(fields=['fecha_envio'], name='reg_fecha_idx'),
        ]
    
    def __str__(self):
        return f"Envío {self.id} - {self.notificacion.id} - {self.estado}"
