from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import uuid
from datetime import datetime, date

def can_edit_gasto(fecha_gasto):
    """Verificar si un gasto se puede editar (solo el mismo día)"""
    if isinstance(fecha_gasto, str):
        fecha_gasto = datetime.strptime(fecha_gasto, '%Y-%m-%d').date()
    return fecha_gasto == date.today()

@api_view(['GET'])
@permission_classes([AllowAny])
def list_gastos(request):
    """Listar todos los gastos con filtros"""
    try:
        # Obtener parámetros de filtro
        search = request.GET.get('search', '')
        categoria = request.GET.get('categoria', '')
        metodo_pago = request.GET.get('metodo_pago', '')
        
        # Construir la consulta SQL base
        query = """
            SELECT g.id, g.descripcion, g.categoria, g.monto, g.fecha_gasto, g.proveedor, 
                   g.metodo_pago, g.comprobante_url, g.usuario_id, g.fecha_creacion,
                   u.nombre as usuario_nombre
            FROM gastos g
            LEFT JOIN usuarios u ON g.usuario_id = u.id
            WHERE 1=1
        """
        params = []
        
        # Agregar filtros si están presentes
        if search:
            query += " AND (g.descripcion ILIKE %s OR g.proveedor ILIKE %s)"
            params.extend([f'%{search}%', f'%{search}%'])
        
        if categoria:
            query += " AND g.categoria = %s"
            params.append(categoria)
            
        if metodo_pago:
            query += " AND g.metodo_pago = %s"
            params.append(metodo_pago)
        
        query += " ORDER BY g.fecha_gasto DESC"
        
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            gastos = []
            for row in cursor.fetchall():
                gastos.append({
                    'id': row[0],
                    'descripcion': row[1],
                    'categoria': row[2],
                    'monto': float(row[3]) if row[3] else 0,
                    'fecha_gasto': row[4].isoformat() if row[4] else None,
                    'proveedor': row[5],
                    'metodo_pago': row[6],
                    'comprobante_url': row[7],
                    'usuario_id': row[8],
                    'fecha_creacion': row[9].isoformat() if row[9] else None,
                    'usuario_nombre': row[10] if row[10] else 'Usuario no encontrado'
                })
        
        return Response({
            'success': True,
            'data': gastos
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def create_gasto(request):
    """Crear nuevo gasto"""
    try:
        descripcion = request.data.get('descripcion')
        monto = request.data.get('monto')
        categoria = request.data.get('categoria', 'Otros')
        fecha_gasto = request.data.get('fecha_gasto')
        proveedor = request.data.get('proveedor', '')
        metodo_pago = request.data.get('metodo_pago', 'Efectivo')
        comprobante_file = request.FILES.get('comprobante')
        comprobante_url = request.data.get('comprobante_url', '')
        
        # Validaciones
        if not descripcion or not monto:
            return Response({
                'success': False,
                'message': 'Descripción y monto son requeridos'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Manejar archivo de comprobante
        final_comprobante_url = comprobante_url
        if comprobante_file:
            # Generar nombre único para el archivo
            file_extension = os.path.splitext(comprobante_file.name)[1]
            unique_filename = f"comprobantes/{uuid.uuid4()}{file_extension}"
            
            # Guardar archivo
            path = default_storage.save(unique_filename, ContentFile(comprobante_file.read()))
            final_comprobante_url = f"/media/{path}"
        
        # Obtener usuario actual (si está autenticado)
        user_email = request.headers.get('X-User-Email')
        usuario_id = None
        
        if user_email:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM usuarios WHERE email = %s", [user_email])
                user_result = cursor.fetchone()
                if user_result:
                    usuario_id = user_result[0]
        
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO gastos (descripcion, categoria, monto, fecha_gasto, proveedor, 
                                 metodo_pago, comprobante_url, usuario_id, fecha_creacion)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING id
            """, [descripcion, categoria, monto, fecha_gasto, proveedor, metodo_pago, final_comprobante_url, usuario_id])
            gasto_id = cursor.fetchone()[0]
        
        return Response({
            'success': True,
            'message': 'Gasto registrado exitosamente',
            'data': {'id': gasto_id}
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([AllowAny])
def update_gasto(request):
    """Actualizar gasto existente"""
    try:
        gasto_id = request.data.get('id')
        descripcion = request.data.get('descripcion')
        monto = request.data.get('monto')
        categoria = request.data.get('categoria')
        fecha_gasto = request.data.get('fecha_gasto')
        proveedor = request.data.get('proveedor')
        metodo_pago = request.data.get('metodo_pago')
        comprobante_file = request.FILES.get('comprobante')
        comprobante_url = request.data.get('comprobante_url', '')
        
        if not gasto_id:
            return Response({
                'success': False,
                'message': 'ID del gasto es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar que el gasto existe
        with connection.cursor() as cursor:
            cursor.execute("SELECT comprobante_url, fecha_gasto FROM gastos WHERE id = %s", [gasto_id])
            existing_gasto = cursor.fetchone()
            
            if not existing_gasto:
                return Response({
                    'success': False,
                    'message': 'Gasto no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Verificar que el gasto se puede editar (solo el mismo día)
            if not can_edit_gasto(existing_gasto[1]):
                return Response({
                    'success': False,
                    'message': 'Solo se pueden editar gastos del día actual'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Manejar archivo de comprobante
            final_comprobante_url = comprobante_url or existing_gasto[0]
            if comprobante_file:
                # Eliminar archivo anterior si existe
                if existing_gasto[0] and existing_gasto[0].startswith('/media/'):
                    old_file_path = existing_gasto[0].replace('/media/', '')
                    if default_storage.exists(old_file_path):
                        default_storage.delete(old_file_path)
                
                # Generar nombre único para el nuevo archivo
                file_extension = os.path.splitext(comprobante_file.name)[1]
                unique_filename = f"comprobantes/{uuid.uuid4()}{file_extension}"
                
                # Guardar archivo
                path = default_storage.save(unique_filename, ContentFile(comprobante_file.read()))
                final_comprobante_url = f"/media/{path}"
            
            # Actualizar gasto
            cursor.execute("""
                UPDATE gastos 
                SET descripcion = %s, categoria = %s, monto = %s, fecha_gasto = %s, 
                    proveedor = %s, metodo_pago = %s, comprobante_url = %s
                WHERE id = %s
            """, [descripcion, categoria, monto, fecha_gasto, proveedor, metodo_pago, final_comprobante_url, gasto_id])
        
        return Response({
            'success': True,
            'message': 'Gasto actualizado exitosamente'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_gasto(request):
    """Eliminar gasto"""
    try:
        gasto_id = request.data.get('id')
        
        if not gasto_id:
            return Response({
                'success': False,
                'message': 'ID del gasto es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar que el gasto existe y obtener información del archivo
        with connection.cursor() as cursor:
            cursor.execute("SELECT comprobante_url, fecha_gasto FROM gastos WHERE id = %s", [gasto_id])
            gasto = cursor.fetchone()
            
            if not gasto:
                return Response({
                    'success': False,
                    'message': 'Gasto no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Verificar que el gasto se puede eliminar (solo el mismo día)
            if not can_edit_gasto(gasto[1]):
                return Response({
                    'success': False,
                    'message': 'Solo se pueden eliminar gastos del día actual'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Eliminar archivo de comprobante si existe
            if gasto[0] and gasto[0].startswith('/media/'):
                file_path = gasto[0].replace('/media/', '')
                if default_storage.exists(file_path):
                    default_storage.delete(file_path)
            
            # Eliminar gasto
            cursor.execute("DELETE FROM gastos WHERE id = %s", [gasto_id])
        
        return Response({
            'success': True,
            'message': 'Gasto eliminado exitosamente'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_gasto_stats(request):
    """Obtener estadísticas de gastos"""
    try:
        with connection.cursor() as cursor:
            # Total gastos
            cursor.execute("SELECT COUNT(*), COALESCE(SUM(monto), 0) FROM gastos")
            total_count, total_amount = cursor.fetchone()
            
            # Gastos del mes actual
            cursor.execute("""
                SELECT COUNT(*), COALESCE(SUM(monto), 0) 
                FROM gastos 
                WHERE DATE_TRUNC('month', fecha_gasto) = DATE_TRUNC('month', CURRENT_DATE)
            """)
            month_count, month_amount = cursor.fetchone()
            
            # Gastos por categoría
            cursor.execute("""
                SELECT categoria, COUNT(*), COALESCE(SUM(monto), 0)
                FROM gastos 
                GROUP BY categoria 
                ORDER BY SUM(monto) DESC
            """)
            categorias = []
            for row in cursor.fetchall():
                categorias.append({
                    'categoria': row[0],
                    'count': row[1],
                    'amount': float(row[2])
                })
            
            # Gastos por método de pago
            cursor.execute("""
                SELECT metodo_pago, COUNT(*), COALESCE(SUM(monto), 0)
                FROM gastos 
                WHERE metodo_pago IS NOT NULL
                GROUP BY metodo_pago 
                ORDER BY SUM(monto) DESC
            """)
            metodos = []
            for row in cursor.fetchall():
                metodos.append({
                    'metodo': row[0],
                    'count': row[1],
                    'amount': float(row[2])
                })
        
        return Response({
            'success': True,
            'data': {
                'total_count': total_count,
                'total_amount': float(total_amount),
                'month_count': month_count,
                'month_amount': float(month_amount),
                'categorias': categorias,
                'metodos': metodos,
                'promedio': float(total_amount) / total_count if total_count > 0 else 0
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_gasto_tendencias(request):
    """Obtener tendencias de gastos de los últimos 6 meses"""
    try:
        meses = int(request.GET.get('meses', 6))
        if meses > 12:
            meses = 12
            
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    TO_CHAR(fecha_gasto, 'YYYY-MM') as mes,
                    TO_CHAR(fecha_gasto, 'YYYY') as año,
                    TO_CHAR(fecha_gasto, 'TMMonth') as nombre_mes,
                    COUNT(*) as cantidad,
                    COALESCE(SUM(monto), 0) as total
                FROM gastos
                WHERE fecha_gasto >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '%s months'
                GROUP BY TO_CHAR(fecha_gasto, 'YYYY-MM'), TO_CHAR(fecha_gasto, 'YYYY'), TO_CHAR(fecha_gasto, 'TMMonth')
                ORDER BY mes ASC
            """, [meses])
            
            tendencias = []
            for row in cursor.fetchall():
                tendencias.append({
                    'mes': row[0],
                    'año': row[1],
                    'nombre_mes': row[2],
                    'cantidad': row[3],
                    'total': float(row[4])
                })
            
            # Obtener gastos por categoría por mes
            cursor.execute("""
                SELECT 
                    TO_CHAR(fecha_gasto, 'YYYY-MM') as mes,
                    categoria,
                    COALESCE(SUM(monto), 0) as total
                FROM gastos
                WHERE fecha_gasto >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '%s months'
                GROUP BY TO_CHAR(fecha_gasto, 'YYYY-MM'), categoria
                ORDER BY mes ASC, total DESC
            """, [meses])
            
            categorias_por_mes = {}
            for row in cursor.fetchall():
                mes = row[0]
                cat = row[1]
                total = float(row[2])
                if mes not in categorias_por_mes:
                    categorias_por_mes[mes] = []
                categorias_por_mes[mes].append({
                    'categoria': cat,
                    'total': total
                })
            
            # Mes actual vs mes anterior
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', fecha_gasto) = DATE_TRUNC('month', CURRENT_DATE) THEN monto END), 0) as mes_actual,
                    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', fecha_gasto) = DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' THEN monto END), 0) as mes_anterior
                FROM gastos
                WHERE fecha_gasto >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'
            """)
            row = cursor.fetchone()
            mes_actual = float(row[0]) if row[0] else 0
            mes_anterior = float(row[1]) if row[1] else 0
            
            diferencia = mes_actual - mes_anterior
            porcentaje_cambio = ((diferencia / mes_anterior) * 100) if mes_anterior > 0 else 0
            
            # Top 5 categorías del mes actual
            cursor.execute("""
                SELECT categoria, COALESCE(SUM(monto), 0) as total
                FROM gastos
                WHERE DATE_TRUNC('month', fecha_gasto) = DATE_TRUNC('month', CURRENT_DATE)
                GROUP BY categoria
                ORDER BY total DESC
                LIMIT 5
            """)
            top_categorias = []
            for row in cursor.fetchall():
                top_categorias.append({
                    'categoria': row[0],
                    'total': float(row[1])
                })
        
        return Response({
            'success': True,
            'data': {
                'tendencias': tendencias,
                'categorias_por_mes': categorias_por_mes,
                'mes_actual': mes_actual,
                'mes_anterior': mes_anterior,
                'diferencia': diferencia,
                'porcentaje_cambio': round(porcentaje_cambio, 2),
                'top_categorias': top_categorias
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_balance_mensual(request):
    """Obtener balance mensual de ingresos vs gastos"""
    try:
        # Obtener mes y año (default: actual)
        año = request.GET.get('año')
        mes = request.GET.get('mes')
        
        if not año or not mes:
            from datetime import datetime
            now = datetime.now()
            año = str(now.year)
            mes = str(now.month).zfill(2)
        
        # Ingresos (pagos) del mes
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COALESCE(SUM(monto), 0), COUNT(*)
                FROM pagos
                WHERE TO_CHAR(fecha_pago, 'YYYY-MM') = %s
                AND estado = 'completado'
            """, [f'{año}-{mes}'])
            row = cursor.fetchone()
            ingresos = float(row[0]) if row[0] else 0
            num_ingresos = row[1] if row[1] else 0
            
            # Gastos del mes
            cursor.execute("""
                SELECT COALESCE(SUM(monto), 0), COUNT(*)
                FROM gastos
                WHERE TO_CHAR(fecha_gasto, 'YYYY-MM') = %s
            """, [f'{año}-{mes}'])
            row = cursor.fetchone()
            gastos = float(row[0]) if row[0] else 0
            num_gastos = row[1] if row[1] else 0
            
            # Balance
            balance = ingresos - gastos
            rentabilidad = ((balance / ingresos) * 100) if ingresos > 0 else 0
            
            # Mes anterior para comparación
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(CASE WHEN 'pagos' = 'pagos' THEN monto END), 0),
                    COALESCE(SUM(CASE WHEN 'gastos' = 'gastos' THEN monto END), 0)
                FROM (
                    SELECT monto, 'pagos' as tipo FROM pagos WHERE TO_CHAR(fecha_pago, 'YYYY-MM') = %s AND estado = 'completado'
                    UNION ALL
                    SELECT monto, 'gastos' as tipo FROM gastos WHERE TO_LE_CHAR(fecha_gasto, 'YYYY-MM') = %s
                ) as t
            """, [f'{int(año)}-{int(mes)-1:02d}', f'{int(año)}-{int(mes)-1:02d}'])
            
            # Historial últimos 6 meses
            cursor.execute("""
                SELECT 
                    TO_CHAR(mes, 'YYYY-MM') as mes,
                    TO_CHAR(mes, 'TMMonth') as nombre_mes,
                    COALESCE(ingresos, 0) as ingresos,
                    COALESCE(gastos, 0) as gastos,
                    COALESCE(ingresos, 0) - COALESCE(gastos, 0) as balance
                FROM (
                    SELECT DATE_TRUNC('month', fecha_pago) as mes
                    FROM pagos
                    WHERE fecha_pago >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '6 months'
                    AND estado = 'completado'
                    GROUP BY DATE_TRUNC('month', fecha_pago)
                ) as meses
                LEFT JOIN LATERAL (
                    SELECT SUM(monto) as ingresos
                    FROM pagos
                    WHERE DATE_TRUNC('month', fecha_pago) = meses.mes AND estado = 'completado'
                ) p ON true
                LEFT JOIN LATERAL (
                    SELECT SUM(monto) as gastos
                    FROM gastos
                    WHERE DATE_TRUNC('month', fecha_gasto) = meses.mes
                ) g ON true
                ORDER BY mes ASC
            """)
            
            historial = []
            for row in cursor.fetchall():
                historial.append({
                    'mes': row[0],
                    'nombre_mes': row[1],
                    'ingresos': float(row[2]) if row[2] else 0,
                    'gastos': float(row[3]) if row[3] else 0,
                    'balance': float(row[4]) if row[4] else 0
                })
        
        return Response({
            'success': True,
            'data': {
                'año': int(año),
                'mes': int(mes),
                'ingresos': ingresos,
                'num_ingresos': num_ingresos,
                'gastos': gastos,
                'num_gastos': num_gastos,
                'balance': balance,
                'rentabilidad': round(rentabilidad, 2),
                'historial': historial
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)