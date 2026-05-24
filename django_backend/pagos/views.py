from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
from datetime import datetime, date, timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.http import HttpResponse
from clientes.serializers import ClienteDeudasSerializer
from clientes.models import Cliente
import json
import os
# from reportlab.lib.pagesizes import letter
# from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
# from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
# from reportlab.lib.units import inch
# from reportlab.lib import colors
# from reportlab.pdfgen import canvas
from io import BytesIO
from .cache_utils import get_cached_stats, set_cached_stats, get_deudas_stats_cache_key, get_pagos_stats_cache_key, invalidate_deudas_cache
from .reportes import ReporteGenerator

# Importaciones opcionales para generación de PDFs
WEASYPRINT_AVAILABLE = False
HTML = None
CSS = None
FontConfiguration = None

def _check_weasyprint():
    """Verificar si WeasyPrint está disponible y configurar variables de entorno si es necesario"""
    global WEASYPRINT_AVAILABLE, HTML, CSS, FontConfiguration
    
    # Si ya está disponible, no hacer nada
    if WEASYPRINT_AVAILABLE and HTML is not None:
        return True
    
    # Configurar variables de entorno para macOS si es necesario
    import sys
    import os
    if sys.platform == 'darwin':  # macOS
        homebrew_prefix = '/opt/homebrew'
        if os.path.exists(homebrew_prefix):
            # Forzar actualización de variables de entorno (no solo setdefault)
            current_pkg_config = os.environ.get('PKG_CONFIG_PATH', '')
            if homebrew_prefix not in current_pkg_config:
                os.environ['PKG_CONFIG_PATH'] = f'{homebrew_prefix}/lib/pkgconfig:{current_pkg_config}'
            
            current_dyld = os.environ.get('DYLD_LIBRARY_PATH', '')
            if homebrew_prefix not in current_dyld:
                os.environ['DYLD_LIBRARY_PATH'] = f'{homebrew_prefix}/lib:{current_dyld}' if current_dyld else f'{homebrew_prefix}/lib'
            
            current_path = os.environ.get('PATH', '')
            if f'{homebrew_prefix}/bin' not in current_path:
                os.environ['PATH'] = f'{homebrew_prefix}/bin:{current_path}'
    
    try:
        # type: ignore[reportMissingImports] - WeasyPrint es una dependencia opcional
        from weasyprint import HTML as HTML_Module, CSS as CSS_Module  # type: ignore[reportMissingImports]
        from weasyprint.text.fonts import FontConfiguration as FontConfig_Module  # type: ignore[reportMissingImports]
        
        # Actualizar las variables globales
        WEASYPRINT_AVAILABLE = True
        HTML = HTML_Module
        CSS = CSS_Module
        FontConfiguration = FontConfig_Module
        print("✅ WeasyPrint está disponible y funcionando")
        return True
    except ImportError as e:
        WEASYPRINT_AVAILABLE = False
        print(f"⚠️ WeasyPrint no está disponible (ImportError): {str(e)}")
        print("   Para instalar: pip install weasyprint")
        print("   En macOS también necesitas: brew install cairo pango gdk-pixbuf gobject-introspection")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        WEASYPRINT_AVAILABLE = False
        print(f"⚠️ Error al importar WeasyPrint: {str(e)}")
        print("   Verifica que las dependencias del sistema estén instaladas.")
        import traceback
        traceback.print_exc()
        return False

# Intentar importar al cargar el módulo (pero puede fallar si las variables de entorno no están configuradas)
# Esto está bien, intentaremos de nuevo cuando se necesite generar el PDF
try:
    _check_weasyprint()
except Exception as e:
    print(f"⚠️ No se pudo cargar WeasyPrint al inicio: {str(e)}")
    print("   Se intentará cargar cuando sea necesario.")

# Create your views here.

