from rest_framework import serializers

class NotificacionSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    cliente_id = serializers.IntegerField(required=True)
    tipo = serializers.ChoiceField(
        choices=[
            ('pago_proximo', 'Pago Próximo'),
            ('pago_vencido', 'Pago Vencido'),
            ('corte_servicio', 'Corte de Servicio'),
            ('recordatorio', 'Recordatorio'),
            ('promocion', 'Promoción'),
            ('mantenimiento', 'Mantenimiento'),
        ],
        required=True
    )
    mensaje = serializers.CharField(required=True, min_length=1, max_length=1000)
    canal = serializers.ChoiceField(
        choices=[
            ('whatsapp', 'WhatsApp'),
            ('email', 'Email'),
            ('sms', 'SMS'),
        ],
        default='whatsapp'
    )
    
    def validate_mensaje(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El mensaje no puede estar vacío")
        return value.strip()
    
    def validate_cliente_id(self, value):
        if value and value <= 0:
            raise serializers.ValidationError("ID de cliente inválido")
        return value


class NotificacionMasivaSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(
        choices=[
            ('pago_proximo', 'Pago Próximo'),
            ('pago_vencido', 'Pago Vencido'),
            ('corte_servicio', 'Corte de Servicio'),
            ('recordatorio', 'Recordatorio'),
            ('promocion', 'Promoción'),
            ('mantenimiento', 'Mantenimiento'),
        ],
        required=True
    )
    mensaje = serializers.CharField(required=True, min_length=1, max_length=1000)
    
    def validate_mensaje(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El mensaje no puede estar vacío")
        return value.strip()


class LimpiarNotificacionesSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(
        choices=[
            ('enviadas', 'Enviadas'),
            ('fallidas', 'Fallidas'),
            ('antiguas', 'Antiguas'),
            ('todas', 'Todas'),
        ],
        required=True
    )
    dias = serializers.IntegerField(required=False, min_value=1, max_value=365)
    
    def validate(self, data):
        if data.get('tipo') == 'antiguas' and not data.get('dias'):
            raise serializers.ValidationError({"dias": "Días requeridos para limpiar notificaciones antiguas"})
        return data


class NotificacionOutputSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    cliente_id = serializers.IntegerField()
    cliente_nombre = serializers.CharField()
    cliente_telefono = serializers.CharField(allow_null=True)
    tipo = serializers.CharField()
    mensaje = serializers.CharField()
    estado = serializers.CharField()
    canal = serializers.CharField()
    fecha_creacion = serializers.CharField()
    fecha_envio = serializers.CharField(allow_null=True)
    fecha_programada = serializers.CharField(allow_null=True)
    intentos = serializers.IntegerField()


class PaginationSerializer(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=20)
    search = serializers.CharField(required=False, allow_blank=True, default='')
    tipo = serializers.CharField(required=False, allow_blank=True, default='todos')
    estado = serializers.CharField(required=False, allow_blank=True, default='todos')


class NotificacionTemplateSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    nombre = serializers.CharField(max_length=100)
    tipo = serializers.ChoiceField(
        choices=[
            ('pago_proximo', 'Pago Próximo'),
            ('pago_vencido', 'Pago Vencido'),
            ('corte_servicio', 'Corte de Servicio'),
            ('recordatorio', 'Recordatorio'),
            ('promocion', 'Promoción'),
            ('mantenimiento', 'Mantenimiento'),
        ]
    )
    mensaje = serializers.CharField(min_length=1, max_length=1000)
    variables = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    activo = serializers.BooleanField(default=True)
