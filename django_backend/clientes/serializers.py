from rest_framework import serializers
from .models import Cliente
from sectores_app.serializers import SectorSerializer
from planes_app.serializers import PlanSerializer


class ClienteSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Cliente"""
    nombre_completo = serializers.ReadOnlyField()
    edad = serializers.ReadOnlyField()
    sector_nombre = serializers.ReadOnlyField()
    tipo_plan_actual = serializers.ReadOnlyField()
    precio_plan_actual = serializers.ReadOnlyField()
    
    class Meta:
        model = Cliente
        fields = [
            'id', 'cedula', 'nombres', 'apellidos', 'fecha_nacimiento', 
            'direccion', 'id_sector', 'sector_nombre', 'email', 'telefono',
            'telegram_chat_id', 'estado', 'fecha_registro', 'fecha_actualizacion',
            'nombre_completo', 'edad', 'tipo_plan_actual', 'precio_plan_actual'
        ]
        read_only_fields = ['id', 'fecha_registro', 'fecha_actualizacion']
    
    def validate_cedula(self, value):
        """Validar cédula ecuatoriana y normalizarla"""
        import re
        # Limpiar espacios, guiones y otros caracteres no numéricos
        cedula_limpia = re.sub(r'[^\d]', '', value)
        
        # Normalizar a 10 dígitos con ceros a la izquierda si es necesario
        if len(cedula_limpia) < 10:
            cedula_limpia = cedula_limpia.zfill(10)
        elif len(cedula_limpia) > 10:
            raise serializers.ValidationError("La cédula no puede tener más de 10 dígitos")
        
        if not cedula_limpia.isdigit():
            raise serializers.ValidationError("La cédula solo debe contener números")
        
        # Verificar si ya existe (normalizada)
        # Buscar tanto con la cédula normalizada como sin ceros a la izquierda
        if self.instance is None:  # Solo en creación
            # Buscar con la cédula normalizada usando consulta directa a la base de datos
            # para asegurar que realmente no existe (incluso si hay problemas con el ORM)
            from django.db import connection
            
            cliente_existente = None
            with connection.cursor() as cursor:
                # Buscar con la cédula normalizada
                cursor.execute("SELECT id, cedula, nombres, apellidos, estado FROM clientes WHERE cedula = %s LIMIT 1", [cedula_limpia])
                result = cursor.fetchone()
                
                if result:
                    # Si se encuentra, crear un objeto temporal para el mensaje de error
                    cliente_existente = {
                        'id': result[0],
                        'cedula': result[1],
                        'nombres': result[2],
                        'apellidos': result[3],
                        'estado': result[4]
                    }
                else:
                    # Buscar sin ceros a la izquierda
                    cedula_sin_ceros = cedula_limpia.lstrip('0')
                    if len(cedula_sin_ceros) < 10 and len(cedula_sin_ceros) > 0:
                        cedula_sin_ceros = cedula_sin_ceros.zfill(10)
                    if cedula_sin_ceros != cedula_limpia and len(cedula_sin_ceros) == 10:
                        cursor.execute("SELECT id, cedula, nombres, apellidos, estado FROM clientes WHERE cedula = %s LIMIT 1", [cedula_sin_ceros])
                        result = cursor.fetchone()
                        if result:
                            cliente_existente = {
                                'id': result[0],
                                'cedula': result[1],
                                'nombres': result[2],
                                'apellidos': result[3],
                                'estado': result[4]
                            }
            
            if cliente_existente:
                nombre_completo = f"{cliente_existente['nombres']} {cliente_existente['apellidos']}"
                estado_cliente = cliente_existente['estado']
                raise serializers.ValidationError(
                    f"Ya existe un cliente con la cédula {cedula_limpia}. "
                    f"Estado actual: {estado_cliente.capitalize()}. "
                    f"Nombre: {nombre_completo}"
                )
        
        return cedula_limpia
    
    def validate_email(self, value):
        """Validar email único solo en creación"""
        if self.instance is None:  # Solo en creación
            if Cliente.objects.filter(email=value).exists():
                raise serializers.ValidationError("Ya existe un cliente con este email")
        return value


class ClienteUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar clientes"""
    nombre_completo = serializers.ReadOnlyField()
    edad = serializers.ReadOnlyField()
    sector_nombre = serializers.ReadOnlyField()
    tipo_plan_actual = serializers.ReadOnlyField()
    precio_plan_actual = serializers.ReadOnlyField()
    
    class Meta:
        model = Cliente
        fields = [
            'id', 'cedula', 'nombres', 'apellidos', 'fecha_nacimiento', 
            'direccion', 'id_sector', 'sector_nombre', 'email', 'telefono',
            'telegram_chat_id', 'estado', 'fecha_registro', 'fecha_actualizacion',
            'nombre_completo', 'edad', 'tipo_plan_actual', 'precio_plan_actual'
        ]
        read_only_fields = ['id', 'fecha_registro', 'fecha_actualizacion']
    
    def validate_fecha_nacimiento(self, value):
        """Validar que la fecha de nacimiento no esté vacía"""
        # Si el valor es None, vacío o string vacío, usar la fecha existente
        if not value or value == '' or value == 'None':
            # Si no se proporciona fecha, mantener la fecha existente
            if self.instance and self.instance.fecha_nacimiento:
                return self.instance.fecha_nacimiento
            raise serializers.ValidationError("La fecha de nacimiento es requerida")
        return value
    
    def validate_cedula(self, value):
        """Validar cédula ecuatoriana y normalizarla"""
        import re
        # Limpiar espacios, guiones y otros caracteres no numéricos
        cedula_limpia = re.sub(r'[^\d]', '', value)
        
        # Normalizar a 10 dígitos con ceros a la izquierda si es necesario
        if len(cedula_limpia) < 10:
            cedula_limpia = cedula_limpia.zfill(10)
        elif len(cedula_limpia) > 10:
            raise serializers.ValidationError("La cédula no puede tener más de 10 dígitos")
        
        if not cedula_limpia.isdigit():
            raise serializers.ValidationError("La cédula solo debe contener números")
        
        # Verificar si ya existe otra cédula igual (solo si está cambiando la cédula)
        if self.instance and self.instance.cedula != cedula_limpia:
            if Cliente.objects.filter(cedula=cedula_limpia).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError(f"Ya existe otro cliente con la cédula {cedula_limpia}")
        
        return cedula_limpia