@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_pago(request, pago_id):
    """Eliminar un pago específico"""
    try:
        with connection.cursor() as cursor:
            # Verificar si el pago existe
            cursor.execute("SELECT id, cliente_id, monto, concepto FROM pagos WHERE id = %s", [pago_id])
            pago = cursor.fetchone()
            
            if not pago:
                return Response({
                    'success': False,
                    'message': 'Pago no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Eliminar el pago
            cursor.execute("DELETE FROM pagos WHERE id = %s", [pago_id])
            
            # Actualizar deudas automáticamente después de eliminar el pago
            actualizar_deudas_automaticamente(cursor, pago[1])  # pago[1] es el cliente_id
            
            # Invalidar caché de estadísticas
            invalidate_deudas_cache()
            
            return Response({
                'success': True,
                'message': f'Pago eliminado exitosamente',
                'data': {
                    'id': pago[0],
                    'cliente_id': pago[1],
                    'monto': float(pago[2]) if pago[2] else 0,
                    'concepto': pago[3]
                }
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al eliminar el pago: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_pagos(request):
    """Listar todos los pagos con paginación"""
    try:
        # Parámetros de paginación
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 50))
        search = request.GET.get('search', '')
        metodo_pago = request.GET.get('metodo_pago', '')
        estado = request.GET.get('estado', '')
        
        # Validar parámetros
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 200:
            page_size = 50
            
        offset = (page - 1) * page_size
        
        with connection.cursor() as cursor:
            # Construir consulta base con filtros
            base_query = """
                SELECT p.id, p.cliente_id, p.monto, p.fecha_pago, p.concepto, p.metodo_pago, p.estado, 
                       p.comprobante_enviado, p.numero_comprobante, p.fecha_creacion,
                       c.nombres, c.apellidos, c.cedula
                FROM pagos p
                LEFT JOIN clientes c ON p.cliente_id = c.id
                WHERE 1=1
            """
            params = []
            
            # Agregar filtros si están presentes
            if search:
                base_query += " AND (p.concepto ILIKE %s OR p.numero_comprobante ILIKE %s OR c.nombres ILIKE %s OR c.apellidos ILIKE %s OR c.cedula ILIKE %s)"
                search_param = f'%{search}%'
                params.extend([search_param, search_param, search_param, search_param, search_param])
            
            if metodo_pago:
                base_query += " AND p.metodo_pago = %s"
                params.append(metodo_pago)
                
            if estado:
                base_query += " AND p.estado = %s"
                params.append(estado)
            
            # Consulta para contar total de registros
            count_query = f"SELECT COUNT(*) FROM ({base_query}) as subquery"
            cursor.execute(count_query, params)
            total_count = cursor.fetchone()[0]
            
            # Consulta principal con paginación
            query = base_query + " ORDER BY p.fecha_pago DESC LIMIT %s OFFSET %s"
            params.extend([page_size, offset])
            
            cursor.execute(query, params)
            pagos = []
            for row in cursor.fetchall():
                pagos.append({
                    'id': row[0],
                    'cliente_id': row[1],
                    'monto': float(row[2]) if row[2] is not None else 0,
                    'fecha_pago': row[3].isoformat() if row[3] else None,
                    'concepto': row[4],
                    'metodo_pago': row[5],
                    'estado': row[6],
                    'comprobante_enviado': row[7],
                    'numero_comprobante': row[8],
                    'fecha_creacion': row[9].isoformat() if row[9] else None,
                    'cliente_nombre': f"{row[10]} {row[11]}" if row[10] and row[11] else "Cliente no encontrado",
                    'cliente_cedula': row[12] if row[12] else ""
                })
        
        # Calcular información de paginación
        total_pages = (total_count + page_size - 1) // page_size
        has_next = page < total_pages
        has_previous = page > 1
        
        return Response({
            'success': True,
            'data': pagos,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': total_pages,
                'has_next': has_next,
                'has_previous': has_previous,
                'next_page': page + 1 if has_next else None,
                'previous_page': page - 1 if has_previous else None
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def create_pago(request):
    """Crear nuevo pago (método legacy - mantener para compatibilidad)"""
    # Llamar directamente a la lógica sin pasar por el decorador nuevamente
    return _create_pago_logic(request)

def _create_pago_logic(request):
    """Lógica compartida para crear pagos (sin decoradores)"""
    try:
        cliente_id = request.data.get('cliente_id')
        monto = request.data.get('monto')
        metodo_pago = request.data.get('metodo_pago', 'efectivo')
        concepto = request.data.get('concepto', 'Pago de servicio')
        meses_seleccionados = request.data.get('meses_seleccionados', [])  # Lista de meses específicos
        fecha_pago = request.data.get('fecha_pago', datetime.now().strftime('%Y-%m-%d'))
        
        if not cliente_id or not monto:
            return Response({
                'success': False,
                'message': 'Cliente ID y monto son requeridos'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with connection.cursor() as cursor:
            # Obtener información del cliente
            cursor.execute("""
                SELECT nombres, apellidos, cedula, fecha_registro
                FROM clientes WHERE id = %s
            """, [cliente_id])
            cliente_data = cursor.fetchone()
            
            if not cliente_data:
                return Response({
                    'success': False,
                    'message': 'Cliente no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Obtener el plan del cliente desde la tabla clientes_planes
            cursor.execute("""
                SELECT p.tipo_plan, p.precio, cp.estado
                FROM clientes_planes cp
                JOIN planes p ON cp.id_plan = p.id_plan
                WHERE cp.id_cliente = %s AND cp.estado = 'activo'
                ORDER BY cp.fecha_inicio DESC
                LIMIT 1
            """, [cliente_id])
            
            plan_data = cursor.fetchone()
            
            if plan_data and len(plan_data) >= 2:
                precio_plan = float(plan_data[1])
                tipo_plan = str(plan_data[0]) if plan_data[0] else "Plan sin nombre"
            else:
                precio_plan = 0.0
                tipo_plan = "Sin plan activo"
            
            # Si no se especifican meses, usar el método tradicional
            if not meses_seleccionados:
                meses = request.data.get('meses', 1)
                
                # Verificar que el cliente tenga un plan válido
                if precio_plan <= 0:
                    return Response({
                        'success': False,
                        'message': 'El cliente no tiene un plan válido asignado. No se puede crear el pago.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                monto_total = precio_plan * meses
                
                # Generar número de comprobante
                numero_comprobante = generar_numero_comprobante(cursor)
                
                # Actualizar concepto
                if meses > 1 and 'mes' not in concepto.lower():
                    concepto = f"{concepto} ({meses} meses)"
                
                cursor.execute("""
                    INSERT INTO pagos (cliente_id, monto, fecha_pago, metodo_pago, concepto, estado, 
                                     comprobante_enviado, numero_comprobante, fecha_creacion)
                    VALUES (%s, %s, %s, %s, %s, 'completado', false, %s, NOW())
                    RETURNING id
                """, [cliente_id, monto_total, fecha_pago, metodo_pago, concepto, numero_comprobante])
                pago_id = cursor.fetchone()[0]
                
                pagos_creados = [{
                    'id': pago_id,
                    'numero_comprobante': numero_comprobante,
                    'meses': meses,
                    'monto': monto_total
                }]
            else:
                # Verificar que el cliente tenga un plan válido
                if precio_plan <= 0:
                    return Response({
                        'success': False,
                        'message': 'El cliente no tiene un plan válido asignado. No se puede crear el pago.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Validar que el monto coincida con los meses seleccionados
                monto_esperado = precio_plan * len(meses_seleccionados)
                if abs(float(monto) - monto_esperado) > 0.01:  # Tolerancia para decimales
                    return Response({
                        'success': False,
                        'message': f'El monto debe ser ${monto_esperado:.2f} para {len(meses_seleccionados)} mes(es) seleccionado(s)'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Verificar meses ya pagados
                meses_ya_pagados = verificar_meses_ya_pagados(cursor, cliente_id, meses_seleccionados)
                if meses_ya_pagados:
                    return Response({
                        'success': False,
                        'message': f'Los siguientes meses ya están pagados: {", ".join(meses_ya_pagados)}',
                        'meses_ya_pagados': meses_ya_pagados
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Crear pagos individuales para cada mes
                pagos_creados = []
                for mes_info in meses_seleccionados:
                    año = mes_info.get('año', datetime.now().year)
                    mes = mes_info.get('mes')
                    nombre_mes = mes_info.get('nombre_mes', obtener_nombre_mes(mes))
                    
                    # Generar número de comprobante único para cada mes
                    numero_comprobante = generar_numero_comprobante(cursor)
                    
                    concepto_mes = f"Pago mensual - {nombre_mes} {año} - {tipo_plan}"
                    
                    cursor.execute("""
                        INSERT INTO pagos (cliente_id, monto, fecha_pago, metodo_pago, concepto, estado, 
                                         comprobante_enviado, numero_comprobante, fecha_creacion)
                        VALUES (%s, %s, %s, %s, %s, 'completado', false, %s, NOW())
                        RETURNING id
                    """, [cliente_id, precio_plan, fecha_pago, metodo_pago, concepto_mes, numero_comprobante])
                    pago_id = cursor.fetchone()[0]
                    
                    pagos_creados.append({
                        'id': pago_id,
                        'numero_comprobante': numero_comprobante,
                        'mes': mes,
                        'año': año,
                        'nombre_mes': nombre_mes,
                        'monto': precio_plan
                    })
            
            # Actualizar deudas automáticamente después de crear pagos (dentro del bloque with)
            actualizar_deudas_automaticamente(cursor, cliente_id)
        
        # Invalidar caché de estadísticas después de crear pagos
        invalidate_deudas_cache()
        
        # Log para indicar que se registró un pago
        print(f"✅ Pago registrado para cliente {cliente_id} - Monto: ${monto}")
        
        return Response({
            'success': True,
            'message': f'Pago(s) registrado(s) exitosamente - {len(pagos_creados)} mes(es)',
            'data': {
                'pagos_creados': pagos_creados,
                'total_pagos': len(pagos_creados),
                'monto_total': float(monto),
                'cliente': {
                    'nombres': cliente_data[0],
                    'apellidos': cliente_data[1],
                    'cedula': cliente_data[2],
                    'fecha_registro': str(cliente_data[3]) if cliente_data[3] else None,
                    'tipo_plan': tipo_plan,
                    'precio_plan': precio_plan
                }
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"❌ Error al crear pago: {str(e)}")
        print(f"Traceback completo:\n{error_trace}")
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def create_pago_flexible(request):
    """Crear nuevo pago con selección flexible de meses"""
    return _create_pago_logic(request)

def generar_numero_comprobante(cursor):
    """Generar número de comprobante único"""
    cursor.execute("SELECT COUNT(*) FROM pagos WHERE DATE(fecha_creacion) = CURRENT_DATE")
    count_hoy = cursor.fetchone()[0]
    
    numero_secuencial = count_hoy + 1
    numero_comprobante = f"TELTEC-{datetime.now().strftime('%Y%m%d')}-{numero_secuencial:05d}"
    
    # Verificar que el número de comprobante no exista
    cursor.execute("SELECT id FROM pagos WHERE numero_comprobante = %s", [numero_comprobante])
    if cursor.fetchone():
        # Si existe, generar uno con timestamp
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        numero_comprobante = f"TELTEC-{timestamp}-{numero_secuencial:05d}"
    
    return numero_comprobante

def verificar_meses_ya_pagados(cursor, cliente_id, meses_seleccionados):
    """Verificar qué meses ya están pagados"""
    meses_ya_pagados = []
    
    for mes_info in meses_seleccionados:
        año = mes_info.get('año', datetime.now().year)
        mes = mes_info.get('mes')
        nombre_mes = mes_info.get('nombre_mes', obtener_nombre_mes(mes))
        
        # Buscar pagos existentes para este mes y año usando múltiples patrones
        patrones_busqueda = [
            f"%{nombre_mes} {año}%",
            f"%{nombre_mes.lower()} {año}%",
            f"%{nombre_mes.upper()} {año}%",
            f"%{mes:02d}/{año}%",
            f"%{mes}/{año}%"
        ]
        
        ya_pagado = False
        for patron in patrones_busqueda:
            cursor.execute("""
                SELECT id FROM pagos 
                WHERE cliente_id = %s 
                AND concepto ILIKE %s
                AND estado = 'completado'
            """, [cliente_id, patron])
            
            if cursor.fetchone():
                ya_pagado = True
                break
        
        if ya_pagado:
            meses_ya_pagados.append(f"{nombre_mes} {año}")
    
    return meses_ya_pagados

def obtener_nombre_mes(numero_mes):
    """Obtener nombre del mes a partir del número"""
    meses = {
        1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
        7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
    }
    return meses.get(numero_mes, f'Mes {numero_mes}')

def obtener_plan_cliente(cursor, cliente_id):
    """Obtener el plan actual de un cliente desde la tabla clientes_planes"""
    try:
        print(f"🔍 [Helper] Buscando plan para cliente {cliente_id}...")  # Debug
        
        # Primero verificar si el cliente existe en clientes_planes
        cursor.execute("""
            SELECT COUNT(*) FROM clientes_planes WHERE id_cliente = %s
        """, [cliente_id])
        count_planes = cursor.fetchone()[0]
        print(f"📊 [Helper] Cliente {cliente_id} tiene {count_planes} planes asignados")  # Debug
        
        if count_planes == 0:
            print(f"⚠️ [Helper] Cliente {cliente_id} no tiene planes asignados")  # Debug
            return {
                'tipo_plan': 'Sin plan asignado',
                'precio': 0.0
            }
        
        # Obtener todos los planes del cliente
        cursor.execute("""
            SELECT p.tipo_plan, p.precio, cp.estado, cp.fecha_inicio
            FROM clientes_planes cp
            JOIN planes p ON cp.id_plan = p.id_plan
            WHERE cp.id_cliente = %s
            ORDER BY cp.fecha_inicio DESC
        """, [cliente_id])
        
        all_planes = cursor.fetchall()
        print(f"📋 [Helper] Todos los planes del cliente {cliente_id}: {all_planes}")  # Debug
        
        # Buscar plan activo
        plan_activo = None
        for plan in all_planes:
            if plan[2] == 'activo':  # estado
                plan_activo = plan
                break
        
        if plan_activo:
            result = {
                'tipo_plan': str(plan_activo[0]) if plan_activo[0] else "Plan sin nombre",
                'precio': float(plan_activo[1])
            }
            print(f"✅ [Helper] Plan activo encontrado: {result}")  # Debug
            return result
        else:
            print(f"⚠️ [Helper] Cliente {cliente_id} no tiene plan activo")  # Debug
            return {
                'tipo_plan': 'Sin plan activo',
                'precio': 0.0
            }
            
    except Exception as e:
        print(f"❌ [Helper] Error obteniendo plan del cliente {cliente_id}: {e}")
        return {
            'tipo_plan': 'Error al obtener plan',
            'precio': 0.0
        }

@api_view(['GET'])
@permission_classes([AllowAny])
def get_meses_disponibles_cliente(request, cliente_id):
    """Obtener meses disponibles para pago de un cliente"""
    try:
        with connection.cursor() as cursor:
            # Obtener información del cliente
            cursor.execute("""
                SELECT nombres, apellidos, cedula, fecha_registro
                FROM clientes WHERE id = %s
            """, [cliente_id])
            cliente_data = cursor.fetchone()
            
            if not cliente_data:
                return Response({
                    'success': False,
                    'message': 'Cliente no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
            
            fecha_registro = cliente_data[3]
            # Obtener el plan del cliente desde la tabla clientes_planes
            print(f"🔍 [Meses] Buscando plan para cliente {cliente_id}...")  # Debug
            
            # Primero verificar si el cliente existe en clientes_planes
            cursor.execute("""
                SELECT COUNT(*) FROM clientes_planes WHERE id_cliente = %s
            """, [cliente_id])
            count_planes = cursor.fetchone()[0]
            print(f"📊 [Meses] Cliente {cliente_id} tiene {count_planes} planes asignados")  # Debug
            
            tipo_plan = "Sin plan activo"
            if count_planes == 0:
                print(f"⚠️ [Meses] Cliente {cliente_id} no tiene planes asignados")  # Debug
                precio_plan = 0.0
            else:
                # Obtener el plan activo del cliente
                cursor.execute("""
                    SELECT p.tipo_plan, p.precio, cp.estado
                    FROM clientes_planes cp
                    JOIN planes p ON cp.id_plan = p.id_plan
                    WHERE cp.id_cliente = %s AND cp.estado = 'activo'
                    ORDER BY cp.fecha_inicio DESC
                    LIMIT 1
                """, [cliente_id])
                
                plan_data = cursor.fetchone()
                print(f"📋 [Meses] Plan activo del cliente {cliente_id}: {plan_data}")  # Debug
                
                if plan_data and plan_data[0] and plan_data[1] is not None:
                    tipo_plan = str(plan_data[0])
                    precio_plan = float(plan_data[1])
                    print(f"✅ [Meses] Plan activo encontrado: {tipo_plan} - ${precio_plan}")  # Debug
                else:
                    tipo_plan = "Sin plan activo"
                    precio_plan = 0.0
                    print(f"⚠️ [Meses] Cliente {cliente_id} no tiene plan activo válido")  # Debug
            
            # Ya no necesitamos obtener todos los pagos, usaremos consultas individuales
            pass
            
            # Generar lista de meses disponibles (desde 2023 hasta próximos 6 meses)
            meses_disponibles = []
            fecha_actual = datetime.now()
            año_actual = fecha_actual.year
            mes_actual = fecha_actual.month
            
            # Meses pasados (desde 2023 hasta el mes actual)
            # Calcular el año de inicio dinámicamente (máximo 3 años hacia atrás desde el año actual)
            año_inicio = max(2023, año_actual - 3)
            fecha_inicio = datetime(año_inicio, 1, 1)
            fecha_fin = fecha_actual.replace(day=1)  # Primer día del mes actual
            
            # Convertir a datetime sin timezone para comparación
            fecha_inicio = fecha_inicio.replace(tzinfo=None)
            fecha_fin = fecha_fin.replace(tzinfo=None)
            
            fecha_actual_iter = fecha_inicio
            while fecha_actual_iter <= fecha_fin:
                año = fecha_actual_iter.year
                mes = fecha_actual_iter.month
                nombre_mes = obtener_nombre_mes(mes)
                
                # Verificar si ya está pagado usando SQL directo
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM pagos 
                    WHERE cliente_id = %s 
                    AND estado = 'completado'
                    AND concepto ILIKE %s
                """, [cliente_id, f"%{nombre_mes} {año}%"])
                ya_pagado = cursor.fetchone()[0] > 0
                
                meses_disponibles.append({
                    'año': año,
                    'mes': mes,
                    'nombre_mes': nombre_mes,
                    'ya_pagado': ya_pagado,
                    'monto': precio_plan,
                    'fecha_limite': fecha_actual_iter.replace(day=5).strftime('%Y-%m-%d')  # Día 5 del mes
                })
                
                # Avanzar al siguiente mes
                if fecha_actual_iter.month == 12:
                    fecha_actual_iter = fecha_actual_iter.replace(year=fecha_actual_iter.year + 1, month=1)
                else:
                    fecha_actual_iter = fecha_actual_iter.replace(month=fecha_actual_iter.month + 1)
            
            # Agregar próximos 6 meses
            for i in range(1, 7):
                if mes_actual + i > 12:
                    año = año_actual + 1
                    mes = mes_actual + i - 12
                else:
                    año = año_actual
                    mes = mes_actual + i
                
                nombre_mes = obtener_nombre_mes(mes)
                fecha_limite = datetime(año, mes, 5)
                
                meses_disponibles.append({
                    'año': año,
                    'mes': mes,
                    'nombre_mes': nombre_mes,
                    'ya_pagado': False,
                    'monto': precio_plan,
                    'fecha_limite': fecha_limite.strftime('%Y-%m-%d')
                })
        
        return Response({
            'success': True,
            'data': {
                'cliente': {
                    'id': cliente_id,
                    'nombres': cliente_data[0],
                    'apellidos': cliente_data[1],
                    'cedula': cliente_data[2],
                    'tipo_plan': tipo_plan,
                    'precio_plan': precio_plan
                },
                    'meses_disponibles': meses_disponibles,
                    'total_meses_disponibles': len([m for m in meses_disponibles if not m['ya_pagado']]),
                    'total_meses_pagados': len([m for m in meses_disponibles if m['ya_pagado']])
            }
            }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def generar_comprobante_pdf(pago_data, cliente_data, empresa_data=None):
    """Generar comprobante de pago en PDF usando WeasyPrint"""
    if empresa_data is None:
        empresa_data = {
            'nombre': 'TELTEC NET',
            'direccion': 'Cañar - Sisid',
            'telefono': '0984517703',
            'email': 'teltecnet@outlook.com',
            'ruc': '1234567890001'
        }
    
    # Formatear estado del pago
    estado_display = {
        'completado': 'COMPLETADO',
        'pendiente': 'PENDIENTE',
        'fallido': 'FALLIDO'
    }.get(pago_data.get('estado', 'completado'), 'COMPLETADO')
    
    # Formatear método de pago
    metodo_display = {
        'efectivo': 'Efectivo',
        'transferencia': 'Transferencia Bancaria',
        'deposito': 'Depósito',
        'tarjeta': 'Tarjeta de Crédito/Débito',
        'pago_online': 'Pago en Línea'
    }.get(pago_data.get('metodo_pago', ''), pago_data.get('metodo_pago', '').title())
    
    from django.utils import timezone
    fecha_generacion = timezone.now().strftime('%d/%m/%Y %H:%M:%S')
    
    # Crear HTML del comprobante compacto (una sola hoja A4)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Comprobante de Pago - {pago_data['numero_comprobante']}</title>
        <style>
            @page {{ size: A4; margin: 10mm; }}
            body {{ font-family: 'Helvetica', 'Arial', sans-serif; margin: 0; padding: 0; font-size: 11px; }}
            .comprobante {{ max-width: 190mm; margin: 0 auto; padding: 10px; }}
            .header {{ display: flex; justify-content: space-between; border-bottom: 3px solid #1a73e8; padding-bottom: 10px; margin-bottom: 15px; }}
            .company-title {{ font-size: 20px; font-weight: bold; color: #1a73e8; margin: 0; }}
            .company-ruc {{ font-size: 10px; color: #666; margin: 2px 0 0 0; }}
            .company-details {{ font-size: 9px; color: #888; margin-top: 4px; }}
            .doc-info {{ text-align: right; padding: 8px 12px; background: #f0f4f8; border-radius: 4px; }}
            .doc-type {{ font-size: 14px; font-weight: bold; color: #1a73e8; margin: 0; }}
            .doc-number {{ font-size: 12px; color: #333; font-family: monospace; }}
            .status-badge {{ display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 9px; font-weight: bold; margin-top: 4px; background: #28a745; color: white; }}
            .main-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }}
            .section {{ background: #f8f9fa; padding: 10px; border-radius: 4px; }}
            .section-title {{ font-size: 11px; font-weight: bold; color: #1a73e8; margin: 0 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #e0e0e0; }}
            .info-row {{ display: flex; justify-content: space-between; margin-bottom: 4px; }}
            .info-label {{ font-weight: bold; color: #555; }}
            .info-value {{ color: #333; }}
            .amount-box {{ background: linear-gradient(135deg, #1a73e8, #1557b0); color: white; padding: 15px; border-radius: 6px; text-align: center; margin: 15px 0; }}
            .amount-label {{ font-size: 11px; opacity: 0.9; }}
            .amount-value {{ font-size: 28px; font-weight: bold; margin: 5px 0; }}
            .amount-concept {{ font-size: 10px; opacity: 0.8; }}
            .barcode {{ font-family: monospace; font-size: 9px; text-align: center; color: #666; margin: 10px 0; }}
            .footer {{ margin-top: 15px; padding-top: 10px; border-top: 1px solid #e0e0e0; }}
            .footer-message {{ background: #e8f5e9; border: 1px solid #c8e6c9; padding: 8px; border-radius: 4px; text-align: center; margin-bottom: 10px; }}
            .footer-message p {{ margin: 0; color: #2e7d32; font-size: 10px; }}
            .signatures {{ display: flex; justify-content: space-around; margin: 15px 0; }}
            .sig-box {{ width: 40%; text-align: center; }}
            .sig-line {{ border-top: 1px solid #999; margin-bottom: 4px; }}
            .sig-label {{ font-size: 9px; color: #888; }}
            .contact {{ font-size: 9px; color: #666; text-align: center; padding: 8px; background: #f5f5f5; border-radius: 4px; }}
            .meta {{ font-size: 8px; color: #aaa; text-align: right; margin-top: 5px; }}
        </style>
    </head>
    <body>
        <div class="comprobante">
            <div class="header">
                <div>
                    <h1 class="company-title">{empresa_data['nombre']}</h1>
                    <p class="company-ruc">RUC: {empresa_data['ruc']}</p>
                    <p class="company-details">📍 {empresa_data['direccion']} | 📞 {empresa_data['telefono']} | ✉️ {empresa_data['email']}</p>
                </div>
                <div class="doc-info">
                    <h2 class="doc-type">COMPROBANTE DE PAGO</h2>
                    <p class="doc-number">No. {pago_data['numero_comprobante']}</p>
                    <span class="status-badge">{estado_display}</span>
                    <p class="meta">Generado: {fecha_generacion}</p>
                </div>
            </div>
            
            <div class="main-grid">
                <div class="section">
                    <h3 class="section-title">👤 Datos del Cliente</h3>
                    <div class="info-row"><span class="info-label">Nombre:</span><span class="info-value">{cliente_data['nombres']} {cliente_data['apellidos']}</span></div>
                    <div class="info-row"><span class="info-label">Cédula:</span><span class="info-value">{cliente_data['cedula']}</span></div>
                    <div class="info-row"><span class="info-label">Teléfono:</span><span class="info-value">{cliente_data.get('telefono', 'N/A')}</span></div>
                    <div class="info-row"><span class="info-label">Email:</span><span class="info-value">{cliente_data.get('email', 'N/A')}</span></div>
                    <div class="info-row"><span class="info-label">Dirección:</span><span class="info-value">{cliente_data.get('direccion', 'N/A')[:40]}{'...' if len(cliente_data.get('direccion', '')) > 40 else ''}</span></div>
                </div>
                <div class="section">
                    <h3 class="section-title">📋 Plan y Pago</h3>
                    <div class="info-row"><span class="info-label">Plan:</span><span class="info-value">{cliente_data.get('tipo_plan', 'Sin plan')}</span></div>
                    <div class="info-row"><span class="info-label">Valor Plan:</span><span class="info-value">$ {cliente_data.get('precio_plan', 0):.2f}</span></div>
                    <div class="info-row"><span class="info-label">Fecha:</span><span class="info-value">{pago_data['fecha_pago']}</span></div>
                    <div class="info-row"><span class="info-label">Método:</span><span class="info-value">{metodo_display}</span></div>
                </div>
            </div>
            
            <div class="section">
                <h3 class="section-title">Concepto</h3>
                <p style="margin: 0; color: #333;">{pago_data['concepto']}</p>
            </div>
            
            <div class="amount-box">
                <div class="amount-label">MONTO TOTAL PAGADO</div>
                <div class="amount-value">$ {pago_data['monto']:.2f}</div>
                <div class="amount-concept">{pago_data['concepto']}</div>
            </div>
            
            <div class="barcode">
                {pago_data['numero_comprobante']} | {cliente_data['cedula']} | ${pago_data['monto']:.2f} | {pago_data['fecha_pago']}
            </div>
            
            <div class="footer">
                <div class="footer-message">
                    <p>✅ Este documento es un comprobante oficial de pago. Guarde este comprobante para sus registros.</p>
                </div>
                <div class="signatures">
                    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Firma del Cliente</div></div>
                    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Recibido por</div></div>
                </div>
                <div class="contact">
                    📞 Atención: {empresa_data['telefono']} | ✉️ {empresa_data['email']} | L-V 08:00-18:00 | S 09:00-14:00
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        # Intentar verificar/importar WeasyPrint si no está disponible
        if not WEASYPRINT_AVAILABLE or HTML is None or CSS is None:
            print("⚠️ WeasyPrint no está disponible inicialmente. Intentando cargar...")
            if not _check_weasyprint():
                print("❌ No se pudo cargar WeasyPrint. No se puede generar el PDF.")
                return None
        
        # Usar las clases importadas globalmente o importarlas localmente
        try:
            if HTML is not None and CSS is not None:
                HTML_Class = HTML
                CSS_Class = CSS
                FontConfigClass = FontConfiguration
            else:
                # type: ignore[reportMissingImports] - WeasyPrint es una dependencia opcional
                from weasyprint import HTML as HTML_Class, CSS as CSS_Class  # type: ignore[reportMissingImports]
                from weasyprint.text.fonts import FontConfiguration as FontConfigClass  # type: ignore[reportMissingImports]
        except Exception as import_error:
            print(f"⚠️ Error al importar WeasyPrint en tiempo de ejecución: {import_error}")
            import traceback
            traceback.print_exc()
            return None
        
        # Configurar fuentes
        font_config = FontConfigClass()
        
        # Generar PDF
        html = HTML_Class(string=html_content)
        css = CSS_Class(string='', font_config=font_config)
        pdf = html.write_pdf(stylesheets=[css], font_config=font_config)
        
        return pdf
        
    except ImportError as import_err:
        # Fallback si weasyprint no está disponible
        print(f"⚠️ ImportError al generar PDF: {import_err}")
        import traceback
        traceback.print_exc()
        return None
    except Exception as e:
        import traceback
        print(f"❌ Error generando PDF: {e}")
        print(f"Traceback completo:")
        traceback.print_exc()
        return None

@api_view(['GET'])
@permission_classes([AllowAny])
def descargar_comprobante(request, pago_id):
    """Descargar comprobante de pago en PDF"""
    try:
        with connection.cursor() as cursor:
            # Obtener datos del pago con plan del cliente
            cursor.execute("""
                SELECT p.id, p.monto, p.fecha_pago, p.metodo_pago, p.concepto, p.numero_comprobante, p.estado,
                       c.nombres, c.apellidos, c.cedula, c.email, c.telefono, c.direccion,
                       pl.tipo_plan, pl.precio, s.nombre_sector
                FROM pagos p
                JOIN clientes c ON p.cliente_id = c.id
                LEFT JOIN clientes_planes cp ON c.id = cp.id_cliente
                LEFT JOIN planes pl ON cp.id_plan = pl.id_plan
                LEFT JOIN sectores s ON c.id_sector = s.id_sector
                WHERE p.id = %s AND (cp.estado = 'activo' OR cp.estado IS NULL)
                ORDER BY cp.fecha_inicio DESC
                LIMIT 1
            """, [pago_id])
            
            row = cursor.fetchone()
            if not row:
                return Response({
                    'success': False,
                    'message': 'Pago no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Usar siempre los valores correctos de la empresa
            empresa_data = {
                'nombre': 'TELTEC NET',
                'direccion': 'Cañar - Sisid',
                'telefono': '0984517703',
                'email': 'teltecnet@outlook.com',
                'ruc': '1234567890001'
            }
            
            pago_data = {
                'id': row[0],
                'monto': float(row[1]),
                'fecha_pago': row[2].strftime('%d/%m/%Y %H:%M') if row[2] else '',
                'metodo_pago': row[3],
                'concepto': row[4],
                'numero_comprobante': row[5],
                'estado': row[6]
            }
            
            cliente_data = {
                'nombres': row[7],
                'apellidos': row[8],
                'cedula': row[9],
                'email': row[10],
                'telefono': row[11],
                'direccion': row[12] or '',
                'tipo_plan': row[13],
                'precio_plan': float(row[14]) if row[14] else 0,
                'sector': row[15] or ''
            }
            
            # Validar que el pago tenga número de comprobante
            if not pago_data.get('numero_comprobante'):
                return Response({
                    'success': False,
                    'message': 'El pago no tiene número de comprobante asignado'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generar PDF
            pdf_content = generar_comprobante_pdf(pago_data, cliente_data, empresa_data)
            
            if pdf_content is None:
                return Response({
                    'success': False,
                    'message': 'Error al generar el PDF. Verifique que weasyprint esté instalado en el servidor. Instale con: pip install weasyprint'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Validar que el PDF no esté vacío
            if len(pdf_content) == 0:
                return Response({
                    'success': False,
                    'message': 'El PDF generado está vacío'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Crear respuesta HTTP
            response = HttpResponse(pdf_content, content_type='application/pdf')
            
            # Usar número de comprobante o ID del pago para el nombre del archivo
            numero_comprobante = pago_data.get('numero_comprobante', f'pago_{pago_id}')
            # Limpiar el nombre del archivo para evitar caracteres problemáticos
            filename = f"comprobante_{numero_comprobante.replace(' ', '_').replace('/', '_')}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        error_message = str(e)
        
        # Log completo del error para debugging
        print("=" * 80)
        print("ERROR AL GENERAR COMPROBANTE")
        print("=" * 80)
        print(f"Error: {error_message}")
        print(f"Pago ID: {pago_id}")
        print(f"Traceback completo:")
        print(error_trace)
        print("=" * 80)
        
        # Mensaje más amigable para el usuario
        user_message = f'Error al generar comprobante: {error_message}'
        if 'gobject' in error_message.lower() or 'library' in error_message.lower():
            user_message += '. Verifique que las dependencias del sistema estén instaladas correctamente.'
        
        return Response({
            'success': False,
            'message': user_message
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def enviar_comprobante_email(request, pago_id):
    """Enviar comprobante por email al cliente"""
    try:
        with connection.cursor() as cursor:
            # Obtener datos del pago y cliente
            cursor.execute("""
                SELECT p.id, p.monto, p.fecha_pago, p.metodo_pago, p.concepto, p.numero_comprobante,
                       c.nombres, c.apellidos, c.cedula, c.email, c.telefono
                FROM pagos p
                JOIN clientes c ON p.cliente_id = c.id
                WHERE p.id = %s
            """, [pago_id])
            
            row = cursor.fetchone()
            if not row:
                return Response({
                    'success': False,
                    'message': 'Pago no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
            
            pago_data = {
                'id': row[0],
                'monto': float(row[1]),
                'fecha_pago': row[2].strftime('%d/%m/%Y %H:%M') if row[2] else '',
                'metodo_pago': row[3],
                'concepto': row[4],
                'numero_comprobante': row[5]
            }
            
            cliente_data = {
                'nombres': row[6],
                'apellidos': row[7],
                'cedula': row[8],
                'email': row[9],
                'telefono': row[10]
            }
            
            # Verificar que el cliente tenga email
            if not cliente_data['email']:
                return Response({
                    'success': False,
                    'message': 'El cliente no tiene un email registrado'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generar PDF
            pdf_content = generar_comprobante_pdf(pago_data, cliente_data)
            
            if pdf_content is None:
                return Response({
                    'success': False,
                    'message': 'Error al generar el PDF. Verifique que weasyprint esté instalado.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Enviar email usando Django EmailMessage
            from django.core.mail import EmailMessage

            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[cliente_data['email']],
            )
            email.attach(
                filename=f"comprobante_{pago_data['numero_comprobante']}.pdf",
                content=pdf_content,
                mimetype='application/pdf',
            )
            email.send(fail_silently=False)

            print(f"✅ Email enviado a {cliente_data['email']} con comprobante adjunto")
            
            # Actualizar estado de envío
            cursor.execute("""
                UPDATE pagos SET comprobante_enviado = true WHERE id = %s
            """, [pago_id])
            
            return Response({
                'success': True,
                'message': f'Comprobante enviado exitosamente a {cliente_data["email"]}'
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al enviar comprobante: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def list_deudas(request):
    """Listar clientes con información de deudas con paginación y búsqueda avanzada"""
    try:
        # Parámetros de paginación
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 50))
        search = request.GET.get('search', '')
        estado = request.GET.get('estado', '')
        tipo_plan = request.GET.get('tipo_plan', '')
        sector = request.GET.get('sector', '')
        deuda_min = request.GET.get('deuda_min', '')
        deuda_max = request.GET.get('deuda_max', '')
        meses_min = request.GET.get('meses_min', '')
        meses_max = request.GET.get('meses_max', '')
        ordenar_por = request.GET.get('ordenar_por', 'monto_total_deuda')
        orden = request.GET.get('orden', 'DESC')
        
        # Validar parámetros
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 200:
            page_size = 50
            
        # Validar orden
        if ordenar_por not in ['monto_total_deuda', 'meses_pendientes', 'fecha_vencimiento_pago', 'nombres', 'cedula']:
            ordenar_por = 'monto_total_deuda'
        if orden not in ['ASC', 'DESC']:
            orden = 'DESC'
            
        offset = (page - 1) * page_size
        
        # Esta consulta se reemplaza con la vista normalizada clientes_deuda
        pass
        params = []
        
        # Búsqueda general
        if search:
            base_query += """ AND (
                c.nombres ILIKE %s OR 
                c.apellidos ILIKE %s OR 
                c.cedula ILIKE %s OR 
                c.email ILIKE %s OR
                c.telefono ILIKE %s OR
                c.sector ILIKE %s
            )"""
            search_param = f'%{search}%'
            params.extend([search_param, search_param, search_param, search_param, search_param, search_param])
        
        # Filtro por estado
        if estado and estado != 'todos':
            base_query += " AND c.estado_pago = %s"
            params.append(estado)
        
        # Filtro por tipo de plan
        if tipo_plan:
            base_query += " AND c.tipo_plan = %s"
            params.append(tipo_plan)
        
        # Filtro por sector
        if sector:
            base_query += " AND c.sector ILIKE %s"
            params.append(f'%{sector}%')
        
        # Filtro por rango de deuda
        if deuda_min:
            base_query += " AND c.monto_total_deuda >= %s"
            params.append(float(deuda_min))
        
        if deuda_max:
            base_query += " AND c.monto_total_deuda <= %s"
            params.append(float(deuda_max))
        
        # Filtro por rango de meses pendientes
        if meses_min:
            base_query += " AND c.meses_pendientes >= %s"
            params.append(int(meses_min))
        
        if meses_max:
            base_query += " AND c.meses_pendientes <= %s"
            params.append(int(meses_max))
        
        # Usar la vista normalizada en lugar del modelo Django
        with connection.cursor() as cursor:
            # Construir consulta base usando la vista
            base_query = """
                SELECT 
                    id, cedula, nombres, apellidos, tipo_plan, precio_plan,
                    email, telefono, estado_pago, meses_pendientes, 
                    monto_total_deuda, fecha_ultimo_pago, fecha_vencimiento_pago,
                    estado, sector, fecha_registro
                FROM clientes_deuda
                WHERE 1=1
            """
            params = []
            
            # Búsqueda general
            if search:
                base_query += """ AND (
                    nombres ILIKE %s OR 
                    apellidos ILIKE %s OR 
                    cedula ILIKE %s OR 
                    email ILIKE %s OR
                    telefono ILIKE %s OR
                    sector ILIKE %s
                )"""
                search_param = f'%{search}%'
                params.extend([search_param, search_param, search_param, search_param, search_param, search_param])
            
            # Filtro por estado
            if estado and estado != 'todos':
                base_query += " AND estado_pago = %s"
                params.append(estado)
            
            # Filtro por tipo de plan
            if tipo_plan:
                base_query += " AND tipo_plan = %s"
                params.append(tipo_plan)
            
            # Filtro por sector
            if sector:
                base_query += " AND sector ILIKE %s"
                params.append(f'%{sector}%')
            
            # Filtro por rango de deuda
            if deuda_min:
                base_query += " AND monto_total_deuda >= %s"
                params.append(float(deuda_min))
            
            if deuda_max:
                base_query += " AND monto_total_deuda <= %s"
                params.append(float(deuda_max))
            
            # Filtro por rango de meses pendientes
            if meses_min:
                base_query += " AND meses_pendientes >= %s"
                params.append(int(meses_min))
            
            if meses_max:
                base_query += " AND meses_pendientes <= %s"
                params.append(int(meses_max))
            
            # Contar total
            count_query = f"SELECT COUNT(*) FROM ({base_query}) as subquery"
            cursor.execute(count_query, params)
            total_count = cursor.fetchone()[0]
            
            # Ordenamiento
            if ordenar_por == 'monto_total_deuda':
                order_field = 'monto_total_deuda'
            elif ordenar_por == 'meses_pendientes':
                order_field = 'meses_pendientes'
            elif ordenar_por == 'fecha_vencimiento_pago':
                order_field = 'fecha_vencimiento_pago'
            elif ordenar_por == 'nombres':
                order_field = 'nombres'
            elif ordenar_por == 'cedula':
                order_field = 'cedula'
            else:
                order_field = 'monto_total_deuda'
            
            # Agregar ordenamiento y paginación
            base_query += f" ORDER BY {order_field} {orden}, fecha_vencimiento_pago LIMIT %s OFFSET %s"
            params.extend([page_size, offset])
            
            # Ejecutar consulta principal
            cursor.execute(base_query, params)
            clientes_data = []
            for row in cursor.fetchall():
                clientes_data.append({
                    'id': row[0],
                    'cedula': row[1],
                    'nombres': row[2],
                    'apellidos': row[3],
                    'tipo_plan': row[4],
                    'precio_plan': float(row[5]) if row[5] else 0.0,
                    'email': row[6],
                    'telefono': row[7],
                    'estado_pago': row[8],
                    'meses_pendientes': row[9],
                    'monto_total_deuda': float(row[10]) if row[10] else 0.0,
                    'fecha_ultimo_pago': row[11].isoformat() if row[11] else None,
                    'fecha_vencimiento_pago': row[12].isoformat() if row[12] else None,
                    'estado': row[13],
                    'sector': row[14],
                    'fecha_registro': row[15].isoformat() if row[15] else None,
                    'nombre_completo': f"{row[2]} {row[3]}",
                    'total_pagado': 0.0  # Se calculará después si es necesario
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
                'tipo_plan': tipo_plan,
                'sector': sector,
                'deuda_min': deuda_min,
                'deuda_max': deuda_max,
                'meses_min': meses_min,
                'meses_max': meses_max,
                'ordenar_por': ordenar_por,
                'orden': orden
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_deudas_filtros(request):
    """Obtener opciones disponibles para filtros de deudas"""
    try:
        with connection.cursor() as cursor:
            # Obtener tipos de planes únicos
            cursor.execute("""
                SELECT DISTINCT tipo_plan 
                FROM clientes 
                WHERE estado = 'activo' AND tipo_plan IS NOT NULL
                ORDER BY tipo_plan
            """)
            tipos_plan = [row[0] for row in cursor.fetchall()]
            
            # Obtener sectores únicos
            cursor.execute("""
                SELECT DISTINCT sector 
                FROM clientes 
                WHERE estado = 'activo' AND sector IS NOT NULL AND sector != ''
                ORDER BY sector
            """)
            sectores = [row[0] for row in cursor.fetchall()]
            
            # Obtener rangos de deudas
            cursor.execute("""
                SELECT 
                    MIN(monto_total_deuda) as min_deuda,
                    MAX(monto_total_deuda) as max_deuda,
                    AVG(monto_total_deuda) as avg_deuda
                FROM clientes 
                WHERE estado = 'activo' AND monto_total_deuda > 0
            """)
            rangos_deuda = cursor.fetchone()
            
            # Obtener rangos de meses pendientes
            cursor.execute("""
                SELECT 
                    MIN(meses_pendientes) as min_meses,
                    MAX(meses_pendientes) as max_meses,
                    AVG(meses_pendientes) as avg_meses
                FROM clientes 
                WHERE estado = 'activo' AND meses_pendientes > 0
            """)
            rangos_meses = cursor.fetchone()
            
            return Response({
                'success': True,
                'data': {
                    'tipos_plan': tipos_plan,
                    'sectores': sectores,
                    'rangos_deuda': {
                        'min': float(rangos_deuda[0]) if rangos_deuda[0] else 0,
                        'max': float(rangos_deuda[1]) if rangos_deuda[1] else 0,
                        'promedio': float(rangos_deuda[2]) if rangos_deuda[2] else 0
                    },
                    'rangos_meses': {
                        'min': int(rangos_meses[0]) if rangos_meses[0] else 0,
                        'max': int(rangos_meses[1]) if rangos_meses[1] else 0,
                        'promedio': float(rangos_meses[2]) if rangos_meses[2] else 0
                    },
                    'opciones_ordenamiento': [
                        {'valor': 'monto_total_deuda', 'etiqueta': 'Monto de Deuda'},
                        {'valor': 'meses_pendientes', 'etiqueta': 'Meses Pendientes'},
                        {'valor': 'fecha_vencimiento_pago', 'etiqueta': 'Fecha de Vencimiento'},
                        {'valor': 'nombres', 'etiqueta': 'Nombre'},
                        {'valor': 'cedula', 'etiqueta': 'Cédula'}
                    ]
                }
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_deudas_stats(request):
    """Obtener estadísticas de deudas"""
    try:
        # Intentar obtener de la caché
        cached_stats = get_cached_stats(get_deudas_stats_cache_key())
        if cached_stats:
            return Response({
                'success': True,
                'data': cached_stats
            }, status=status.HTTP_200_OK)

        with connection.cursor() as cursor:
            # Estadísticas generales usando la vista normalizada
            cursor.execute("SELECT * FROM estadisticas_deudas")
            stats_row = cursor.fetchone()
            
            # Deuda por estado usando la vista
            cursor.execute("""
                SELECT 
                    estado_pago,
                    COUNT(*) as cantidad,
                    SUM(monto_total_deuda) as total_deuda
                FROM clientes_deuda
                GROUP BY estado_pago
            """)
            deuda_por_estado = []
            for row in cursor.fetchall():
                deuda_por_estado.append({
                    'estado': row[0],
                    'cantidad': row[1],
                    'total_deuda': float(row[2]) if row[2] else 0.0
                })
            
            # Top 5 clientes con mayor deuda usando la vista
            cursor.execute("SELECT * FROM top_deudores LIMIT 5")
            top_deudores = []
            for row in cursor.fetchall():
                top_deudores.append({
                    'nombres': row[0],
                    'apellidos': row[1],
                    'cedula': row[2],
                    'monto_deuda': float(row[3]) if row[3] else 0.0,
                    'estado_pago': row[4],
                    'meses_pendientes': row[5]
                })
        
        # Guardar en caché
        set_cached_stats(get_deudas_stats_cache_key(), {
            'total_clientes': stats_row[0],
            'clientes_al_dia': stats_row[1],
            'clientes_vencidos': stats_row[2],
            'clientes_proximo_vencimiento': stats_row[3],
            'total_deuda': float(stats_row[4]),
            'promedio_deuda': float(stats_row[5]),
            'cuotas_vencidas': stats_row[6],  # Usando total_meses_pendientes
            'deuda_por_estado': deuda_por_estado,
            'top_deudores': top_deudores
        })
        
        return Response({
            'success': True,
            'data': {
                'total_clientes': stats_row[0],
                'clientes_al_dia': stats_row[1],
                'clientes_vencidos': stats_row[2],
                'clientes_proximo_vencimiento': stats_row[3],
                'total_deuda': float(stats_row[4]),
                'promedio_deuda': float(stats_row[5]),
                'cuotas_vencidas': stats_row[6],  # Usando total_meses_pendientes
                'deuda_por_estado': deuda_por_estado,
                'top_deudores': top_deudores
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_pagos_stats(request):
    """Obtener estadísticas de pagos"""
    try:
        # Intentar obtener de la caché
        cached_stats = get_cached_stats(get_pagos_stats_cache_key())
        if cached_stats:
            return Response({
                'success': True,
                'data': cached_stats
            }, status=status.HTTP_200_OK)

        with connection.cursor() as cursor:
            # Estadísticas generales de pagos
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_pagos,
                    COALESCE(SUM(monto), 0) as total_recaudado,
                    COALESCE(AVG(monto), 0) as promedio_ticket,
                    COUNT(CASE WHEN DATE(fecha_pago) = CURRENT_DATE THEN 1 END) as pagos_hoy,
                    COALESCE(SUM(CASE WHEN DATE(fecha_pago) = CURRENT_DATE THEN monto ELSE 0 END), 0) as recaudacion_hoy,
                    COUNT(CASE WHEN EXTRACT(MONTH FROM fecha_pago) = EXTRACT(MONTH FROM CURRENT_DATE) 
                               AND EXTRACT(YEAR FROM fecha_pago) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 END) as pagos_mes_actual,
                    COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM fecha_pago) = EXTRACT(MONTH FROM CURRENT_DATE) 
                                     AND EXTRACT(YEAR FROM fecha_pago) = EXTRACT(YEAR FROM CURRENT_DATE) THEN monto ELSE 0 END), 0) as recaudacion_mes_actual,
                    COUNT(CASE WHEN NOT comprobante_enviado THEN 1 END) as comprobantes_pendientes
                FROM pagos 
                WHERE estado = 'completado'
            """)
            stats_row = cursor.fetchone()
            
            # Pagos por método de pago
            cursor.execute("""
                SELECT 
                    metodo_pago,
                    COUNT(*) as cantidad,
                    COALESCE(SUM(monto), 0) as total_monto
                FROM pagos 
                WHERE estado = 'completado'
                GROUP BY metodo_pago
                ORDER BY total_monto DESC
            """)
            pagos_por_metodo = []
            for row in cursor.fetchall():
                pagos_por_metodo.append({
                    'metodo_pago': row[0],
                    'cantidad': row[1],
                    'total_monto': float(row[2])
                })
            
            # Pagos por día (últimos 7 días)
            cursor.execute("""
                SELECT 
                    DATE(fecha_pago) as fecha,
                    COUNT(*) as cantidad,
                    COALESCE(SUM(monto), 0) as total_monto
                FROM pagos 
                WHERE estado = 'completado' 
                AND fecha_pago >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY DATE(fecha_pago)
                ORDER BY fecha DESC
            """)
            pagos_por_dia = []
            for row in cursor.fetchall():
                pagos_por_dia.append({
                    'fecha': row[0].isoformat(),
                    'cantidad': row[1],
                    'total_monto': float(row[2])
                })
            
            # Top 5 clientes con más pagos
            cursor.execute("""
                SELECT 
                    c.nombres, c.apellidos, c.cedula,
                    COUNT(p.id) as total_pagos,
                    COALESCE(SUM(p.monto), 0) as total_pagado
                FROM clientes c
                LEFT JOIN pagos p ON c.id = p.cliente_id AND p.estado = 'completado'
                WHERE c.estado = 'activo'
                GROUP BY c.id, c.nombres, c.apellidos, c.cedula
                HAVING COUNT(p.id) > 0
                ORDER BY total_pagado DESC
                LIMIT 5
            """)
            top_clientes = []
            for row in cursor.fetchall():
                top_clientes.append({
                    'nombres': row[0],
                    'apellidos': row[1],
                    'cedula': row[2],
                    'total_pagos': row[3],
                    'total_pagado': float(row[4])
                })
        
        # Guardar en caché
        stats_data = {
            'total_pagos': stats_row[0],
            'total_recaudado': float(stats_row[1]),
            'promedio_ticket': float(stats_row[2]),
            'pagos_hoy': stats_row[3],
            'recaudacion_hoy': float(stats_row[4]),
            'pagos_mes_actual': stats_row[5],
            'recaudacion_mes_actual': float(stats_row[6]),
            'comprobantes_pendientes': stats_row[7],
            'pagos_por_metodo': pagos_por_metodo,
            'pagos_por_dia': pagos_por_dia,
            'top_clientes': top_clientes
        }
        
        set_cached_stats(get_pagos_stats_cache_key(), stats_data)

        return Response({
            'success': True,
            'data': stats_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_cliente_cuotas(request, cliente_id):
    """Obtener cuotas mensuales de un cliente"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    id, mes, año, monto, fecha_vencimiento, fecha_pago, estado, pago_id
                FROM cuotas_mensuales 
                WHERE cliente_id = %s
                ORDER BY año DESC, mes DESC
            """, [cliente_id])
            
            cuotas = []
            for row in cursor.fetchall():
                cuotas.append({
                    'id': row[0],
                    'mes': row[1],
                    'año': row[2],
                    'monto': float(row[3]) if row[3] else 0,
                    'fecha_vencimiento': row[4].isoformat() if row[4] else None,
                    'fecha_pago': row[5].isoformat() if row[5] else None,
                    'estado': row[6],
                    'pago_id': row[7]
                })
        
        return Response({
            'success': True,
            'data': cuotas
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_cliente_historial(request, cliente_id):
    """Obtener historial de pagos de un cliente"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    id, pago_id, fecha, descripcion, monto_pagado, concepto, 
                    fecha_pago, meses_cubiertos
                FROM historial_pagos_cliente 
                WHERE cliente_id = %s
                ORDER BY fecha_pago DESC
            """, [cliente_id])
            
            historial = []
            for row in cursor.fetchall():
                historial.append({
                    'id': row[0],
                    'pago_id': row[1],
                    'fecha': row[2].isoformat() if row[2] else None,
                    'descripcion': row[3],
                    'monto_pagado': float(row[4]) if row[4] else 0,
                    'concepto': row[5],
                    'fecha_pago': row[6].isoformat() if row[6] else None,
                    'meses_cubiertos': row[7] or 0
                })
        
        return Response({
            'success': True,
            'data': historial
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def actualizar_estados_pago(request):
    """Actualizar estados de pago de todos los clientes"""
    try:
        with connection.cursor() as cursor:
            # Primero, actualizar fechas de vencimiento para clientes que no las tienen
            cursor.execute("""
                UPDATE clientes 
                SET fecha_vencimiento_pago = DATE(fecha_registro) + INTERVAL '1 month'
                WHERE estado = 'activo' AND fecha_vencimiento_pago IS NULL
            """)
            
            # Actualizar estados basado en fecha de vencimiento
            cursor.execute("""
                UPDATE clientes 
                SET estado_pago = CASE 
                    WHEN fecha_vencimiento_pago IS NULL THEN 'sin_fecha'
                    WHEN fecha_vencimiento_pago < CURRENT_DATE - INTERVAL '3 days' THEN 'vencido'
                    WHEN fecha_vencimiento_pago <= CURRENT_DATE THEN 'proximo_vencimiento'
                    ELSE 'al_dia'
                END
                WHERE estado = 'activo'
            """)
            
            # Calcular meses pendientes y monto total de deuda
            cursor.execute("""
                UPDATE clientes 
                SET 
                    meses_pendientes = CASE 
                        WHEN fecha_vencimiento_pago IS NULL THEN 0
                        WHEN fecha_vencimiento_pago < CURRENT_DATE THEN 
                            EXTRACT(MONTH FROM AGE(CURRENT_DATE, fecha_vencimiento_pago)) + 
                            EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_vencimiento_pago)) * 12
                        ELSE 0
                    END,
                    monto_total_deuda = CASE 
                        WHEN fecha_vencimiento_pago IS NULL THEN 0
                        WHEN fecha_vencimiento_pago < CURRENT_DATE THEN 
                            precio_plan * (
                                EXTRACT(MONTH FROM AGE(CURRENT_DATE, fecha_vencimiento_pago)) + 
                                EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_vencimiento_pago)) * 12
                            )
                        ELSE 0
                    END
                WHERE estado = 'activo'
            """)
            
            # Actualizar cuotas vencidas
            cursor.execute("""
                UPDATE cuotas_mensuales 
                SET estado = CASE 
                    WHEN fecha_vencimiento < CURRENT_DATE THEN 'vencida'
                    ELSE 'pendiente'
                END
                WHERE estado != 'pagada'
            """)
        
        return Response({
            'success': True,
            'message': 'Estados de pago actualizados exitosamente'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def actualizar_deudas_pagos_reales(request):
    """Actualizar deudas basándose en pagos reales registrados"""
    try:
        with connection.cursor() as cursor:
            # Obtener todos los clientes activos con sus planes
            cursor.execute("""
                SELECT c.id, c.cedula, c.nombres, c.apellidos, c.fecha_registro,
                       p.tipo_plan, p.precio, cp.estado as estado_plan
                FROM clientes c
                LEFT JOIN clientes_planes cp ON c.id = cp.id_cliente AND cp.estado = 'activo'
                LEFT JOIN planes p ON cp.id_plan = p.id_plan
                WHERE c.estado = 'activo'
                ORDER BY c.id
            """)
            clientes = cursor.fetchall()
            
            clientes_actualizados = 0
            
            for cliente in clientes:
                cliente_id = cliente[0]
                cedula = cliente[1]
                nombres = cliente[2]
                apellidos = cliente[3]
                fecha_registro = cliente[4]
                tipo_plan = cliente[5] if cliente[5] else "Sin plan"
                precio_plan = float(cliente[6]) if cliente[6] else 0
                estado_plan = cliente[7] if cliente[7] else "inactivo"
                
                # Solo procesar clientes con plan activo
                if estado_plan != 'activo' or precio_plan <= 0:
                    continue
                
                # Obtener todos los pagos del cliente
                cursor.execute("""
                    SELECT fecha_pago, monto, concepto, estado
                    FROM pagos 
                    WHERE cliente_id = %s AND estado = 'completado'
                    ORDER BY fecha_pago ASC
                """, [cliente_id])
                pagos = cursor.fetchall()
                
                # Calcular meses desde el registro hasta hoy
                if hasattr(fecha_registro, 'date'):
                    fecha_registro = fecha_registro.date()
                
                hoy = date.today()
                meses_desde_registro = (hoy.year - fecha_registro.year) * 12 + (hoy.month - fecha_registro.month)
                if hoy.day < fecha_registro.day:
                    meses_desde_registro -= 1
                
                # Asegurar que no sea negativo
                meses_desde_registro = max(0, meses_desde_registro)
                
                # Analizar pagos por mes
                pagos_por_mes = {}
                for pago in pagos:
                    fecha_pago = pago[0]
                    monto = float(pago[1])
                    concepto = pago[2] or ""
                    
                    # Extraer mes del concepto
                    año = fecha_pago.year
                    mes = fecha_pago.month
                    
                    # Buscar mes en el concepto
                    import re
                    mes_match = re.search(r'(\w+)\s+(\d{4})', concepto)
                    if mes_match:
                        mes_nombre = mes_match.group(1)
                        año_concepto = int(mes_match.group(2))
                        
                        meses_map = {
                            'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4,
                            'Mayo': 5, 'Junio': 6, 'Julio': 7, 'Agosto': 8,
                            'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'Diciembre': 12
                        }
                        
                        if mes_nombre in meses_map:
                            mes = meses_map[mes_nombre]
                            año = año_concepto
                    
                    key = f"{año}-{mes:02d}"
                    if key not in pagos_por_mes:
                        pagos_por_mes[key] = 0
                    pagos_por_mes[key] += monto
                
                # Contar meses pagados
                meses_pagados = 0
                for key in pagos_por_mes:
                    monto = pagos_por_mes[key]
                    # Verificar si cubre el mes completo (80% del precio)
                    if monto >= precio_plan * 0.8:
                        meses_pagados += 1
                
                # Calcular meses pendientes y deuda
                meses_pendientes = max(0, meses_desde_registro - meses_pagados)
                monto_deuda = meses_pendientes * precio_plan
                
                # Determinar estado del pago
                if meses_pendientes == 0:
                    estado_pago = 'al_dia'
                elif meses_pendientes == 1:
                    estado_pago = 'proximo_vencimiento'
                else:
                    estado_pago = 'vencido'
                
                # Calcular fecha de último pago
                fecha_ultimo_pago = None
                if pagos:
                    fecha_ultimo_pago = max(pago[0] for pago in pagos)
                
                # Calcular fecha de vencimiento
                fecha_vencimiento = None
                if fecha_ultimo_pago:
                    # Calcular próximo mes desde el último pago
                    try:
                        if fecha_ultimo_pago.month == 12:
                            fecha_vencimiento = fecha_ultimo_pago.replace(year=fecha_ultimo_pago.year + 1, month=1, day=1)
                        else:
                            fecha_vencimiento = fecha_ultimo_pago.replace(month=fecha_ultimo_pago.month + 1, day=1)
                    except ValueError:
                        # Si hay error con la fecha, usar el primer día del mes siguiente
                        from datetime import timedelta
                        fecha_vencimiento = fecha_ultimo_pago + timedelta(days=32)
                        fecha_vencimiento = fecha_vencimiento.replace(day=1)
                else:
                    # Si no hay pagos, usar fecha de registro + 1 mes
                    try:
                        if fecha_registro.month == 12:
                            fecha_vencimiento = fecha_registro.replace(year=fecha_registro.year + 1, month=1, day=1)
                        else:
                            fecha_vencimiento = fecha_registro.replace(month=fecha_registro.month + 1, day=1)
                    except ValueError:
                        # Si hay error con la fecha, usar el primer día del mes siguiente
                        from datetime import timedelta
                        fecha_vencimiento = fecha_registro + timedelta(days=32)
                        fecha_vencimiento = fecha_vencimiento.replace(day=1)
                
                # Actualizar cliente en la base de datos (solo si las columnas existen)
                try:
                    cursor.execute("""
                        UPDATE clientes 
                        SET estado_pago = %s, meses_pendientes = %s, monto_total_deuda = %s,
                            fecha_ultimo_pago = %s, fecha_vencimiento_pago = %s
                        WHERE id = %s
                    """, [estado_pago, meses_pendientes, monto_deuda, fecha_ultimo_pago, fecha_vencimiento, cliente_id])
                except Exception as e:
                    # Si las columnas no existen, solo logear el resultado
                    print(f"⚠️  No se pudieron actualizar las columnas de deuda para cliente {cedula}: {str(e)}")
                    print(f"   Estado calculado: {estado_pago}, Meses pendientes: {meses_pendientes}, Deuda: ${monto_deuda:.2f}")
                
                clientes_actualizados += 1
                
                print(f"Cliente {cedula} ({nombres} {apellidos}): {meses_pendientes} meses pendientes, ${monto_deuda:.2f} deuda")
            
            return Response({
                'success': True,
                'message': f'Deudas actualizadas correctamente. {clientes_actualizados} clientes procesados.',
                'clientes_actualizados': clientes_actualizados
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error actualizando deudas: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def exportar_reporte_pagos_excel(request):
    """Exportar reporte de pagos en Excel"""
    try:
        fecha_inicio = request.GET.get('fecha_inicio')
        fecha_fin = request.GET.get('fecha_fin')
        metodo_pago = request.GET.get('metodo_pago')
        
        generator = ReporteGenerator()
        output = generator.generar_reporte_pagos_excel(fecha_inicio, fecha_fin, metodo_pago)
        
        # Generar nombre de archivo
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'reporte_pagos_{timestamp}.xlsx'
        
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al generar reporte: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def exportar_reporte_pagos_pdf(request):
    """Exportar reporte de pagos en PDF"""
    try:
        fecha_inicio = request.GET.get('fecha_inicio')
        fecha_fin = request.GET.get('fecha_fin')
        metodo_pago = request.GET.get('metodo_pago')
        
        generator = ReporteGenerator()
        output = generator.generar_reporte_pagos_pdf(fecha_inicio, fecha_fin, metodo_pago)
        
        # Generar nombre de archivo
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'reporte_pagos_{timestamp}.pdf'
        
        response = HttpResponse(output.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al generar reporte: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def exportar_reporte_deudas_excel(request):
    """Exportar reporte de deudas en Excel"""
    try:
        generator = ReporteGenerator()
        output = generator.generar_reporte_deudas_excel()
        
        # Generar nombre de archivo
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'reporte_deudas_{timestamp}.xlsx'
        
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al generar reporte: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def debug_recaudacion_deudas(request):
    """Debug para verificar consistencia entre recaudación y deudas"""
    try:
        cliente_id = request.GET.get('cliente_id')
        
        with connection.cursor() as cursor:
            if cliente_id:
                # Debug para un cliente específico
                cursor.execute("""
                    SELECT 
                        c.id, c.cedula, c.nombres, c.apellidos, c.tipo_plan, c.precio_plan,
                        c.estado_pago, c.meses_pendientes, c.monto_total_deuda,
                        c.fecha_ultimo_pago, c.fecha_vencimiento_pago, c.fecha_registro
                    FROM clientes c
                    WHERE c.id = %s
                """, [cliente_id])
                cliente = cursor.fetchone()
                
                if not cliente:
                    return Response({
                        'success': False,
                        'message': 'Cliente no encontrado'
                    }, status=status.HTTP_404_NOT_FOUND)
                
                # Obtener todos los pagos del cliente
                cursor.execute("""
                    SELECT fecha_pago, monto, concepto, estado
                    FROM pagos 
                    WHERE cliente_id = %s AND estado = 'completado'
                    ORDER BY fecha_pago ASC
                """, [cliente_id])
                pagos = cursor.fetchall()
                
                # Calcular información de pagos
                total_pagado = sum(float(pago[1]) for pago in pagos)
                pagos_por_mes = {}
                
                for pago in pagos:
                    fecha_pago = pago[0]
                    monto = float(pago[1])
                    concepto = pago[2] or ""
                    
                    # Extraer mes del concepto
                    import re
                    mes_match = re.search(r'(\w+)\s+(\d{4})', concepto)
                    if mes_match:
                        mes_nombre = mes_match.group(1)
                        año = int(mes_match.group(2))
                        
                        meses_map = {
                            'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4,
                            'Mayo': 5, 'Junio': 6, 'Julio': 7, 'Agosto': 8,
                            'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'Diciembre': 12
                        }
                        
                        if mes_nombre in meses_map:
                            mes = meses_map[mes_nombre]
                            key = f"{año}-{mes:02d}"
                            if key not in pagos_por_mes:
                                pagos_por_mes[key] = 0
                            pagos_por_mes[key] += monto
                
                # Calcular deuda real
                from datetime import datetime, date
                hoy = date.today()
                fecha_registro = cliente[11]
                fecha_registro_date = fecha_registro.date() if hasattr(fecha_registro, 'date') else fecha_registro
                
                meses_totales = (hoy.year - fecha_registro_date.year) * 12 + (hoy.month - fecha_registro_date.month)
                if hoy.day < fecha_registro_date.day:
                    meses_totales -= 1
                meses_totales = max(0, meses_totales)
                
                precio_plan = float(cliente[5]) if cliente[5] else 0
                meses_pagados = 0
                for key in pagos_por_mes:
                    if pagos_por_mes[key] >= precio_plan * 0.8:
                        meses_pagados += 1
                
                meses_pendientes_real = max(0, meses_totales - meses_pagados)
                deuda_real = meses_pendientes_real * precio_plan
                
                return Response({
                    'success': True,
                    'data': {
                        'cliente': {
                            'id': cliente[0],
                            'cedula': cliente[1],
                            'nombres': cliente[2],
                            'apellidos': cliente[3],
                            'tipo_plan': cliente[4],
                            'precio_plan': precio_plan,
                            'estado_pago_actual': cliente[6],
                            'meses_pendientes_actual': cliente[7],
                            'monto_deuda_actual': float(cliente[8]) if cliente[8] else 0,
                            'fecha_ultimo_pago': cliente[9].isoformat() if cliente[9] else None,
                            'fecha_vencimiento': cliente[10].isoformat() if cliente[10] else None,
                            'fecha_registro': cliente[11].isoformat() if cliente[11] else None
                        },
                        'pagos': {
                            'total_pagos': len(pagos),
                            'total_pagado': total_pagado,
                            'pagos_por_mes': pagos_por_mes,
                            'detalle_pagos': [
                                {
                                    'fecha': pago[0].isoformat(),
                                    'monto': float(pago[1]),
                                    'concepto': pago[2],
                                    'estado': pago[3]
                                } for pago in pagos
                            ]
                        },
                        'calculo_real': {
                            'meses_totales_desde_registro': meses_totales,
                            'meses_pagados': meses_pagados,
                            'meses_pendientes_real': meses_pendientes_real,
                            'deuda_real': deuda_real,
                            'diferencia_con_actual': float(cliente[8]) if cliente[8] else 0 - deuda_real
                        }
                    }
                }, status=status.HTTP_200_OK)
            else:
                # Debug general para todos los clientes
                cursor.execute("""
                    SELECT 
                        c.id, c.cedula, c.nombres, c.apellidos, c.tipo_plan, c.precio_plan,
                        c.estado_pago, c.meses_pendientes, c.monto_total_deuda,
                        COUNT(p.id) as total_pagos,
                        COALESCE(SUM(p.monto), 0) as total_pagado
                    FROM clientes c
                    LEFT JOIN pagos p ON c.id = p.cliente_id AND p.estado = 'completado'
                    WHERE c.estado = 'activo'
                    GROUP BY c.id, c.cedula, c.nombres, c.apellidos, c.tipo_plan, c.precio_plan,
                             c.estado_pago, c.meses_pendientes, c.monto_total_deuda
                    ORDER BY c.monto_total_deuda DESC
                """)
                
                clientes = []
                for row in cursor.fetchall():
                    clientes.append({
                        'id': row[0],
                        'cedula': row[1],
                        'nombres': row[2],
                        'apellidos': row[3],
                        'tipo_plan': row[4],
                        'precio_plan': float(row[5]) if row[5] else 0,
                        'estado_pago': row[6],
                        'meses_pendientes': row[7],
                        'monto_deuda_actual': float(row[8]) if row[8] else 0,
                        'total_pagos': row[9],
                        'total_pagado': float(row[10])
                    })
                
                return Response({
                    'success': True,
                    'data': {
                        'total_clientes': len(clientes),
                        'clientes': clientes
                    }
                }, status=status.HTTP_200_OK)
                
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en debug: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def actualizar_deudas_automaticamente(cursor, cliente_id):
    """Actualizar automáticamente las deudas de un cliente específico después de registrar un pago"""
    try:
        # Obtener información del cliente y su plan
        cursor.execute("""
            SELECT c.id, c.cedula, c.nombres, c.apellidos, c.fecha_registro,
                   p.tipo_plan, p.precio
            FROM clientes c
            JOIN clientes_planes cp ON c.id = cp.id_cliente
            JOIN planes p ON cp.id_plan = p.id_plan
            WHERE c.id = %s AND cp.estado = 'activo'
        """, [cliente_id])
        
        cliente_data = cursor.fetchone()
        if not cliente_data:
            print(f"⚠️ Cliente {cliente_id} no encontrado o sin plan activo")
            return
        
        cliente_id, cedula, nombres, apellidos, fecha_registro, tipo_plan, precio_plan = cliente_data
        precio_plan = float(precio_plan) if precio_plan else 0
        
        # Calcular meses desde registro
        if hasattr(fecha_registro, 'date'):
            fecha_registro = fecha_registro.date()
        
        hoy = date.today()
        meses_desde_registro = (hoy.year - fecha_registro.year) * 12 + (hoy.month - fecha_registro.month)
        if hoy.day < fecha_registro.day:
            meses_desde_registro -= 1
        
        meses_desde_registro = max(0, meses_desde_registro)
        
        # Obtener total pagado
        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0)
            FROM pagos 
            WHERE cliente_id = %s AND estado = 'completado'
        """, [cliente_id])
        
        result = cursor.fetchone()
        total_pagado = float(result[0]) if result and result[0] is not None else 0
        
        # Calcular deuda actual
        total_debe_teorico = meses_desde_registro * precio_plan
        deuda_actual = total_debe_teorico - total_pagado
        
        # Determinar estado de pago
        if deuda_actual <= 0:
            estado_pago = 'al_dia'
            meses_pendientes = 0
        elif deuda_actual <= precio_plan:
            estado_pago = 'proximo_vencimiento'
            meses_pendientes = 1
        else:
            estado_pago = 'vencido'
            meses_pendientes = int(deuda_actual / precio_plan)
        
        # Calcular fechas
        fecha_ultimo_pago = None
        cursor.execute("""
            SELECT fecha_pago
            FROM pagos 
            WHERE cliente_id = %s AND estado = 'completado'
            ORDER BY fecha_pago DESC
            LIMIT 1
        """, [cliente_id])
        
        ultimo_pago = cursor.fetchone()
        if ultimo_pago:
            fecha_ultimo_pago = ultimo_pago[0]
        
        # Calcular próximo vencimiento
        from calendar import monthrange
        nuevo_mes = fecha_registro.month + meses_desde_registro + 1
        nuevo_año = fecha_registro.year
        while nuevo_mes > 12:
            nuevo_mes -= 12
            nuevo_año += 1
        try:
            # Asegurar que el día sea válido para el mes
            ultimo_dia_mes = monthrange(nuevo_año, nuevo_mes)[1]
            dia_valido = min(fecha_registro.day, ultimo_dia_mes)
            proximo_vencimiento = date(nuevo_año, nuevo_mes, dia_valido)
        except (ValueError, TypeError) as e:
            # Si hay error, usar una fecha segura
            print(f"⚠️ Error calculando próximo vencimiento: {str(e)}, usando fecha por defecto")
            proximo_vencimiento = date(nuevo_año, nuevo_mes, 1)
        
        # Actualizar campos de deuda en la tabla clientes
        cursor.execute("""
            UPDATE clientes 
            SET estado_pago = %s,
                meses_pendientes = %s,
                monto_total_deuda = %s,
                fecha_ultimo_pago = %s,
                fecha_vencimiento_pago = %s
            WHERE id = %s
        """, [estado_pago, meses_pendientes, deuda_actual, fecha_ultimo_pago, proximo_vencimiento, cliente_id])
        
        print(f"✅ Deudas actualizadas automáticamente para cliente {cedula} ({nombres} {apellidos})")
        print(f"   Estado: {estado_pago}, Meses pendientes: {meses_pendientes}, Deuda: ${deuda_actual}")
        
    except Exception as e:
        print(f"❌ Error actualizando deudas automáticamente para cliente {cliente_id}: {str(e)}")


@api_view(['POST'])
@permission_classes([AllowAny])
def bulk_import_pagos(request):
    """
    Importación masiva de pagos desde CSV/Excel
    """
    from django.db import transaction
    from pagos.models import Pago
    
    try:
        data = request.data
        pagos_data = data.get('pagos', [])
        
        if not pagos_data:
            return Response({
                'success': False,
                'message': 'No se recibieron datos de pagos'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        resultados = {
            'creados': [],
            'errores': []
        }
        
        for idx, pago_item in enumerate(pagos_data):
            try:
                cedula = str(pago_item.get('cedula', '')).strip()
                monto = pago_item.get('monto')
                fecha_pago_str = pago_item.get('fecha_pago')
                metodo_pago = pago_item.get('metodo_pago', 'efectivo').lower()
                concepto = pago_item.get('concepto', 'Pago importado')
                estado = pago_item.get('estado', 'completado').lower()
                numero_comprobante = pago_item.get('numero_comprobante', '')
                
                # Validar cédula
                if not cedula:
                    resultados['errores'].append({
                        'fila': idx + 1,
                        'error': 'Cédula no proporcionada'
                    })
                    continue
                
                # Normalizar cédula
                import re
                cedula_normalizada = re.sub(r'[^\d]', '', cedula)
                if len(cedula_normalizada) < 10:
                    cedula_normalizada = cedula_normalizada.zfill(10)
                
                # Buscar cliente por cédula
                with connection.cursor() as cursor:
                    cursor.execute("SELECT id FROM clientes WHERE cedula = %s LIMIT 1", [cedula_normalizada])
                    cliente_row = cursor.fetchone()
                
                if not cliente_row:
                    resultados['errores'].append({
                        'fila': idx + 1,
                        'cedula': cedula,
                        'error': f'Cliente con cédula {cedula_normalizada} no encontrado'
                    })
                    continue
                
                cliente_id = cliente_row[0]
                
                # Parsear monto
                try:
                    if isinstance(monto, str):
                        monto = float(monto.replace(',', '').replace('$', ''))
                    monto = float(monto)
                except (ValueError, TypeError):
                    resultados['errores'].append({
                        'fila': idx + 1,
                        'cedula': cedula,
                        'error': f'Monto inválido: {monto}'
                    })
                    continue
                
                # Parsear fecha
                try:
                    if isinstance(fecha_pago_str, str):
                        fecha_pago = datetime.strptime(fecha_pago_str[:10], '%Y-%m-%d').date()
                    else:
                        fecha_pago = fecha_pago_str
                except (ValueError, TypeError):
                    resultados['errores'].append({
                        'fila': idx + 1,
                        'cedula': cedula,
                        'error': f'Fecha inválida: {fecha_pago_str}'
                    })
                    continue
                
                # Validar método de pago
                metodos_validos = ['efectivo', 'transferencia', 'deposito', 'tarjeta', 'pago_online']
                if metodo_pago not in metodos_validos:
                    metodo_pago = 'efectivo'
                
                # Validar estado
                estados_validos = ['completado', 'pendiente', 'fallido']
                if estado not in estados_validos:
                    estado = 'completado'
                
                # Crear el pago
                with transaction.atomic():
                    pago = Pago.objects.create(
                        cliente_id=cliente_id,
                        monto=monto,
                        fecha_pago=fecha_pago,
                        metodo_pago=metodo_pago,
                        concepto=concepto,
                        estado=estado,
                        numero_comprobante=numero_comprobante or None
                    )
                    resultados['creados'].append({
                        'id': pago.id,
                        'cliente_cedula': cedula_normalizada,
                        'monto': float(monto),
                        'fecha_pago': str(fecha_pago)
                    })
                    
            except Exception as e:
                resultados['errores'].append({
                    'fila': idx + 1,
                    'error': str(e)
                })
        
        return Response({
            'success': len(resultados['creados']) > 0,
            'message': f'Se importaron {len(resultados["creados"])} pagos',
            'creados': resultados['creados'],
            'errores': resultados['errores'],
            'resumen': {
                'total_procesados': len(pagos_data),
                'pagos_creados': len(resultados['creados']),
                'errores': len(resultados['errores'])
            }
        })
        
    except Exception as e:
        print(f"Error en bulk_import_pagos: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'message': f'Error al procesar la importación: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

