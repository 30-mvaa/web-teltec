
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.db import connection
from .models import Cliente
from .serializers import (
    ClienteSerializer, ClienteUpdateSerializer, ClienteListSerializer,
    ClienteDetailSerializer, ClienteDeudasSerializer
)
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes


class ClienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el modelo Cliente con estructura normalizada
    """
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [AllowAny]
    
    def get_serializer_class(self):
        """Retorna el serializer apropiado según la acción"""
        if self.action == 'update' or self.action == 'partial_update':
            return ClienteUpdateSerializer
        elif self.action == 'list':
            return ClienteListSerializer
        elif self.action == 'retrieve':
            return ClienteDetailSerializer
        return ClienteSerializer
    
    def list(self, request, *args, **kwargs):
        """Listar clientes con filtros y paginación"""
        try:
            # Parámetros de paginación
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 50))
            search = request.query_params.get('search', '')
            estado = request.query_params.get('estado', '')
            sector = request.query_params.get('sector', '')
            
            # Validar parámetros
            if page < 1:
                page = 1
            if page_size < 1 or page_size > 200:
                page_size = 50
                
            offset = (page - 1) * page_size
            
            # Siempre usar consulta directa para incluir fecha_nacimiento y direccion
            # La vista clientes_deuda no incluye estos campos
            usar_vista = False
            
            with connection.cursor() as cursor:
                # Verificar si la vista existe (ya no la usamos pero dejamos el check por si acaso)
                try:
                    cursor.execute("SELECT COUNT(*) FROM clientes_deuda LIMIT 1")
                    vista_existe = True
                except:
                    vista_existe = False
                
                # Siempre usar consulta directa a la tabla clientes
                if True:
                    vista_existe = False
                    # Usar consulta directa a la tabla clientes con JOINs simplificados
                    base_query = """
                        SELECT 
                            c.id, 
                            c.cedula, 
                            c.nombres, 
                            c.apellidos, 
                            c.email, 
                            c.telefono, 
                            c.estado, 
                            c.fecha_registro,
                            c.fecha_nacimiento,
                            c.direccion,
                            COALESCE(s.nombre_sector, 'Sin sector') as sector,
                            COALESCE(p.tipo_plan, 'Sin plan') as tipo_plan,
                            COALESCE(p.precio, 0) as precio_plan,
                            'al_dia' as estado_pago,
                            0 as meses_pendientes,
                            0 as monto_total_deuda,
                            NULL as fecha_ultimo_pago,
                            NULL as fecha_vencimiento_pago
                        FROM clientes c
                        LEFT JOIN clientes_planes cp ON c.id = cp.id_cliente AND cp.estado = 'activo'
                        LEFT JOIN planes p ON cp.id_plan = p.id_plan
                        LEFT JOIN sectores s ON c.id_sector = s.id_sector
                        WHERE 1=1
                    """
                else:
                    # Usar la vista clientes_deuda (más eficiente)
                    base_query = """
                        SELECT id, cedula, nombres, apellidos, email, telefono, 
                               estado, fecha_registro, sector, tipo_plan, 
                               precio_plan, estado_pago, meses_pendientes, 
                               monto_total_deuda, fecha_ultimo_pago, fecha_vencimiento_pago,
                               NULL as fecha_nacimiento, NULL as direccion
                        FROM clientes_deuda
                        WHERE 1=1
                    """
                params = []
                
                # Aplicar filtros (ajustar según si usamos vista o consulta directa)
                buscar_por_cedula_exacta = False
                if search and search.strip():
                    # Limpiar espacios en blanco y preparar término de búsqueda
                    search_clean = search.strip()
                    
                    # Normalizar cédula: quitar espacios, guiones y asegurar 10 dígitos
                    import re
                    cedula_normalizada = re.sub(r'[^\d]', '', search_clean)
                    
                    # Si el término de búsqueda parece ser una cédula (solo números y entre 8-10 dígitos)
                    # hacer búsqueda exacta o con padding de ceros
                    es_cedula = cedula_normalizada.isdigit() and 8 <= len(cedula_normalizada) <= 10
                    
                    if es_cedula:
                        # Normalizar a 10 dígitos con ceros a la izquierda
                        cedula_busqueda = cedula_normalizada.zfill(10)
                        buscar_por_cedula_exacta = True
                        
                        # Para búsqueda por cédula exacta, buscar en todos los formatos posibles
                        # Buscar con ceros a la izquierda, sin ceros, y también con LIKE
                        cedula_sin_ceros_izq = cedula_normalizada.lstrip('0')
                        if len(cedula_sin_ceros_izq) < 10 and len(cedula_sin_ceros_izq) > 0:
                            cedula_sin_ceros_izq = cedula_sin_ceros_izq.zfill(10)
                        elif len(cedula_sin_ceros_izq) == 0:
                            cedula_sin_ceros_izq = cedula_busqueda
                        
                        # Construir condición OR para cédula que busque en todos los formatos
                        if vista_existe:
                            base_query += """ AND (
                                nombres ILIKE %s OR 
                                apellidos ILIKE %s OR 
                                cedula = %s OR 
                                cedula = %s OR 
                                cedula LIKE %s OR 
                                cedula LIKE %s OR
                                email ILIKE %s OR 
                                telefono ILIKE %s
                            )"""
                        else:
                            base_query += """ AND (
                                c.nombres ILIKE %s OR 
                                c.apellidos ILIKE %s OR 
                                c.cedula = %s OR 
                                c.cedula = %s OR 
                                c.cedula LIKE %s OR 
                                c.cedula LIKE %s OR
                                c.email ILIKE %s OR 
                                c.telefono ILIKE %s
                            )"""
                        search_param = f'%{search_clean}%'
                        # Debug: imprimir valores de búsqueda
                        print(f"🔍 DEBUG Búsqueda cédula:")
                        print(f"  - Término original: {search_clean}")
                        print(f"  - Cédula normalizada: {cedula_normalizada}")
                        print(f"  - Cédula con ceros: {cedula_busqueda}")
                        print(f"  - Cédula sin ceros izq: {cedula_sin_ceros_izq}")
                        print(f"  - Buscar por cédula exacta: {buscar_por_cedula_exacta}")
                        
                        params.extend([
                            search_param, search_param, 
                            cedula_busqueda,  # Búsqueda exacta con ceros
                            cedula_sin_ceros_izq,  # Búsqueda exacta sin ceros iniciales
                            f'%{cedula_busqueda}%',  # LIKE con ceros
                            f'%{cedula_sin_ceros_izq}%',  # LIKE sin ceros iniciales
                            search_param, search_param
                        ])
                    else:
                        # Para otros términos, búsqueda normal con ILIKE
                        if vista_existe:
                            base_query += " AND (nombres ILIKE %s OR apellidos ILIKE %s OR cedula ILIKE %s OR email ILIKE %s OR telefono ILIKE %s)"
                        else:
                            base_query += " AND (c.nombres ILIKE %s OR c.apellidos ILIKE %s OR c.cedula ILIKE %s OR c.email ILIKE %s OR c.telefono ILIKE %s)"
                        search_param = f'%{search_clean}%'
                        params.extend([search_param, search_param, search_param, search_param, search_param])
                
                # Si se busca por cédula exacta, ignorar el filtro de estado para que siempre encuentre el cliente
                # Esto permite encontrar al cliente sin importar su estado actual
                if estado and estado != 'todos':
                    if buscar_por_cedula_exacta:
                        # Si se busca por cédula, no aplicar filtro de estado (encontrar en cualquier estado)
                        pass
                    else:
                        # Si no es búsqueda por cédula, aplicar filtro de estado normalmente
                        print(f"🔍 DEBUG Filtro de estado: '{estado}'")
                        if vista_existe:
                            base_query += " AND estado = %s"
                        else:
                            base_query += " AND c.estado = %s"
                        params.append(estado)
                        print(f"🔍 DEBUG Query después de aplicar filtro de estado: {base_query[:200]}...")
                        print(f"🔍 DEBUG Params: {params}")
                
                if sector and sector != 'todos':
                    if vista_existe:
                        base_query += " AND sector ILIKE %s"
                    else:
                        base_query += " AND s.nombre_sector ILIKE %s"
                    params.append(f'%{sector}%')
                
                # Debug: Verificar clientes suspendidos en la base de datos
                if estado == 'suspendido':
                    print(f"🔍 DEBUG Verificando clientes suspendidos:")
                    cursor.execute("SELECT COUNT(*) FROM clientes WHERE estado = 'suspendido'")
                    total_suspendidos = cursor.fetchone()[0]
                    print(f"  - Total suspendidos en tabla clientes: {total_suspendidos}")
                    
                    if vista_existe:
                        cursor.execute("SELECT COUNT(*) FROM clientes_deuda WHERE estado = 'suspendido'")
                        total_suspendidos_vista = cursor.fetchone()[0]
                        print(f"  - Total suspendidos en vista clientes_deuda: {total_suspendidos_vista}")
                        
                        # Verificar si hay diferencia
                        if total_suspendidos > 0 and total_suspendidos_vista == 0:
                            print(f"  - ⚠️ PROBLEMA: La vista clientes_deuda no incluye clientes suspendidos!")
                            # Si la vista no incluye suspendidos, usar consulta directa
                            vista_existe = False
                            base_query = """
                                SELECT 
                                    c.id, 
                                    c.cedula, 
                                    c.nombres, 
                                    c.apellidos, 
                                    c.email, 
                                    c.telefono, 
                                    c.estado, 
                                    c.fecha_registro,
                                    COALESCE(s.nombre_sector, 'Sin sector') as sector,
                                    COALESCE(p.tipo_plan, 'Sin plan') as tipo_plan,
                                    COALESCE(p.precio, 0) as precio_plan,
                                    'al_dia' as estado_pago,
                                    0 as meses_pendientes,
                                    0 as monto_total_deuda,
                                    NULL as fecha_ultimo_pago,
                                    NULL as fecha_vencimiento_pago
                                FROM clientes c
                                LEFT JOIN clientes_planes cp ON c.id = cp.id_cliente AND cp.estado = 'activo'
                                LEFT JOIN planes p ON cp.id_plan = p.id_plan
                                LEFT JOIN sectores s ON c.id_sector = s.id_sector
                                WHERE 1=1
                            """
                            # Reconstruir parámetros si había búsqueda
                            params = []
                            if search and search.strip():
                                search_clean = search.strip()
                                import re
                                cedula_normalizada = re.sub(r'[^\d]', '', search_clean)
                                es_cedula = cedula_normalizada.isdigit() and 8 <= len(cedula_normalizada) <= 10
                                if es_cedula:
                                    cedula_busqueda = cedula_normalizada.zfill(10)
                                    base_query += """ AND (
                                        c.nombres ILIKE %s OR 
                                        c.apellidos ILIKE %s OR 
                                        c.cedula = %s OR 
                                        c.cedula ILIKE %s OR
                                        c.email ILIKE %s OR 
                                        c.telefono ILIKE %s
                                    )"""
                                    search_param = f'%{search_clean}%'
                                    params.extend([
                                        search_param, search_param, 
                                        cedula_busqueda, search_param,
                                        search_param, search_param
                                    ])
                                else:
                                    base_query += " AND (c.nombres ILIKE %s OR c.apellidos ILIKE %s OR c.cedula ILIKE %s OR c.email ILIKE %s OR c.telefono ILIKE %s)"
                                    search_param = f'%{search_clean}%'
                                    params.extend([search_param, search_param, search_param, search_param, search_param])
                            
                            # Aplicar filtro de estado
                            if estado and estado != 'todos':
                                base_query += " AND c.estado = %s"
                                params.append(estado)
                            print(f"  - ✅ Cambiado a consulta directa para incluir suspendidos")
                
                # Debug: imprimir consulta SQL
                print(f"🔍 DEBUG SQL Query:")
                print(f"  - Vista existe: {vista_existe}")
                print(f"  - Estado filtro: {estado if estado and estado != 'todos' else 'todos'}")
                print(f"  - Buscar por cédula exacta: {buscar_por_cedula_exacta}")
                print(f"  - Query (primeros 300 chars): {base_query[:300]}")
                print(f"  - Params count: {len(params)}")
                
                # Contar total
                count_query = f"SELECT COUNT(*) FROM ({base_query}) as count_query"
                try:
                    cursor.execute(count_query, params)
                    total_count = cursor.fetchone()[0]
                    print(f"  - Total encontrado: {total_count}")
                except Exception as e:
                    print(f"  - ERROR en consulta COUNT: {str(e)}")
                    raise
                print(f"  - Total encontrado: {total_count}")
                
                # Ordenamiento y paginación
                if vista_existe:
                    base_query += " ORDER BY fecha_registro DESC LIMIT %s OFFSET %s"
                else:
                    base_query += " ORDER BY c.fecha_registro DESC LIMIT %s OFFSET %s"
                params.extend([page_size, offset])
                
                cursor.execute(base_query, params)
                clientes_raw = cursor.fetchall()
                
                # Convertir a diccionarios
                clientes_data = []
                for cliente in clientes_raw:
                    clientes_data.append({
                        'id': cliente[0],
                        'cedula': cliente[1],
                        'nombres': cliente[2],
                        'apellidos': cliente[3],
                        'email': cliente[4],
                        'telefono': cliente[5],
                        'estado': cliente[6],
                        'fecha_registro': cliente[7].isoformat() if cliente[7] else None,
                        'fecha_nacimiento': cliente[8].isoformat() if cliente[8] else None,
                        'direccion': cliente[9] or '',
                        'sector_nombre': cliente[10],
                        'tipo_plan_actual': cliente[11],
                        'precio_plan_actual': float(cliente[12]) if cliente[12] else 0,
                        'estado_pago': cliente[13],
                        'meses_pendientes': cliente[14],
                        'monto_total_deuda': float(cliente[15]) if cliente[15] else 0,
                        'fecha_ultimo_pago': cliente[16].isoformat() if cliente[16] else None,
                        'fecha_vencimiento_pago': cliente[17].isoformat() if cliente[17] else None
                    })
            
            # Calcular información de paginación
            total_pages = (total_count + page_size - 1) // page_size
            has_next = page < total_pages
            has_previous = page > 1
            
            return Response({
                'success': True,
                'data': clientes_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': total_pages,
                    'has_next': has_next,
                    'has_previous': has_previous,
                    'next_page': page + 1 if has_next else None,
                    'previous_page': page - 1 if has_previous else None
                },
                'filters': {
                    'search': search,
                    'estado': estado,
                    'sector': sector
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error en list clientes: {str(e)}")
            print(f"Traceback: {error_details}")
            return Response({
                'success': False,
                'message': f'Error al obtener clientes: {str(e)}',
                'error_details': str(e) if 'DEBUG' in str(e) else 'Error del servidor. Intente más tarde.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request, *args, **kwargs):
        """Crear un nuevo cliente"""
        try:
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                cliente = serializer.save()
                
                # Si se está asignando un plan, asignarlo
                plan_id = request.data.get('plan_id')
                if plan_id:
                    try:
                        from django.utils import timezone
                        from datetime import timedelta
                        from planes_app.models import Plan
                        from clientes_planes_app.models import ClientePlan
                        
                        # Verificar que el plan existe
                        plan = Plan.objects.get(id=plan_id, estado='activo')
                        
                        # Crear asignación de plan
                        ClientePlan.objects.create(
                            id_cliente=cliente,
                            id_plan=plan,
                            fecha_inicio=timezone.now().date(),
                            estado='activo'
                        )
                        
                    except Plan.DoesNotExist:
                        return Response({
                            'success': False,
                            'message': 'Plan no encontrado o inactivo'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    except Exception as e:
                        return Response({
                            'success': False,
                            'message': f'Error al asignar plan: {str(e)}'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                return Response({
                    'success': True,
                    'message': 'Cliente creado exitosamente',
                    'data': ClienteDetailSerializer(cliente).data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'message': 'Datos inválidos',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al crear cliente: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def retrieve(self, request, *args, **kwargs):
        """Obtener un cliente específico"""
        try:
            cliente = self.get_object()
            serializer = ClienteDetailSerializer(cliente)
            
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener cliente: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def update(self, request, *args, **kwargs):
        """Actualizar un cliente existente"""
        try:
            cliente = self.get_object()
            print(f"🔧 DEBUG Update Cliente:")
            print(f"  - Cliente ID: {cliente.id}")
            print(f"  - Datos recibidos: {request.data}")
            print(f"  - Fecha nacimiento recibida: {request.data.get('fecha_nacimiento')}")
            print(f"  - Fecha nacimiento actual: {cliente.fecha_nacimiento}")
            
            # Convertir request.data a diccionario mutable
            try:
                if hasattr(request.data, '_mutable'):
                    data_to_update = request.data.copy()
                elif isinstance(request.data, dict):
                    data_to_update = dict(request.data)
                else:
                    # Si es QueryDict u otro tipo, convertir a dict
                    data_to_update = dict(request.data.items())
            except Exception as e:
                print(f"  - ERROR al copiar request.data: {str(e)}")
                data_to_update = dict(request.data) if hasattr(request.data, '__dict__') else {}
            
            # Asegurar que fecha_nacimiento esté presente
            fecha_nacimiento_recibida = data_to_update.get('fecha_nacimiento')
            print(f"  - Fecha nacimiento recibida (raw): {fecha_nacimiento_recibida}")
            print(f"  - Tipo: {type(fecha_nacimiento_recibida)}")
            
            if not fecha_nacimiento_recibida or fecha_nacimiento_recibida == '' or fecha_nacimiento_recibida == 'None':
                fecha_existente = str(cliente.fecha_nacimiento) if cliente.fecha_nacimiento else None
                data_to_update['fecha_nacimiento'] = fecha_existente
                print(f"  - Fecha nacimiento no enviada o vacía, manteniendo: {fecha_existente}")
            else:
                print(f"  - Fecha nacimiento recibida y válida: {fecha_nacimiento_recibida}")
            
            # Usar ClienteUpdateSerializer para actualización
            serializer = ClienteUpdateSerializer(cliente, data=data_to_update, partial=True)
            
            if serializer.is_valid():
                print(f"  - Serializer válido, guardando...")
                print(f"  - Datos validados: {serializer.validated_data}")
                # Guardar cambios básicos del cliente
                cliente = serializer.save()
                print(f"  - Cliente guardado exitosamente")
                print(f"  - Cliente actualizado: {cliente.nombres} {cliente.apellidos}")
                print(f"  - Fecha nacimiento guardada: {cliente.fecha_nacimiento}")
                
                # Si se está cambiando el plan, asignarlo
                plan_id = request.data.get('plan_id')
                if plan_id:
                    try:
                        from planes_app.models import Plan
                        from clientes_planes_app.models import ClientePlan
                        
                        print(f"  - Asignando plan ID: {plan_id}")
                        # Verificar que el plan existe
                        plan = Plan.objects.get(id=plan_id, estado='activo')
                        
                        # Desactivar planes anteriores del cliente
                        planes_anteriores = ClientePlan.objects.filter(
                            id_cliente=cliente,
                            estado='activo'
                        )
                        print(f"  - Planes anteriores encontrados: {planes_anteriores.count()}")
                        planes_anteriores.update(estado='inactivo', fecha_fin=timezone.now().date())
                        
                        # Crear nueva asignación de plan
                        nuevo_plan = ClientePlan.objects.create(
                            id_cliente=cliente,
                            id_plan=plan,
                            fecha_inicio=timezone.now().date(),
                            estado='activo'
                        )
                        print(f"  - Nuevo plan asignado: {nuevo_plan.id}")
                        
                    except Plan.DoesNotExist:
                        print(f"  - ERROR: Plan no encontrado")
                        return Response({
                            'success': False,
                            'message': 'Plan no encontrado o inactivo'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    except Exception as e:
                        print(f"  - ERROR al asignar plan: {str(e)}")
                        import traceback
                        print(traceback.format_exc())
                        return Response({
                            'success': False,
                            'message': f'Error al asignar plan: {str(e)}'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                # Recargar el cliente desde la base de datos para obtener datos actualizados
                cliente.refresh_from_db()
                
                return Response({
                    'success': True,
                    'message': 'Cliente actualizado exitosamente',
                    'data': ClienteDetailSerializer(cliente).data
                }, status=status.HTTP_200_OK)
            else:
                print(f"  - ERROR: Serializer inválido")
                print(f"  - Errores: {serializer.errors}")
                return Response({
                    'success': False,
                    'message': 'Datos inválidos',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"🔧 ERROR en update cliente: {str(e)}")
            print(f"Traceback: {error_details}")
            return Response({
                'success': False,
                'message': f'Error al actualizar cliente: {str(e)}',
                'error_details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, *args, **kwargs):
        """Eliminar un cliente completamente de la base de datos"""
        try:
            cliente = self.get_object()
            cliente_id = cliente.id
            cedula_cliente = cliente.cedula
            email_cliente = cliente.email
            
            print(f"🗑️ DEBUG Eliminar Cliente:")
            print(f"  - Cliente ID: {cliente_id}")
            print(f"  - Cédula: {cedula_cliente}")
            print(f"  - Email: {email_cliente}")
            
            # Verificar que el cliente existe antes de eliminar
            if not Cliente.objects.filter(id=cliente_id).exists():
                return Response({
                    'success': False,
                    'message': 'Cliente no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Eliminar todas las relaciones primero usando SQL directo para asegurar eliminación completa
            print(f"  - Eliminando relaciones del cliente...")
            with connection.cursor() as cursor:
                # Eliminar todas las relaciones en orden (para evitar errores de FK)
                try:
                    cursor.execute("DELETE FROM notificaciones WHERE cliente_id = %s", [cliente_id])
                    print(f"    - Notificaciones eliminadas")
                except Exception as e:
                    print(f"    - Advertencia al eliminar notificaciones: {str(e)}")
                
                try:
                    cursor.execute("DELETE FROM clientes_planes WHERE id_cliente = %s", [cliente_id])
                    print(f"    - Clientes_planes eliminados")
                except Exception as e:
                    print(f"    - Advertencia al eliminar clientes_planes: {str(e)}")
                
                try:
                    cursor.execute("DELETE FROM pagos WHERE cliente_id = %s", [cliente_id])
                    print(f"    - Pagos eliminados")
                except Exception as e:
                    print(f"    - Advertencia al eliminar pagos: {str(e)}")
                
                try:
                    cursor.execute("DELETE FROM deudas WHERE cliente_id = %s", [cliente_id])
                    print(f"    - Deudas eliminadas")
                except Exception as e:
                    print(f"    - Advertencia al eliminar deudas: {str(e)}")
                
                # Finalmente, eliminar el cliente directamente con SQL
                print(f"  - Eliminando cliente de la tabla clientes...")
                cursor.execute("DELETE FROM clientes WHERE id = %s", [cliente_id])
                print(f"    - Cliente eliminado de la tabla clientes")
            
            # Verificar que el cliente fue eliminado usando SQL directo
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM clientes WHERE id = %s", [cliente_id])
                cliente_existe = cursor.fetchone()[0] > 0
                
                cursor.execute("SELECT COUNT(*) FROM clientes WHERE cedula = %s", [cedula_cliente])
                cedula_existe = cursor.fetchone()[0] > 0
                
                cursor.execute("SELECT COUNT(*) FROM clientes WHERE email = %s", [email_cliente])
                email_existe = cursor.fetchone()[0] > 0
            
            print(f"  - Cliente eliminado: {not cliente_existe}")
            print(f"  - Cédula eliminada: {not cedula_existe}")
            print(f"  - Email eliminado: {not email_existe}")
            
            if cliente_existe or cedula_existe:
                raise Exception(f"El cliente con ID {cliente_id} y cédula {cedula_cliente} no pudo ser eliminado completamente de la base de datos")
            
            return Response({
                'success': True,
                'message': 'Cliente eliminado exitosamente de la base de datos'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"🗑️ ERROR al eliminar cliente: {str(e)}")
            print(f"Traceback: {error_details}")
            return Response({
                'success': False,
                'message': f'Error al eliminar cliente: {str(e)}',
                'error_details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def deudas(self, request, pk=None):
        """Obtener información de deudas del cliente"""
        try:
            cliente = self.get_object()
            
            # Usar la vista normalizada para obtener información de deudas
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT estado_pago, meses_pendientes, monto_total_deuda,
                           fecha_ultimo_pago, fecha_vencimiento_pago
                    FROM clientes_deuda
                    WHERE id = %s
                """, [cliente.id])
                
                result = cursor.fetchone()
                if result:
                    deuda_data = {
                        'estado_pago': result[0],
                        'meses_pendientes': result[1],
                        'monto_total_deuda': float(result[2]) if result[2] else 0.0,
                        'fecha_ultimo_pago': result[3].isoformat() if result[3] else None,
                        'fecha_vencimiento_pago': result[4].isoformat() if result[4] else None
                    }
                else:
                    deuda_data = {
                        'estado_pago': 'sin_plan',
                        'meses_pendientes': 0,
                        'monto_total_deuda': 0.0,
                        'fecha_ultimo_pago': None,
                        'fecha_vencimiento_pago': None
                    }
            
            return Response({
                'success': True,
                'data': deuda_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener deudas: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['delete'])
    def eliminar_por_cedula(self, request):
        """Eliminar cliente por cédula directamente desde la base de datos"""
        try:
            cedula = request.query_params.get('cedula', '')
            if not cedula:
                return Response({
                    'success': False,
                    'message': 'Cédula no proporcionada'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Normalizar cédula
            import re
            cedula_limpia = re.sub(r'[^\d]', '', cedula)
            if len(cedula_limpia) < 10:
                cedula_limpia = cedula_limpia.zfill(10)
            
            print(f"🗑️ Eliminando cliente por cédula: {cedula_limpia}")
            
            with connection.cursor() as cursor:
                # Buscar el cliente por cédula
                cursor.execute("SELECT id, nombres, apellidos FROM clientes WHERE cedula = %s", [cedula_limpia])
                result = cursor.fetchone()
                
                if not result:
                    return Response({
                        'success': False,
                        'message': f'Cliente con cédula {cedula_limpia} no encontrado'
                    }, status=status.HTTP_404_NOT_FOUND)
                
                cliente_id = result[0]
                nombres = result[1]
                apellidos = result[2]
                print(f"  - Cliente encontrado: {nombres} {apellidos} (ID: {cliente_id})")
                
                # Eliminar todas las relaciones
                print(f"  - Eliminando relaciones...")
                cursor.execute("DELETE FROM notificaciones WHERE cliente_id = %s", [cliente_id])
                print(f"    - Notificaciones eliminadas")
                
                cursor.execute("DELETE FROM clientes_planes WHERE id_cliente = %s", [cliente_id])
                print(f"    - Clientes_planes eliminados")
                
                cursor.execute("DELETE FROM pagos WHERE cliente_id = %s", [cliente_id])
                print(f"    - Pagos eliminados")
                
                cursor.execute("DELETE FROM deudas WHERE cliente_id = %s", [cliente_id])
                print(f"    - Deudas eliminadas")
                
                # Eliminar el cliente
                cursor.execute("DELETE FROM clientes WHERE id = %s", [cliente_id])
                print(f"    - Cliente eliminado de la tabla clientes")
                
                # Verificar que fue eliminado
                cursor.execute("SELECT COUNT(*) FROM clientes WHERE cedula = %s", [cedula_limpia])
                count = cursor.fetchone()[0]
                
                if count > 0:
                    return Response({
                        'success': False,
                        'message': f'Error: El cliente con cédula {cedula_limpia} no pudo ser eliminado'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                print(f"  - ✅ Cliente eliminado exitosamente")
                
                return Response({
                    'success': True,
                    'message': f'Cliente con cédula {cedula_limpia} eliminado exitosamente de la base de datos'
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"🗑️ ERROR eliminando por cédula: {str(e)}")
            print(f"Traceback: {error_details}")
            return Response({
                'success': False,
                'message': f'Error al eliminar cliente: {str(e)}',
                'error_details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas generales de clientes"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_clientes,
                        COUNT(CASE WHEN estado = 'activo' THEN 1 END) as clientes_activos,
                        COUNT(CASE WHEN estado = 'inactivo' THEN 1 END) as clientes_inactivos,
                        COUNT(CASE WHEN estado = 'suspendido' THEN 1 END) as clientes_suspendidos
                    FROM clientes
                """)
                
                stats = cursor.fetchone()
                
                # Obtener estadísticas por sector
                cursor.execute("""
                    SELECT 
                        s.nombre_sector,
                        COUNT(c.id) as cantidad_clientes
                    FROM sectores s
                    LEFT JOIN clientes c ON s.id_sector = c.id_sector
                    GROUP BY s.id_sector, s.nombre_sector
                    ORDER BY cantidad_clientes DESC
                """)
                
                sectores_stats = []
                for row in cursor.fetchall():
                    sectores_stats.append({
                        'sector': row[0],
                        'cantidad_clientes': row[1]
                    })
                
                return Response({
                    'success': True,
                    'data': {
                        'total_clientes': stats[0],
                        'clientes_activos': stats[1],
                        'clientes_inactivos': stats[2],
                        'clientes_suspendidos': stats[3],
                        'sectores': sectores_stats
                    }
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener estadísticas: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def datos_selects(self, request):
        """Obtener datos para los selects de planes y sectores"""
        try:
            from sectores_app.models import Sector
            from planes_app.models import Plan
            from django.db.models import Q
            
            # Obtener sectores activos (estado = 'activo' o null para compatibilidad)
            sectores = Sector.objects.filter(
                Q(estado='activo') | Q(estado__isnull=True)
            ).values('id', 'nombre_sector').order_by('nombre_sector')
            
            # Obtener solo planes activos (estado = 'activo' o null para compatibilidad)
            planes = Plan.objects.filter(
                Q(estado='activo') | Q(estado__isnull=True)
            ).values('id', 'tipo_plan', 'precio', 'estado').order_by('precio')
            
            return Response({
                'success': True,
                'data': {
                    'sectores': list(sectores),
                    'planes': list(planes)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener datos de selects: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def asignar_plan(self, request, pk=None):
        """Asignar un plan a un cliente"""
        try:
            cliente = self.get_object()
            plan_id = request.data.get('plan_id')
            fecha_inicio = request.data.get('fecha_inicio')
            
            if not plan_id:
                return Response({
                    'success': False,
                    'message': 'Se requiere el ID del plan'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            from planes_app.models import Plan
            from clientes_planes_app.models import ClientePlan
            
            # Verificar que el plan existe
            try:
                plan = Plan.objects.get(id=plan_id, estado='activo')
            except Plan.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Plan no encontrado o inactivo'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Desactivar planes anteriores del cliente
            ClientePlan.objects.filter(
                id_cliente=cliente,
                estado='activo'
            ).update(estado='inactivo', fecha_fin=timezone.now().date())
            
            # Crear nueva asignación de plan
            if not fecha_inicio:
                fecha_inicio = timezone.now().date()
            
            cliente_plan = ClientePlan.objects.create(
                id_cliente=cliente,
                id_plan=plan,
                fecha_inicio=fecha_inicio,
                estado='activo'
            )
            
            return Response({
                'success': True,
                'message': f'Plan "{plan.tipo_plan}" asignado exitosamente al cliente',
                'data': {
                    'cliente_id': cliente.id,
                    'plan_id': plan.id,
                    'tipo_plan': plan.tipo_plan,
                    'precio': float(plan.precio),
                    'fecha_inicio': cliente_plan.fecha_inicio.isoformat()
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al asignar plan: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def plan_actual(self, request, pk=None):
        """Obtener el plan actual del cliente"""
        try:
            cliente = self.get_object()
            plan_actual = cliente.plan_actual
            
            if plan_actual:
                return Response({
                    'success': True,
                    'data': {
                        'plan_id': plan_actual.id_plan.id,
                        'tipo_plan': plan_actual.id_plan.tipo_plan,
                        'precio': float(plan_actual.id_plan.precio),
                        'fecha_inicio': plan_actual.fecha_inicio.isoformat(),
                        'fecha_fin': plan_actual.fecha_fin.isoformat() if plan_actual.fecha_fin else None,
                        'estado': plan_actual.estado
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': True,
                    'data': None,
                    'message': 'El cliente no tiene un plan asignado'
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener plan actual: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Vistas adicionales para funcionalidades específicas
@api_view(['GET'])
@permission_classes([AllowAny])
def buscar_cliente_cedula(request, cedula):
    """Buscar cliente por cédula"""
    try:
        cliente = get_object_or_404(Cliente, cedula=cedula)
        serializer = ClienteDetailSerializer(cliente)
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Cliente.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Cliente no encontrado'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def clientes_por_sector(request, id_sector):
    """Obtener clientes por sector"""
    try:
        clientes = Cliente.objects.filter(id_sector=id_sector).order_by('nombres')
        serializer = ClienteListSerializer(clientes, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def bulk_import_clientes(request):
    """Importar clientes masivamente desde CSV/JSON
    
    El CSV debe tener las columnas:
    - cedula (requerido): Cédula de identidad (10 dígitos)
    - email (requerido): Correo electrónico
    - nombres (requerido): Nombres del cliente
    - apellidos (requerido): Apellidos del cliente
    - telefono (requerido): Teléfono (10 dígitos)
    - sector (opcional): Nombre del sector (se crea automáticamente si no existe)
    - plan (opcional): Nombre del plan (se crea automáticamente si no existe con precio default)
    - precio (opcional): Precio del plan (solo se usa si se crea un nuevo plan)
    - fechanacimiento (opcional): Fecha de nacimiento (YYYY-MM-DD)
    - estado (opcional): Estado del cliente (activo/inactivo/suspendido)
    - direccion (opcional): Dirección del cliente
    """
    try:
        from django.utils import timezone
        from django.db import transaction
        from sectores_app.models import Sector
        from planes_app.models import Plan
        from clientes_planes_app.models import ClientePlan
        import re
        
        clientes_data = request.data.get('clientes', [])
        
        if not clientes_data:
            return Response({
                'success': False,
                'message': 'No se proporcionaron datos de clientes'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        created = []
        errors = []
        sectores_creados = []
        planes_creados = []
        
        # Obtener sectores y planes disponibles (cache en memoria para mejor rendimiento)
        sectores_cache = {}
        planes_cache = {}
        
        def get_or_create_sector(nombre):
            """Obtiene o crea un sector por nombre"""
            nombre_lower = nombre.lower().strip()
            if nombre_lower in sectores_cache:
                return sectores_cache[nombre_lower]
            
            # Buscar en BD
            sector = Sector.objects.filter(nombre_sector__iexact=nombre).first()
            if sector:
                sectores_cache[nombre_lower] = sector
                return sector
            
            # Crear nuevo sector
            sector = Sector.objects.create(
                nombre_sector=nombre.strip().title(),
                descripcion=f"Sector creado automáticamente durante importación",
                estado='activo'
            )
            sectores_cache[nombre_lower] = sector
            sectores_creados.append(sector.nombre_sector)
            return sector
        
        def get_or_create_plan(nombre, precio=None):
            """Obtiene o crea un plan por nombre con precio opcional"""
            nombre_lower = nombre.lower().strip()
            if nombre_lower in planes_cache:
                return planes_cache[nombre_lower]
            
            # Buscar en BD (buscar en cualquier estado para poder reactivarlo)
            plan = Plan.objects.filter(tipo_plan__iexact=nombre).first()
            if plan:
                # Si estaba inactivo, activarlo
                if plan.estado != 'activo':
                    plan.estado = 'activo'
                    plan.save()
                planes_cache[nombre_lower] = plan
                return plan
            
            # Crear nuevo plan con precio default si no se especifica
            precio_default = float(precio) if precio and str(precio).replace('.', '').replace('-', '').isdigit() else 25.00
            plan = Plan.objects.create(
                tipo_plan=nombre.strip().title(),
                precio=precio_default,
                descripcion=f"Plan creado automáticamente durante importación",
                estado='activo'
            )
            planes_cache[nombre_lower] = plan
            planes_creados.append({'nombre': plan.tipo_plan, 'precio': float(plan.precio)})
            return plan
        
        with transaction.atomic():
            for idx, cliente_data in enumerate(clientes_data):
                row_number = idx + 1
                
                try:
                    # Normalizar datos
                    cedula = str(cliente_data.get('cedula', '')).strip()
                    email = str(cliente_data.get('email', '')).strip().lower()
                    nombres = str(cliente_data.get('nombres', '')).strip()
                    apellidos = str(cliente_data.get('apellidos', '')).strip()
                    telefono = str(cliente_data.get('telefono', '')).strip()
                    sector_nombre = str(cliente_data.get('sector', '')).strip()
                    plan_nombre = str(cliente_data.get('plan', '')).strip()
                    plan_precio = cliente_data.get('precio')
                    direccion = str(cliente_data.get('direccion', '')).strip() or 'Sin dirección'
                    estado = str(cliente_data.get('estado', 'activo')).strip().lower()
                    fecha_nacimiento = cliente_data.get('fechanacimiento') or cliente_data.get('fecha_nacimiento')
                    
                    # Validar campos requeridos
                    if not cedula or not email or not nombres or not apellidos:
                        errors.append({
                            'row': row_number,
                            'data': cliente_data,
                            'error': 'Faltan campos requeridos: cédula, email, nombres o apellidos'
                        })
                        continue
                    
                    # Validar email básico
                    if '@' not in email or '.' not in email.split('@')[-1]:
                        errors.append({
                            'row': row_number,
                            'data': cliente_data,
                            'error': f'Email inválido: {email}'
                        })
                        continue
                    
                    # Normalizar cédula
                    cedula_limpia = re.sub(r'[^\d]', '', cedula)
                    if len(cedula_limpia) < 10:
                        cedula_limpia = cedula_limpia.zfill(10)
                    elif len(cedula_limpia) > 10:
                        errors.append({
                            'row': row_number,
                            'data': cliente_data,
                            'error': f'Cédula inválida (más de 10 dígitos): {cedula}'
                        })
                        continue
                    
                    # Verificar si ya existe cliente con esta cédula
                    if Cliente.objects.filter(cedula=cedula_limpia).exists():
                        errors.append({
                            'row': row_number,
                            'data': cliente_data,
                            'error': f'Ya existe un cliente con cédula {cedula_limpia}'
                        })
                        continue
                    
                    # Verificar si ya existe cliente con este email
                    if Cliente.objects.filter(email__iexact=email).exists():
                        errors.append({
                            'row': row_number,
                            'data': cliente_data,
                            'error': f'Ya existe un cliente con email {email}'
                        })
                        continue
                    
                    # Procesar sector (crear si no existe)
                    id_sector = None
                    if sector_nombre:
                        sector = get_or_create_sector(sector_nombre)
                        id_sector = sector.id
                    
                    # Procesar plan (crear si no existe)
                    plan_obj = None
                    if plan_nombre:
                        plan_obj = get_or_create_plan(plan_nombre, plan_precio)
                    
                    # Procesar fecha de nacimiento
                    if fecha_nacimiento:
                        try:
                            from datetime import datetime
                            if isinstance(fecha_nacimiento, str):
                                fecha_nacimiento = datetime.strptime(str(fecha_nacimiento)[:10], '%Y-%m-%d').date()
                        except:
                            fecha_nacimiento = timezone.now().date() - timedelta(days=365*25)
                    else:
                        fecha_nacimiento = timezone.now().date() - timedelta(days=365*25)
                    
                    # Validar estado
                    if estado not in ['activo', 'inactivo', 'suspendido']:
                        estado = 'activo'
                    
                    # Crear cliente
                    nuevo_cliente = Cliente.objects.create(
                        cedula=cedula_limpia,
                        nombres=nombres,
                        apellidos=apellidos,
                        email=email,
                        telefono=re.sub(r'[^\d]', '', telefono)[:10] or '0000000000',
                        direccion=direccion,
                        fecha_nacimiento=fecha_nacimiento,
                        estado=estado,
                        id_sector_id=id_sector
                    )
                    
                    # Asignar plan si existe
                    if plan_obj:
                        ClientePlan.objects.create(
                            id_cliente=nuevo_cliente,
                            id_plan=plan_obj,
                            fecha_inicio=timezone.now().date(),
                            estado='activo'
                        )
                    
                    created.append({
                        'row': row_number,
                        'cedula': cedula_limpia,
                        'nombres': f'{nombres} {apellidos}',
                        'email': email,
                        'sector': sector_nombre if sector_nombre else 'Sin sector',
                        'plan': plan_obj.tipo_plan if plan_obj else 'Sin plan'
                    })
                    
                except Exception as e:
                    import traceback
                    errors.append({
                        'row': row_number,
                        'data': cliente_data,
                        'error': f'{str(e)}'
                    })
        
        # Preparar respuesta con información de elementos creados
        resumen = {
            'total_procesados': len(clientes_data),
            'clientes_creados': len(created),
            'errores': len(errors),
            'sectores_creados': len(set(sectores_creados)),
            'planes_creados': len(set([p['nombre'] for p in planes_creados])),
            'nuevos_sectores': list(set(sectores_creados)),
            'nuevos_planes': [{'nombre': p['nombre'], 'precio': p['precio']} for p in planes_creados]
        }
        
        return Response({
            'success': True,
            'message': f'Importación completada: {len(created)} clientes creados, {len(errors)} errores',
            'resumen': resumen,
            'created': created[:100],  # Limitar a 100 para no sobrecargar la respuesta
            'errors': errors[:100]
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        return Response({
            'success': False,
            'message': f'Error en la importación: {str(e)}',
            'error_details': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        import traceback
        return Response({
            'success': False,
            'message': f'Error en la importación: {str(e)}',
            'error_details': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
