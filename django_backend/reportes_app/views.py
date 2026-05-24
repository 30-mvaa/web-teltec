from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
from django.http import HttpResponse
from datetime import datetime
import calendar
# Importaciones de reportlab - ignorar errores de Pyright
from reportlab.lib import colors  # type: ignore
from reportlab.lib.pagesizes import letter, A4, landscape  # type: ignore
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image  # type: ignore
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle  # type: ignore
from reportlab.lib.units import inch  # type: ignore
from reportlab.graphics.shapes import Drawing  # type: ignore
from reportlab.graphics.charts.linecharts import HorizontalLineChart  # type: ignore
from reportlab.graphics.charts.barcharts import VerticalBarChart  # type: ignore
from reportlab.graphics.charts.piecharts import Pie  # type: ignore
from reportlab.graphics import renderPDF  # type: ignore
import io

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_general(request):
    """Reporte general del sistema"""
    try:
        month = request.GET.get('month', datetime.now().month)
        year = request.GET.get('year', datetime.now().year)
        report_type = request.GET.get('type', 'general')
        
        with connection.cursor() as cursor:
            # Estadísticas generales
            cursor.execute("SELECT COUNT(*) FROM clientes WHERE estado = 'activo'")
            total_clientes = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM pagos WHERE EXTRACT(MONTH FROM fecha_pago) = %s AND EXTRACT(YEAR FROM fecha_pago) = %s", [month, year])
            total_pagos = cursor.fetchone()[0]
            
            cursor.execute("SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE EXTRACT(MONTH FROM fecha_pago) = %s AND EXTRACT(YEAR FROM fecha_pago) = %s", [month, year])
            total_recaudado = cursor.fetchone()[0] or 0
            
            cursor.execute("SELECT COALESCE(SUM(monto), 0) FROM gastos WHERE EXTRACT(MONTH FROM fecha_gasto) = %s AND EXTRACT(YEAR FROM fecha_gasto) = %s", [month, year])
            total_gastos = cursor.fetchone()[0] or 0
            
            # Calcular ganancia neta
            ganancia_neta = float(total_recaudado) - float(total_gastos)
        
        return Response({
            'success': True,
            'data': {
                'periodo': f"{month}/{year}",
                'tipo_reporte': report_type,
                'total_clientes': total_clientes,
                'total_pagos': total_pagos,
                'total_recaudado': float(total_recaudado),
                'total_gastos': float(total_gastos),
                'ganancia_neta': ganancia_neta,
                'fecha_generacion': datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_clientes(request):
    """Reporte de clientes"""
    try:
        month = request.GET.get('month', datetime.now().month)
        year = request.GET.get('year', datetime.now().year)
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    c.id, c.nombres || ' ' || c.apellidos as nombre_completo, c.email, c.telefono,
                    COUNT(p.id) as total_pagos,
                    COALESCE(SUM(p.monto), 0) as total_pagado,
                    c.fecha_registro
                FROM clientes c
                LEFT JOIN pagos p ON c.id = p.cliente_id 
                    AND EXTRACT(MONTH FROM p.fecha_pago) = %s 
                    AND EXTRACT(YEAR FROM p.fecha_pago) = %s
                WHERE c.estado = 'activo'
                GROUP BY c.id, c.nombres, c.apellidos, c.email, c.telefono, c.fecha_registro
                ORDER BY total_pagado DESC
            """, [month, year])
            
            clientes = []
            for row in cursor.fetchall():
                clientes.append({
                    'id': row[0],
                    'nombre_completo': row[1],
                    'email': row[2],
                    'telefono': row[3],
                    'total_pagos': row[4],
                    'total_pagado': float(row[5]),
                    'fecha_registro': row[6].isoformat() if row[6] else None
                })
        
        return Response({
            'success': True,
            'data': {
                'periodo': f"{month}/{year}",
                'clientes': clientes,
                'total_clientes': len(clientes)
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_pagos(request):
    """Reporte de pagos"""
    try:
        month = request.GET.get('month', datetime.now().month)
        year = request.GET.get('year', datetime.now().year)
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    p.id, p.numero_comprobante, p.fecha_pago, 
                    c.nombres || ' ' || c.apellidos as cliente_nombre,
                    c.cedula as cliente_cedula,
                    c.tipo_plan, p.concepto, p.metodo_pago, p.monto, p.estado,
                    p.comprobante_enviado
                FROM pagos p
                JOIN clientes c ON p.cliente_id = c.id
                WHERE EXTRACT(MONTH FROM p.fecha_pago) = %s 
                AND EXTRACT(YEAR FROM p.fecha_pago) = %s
                ORDER BY p.fecha_pago DESC
            """, [month, year])
            
            pagos = []
            for row in cursor.fetchall():
                pagos.append({
                    'id': row[0],
                    'numero_comprobante': row[1],
                    'fecha_pago': row[2].isoformat() if row[2] else None,
                    'cliente_nombre': row[3],
                    'cliente_cedula': row[4],
                    'tipo_plan': row[5],
                    'concepto': row[6],
                    'metodo_pago': row[7],
                    'monto': float(row[8]),
                    'estado': row[9],
                    'comprobante_enviado': row[10]
                })
        
        return Response({
            'success': True,
            'data': pagos,
            'total_pagos': len(pagos),
            'total_monto': sum(p['monto'] for p in pagos)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_gastos(request):
    """Reporte de gastos"""
    try:
        month = request.GET.get('month', datetime.now().month)
        year = request.GET.get('year', datetime.now().year)
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    g.id, g.fecha_gasto, g.descripcion, g.categoria, g.monto,
                    g.proveedor, g.metodo_pago, u.nombre as usuario_nombre
                FROM gastos g
                LEFT JOIN usuarios u ON g.usuario_id = u.id
                WHERE EXTRACT(MONTH FROM g.fecha_gasto) = %s 
                AND EXTRACT(YEAR FROM g.fecha_gasto) = %s
                ORDER BY g.fecha_gasto DESC
            """, [month, year])
            
            gastos = []
            for row in cursor.fetchall():
                gastos.append({
                    'id': row[0],
                    'fecha_gasto': row[1].isoformat() if row[1] else None,
                    'descripcion': row[2],
                    'categoria': row[3],
                    'monto': float(row[4]),
                    'proveedor': row[5],
                    'metodo_pago': row[6],
                    'usuario_nombre': row[7]
                })
        
        return Response({
            'success': True,
            'data': gastos,
            'total_gastos': len(gastos),
            'total_monto': sum(g['monto'] for g in gastos)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_anual_clientes(request):
    """Reporte anual de clientes con estado de pagos por mes"""
    try:
        year = request.GET.get('year', datetime.now().year)
        
        with connection.cursor() as cursor:
            # Obtener todos los clientes activos
            cursor.execute("""
                SELECT 
                    c.id, c.cedula, c.nombres, c.apellidos, c.tipo_plan, 
                    c.precio_plan, c.sector, c.estado, c.fecha_registro
                FROM clientes c
                WHERE c.estado = 'activo'
                ORDER BY c.nombres, c.apellidos
            """)
            
            clientes = []
            for cliente in cursor.fetchall():
                cliente_id, cedula, nombres, apellidos, tipo_plan, precio_plan, sector, estado, fecha_registro = cliente
                
                # Obtener pagos del cliente por mes para el año especificado
                # Incluye pagos flexibles que pueden tener múltiples meses en un solo registro
                cursor.execute("""
                    SELECT 
                        CASE 
                            WHEN p.concepto ILIKE '%%Enero%%' THEN 1
                            WHEN p.concepto ILIKE '%%Febrero%%' THEN 2
                            WHEN p.concepto ILIKE '%%Marzo%%' THEN 3
                            WHEN p.concepto ILIKE '%%Abril%%' THEN 4
                            WHEN p.concepto ILIKE '%%Mayo%%' THEN 5
                            WHEN p.concepto ILIKE '%%Junio%%' THEN 6
                            WHEN p.concepto ILIKE '%%Julio%%' THEN 7
                            WHEN p.concepto ILIKE '%%Agosto%%' THEN 8
                            WHEN p.concepto ILIKE '%%Septiembre%%' THEN 9
                            WHEN p.concepto ILIKE '%%Octubre%%' THEN 10
                            WHEN p.concepto ILIKE '%%Noviembre%%' THEN 11
                            WHEN p.concepto ILIKE '%%Diciembre%%' THEN 12
                            ELSE EXTRACT(MONTH FROM p.fecha_pago)
                        END as mes,
                        COUNT(p.id) as cantidad_pagos,
                        COALESCE(SUM(p.monto), 0) as total_pagado
                    FROM pagos p
                    WHERE p.cliente_id = %s 
                    AND EXTRACT(YEAR FROM p.fecha_pago) = %s
                    AND p.estado = 'completado'
                    GROUP BY 
                        CASE 
                            WHEN p.concepto ILIKE '%%Enero%%' THEN 1
                            WHEN p.concepto ILIKE '%%Febrero%%' THEN 2
                            WHEN p.concepto ILIKE '%%Marzo%%' THEN 3
                            WHEN p.concepto ILIKE '%%Abril%%' THEN 4
                            WHEN p.concepto ILIKE '%%Mayo%%' THEN 5
                            WHEN p.concepto ILIKE '%%Junio%%' THEN 6
                            WHEN p.concepto ILIKE '%%Julio%%' THEN 7
                            WHEN p.concepto ILIKE '%%Agosto%%' THEN 8
                            WHEN p.concepto ILIKE '%%Septiembre%%' THEN 9
                            WHEN p.concepto ILIKE '%%Octubre%%' THEN 10
                            WHEN p.concepto ILIKE '%%Noviembre%%' THEN 11
                            WHEN p.concepto ILIKE '%%Diciembre%%' THEN 12
                            ELSE EXTRACT(MONTH FROM p.fecha_pago)
                        END
                    ORDER BY mes
                """, [cliente_id, year])
                
                pagos_por_mes = cursor.fetchall()
                
                # Crear estructura con todos los 12 meses del año
                meses_estado = {}
                total_anual = 0
                pagos_anual = 0
                meses_con_pagos = set()
                
                # Procesar los meses que tienen pagos reales
                # Usar un diccionario temporal para acumular datos por mes
                meses_temp = {}
                
                for pago_mes in pagos_por_mes:
                    mes = int(pago_mes[0])
                    cantidad_pagos = pago_mes[1]
                    total_pagado = float(pago_mes[2])
                    
                    if mes in meses_temp:
                        # Si ya existe, sumar los valores
                        meses_temp[mes]['cantidad_pagos'] += cantidad_pagos
                        meses_temp[mes]['total_pagado'] += total_pagado
                    else:
                        # Si es nuevo, crear entrada
                        meses_temp[mes] = {
                            'pagado': True,
                            'cantidad_pagos': cantidad_pagos,
                            'total_pagado': total_pagado,
                            'color': 'green'
                        }
                
                # Transferir datos acumulados al diccionario final
                for mes, datos in meses_temp.items():
                    meses_estado[mes] = datos
                    total_anual += datos['total_pagado']
                    pagos_anual += datos['cantidad_pagos']
                    meses_con_pagos.add(mes)
                
                # Agregar todos los meses del año (1-12) que no tienen pagos
                for mes in range(1, 13):
                    if mes not in meses_estado:
                        meses_estado[mes] = {
                            'pagado': False,
                            'cantidad_pagos': 0,
                            'total_pagado': 0,
                            'color': 'red'
                        }
                
                # Calcular meses pagados y sin pagar
                meses_pagados = len(meses_con_pagos)
                meses_sin_pagar = 12 - meses_pagados
                
                # Calcular porcentaje de cumplimiento basado en los 12 meses
                porcentaje_cumplimiento = (meses_pagados / 12) * 100.0
                
                clientes.append({
                    'id': cliente_id,
                    'cedula': cedula,
                    'nombres': nombres,
                    'apellidos': apellidos,
                    'nombre_completo': f"{nombres} {apellidos}",
                    'tipo_plan': tipo_plan,
                    'precio_plan': float(precio_plan),
                    'sector': sector,
                    'estado': estado,
                    'fecha_registro': fecha_registro.isoformat() if fecha_registro else None,
                    'meses_estado': meses_estado,
                    'total_anual': total_anual,
                    'pagos_anual': pagos_anual,
                    'meses_pagados': meses_pagados,
                    'meses_sin_pagar': meses_sin_pagar,
                    'porcentaje_cumplimiento': porcentaje_cumplimiento
                })
        
        return Response({
            'success': True,
            'data': {
                'anio': int(year),
                'clientes': clientes,
                'total_clientes': len(clientes),
                'resumen': {
                    'total_recaudado_anio': sum(c['total_anual'] for c in clientes),
                    'total_pagos_anio': sum(c['pagos_anual'] for c in clientes),
                    'promedio_cumplimiento': 100.0 if any(c['pagos_anual'] > 0 for c in clientes) else 0.0
                }
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def obtener_sectores(request):
    """Obtener todos los sectores únicos de la base de datos"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        with connection.cursor() as cursor:
            # Intentar obtener sectores desde la tabla sectores (estructura normalizada)
            try:
                cursor.execute("""
                    SELECT DISTINCT s.nombre_sector 
                    FROM sectores s
                    WHERE s.estado = 'activo'
                    AND s.nombre_sector IS NOT NULL 
                    AND s.nombre_sector != '' 
                    AND TRIM(s.nombre_sector) != ''
                    ORDER BY s.nombre_sector
                """)
                sectores = [row[0].strip() for row in cursor.fetchall() if row[0]]
            except Exception as db_error:
                logger.warning(f"Error al consultar sectores desde tabla sectores: {str(db_error)}")
                # Fallback: intentar desde clientes con JOIN
                try:
                    cursor.execute("""
                        SELECT DISTINCT s.nombre_sector 
                        FROM clientes c
                        JOIN sectores s ON c.id_sector = s.id_sector
                        WHERE s.nombre_sector IS NOT NULL 
                        AND s.nombre_sector != '' 
                        AND TRIM(s.nombre_sector) != ''
                        ORDER BY s.nombre_sector
                    """)
                    sectores = [row[0].strip() for row in cursor.fetchall() if row[0]]
                except Exception as fallback_error:
                    logger.warning(f"Error en fallback de sectores: {str(fallback_error)}")
                    # Si no hay tabla de sectores, retornar lista vacía
                    sectores = []
        
        # Limpiar y validar sectores
        sectores = [s for s in sectores if s and isinstance(s, str) and len(s.strip()) > 0]
        
        logger.info(f"Sectores obtenidos: {len(sectores)}")
        
        return Response({
            'success': True,
            'sectores': sectores
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error al obtener sectores: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'sectores': [],
            'message': f'Error al obtener sectores: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def debug_pagos_reales(request):
    """Función de debug para ver los pagos reales en la base de datos"""
    try:
        year = request.GET.get('year', 2025)
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    id, cliente_id, monto, fecha_pago, metodo_pago, concepto, estado, comprobante_enviado, numero_comprobante
                FROM pagos 
                WHERE EXTRACT(YEAR FROM fecha_pago) = %s
                ORDER BY fecha_pago
            """, [year])
            
            pagos = []
            for row in cursor.fetchall():
                pagos.append({
                    'id': row[0],
                    'cliente_id': row[1],
                    'monto': float(row[2]),
                    'fecha_pago': row[3].isoformat() if row[3] else None,
                    'metodo_pago': row[4],
                    'concepto': row[5],
                    'estado': row[6],
                    'comprobante_enviado': row[7],
                    'numero_comprobante': row[8]
                })
        
        return Response({
            'success': True,
            'year': int(year),
            'total_pagos': len(pagos),
            'pagos': pagos
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al obtener pagos reales: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def debug_gastos_reales(request):
    """Función de debug para ver los gastos reales en la base de datos"""
    try:
        year = request.GET.get('year', None)
        
        with connection.cursor() as cursor:
            if year:
                cursor.execute("""
                    SELECT 
                        id, descripcion, categoria, monto, fecha_gasto, proveedor, metodo_pago, usuario_id
                    FROM gastos 
                    WHERE EXTRACT(YEAR FROM fecha_gasto) = %s
                    ORDER BY fecha_gasto
                """, [year])
            else:
                cursor.execute("""
                    SELECT 
                        id, descripcion, categoria, monto, fecha_gasto, proveedor, metodo_pago, usuario_id
                    FROM gastos 
                    ORDER BY fecha_gasto
                """)
            
            gastos = []
            for row in cursor.fetchall():
                gastos.append({
                    'id': row[0],
                    'descripcion': row[1],
                    'categoria': row[2],
                    'monto': float(row[3]),
                    'fecha_gasto': row[4].isoformat() if row[4] else None,
                    'proveedor': row[5],
                    'metodo_pago': row[6],
                    'usuario_id': row[7]
                })
        
        return Response({
            'success': True,
            'year': int(year) if year else 'todos',
            'total_gastos': len(gastos),
            'gastos': gastos
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al obtener gastos reales: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def utilidades_anuales(request):
    """Obtener utilidades anuales (recaudación, gastos, utilidad)"""
    try:
        year = request.GET.get('year', datetime.now().year)
        
        with connection.cursor() as cursor:
            # Obtener recaudación anual
            cursor.execute("""
                SELECT COALESCE(SUM(monto), 0) 
                FROM pagos 
                WHERE EXTRACT(YEAR FROM fecha_pago) = %s
            """, [year])
            recaudacion_anual = cursor.fetchone()[0] or 0
            
            # Obtener gastos anuales
            cursor.execute("""
                SELECT COALESCE(SUM(monto), 0) 
                FROM gastos 
                WHERE EXTRACT(YEAR FROM fecha_gasto) = %s
            """, [year])
            gastos_anuales = cursor.fetchone()[0] or 0
            
            # Calcular utilidad
            utilidad_anual = float(recaudacion_anual) - float(gastos_anuales)
            
            # Obtener estadísticas adicionales
            cursor.execute("""
                SELECT COUNT(*) 
                FROM pagos 
                WHERE EXTRACT(YEAR FROM fecha_pago) = %s
            """, [year])
            total_pagos = cursor.fetchone()[0] or 0
            
            cursor.execute("""
                SELECT COUNT(*) 
                FROM gastos 
                WHERE EXTRACT(YEAR FROM fecha_gasto) = %s
            """, [year])
            total_gastos = cursor.fetchone()[0] or 0
        
        return Response({
            'success': True,
            'anio': int(year),
            'recaudacion_anual': float(recaudacion_anual),
            'gastos_anuales': float(gastos_anuales),
            'utilidad_anual': utilidad_anual,
            'total_pagos': total_pagos,
            'total_gastos': total_gastos,
            'porcentaje_utilidad': (utilidad_anual / float(recaudacion_anual) * 100) if recaudacion_anual > 0 else 0
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al obtener utilidades: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_grafico_anual_recaudacion(request):
    """
    Reporte gráfico anual de recaudación mensual
    Muestra la recaudación por mes durante un año específico
    """
    try:
        year = request.GET.get('year', datetime.now().year)
        
        with connection.cursor() as cursor:
            # Obtener recaudación mensual para el año especificado
            cursor.execute("""
                SELECT 
                    EXTRACT(MONTH FROM fecha_pago) as mes,
                    COALESCE(SUM(monto), 0) as total_recaudado,
                    COUNT(*) as total_pagos
                FROM pagos 
                WHERE EXTRACT(YEAR FROM fecha_pago) = %s
                GROUP BY EXTRACT(MONTH FROM fecha_pago)
                ORDER BY mes
            """, [year])
            
            # Crear diccionario solo con los meses que tienen datos reales
            recaudacion_mensual = {}
            meses_con_datos = set()
            
            # Primero obtener todos los meses que tienen datos
            for row in cursor.fetchall():
                mes = int(row[0])
                meses_con_datos.add(mes)
                recaudacion_mensual[mes] = {
                    'mes': mes,
                    'nombre_mes': calendar.month_name[mes],
                    'nombre_mes_corto': calendar.month_abbr[mes],
                    'total_recaudado': float(row[1]),
                    'total_pagos': int(row[2]),
                    'es_mayor_recaudacion': False,
                    'es_menor_recaudacion': False
                }
            
            # Si no hay datos, mostrar solo el mes actual
            if not meses_con_datos:
                mes_actual = datetime.now().month
                recaudacion_mensual[mes_actual] = {
                    'mes': mes_actual,
                    'nombre_mes': calendar.month_name[mes_actual],
                    'nombre_mes_corto': calendar.month_abbr[mes_actual],
                    'total_recaudado': 0.0,
                    'total_pagos': 0,
                    'es_mayor_recaudacion': False,
                    'es_menor_recaudacion': False
                }
            

            
            # Convertir a lista y encontrar valores máximos y mínimos
            datos_mensuales = list(recaudacion_mensual.values())
            valores_recaudacion = [d['total_recaudado'] for d in datos_mensuales]
            
            if valores_recaudacion:
                max_recaudacion = max(valores_recaudacion)
                min_recaudacion = min(valores_recaudacion)
                
                # Marcar meses con mayor y menor recaudación
                for dato in datos_mensuales:
                    if dato['total_recaudado'] == max_recaudacion and max_recaudacion > 0:
                        dato['es_mayor_recaudacion'] = True
                    if dato['total_recaudado'] == min_recaudacion:
                        dato['es_menor_recaudacion'] = True
            
            # Calcular estadísticas generales
            total_anual = sum(d['total_recaudado'] for d in datos_mensuales)
            total_pagos_anual = sum(d['total_pagos'] for d in datos_mensuales)
            promedio_mensual = total_anual / len(datos_mensuales) if datos_mensuales else 0
            
            # Encontrar meses con mayor y menor recaudación
            meses_mayor_recaudacion = [d for d in datos_mensuales if d['es_mayor_recaudacion']]
            meses_menor_recaudacion = [d for d in datos_mensuales if d['es_menor_recaudacion']]
            
            # Calcular variación mensual
            variacion_mensual = []
            for i, dato in enumerate(datos_mensuales):
                if i == 0:
                    variacion = 0
                else:
                    mes_anterior = datos_mensuales[i-1]['total_recaudado']
                    if mes_anterior > 0:
                        variacion = ((dato['total_recaudado'] - mes_anterior) / mes_anterior) * 100
                    else:
                        variacion = 0 if dato['total_recaudado'] == 0 else 100
                
                variacion_mensual.append({
                    'mes': dato['mes'],
                    'nombre_mes': dato['nombre_mes'],
                    'variacion_porcentual': round(variacion, 2)
                })
        
        return Response({
            'success': True,
            'anio': int(year),
            'datos_mensuales': datos_mensuales,
            'estadisticas': {
                'total_anual': total_anual,
                'total_pagos_anual': total_pagos_anual,
                'promedio_mensual': round(promedio_mensual, 2),
                'meses_mayor_recaudacion': meses_mayor_recaudacion,
                'meses_menor_recaudacion': meses_menor_recaudacion
            },
            'variacion_mensual': variacion_mensual,
            'fecha_generacion': datetime.now().isoformat()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al generar reporte gráfico anual: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def descargar_reporte_grafico_pdf(request):
    """
    Descargar reporte gráfico anual en PDF usando ReportLab
    """
    try:
        # Importaciones de ReportLab comentadas temporalmente
        # from reportlab.lib.pagesizes import letter, landscape
        # from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        # from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        # from reportlab.lib.units import inch
        # from reportlab.lib import colors
        from io import BytesIO
        
        year = request.GET.get('year', datetime.now().year)
        
        # Obtener datos del reporte
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    EXTRACT(MONTH FROM fecha_pago) as mes,
                    COALESCE(SUM(monto), 0) as total_recaudado,
                    COUNT(*) as total_pagos
                FROM pagos 
                WHERE EXTRACT(YEAR FROM fecha_pago) = %s
                GROUP BY EXTRACT(MONTH FROM fecha_pago)
                ORDER BY mes
            """, [year])
            
            # Crear diccionario solo con los meses que tienen datos reales
            recaudacion_mensual = {}
            meses_con_datos = set()
            
            # Obtener todos los meses que tienen datos
            for row in cursor.fetchall():
                mes = int(row[0])
                meses_con_datos.add(mes)
                recaudacion_mensual[mes] = {
                    'mes': mes,
                    'nombre_mes': calendar.month_name[mes],
                    'nombre_mes_corto': calendar.month_abbr[mes],
                    'total_recaudado': float(row[1]),
                    'total_pagos': int(row[2]),
                    'es_mayor_recaudacion': False,
                    'es_menor_recaudacion': False
                }
            
            # Si no hay datos, mostrar solo el mes actual
            if not meses_con_datos:
                mes_actual = datetime.now().month
                recaudacion_mensual[mes_actual] = {
                    'mes': mes_actual,
                    'nombre_mes': calendar.month_name[mes_actual],
                    'nombre_mes_corto': calendar.month_abbr[mes_actual],
                    'total_recaudado': 0.0,
                    'total_pagos': 0,
                    'es_mayor_recaudacion': False,
                    'es_menor_recaudacion': False
                }
            
            datos_mensuales = list(recaudacion_mensual.values())
            valores_recaudacion = [d['total_recaudado'] for d in datos_mensuales]
            
            if valores_recaudacion:
                max_recaudacion = max(valores_recaudacion)
                min_recaudacion = min(valores_recaudacion)
                
                for dato in datos_mensuales:
                    if dato['total_recaudado'] == max_recaudacion and max_recaudacion > 0:
                        dato['es_mayor_recaudacion'] = True
                    if dato['total_recaudado'] == min_recaudacion:
                        dato['es_menor_recaudacion'] = True
            
            total_anual = sum(d['total_recaudado'] for d in datos_mensuales)
            total_pagos_anual = sum(d['total_pagos'] for d in datos_mensuales)
            promedio_mensual = total_anual / len(datos_mensuales) if datos_mensuales else 0
        
        # Crear buffer para el PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
        story = []
        
        # Estilos
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=1  # Centrado
        )
        normal_style = styles['Normal']
        
        # Título
        story.append(Paragraph(f"Reporte Gráfico Anual de Recaudación - {year}", title_style))
        story.append(Paragraph(f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", normal_style))
        story.append(Spacer(1, 20))
        
        # Estadísticas principales
        stats_data = [
            ['Total Recaudado Anual', f"${total_anual:,.2f}"],
            ['Promedio Mensual', f"${promedio_mensual:,.2f}"],
            ['Total de Pagos', str(total_pagos_anual)],
            ['Año Analizado', str(year)]
        ]
        
        stats_table = Table(stats_data, colWidths=[2*inch, 1.5*inch])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightblue),
            ('BACKGROUND', (1, 0), (1, -1), colors.lightgrey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(stats_table)
        story.append(Spacer(1, 30))
        
        # Tabla de datos mensuales
        if datos_mensuales:
            table_data = [['Mes', 'Recaudación ($)', 'Total Pagos', 'Estado']]
            
            for dato in datos_mensuales:
                estado = "Mayor" if dato['es_mayor_recaudacion'] else "Menor" if dato['es_menor_recaudacion'] else "Normal"
                table_data.append([
                    dato['nombre_mes'],
                    f"${dato['total_recaudado']:,.2f}",
                    str(dato['total_pagos']),
                    estado
                ])
            
            # Agregar fila de total
            table_data.append(['TOTAL ANUAL', f"${total_anual:,.2f}", str(total_pagos_anual), ''])
            
            table = Table(table_data, colWidths=[1.5*inch, 1.5*inch, 1*inch, 1*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
                ('BACKGROUND', (0, -1), (-1, -1), colors.lightgreen),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(table)
        else:
            story.append(Paragraph("No hay datos para mostrar", normal_style))
        
        story.append(Spacer(1, 20))
        story.append(Paragraph("Reporte generado automáticamente por el sistema TelTec", normal_style))
        
        # Construir PDF
        doc.build(story)
        pdf_content = buffer.getvalue()
        buffer.close()
        
        # Crear respuesta HTTP
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="reporte_recaudacion_anual_{year}.pdf"'
        
        return response
        
    except ImportError:
        return Response({
            'success': False,
            'message': 'Error: ReportLab no está instalado'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al generar PDF: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_dashboard(request):
    """Reporte del dashboard principal con estadísticas generales"""
    try:
        with connection.cursor() as cursor:
            # Estadísticas generales usando la vista normalizada
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_clientes,
                    COUNT(CASE WHEN estado_pago = 'al_dia' THEN 1 END) as clientes_al_dia,
                    COUNT(CASE WHEN estado_pago = 'vencido' THEN 1 END) as clientes_vencidos,
                    COUNT(CASE WHEN estado_pago = 'pendiente' THEN 1 END) as clientes_pendientes,
                    COALESCE(SUM(monto_total_deuda), 0) as total_deuda,
                    COALESCE(AVG(monto_total_deuda), 0) as promedio_deuda,
                    COALESCE(SUM(total_pagado), 0) as total_recaudado
                FROM clientes_deuda
                WHERE estado = 'activo'
            """)
            
            stats = cursor.fetchone()
            
            # Top 5 deudores
            cursor.execute("""
                SELECT nombres, apellidos, cedula, monto_total_deuda, meses_pendientes
                FROM clientes_deuda
                WHERE estado = 'activo' AND monto_total_deuda > 0
                ORDER BY monto_total_deuda DESC
                LIMIT 5
            """)
            
            top_deudores = []
            for row in cursor.fetchall():
                top_deudores.append({
                    'nombres': row[0],
                    'apellidos': row[1],
                    'cedula': row[2],
                    'monto_deuda': float(row[3]),
                    'meses_pendientes': row[4]
                })
            
            # Recaudación del mes actual
            current_month = datetime.now().month
            current_year = datetime.now().year
            
            cursor.execute("""
                SELECT COALESCE(SUM(monto), 0) as recaudacion_mes
                FROM pagos
                WHERE EXTRACT(MONTH FROM fecha_pago) = %s 
                AND EXTRACT(YEAR FROM fecha_pago) = %s
                AND estado = 'completado'
            """, [current_month, current_year])
            
            recaudacion_mes = cursor.fetchone()[0] or 0
            
        return Response({
            'success': True,
            'data': {
                'estadisticas_generales': {
                    'total_clientes': stats[0],
                    'clientes_al_dia': stats[1],
                    'clientes_vencidos': stats[2],
                    'clientes_pendientes': stats[3],
                    'total_deuda': float(stats[4]),
                    'promedio_deuda': float(stats[5]),
                    'total_recaudado': float(stats[6])
                },
                'top_deudores': top_deudores,
                'recaudacion_mes_actual': float(recaudacion_mes),
                'fecha_generacion': datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_deudas_resumen(request):
    """Reporte resumido de deudas usando la vista normalizada"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_clientes,
                    COUNT(CASE WHEN estado_pago = 'al_dia' THEN 1 END) as al_dia,
                    COUNT(CASE WHEN estado_pago = 'vencido' THEN 1 END) as vencidos,
                    COUNT(CASE WHEN estado_pago = 'pendiente' THEN 1 END) as pendientes,
                    COUNT(CASE WHEN estado_pago = 'por_vencer' THEN 1 END) as por_vencer,
                    COALESCE(SUM(monto_total_deuda), 0) as deuda_total,
                    COALESCE(SUM(total_pagado), 0) as pagado_total,
                    COALESCE(AVG(monto_total_deuda), 0) as deuda_promedio
                FROM clientes_deuda
                WHERE estado = 'activo'
            """)
            
            resumen = cursor.fetchone()
            
        return Response({
            'success': True,
            'data': {
                'resumen_deudas': {
                    'total_clientes': resumen[0],
                    'al_dia': resumen[1],
                    'vencidos': resumen[2],
                    'pendientes': resumen[3],
                    'por_vencer': resumen[4],
                    'deuda_total': float(resumen[5]),
                    'pagado_total': float(resumen[6]),
                    'deuda_promedio': float(resumen[7])
                },
                'fecha_generacion': datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_deudas_detalle(request):
    """Reporte detallado de deudas por cliente"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        year = request.GET.get('year', datetime.now().year)
        offset = (page - 1) * page_size
        
        with connection.cursor() as cursor:
            # Total de registros para el año especificado
            cursor.execute("""
                SELECT COUNT(*) FROM clientes_deuda 
                WHERE estado = 'activo' AND EXTRACT(YEAR FROM fecha_registro) <= %s
            """, [year])
            total_registros = cursor.fetchone()[0]
            
            # Registros paginados para el año especificado
            cursor.execute("""
                SELECT 
                    id, nombres, apellidos, cedula, sector,
                    tipo_plan, precio_plan, fecha_registro,
                    meses_pendientes, monto_total_deuda, total_pagado,
                    estado_pago, fecha_ultimo_pago, fecha_vencimiento_pago
                FROM clientes_deuda
                WHERE estado = 'activo' AND EXTRACT(YEAR FROM fecha_registro) <= %s
                ORDER BY monto_total_deuda DESC
                LIMIT %s OFFSET %s
            """, [year, page_size, offset])
            
            clientes = []
            for row in cursor.fetchall():
                clientes.append({
                    'id': row[0],
                    'nombres': row[1],
                    'apellidos': row[2],
                    'cedula': row[3],
                    'sector': row[4],
                    'tipo_plan': row[5],
                    'precio_plan': float(row[6]),
                    'fecha_registro': row[7].isoformat() if row[7] else None,
                    'meses_pendientes': row[8],
                    'monto_total_deuda': float(row[9]),
                    'total_pagado': float(row[10]),
                    'estado_pago': row[11],
                    'fecha_ultimo_pago': row[12].isoformat() if row[12] else None,
                    'fecha_vencimiento_pago': row[13].isoformat() if row[13] else None
                })
            
        return Response({
            'success': True,
            'data': {
                'year': int(year),
                'clientes': clientes,
                'paginacion': {
                    'pagina_actual': page,
                    'tamano_pagina': page_size,
                    'total_registros': total_registros,
                    'total_paginas': (total_registros + page_size - 1) // page_size
                },
                'fecha_generacion': datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_top_deudores(request):
    """Reporte de los principales deudores"""
    try:
        limit = int(request.GET.get('limit', 10))
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    nombres, apellidos, cedula, sector,
                    monto_total_deuda, meses_pendientes, estado_pago,
                    fecha_ultimo_pago, total_pagado
                FROM clientes_deuda
                WHERE estado = 'activo' AND monto_total_deuda > 0
                ORDER BY monto_total_deuda DESC
                LIMIT %s
            """, [limit])
            
            top_deudores = []
            for row in cursor.fetchall():
                top_deudores.append({
                    'nombres': row[0],
                    'apellidos': row[1],
                    'cedula': row[2],
                    'sector': row[3],
                    'monto_deuda': float(row[4]),
                    'meses_pendientes': row[5],
                    'estado_pago': row[6],
                    'fecha_ultimo_pago': row[7].isoformat() if row[7] else None,
                    'total_pagado': float(row[8])
                })
            
        return Response({
            'success': True,
            'data': {
                'top_deudores': top_deudores,
                'fecha_generacion': datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_sectores_deuda(request):
    """Reporte de deudas por sector"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    sector,
                    COUNT(*) as total_clientes,
                    COUNT(CASE WHEN estado_pago = 'al_dia' THEN 1 END) as al_dia,
                    COUNT(CASE WHEN estado_pago = 'vencido' THEN 1 END) as vencidos,
                    COUNT(CASE WHEN estado_pago = 'pendiente' THEN 1 END) as pendientes,
                    COALESCE(SUM(monto_total_deuda), 0) as deuda_total,
                    COALESCE(SUM(total_pagado), 0) as pagado_total,
                    COALESCE(AVG(monto_total_deuda), 0) as deuda_promedio
                FROM clientes_deuda
                WHERE estado = 'activo'
                GROUP BY sector
                ORDER BY deuda_total DESC
            """)
            
            sectores = []
            for row in cursor.fetchall():
                sectores.append({
                    'sector': row[0],
                    'total_clientes': row[1],
                    'al_dia': row[2],
                    'vencidos': row[3],
                    'pendientes': row[4],
                    'deuda_total': float(row[5]),
                    'pagado_total': float(row[6]),
                    'deuda_promedio': float(row[7])
                })
            
        return Response({
            'success': True,
            'data': {
                'sectores': sectores,
                'fecha_generacion': datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_recaudacion_mensual(request):
    """Reporte de recaudación mensual"""
    try:
        year = int(request.GET.get('year', datetime.now().year))
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    EXTRACT(MONTH FROM fecha_pago) as mes,
                    COUNT(*) as total_pagos,
                    COALESCE(SUM(monto), 0) as total_recaudado,
                    COUNT(DISTINCT cliente_id) as clientes_activos
                FROM pagos
                WHERE EXTRACT(YEAR FROM fecha_pago) = %s
                AND estado = 'completado'
                GROUP BY EXTRACT(MONTH FROM fecha_pago)
                ORDER BY mes
            """, [year])
            
            meses = []
            for row in cursor.fetchall():
                mes_num = int(row[0])
                meses.append({
                    'mes': mes_num,
                    'nombre_mes': calendar.month_name[mes_num],
                    'nombre_mes_corto': calendar.month_abbr[mes_num],
                    'total_pagos': row[1],
                    'total_recaudado': float(row[2]),
                    'clientes_activos': row[3]
                })
            
        return Response({
            'success': True,
            'data': {
                'anio': year,
                'meses': meses,
                'fecha_generacion': datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_recaudacion_anual(request):
    """Reporte de recaudación anual comparativa"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    EXTRACT(YEAR FROM fecha_pago) as anio,
                    COUNT(*) as total_pagos,
                    COALESCE(SUM(monto), 0) as total_recaudado,
                    COUNT(DISTINCT cliente_id) as clientes_activos,
                    COALESCE(AVG(monto), 0) as promedio_pago
                FROM pagos
                WHERE estado = 'completado'
                GROUP BY EXTRACT(YEAR FROM fecha_pago)
                ORDER BY anio DESC
            """)
            
            anios = []
            for row in cursor.fetchall():
                anios.append({
                    'anio': int(row[0]),
                    'total_pagos': row[1],
                    'total_recaudado': float(row[2]),
                    'clientes_activos': row[3],
                    'promedio_pago': float(row[4])
                })
            
        return Response({
            'success': True,
            'data': {
                'anios': anios,
                'fecha_generacion': datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_clientes_estado(request):
    """Reporte de clientes por estado de pago"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    estado_pago,
                    COUNT(*) as total_clientes,
                    COALESCE(SUM(monto_total_deuda), 0) as deuda_total,
                    COALESCE(SUM(total_pagado), 0) as pagado_total,
                    COALESCE(AVG(meses_pendientes), 0) as meses_promedio
                FROM clientes_deuda
                WHERE estado = 'activo'
                GROUP BY estado_pago
                ORDER BY deuda_total DESC
            """)
            
            estados = []
            for row in cursor.fetchall():
                estados.append({
                    'estado_pago': row[0],
                    'total_clientes': row[1],
                    'deuda_total': float(row[2]),
                    'pagado_total': float(row[3]),
                    'meses_promedio': float(row[4])
                })
            
        return Response({
            'success': True,
            'data': {
                'estados': estados,
                'fecha_generacion': datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_morosidad(request):
    """Reporte de morosidad del sistema"""
    try:
        with connection.cursor() as cursor:
            # Clientes vencidos
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_vencidos,
                    COALESCE(SUM(monto_total_deuda), 0) as deuda_vencida,
                    COALESCE(AVG(meses_pendientes), 0) as meses_promedio
                FROM clientes_deuda
                WHERE estado = 'activo' AND estado_pago = 'vencido'
            """)
            
            vencidos = cursor.fetchone()
            
            # Distribución por meses de mora
            cursor.execute("""
                SELECT 
                    meses_pendientes,
                    COUNT(*) as cantidad_clientes,
                    COALESCE(SUM(monto_total_deuda), 0) as deuda_total
                FROM clientes_deuda
                WHERE estado = 'activo' AND estado_pago = 'vencido'
                GROUP BY meses_pendientes
                ORDER BY meses_pendientes DESC
            """)
            
            distribucion_meses = []
            for row in cursor.fetchall():
                distribucion_meses.append({
                    'meses_pendientes': row[0],
                    'cantidad_clientes': row[1],
                    'deuda_total': float(row[2])
                })
            
        return Response({
            'success': True,
            'data': {
                'resumen_vencidos': {
                    'total_vencidos': vencidos[0],
                    'deuda_vencida': float(vencidos[1]),
                    'meses_promedio': float(vencidos[2])
                },
                'distribucion_meses': distribucion_meses,
                'fecha_generacion': datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_eficiencia_cobranza(request):
    """Reporte de eficiencia en cobranza"""
    try:
        with connection.cursor() as cursor:
            # Eficiencia general
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_clientes,
                    COUNT(CASE WHEN estado_pago = 'al_dia' THEN 1 END) as al_dia,
                    COUNT(CASE WHEN estado_pago IN ('vencido', 'pendiente') THEN 1 END) as con_deuda,
                    COALESCE(SUM(total_pagado), 0) as total_recaudado,
                    COALESCE(SUM(monto_total_deuda), 0) as total_deuda
                FROM clientes_deuda
                WHERE estado = 'activo'
            """)
            
            eficiencia = cursor.fetchone()
            
            # Calcular porcentajes
            total_clientes = eficiencia[0]
            al_dia = eficiencia[1]
            con_deuda = eficiencia[2]
            
            porcentaje_al_dia = (al_dia / total_clientes * 100) if total_clientes > 0 else 0
            porcentaje_con_deuda = (con_deuda / total_clientes * 100) if total_clientes > 0 else 0
            
            # Calcular porcentaje cobrado
            total_recaudado = float(eficiencia[3])
            total_deuda = float(eficiencia[4])
            porcentaje_cobrado = 0
            if (total_recaudado + total_deuda) > 0:
                porcentaje_cobrado = round((total_recaudado / (total_recaudado + total_deuda)) * 100, 2)
            
        return Response({
            'success': True,
            'data': {
                'eficiencia_general': {
                    'total_clientes': total_clientes,
                    'al_dia': al_dia,
                    'con_deuda': con_deuda,
                    'porcentaje_al_dia': round(porcentaje_al_dia, 2),
                    'porcentaje_con_deuda': round(porcentaje_con_deuda, 2)
                },
                'recaudacion': {
                    'total_recaudado': total_recaudado,
                    'total_deuda': total_deuda,
                    'porcentaje_cobrado': porcentaje_cobrado
                },
                'fecha_generacion': datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def reporte_proyecciones(request):
    """Reporte de proyecciones futuras"""
    try:
        with connection.cursor() as cursor:
            # Proyección de recaudación basada en clientes activos
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_clientes,
                    COALESCE(SUM(precio_plan), 0) as recaudacion_mensual_potencial,
                    COALESCE(AVG(precio_plan), 0) as promedio_plan
                FROM clientes_deuda
                WHERE estado = 'activo'
            """)
            
            proyeccion = cursor.fetchone()
            
            # Calcular proyecciones
            recaudacion_mensual = float(proyeccion[1])
            proyeccion_3_meses = recaudacion_mensual * 3
            proyeccion_6_meses = recaudacion_mensual * 6
            proyeccion_12_meses = recaudacion_mensual * 12
            
        return Response({
            'success': True,
            'data': {
                'proyecciones': {
                    'total_clientes': proyeccion[0],
                    'recaudacion_mensual_potencial': recaudacion_mensual,
                    'promedio_plan': float(proyeccion[2]),
                    'proyeccion_3_meses': proyeccion_3_meses,
                    'proyeccion_6_meses': proyeccion_6_meses,
                    'proyeccion_12_meses': proyeccion_12_meses
                },
                'fecha_generacion': datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def exportar_reporte_excel(request):
    """Exportar reporte a Excel (placeholder)"""
    return Response({
        'success': True,
        'message': 'Función de exportación a Excel en desarrollo',
        'data': {
            'formato': 'Excel (.xlsx)',
            'estado': 'En desarrollo'
        }
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def exportar_reporte_pdf(request):
    """Exportar reporte a PDF (placeholder)"""
    return Response({
        'success': True,
        'message': 'Función de exportación a PDF en desarrollo',
        'data': {
            'formato': 'PDF',
            'estado': 'En desarrollo'
        }
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def pagos_reales(request):
    """Obtener pagos reales para el reporte de pagos"""
    try:
        year = request.GET.get('year', datetime.now().year)
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    p.id, p.numero_comprobante, p.fecha_pago, 
                    c.nombres || ' ' || c.apellidos as cliente_nombre,
                    c.cedula as cliente_cedula,
                    COALESCE(pl.tipo_plan, 'Sin plan') as tipo_plan,
                    p.concepto, p.metodo_pago, p.monto, p.estado,
                    p.comprobante_enviado
                FROM pagos p
                JOIN clientes c ON p.cliente_id = c.id
                LEFT JOIN clientes_planes cp ON c.id = cp.id_cliente AND cp.estado = 'activo'
                LEFT JOIN planes pl ON cp.id_plan = pl.id_plan
                WHERE EXTRACT(YEAR FROM p.fecha_pago) = %s
                ORDER BY p.fecha_pago DESC
            """, [year])
            
            pagos = []
            for row in cursor.fetchall():
                pagos.append({
                    'id': row[0],
                    'numero_comprobante': row[1],
                    'fecha_pago': row[2].isoformat() if row[2] else None,
                    'cliente_nombre': row[3],
                    'cliente_cedula': row[4],
                    'tipo_plan': row[5],
                    'concepto': row[6],
                    'metodo_pago': row[7],
                    'monto': float(row[8]),
                    'estado': row[9],
                    'comprobante_enviado': row[10]
                })
        
        return Response({
            'success': True,
            'pagos': pagos,
            'total_pagos': len(pagos),
            'total_monto': sum(p['monto'] for p in pagos)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al obtener pagos reales: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def gastos_reales(request):
    """Obtener gastos reales para el reporte de gastos"""
    try:
        year = request.GET.get('year', datetime.now().year)
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    g.id, g.fecha_gasto, g.descripcion, g.categoria, g.monto,
                    g.proveedor, g.metodo_pago, u.nombre as usuario_nombre
                FROM gastos g
                LEFT JOIN usuarios u ON g.usuario_id = u.id
                WHERE EXTRACT(YEAR FROM g.fecha_gasto) = %s
                ORDER BY g.fecha_gasto DESC
            """, [year])
            
            gastos = []
            for row in cursor.fetchall():
                gastos.append({
                    'id': row[0],
                    'fecha_gasto': row[1].isoformat() if row[1] else None,
                    'descripcion': row[2],
                    'categoria': row[3],
                    'monto': float(row[4]),
                    'proveedor': row[5],
                    'metodo_pago': row[6],
                    'usuario_nombre': row[7] or 'Sistema'
                })
        
        return Response({
            'success': True,
            'gastos': gastos,
            'total_gastos': len(gastos),
            'total_monto': sum(g['monto'] for g in gastos)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al obtener gastos reales: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def descargar_reporte_excel(request):
    """Descargar reporte completo en Excel"""
    try:
        import os
        from django.http import FileResponse
        import glob
        
        # Buscar el archivo más reciente
        reportes_path = os.path.join(os.path.dirname(__file__), '..')
        archivos = glob.glob(os.path.join(reportes_path, 'reporte_completo_*.xlsx'))
        
        if not archivos:
            return Response({
                'success': False,
                'message': 'No se encontraron reportes generados'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Obtener el archivo más reciente
        archivo_mas_reciente = max(archivos, key=os.path.getctime)
        
        # Crear respuesta de archivo
        response = FileResponse(
            open(archivo_mas_reciente, 'rb'),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(archivo_mas_reciente)}"'
        
        return response
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al descargar el archivo: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def descargar_reporte_detallado_excel(request):
    """Descargar reporte detallado en Excel"""
    try:
        import os
        from django.http import FileResponse
        import glob
        
        # Buscar el archivo más reciente
        reportes_path = os.path.join(os.path.dirname(__file__), '..')
        archivos = glob.glob(os.path.join(reportes_path, 'reporte_detallado_*.xlsx'))
        
        if not archivos:
            return Response({
                'success': False,
                'message': 'No se encontraron reportes detallados generados'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Obtener el archivo más reciente
        archivo_mas_reciente = max(archivos, key=os.path.getctime)
        
        # Crear respuesta de archivo
        response = FileResponse(
            open(archivo_mas_reciente, 'rb'),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(archivo_mas_reciente)}"'
        
        return response
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al descargar el archivo: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

