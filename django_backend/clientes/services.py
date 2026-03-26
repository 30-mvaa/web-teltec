from django.db import connection
from django.utils import timezone
from datetime import datetime, timedelta

class ClienteService:
    """Servicio de Cliente - Lógica de negocio"""
    
    @staticmethod
    def validar_cedula_ecuatoriana(cedula):
        """Validar cédula ecuatoriana"""
        if not cedula or len(cedula) != 10 or not cedula.isdigit():
            return False
        
        # Algoritmo de validación de cédula ecuatoriana
        coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2]
        verificador = int(cedula[9])
        
        suma = 0
        for i in range(9):
            producto = int(cedula[i]) * coeficientes[i]
            if producto >= 10:
                producto = producto - 9
            suma += producto
        
        decena_superior = ((suma // 10) + 1) * 10
        digito_verificador = decena_superior - suma
        
        if digito_verificador == 10:
            digito_verificador = 0
        
        return digito_verificador == verificador
    
    @staticmethod
    def validar_mayor_edad(fecha_nacimiento):
        """Validar que el cliente sea mayor de edad"""
        today = timezone.now().date()
        edad = today.year - fecha_nacimiento.year - (
            (today.month, today.day) < (fecha_nacimiento.month, fecha_nacimiento.day)
        )
        return edad >= 18
    
    @staticmethod
    def calcular_estado_pago(cliente):
        """Calcular estado de pago del cliente"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT fecha_ultimo_pago, meses_pendientes, monto_total_deuda
                    FROM clientes 
                    WHERE id = %s
                """, [cliente.id])
                result = cursor.fetchone()
                
                if not result:
                    return 'al_dia'
                
                fecha_ultimo_pago, meses_pendientes, monto_total_deuda = result
                
                if monto_total_deuda and monto_total_deuda > 0:
                    if meses_pendientes >= 2:
                        return 'corte_pendiente'
                    elif meses_pendientes == 1:
                        return 'vencido'
                    else:
                        return 'proximo_vencimiento'
                
                return 'al_dia'
                
        except Exception as e:
            print(f"Error calculando estado de pago: {e}")
            return 'al_dia'
    
    @staticmethod
    def calcular_meses_pendientes(cliente):
        """Calcular meses pendientes de pago"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT meses_pendientes FROM clientes WHERE id = %s
                """, [cliente.id])
                result = cursor.fetchone()
                return result[0] if result else 0
                
        except Exception as e:
            print(f"Error calculando meses pendientes: {e}")
            return 0
    
    @staticmethod
    def calcular_deuda_total(cliente):
        """Calcular monto total de deuda"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT monto_total_deuda FROM clientes WHERE id = %s
                """, [cliente.id])
                result = cursor.fetchone()
                return float(result[0]) if result and result[0] else 0.0
                
        except Exception as e:
            print(f"Error calculando deuda total: {e}")
            return 0.0
    
    @staticmethod
    def get_clientes(filtros=None):
        """Obtener clientes con filtros opcionales"""
        try:
            query = """
                SELECT id, cedula, nombres, apellidos, tipo_plan, precio_plan, 
                       fecha_nacimiento, direccion, sector, email, telefono, 
                       telegram_chat_id, estado, fecha_registro, fecha_actualizacion,
                       fecha_ultimo_pago, meses_pendientes, monto_total_deuda,
                       fecha_vencimiento_pago, estado_pago
                FROM clientes 
                WHERE 1=1
            """
            params = []
            
            if filtros:
                if filtros.get('search'):
                    search_term = f"%{filtros['search']}%"
                    query += """ AND (
                        cedula ILIKE %s OR 
                        nombres ILIKE %s OR 
                        apellidos ILIKE %s OR 
                        email ILIKE %s OR 
                        telefono ILIKE %s
                    )"""
                    params.extend([search_term] * 5)
                
                if filtros.get('estado') and filtros['estado'] != 'todos':
                    query += " AND estado = %s"
                    params.append(filtros['estado'])
            
            query += " ORDER BY fecha_registro DESC"
            
            with connection.cursor() as cursor:
                cursor.execute(query, params)
                clientes = []
                for row in cursor.fetchall():
                    clientes.append({
                        'id': row[0],
                        'cedula': row[1],
                        'nombres': row[2],
                        'apellidos': row[3],
                        'tipo_plan': row[4],
                        'precio_plan': float(row[5]) if row[5] else 0,
                        'fecha_nacimiento': row[6].isoformat() if row[6] else None,
                        'direccion': row[7],
                        'sector': row[8],
                        'email': row[9],
                        'telefono': row[10],
                        'telegram_chat_id': row[11],
                        'estado': row[12],
                        'fecha_registro': row[13].isoformat() if row[13] else None,
                        'fecha_actualizacion': row[14].isoformat() if row[14] else None,
                        'fecha_ultimo_pago': row[15].isoformat() if row[15] else None,
                        'meses_pendientes': row[16] if row[16] else 0,
                        'monto_total_deuda': float(row[17]) if row[17] else 0.0,
                        'fecha_vencimiento_pago': row[18].isoformat() if row[18] else None,
                        'estado_pago': row[19] if row[19] else 'al_dia'
                    })
                
                return clientes
                
        except Exception as e:
            print(f"Error obteniendo clientes: {e}")
            return []
    
    @staticmethod
    def get_cliente_by_id(cliente_id):
        """Obtener cliente por ID"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id, cedula, nombres, apellidos, tipo_plan, precio_plan, 
                           fecha_nacimiento, direccion, sector, email, telefono, 
                           telegram_chat_id, estado, fecha_registro, fecha_actualizacion
                    FROM clientes 
                    WHERE id = %s
                """, [cliente_id])
                row = cursor.fetchone()
                
                if not row:
                    return None
                
                return {
                    'id': row[0],
                    'cedula': row[1],
                    'nombres': row[2],
                    'apellidos': row[3],
                    'tipo_plan': row[4],
                    'precio_plan': float(row[5]) if row[5] else 0,
                    'fecha_nacimiento': row[6].isoformat() if row[6] else None,
                    'direccion': row[7],
                    'sector': row[8],
                    'email': row[9],
                    'telefono': row[10],
                    'telegram_chat_id': row[11],
                    'estado': row[12],
                    'fecha_registro': row[13].isoformat() if row[13] else None,
                    'fecha_actualizacion': row[14].isoformat() if row[14] else None
                }
                
        except Exception as e:
            print(f"Error obteniendo cliente: {e}")
            return None
    
    @staticmethod
    def create_cliente(datos):
        """Crear nuevo cliente"""
        try:
            # Validar cédula
            if not ClienteService.validar_cedula_ecuatoriana(datos['cedula']):
                return False, "Cédula ecuatoriana inválida"
            
            # Verificar que la cédula no exista
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM clientes WHERE cedula = %s", [datos['cedula']])
                if cursor.fetchone():
                    return False, "La cédula ya está registrada"
            
            # Insertar cliente
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO clientes (
                        cedula, nombres, apellidos, tipo_plan, precio_plan, 
                        fecha_nacimiento, direccion, sector, email, telefono, 
                        telegram_chat_id, estado, fecha_registro, fecha_actualizacion
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                    ) RETURNING id
                """, [
                    datos['cedula'], datos['nombres'], datos['apellidos'],
                    datos['tipo_plan'], datos['precio_plan'], datos['fecha_nacimiento'],
                    datos['direccion'], datos['sector'], datos['email'],
                    datos['telefono'], datos.get('telegram_chat_id', ''), datos['estado']
                ])
                cliente_id = cursor.fetchone()[0]
            
            return True, f"Cliente creado exitosamente con ID: {cliente_id}"
            
        except Exception as e:
            print(f"Error creando cliente: {e}")
            return False, f"Error al crear cliente: {str(e)}"
    
    @staticmethod
    def update_cliente(cliente_id, datos):
        """Actualizar cliente"""
        try:
            # Verificar que el cliente existe
            cliente = ClienteService.get_cliente_by_id(cliente_id)
            if not cliente:
                return False, "Cliente no encontrado"
            
            # Validar cédula si se está actualizando
            if 'cedula' in datos and datos['cedula'] != cliente['cedula']:
                if not ClienteService.validar_cedula_ecuatoriana(datos['cedula']):
                    return False, "Cédula ecuatoriana inválida"
                
                # Verificar que la nueva cédula no exista
                with connection.cursor() as cursor:
                    cursor.execute("SELECT id FROM clientes WHERE cedula = %s AND id != %s", 
                                 [datos['cedula'], cliente_id])
                    if cursor.fetchone():
                        return False, "La cédula ya está registrada"
            
            # Construir query de actualización con validación de columnas
            updates = []
            params = []
            
            # Whitelist de columnas permitidas para prevenir SQL injection
            allowed_columns = {
                'cedula', 'nombres', 'apellidos', 'tipo_plan', 'precio_plan',
                     'fecha_nacimiento', 'direccion', 'sector', 'email', 'telefono',
                'telegram_chat_id', 'estado', 'id_sector'
            }
            
            for campo, valor in datos.items():
                # Validar que el campo esté en la whitelist
                if campo in allowed_columns:
                    updates.append(f"{campo} = %s")
                    params.append(valor)
            
            if not updates:
                return False, "No hay campos para actualizar"
            
            params.append(cliente_id)
            
            with connection.cursor() as cursor:
                # Construir query de forma segura
                set_clause = ', '.join(updates)
                cursor.execute(f"""
                    UPDATE clientes 
                    SET {set_clause}, fecha_actualizacion = NOW()
                    WHERE id = %s
                """, params)
            
            return True, "Cliente actualizado exitosamente"
            
        except Exception as e:
            print(f"Error actualizando cliente: {e}")
            return False, f"Error al actualizar cliente: {str(e)}"
    
    @staticmethod
    def delete_cliente(cliente_id):
        """Eliminar cliente"""
        try:
            # Verificar que el cliente existe
            cliente = ClienteService.get_cliente_by_id(cliente_id)
            if not cliente:
                return False, "Cliente no encontrado"
            
            # Eliminar cliente
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM clientes WHERE id = %s", [cliente_id])
            
            return True, "Cliente eliminado exitosamente"
            
        except Exception as e:
            print(f"Error eliminando cliente: {e}")
            return False, f"Error al eliminar cliente: {str(e)}"
    
    @staticmethod
    def get_valores_unicos():
        """Obtener valores únicos para filtros"""
        try:
            with connection.cursor() as cursor:
                # Obtener sectores únicos
                cursor.execute("SELECT DISTINCT sector FROM clientes WHERE sector != '' ORDER BY sector")
                sectores = [row[0] for row in cursor.fetchall()]
                
                # Obtener planes únicos
                cursor.execute("SELECT DISTINCT tipo_plan FROM clientes WHERE tipo_plan != '' ORDER BY tipo_plan")
                planes = [{'tipo_plan': row[0], 'precio_plan': 0} for row in cursor.fetchall()]
                
                return {
                    'sectores': sectores,
                    'planes': planes
                }
                
        except Exception as e:
            print(f"Error obteniendo valores únicos: {e}")
            return {'sectores': [], 'planes': []}
    
    @staticmethod
    def get_estadisticas_generales():
        """Obtener estadísticas generales de clientes"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_clientes,
                        COUNT(CASE WHEN estado = 'activo' THEN 1 END) as clientes_activos,
                        COUNT(CASE WHEN estado = 'inactivo' THEN 1 END) as clientes_inactivos,
                        COUNT(CASE WHEN estado = 'suspendido' THEN 1 END) as clientes_suspendidos,
                        COUNT(CASE WHEN telegram_chat_id IS NOT NULL AND telegram_chat_id != '' THEN 1 END) as con_telegram,
                        SUM(precio_plan) as ingresos_mensuales
                    FROM clientes
                """)
                stats = cursor.fetchone()
                
                return {
                    'total_clientes': stats[0],
                    'clientes_activos': stats[1],
                    'clientes_inactivos': stats[2],
                    'clientes_suspendidos': stats[3],
                    'con_telegram': stats[4],
                    'ingresos_mensuales': float(stats[5]) if stats[5] else 0.0
                }
                
        except Exception as e:
            print(f"Error obteniendo estadísticas: {e}")
            return {
                'total_clientes': 0,
                'clientes_activos': 0,
                'clientes_inactivos': 0,
                'clientes_suspendidos': 0,
                'con_telegram': 0,
                'ingresos_mensuales': 0.0
            } 