class ClienteListSerializer(serializers.ModelSerializer):
    """Serializer para listar clientes (campos básicos)"""
    nombre_completo = serializers.ReadOnlyField()
    edad = serializers.ReadOnlyField()
    sector_nombre = serializers.ReadOnlyField()
    tipo_plan_actual = serializers.ReadOnlyField()
    precio_plan_actual = serializers.ReadOnlyField()
    
    class Meta:
        model = Cliente
        fields = [
            'id', 'cedula', 'nombres', 'apellidos', 'email', 'telefono', 
            'estado', 'fecha_registro', 'nombre_completo', 'edad', 
            'sector_nombre', 'tipo_plan_actual', 'precio_plan_actual'
        ]


class ClienteDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalles completos del cliente"""
    nombre_completo = serializers.ReadOnlyField()
    edad = serializers.ReadOnlyField()
    sector_nombre = serializers.ReadOnlyField()
    tipo_plan_actual = serializers.ReadOnlyField()
    precio_plan_actual = serializers.ReadOnlyField()
    sector = SectorSerializer(read_only=True, source='id_sector')
    
    class Meta:
        model = Cliente
        fields = [
            'id', 'cedula', 'nombres', 'apellidos', 'fecha_nacimiento', 
            'direccion', 'id_sector', 'sector', 'sector_nombre', 'email', 'telefono',
            'telegram_chat_id', 'estado', 'fecha_registro', 'fecha_actualizacion',
            'nombre_completo', 'edad', 'tipo_plan_actual', 'precio_plan_actual'
        ]


class ClienteDeudasSerializer(serializers.ModelSerializer):
    """Serializer específico para el módulo de deudas usando la vista normalizada"""
    nombre_completo = serializers.ReadOnlyField()
    # Campos de deuda que vienen de la vista
    estado_pago = serializers.CharField(read_only=True)
    meses_pendientes = serializers.IntegerField(read_only=True)
    monto_total_deuda = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_pagado = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    fecha_ultimo_pago = serializers.DateTimeField(read_only=True)
    fecha_vencimiento_pago = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = Cliente
        fields = [
            'id', 'cedula', 'nombres', 'apellidos', 'email', 'telefono',
            'estado_pago', 'meses_pendientes', 'monto_total_deuda', 
            'fecha_ultimo_pago', 'fecha_vencimiento_pago', 'estado', 
            'sector_nombre', 'fecha_registro', 'nombre_completo', 'total_pagado'
        ]
        read_only_fields = ['id', 'fecha_registro', 'fecha_actualizacion'] 