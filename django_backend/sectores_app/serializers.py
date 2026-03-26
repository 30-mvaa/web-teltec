from rest_framework import serializers
from .models import Sector

class SectorSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Sector"""
    cantidad_clientes = serializers.ReadOnlyField()
    
    class Meta:
        model = Sector
        fields = [
            'id', 'nombre_sector', 'descripcion', 'estado', 
            'fecha_creacion', 'fecha_actualizacion', 'cantidad_clientes'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
    
    def validate_nombre_sector(self, value):
        """Validar nombre único"""
        if Sector.objects.filter(nombre_sector__iexact=value).exists():
            raise serializers.ValidationError("Ya existe un sector con este nombre")
        return value


class SectorListSerializer(serializers.ModelSerializer):
    """Serializer para listar sectores"""
    cantidad_clientes = serializers.ReadOnlyField()
    
    class Meta:
        model = Sector
        fields = ['id', 'nombre_sector', 'estado', 'cantidad_clientes']


class SectorUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar sectores"""
    cantidad_clientes = serializers.ReadOnlyField()
    
    class Meta:
        model = Sector
        fields = [
            'id', 'nombre_sector', 'descripcion', 'estado', 
            'fecha_creacion', 'fecha_actualizacion', 'cantidad_clientes'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']












