from django.db import models

# Modelos para el chatbot (opcional, para guardar historial de conversaciones)
class ConversacionChatbot(models.Model):
    """Modelo para almacenar historial de conversaciones del chatbot"""
    session_id = models.CharField(max_length=255)
    mensaje_usuario = models.TextField()
    respuesta_bot = models.TextField()
    contexto = models.CharField(max_length=50, default='sitio_publico')
    cliente_id = models.IntegerField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chatbot_conversaciones'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['session_id', 'fecha_creacion']),
            models.Index(fields=['cliente_id']),
        ]

