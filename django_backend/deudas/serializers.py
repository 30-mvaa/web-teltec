from rest_framework import serializers
from .models import Deuda, HistorialDeuda
from clientes.serializers import ClienteSerializer
from planes_app.serializers import PlanSerializer

class HistorialDeudaSerializer(serializers.ModelSerializer):
    """Serializer para el historial de deudas"""
    
    class Meta:
        model = HistorialDeuda
        fields = [
            'id', 'tipo_cambio', 'descripcion', 'monto_anterior', 
            'monto_nuevo', 'estado_anterior', 'estado_nuevo', 
            'fecha_cambio', 'usuario'
        ]
        read_only_fields = ['fecha_cambio']

class DeudaSerializer(serializers.ModelSerializer):
    """Serializer para las deudas"""
    
    cliente = ClienteSerializer(read_only=True)
    plan = PlanSerializer(read_only=True)
    cliente_id = serializers.IntegerField(write_only=True)
    plan_id = serializers.IntegerField(write_only=True)
    
    # Campos calculados
    monto_pendiente = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    dias_vencida = serializers.IntegerField(read_only=True)
    esta_pagada = serializers.BooleanField(read_only=True)
    
    # Historial
    historial = HistorialDeudaSerializer(many=True, read_only=True)
    
    class Meta:
        model = Deuda
        fields = [
            'id', 'cliente', 'plan', 'cliente_id', 'plan_id',
            'mes_anio', 'fecha_vencimiento', 'monto_deuda', 'monto_pagado',
            'estado', 'meses_atraso', 'monto_pendiente', 'dias_vencida',
            'esta_pagada', 'observaciones', 'fecha_creacion', 
            'fecha_actualizacion', 'historial'
        ]
        read_only_fields = [
            'id', 'fecha_creacion', 'fecha_actualizacion', 
            'monto_pendiente', 'dias_vencida', 'esta_pagada'
        ]
    
    def validate(self, data):
        """Validación personalizada"""
        # Verificar que el cliente existe
        from clientes.models import Cliente
        try:
            Cliente.objects.get(id=data['cliente_id'])
        except Cliente.DoesNotExist:
            raise serializers.ValidationError("El cliente especificado no existe")
        
        # Verificar que el plan existe
        from planes_app.models import Plan
        try:
            Plan.objects.get(id=data['plan_id'])
        except Plan.DoesNotExist:
            raise serializers.ValidationError("El plan especificado no existe")
        
        # Verificar que no haya deuda duplicada para el mismo cliente, plan y mes
        if self.instance is None:  # Nueva deuda
            if Deuda.objects.filter(
                cliente_id=data['cliente_id'],
                plan_id=data['plan_id'],
                mes_anio=data['mes_anio']
            ).exists():
                raise serializers.ValidationError(
                    "Ya existe una deuda para este cliente, plan y mes"
                )
        
        # Verificar que la fecha de vencimiento sea posterior al mes de la deuda
        if data['fecha_vencimiento'] <= data['mes_anio']:
            raise serializers.ValidationError(
                "La fecha de vencimiento debe ser posterior al mes de la deuda"
            )
        
        return data
    
    def create(self, validated_data):
        """Crear nueva deuda"""
        # Extraer IDs para las relaciones
        cliente_id = validated_data.pop('cliente_id')
        plan_id = validated_data.pop('plan_id')
        
        # Crear la deuda
        deuda = Deuda.objects.create(
            cliente_id=cliente_id,
            plan_id=plan_id,
            **validated_data
        )
        
        # Crear registro en el historial
        HistorialDeuda.objects.create(
            deuda=deuda,
            tipo_cambio='creacion',
            descripcion='Deuda creada',
            monto_nuevo=deuda.monto_deuda,
            estado_nuevo=deuda.estado,
            usuario=self.context.get('request').user.username if self.context.get('request') else 'sistema'
        )
        
        return deuda
    
    def update(self, instance, validated_data):
        """Actualizar deuda existente"""
        # Guardar valores anteriores para el historial
        monto_anterior = instance.monto_deuda
        estado_anterior = instance.estado
        
        # Actualizar la instancia
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Calcular nuevo estado
        instance.calcular_estado()
        instance.save()
        
        # Crear registro en el historial
        HistorialDeuda.objects.create(
            deuda=instance,
            tipo_cambio='cambio_estado' if estado_anterior != instance.estado else 'ajuste',
            descripcion=f'Deuda actualizada - Monto: ${monto_anterior} → ${instance.monto_deuda}, Estado: {estado_anterior} → {instance.estado}',
            monto_anterior=monto_anterior,
            monto_nuevo=instance.monto_deuda,
            estado_anterior=estado_anterior,
            estado_nuevo=instance.estado,
            usuario=self.context.get('request').user.username if self.context.get('request') else 'sistema'
        )
        
        return instance

class DeudaResumenSerializer(serializers.ModelSerializer):
    """Serializer para resumen de deudas"""
    
    cliente_nombre = serializers.CharField(source='cliente.nombres', read_only=True)
    cliente_apellidos = serializers.CharField(source='cliente.apellidos', read_only=True)
    cliente_cedula = serializers.CharField(source='cliente.cedula', read_only=True)
    plan_tipo = serializers.CharField(source='plan.tipo_plan', read_only=True)
    plan_precio = serializers.DecimalField(source='plan.precio', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = Deuda
        fields = [
            'id', 'cliente_nombre', 'cliente_apellidos', 'cliente_cedula',
            'plan_tipo', 'plan_precio', 'mes_anio', 'fecha_vencimiento',
            'monto_deuda', 'monto_pagado', 'monto_pendiente', 'estado',
            'meses_atraso', 'dias_vencida'
        ]

class DeudaEstadisticasSerializer(serializers.Serializer):
    """Serializer para estadísticas de deudas"""
    
    total_deudas = serializers.IntegerField()
    total_monto_deuda = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_monto_pagado = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_monto_pendiente = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    deudas_por_estado = serializers.DictField()
    deudas_por_mes = serializers.DictField()
    top_deudores = DeudaResumenSerializer(many=True)
    
    promedio_deuda = serializers.DecimalField(max_digits=10, decimal_places=2)
    promedio_meses_atraso = serializers.DecimalField(max_digits=5, decimal_places=2)
