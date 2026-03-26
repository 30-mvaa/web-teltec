from rest_framework import serializers
from .models import Plan

class PlanSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Plan"""
    clientes_activos = serializers.ReadOnlyField()
    
    class Meta:
        model = Plan
        fields = [
            'id', 'tipo_plan', 'precio', 'descripcion', 'estado', 
            'fecha_creacion', 'fecha_actualizacion', 'clientes_activos'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
    
    def validate_tipo_plan(self, value):
        """Validar nombre único"""
        if Plan.objects.filter(tipo_plan__iexact=value).exists():
            raise serializers.ValidationError("Ya existe un plan con este nombre")
        return value


class PlanListSerializer(serializers.ModelSerializer):
    """Serializer para listar planes"""
    clientes_activos = serializers.ReadOnlyField()
    
    class Meta:
        model = Plan
        fields = ['id', 'tipo_plan', 'precio', 'estado', 'clientes_activos']


class PlanUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar planes"""
    clientes_activos = serializers.ReadOnlyField()
    
    class Meta:
        model = Plan
        fields = [
            'id', 'tipo_plan', 'precio', 'descripcion', 'estado', 
            'fecha_creacion', 'fecha_actualizacion', 'clientes_activos'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']


