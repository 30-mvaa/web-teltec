from rest_framework import status, viewsets
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q, Count, Sum, Avg, F
from django.db import connection
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from .models import Deuda, HistorialDeuda
from .serializers import (
    DeudaSerializer, 
    DeudaResumenSerializer, 
    DeudaEstadisticasSerializer,
    HistorialDeudaSerializer
)

class DeudaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar las deudas"""
    
    queryset = Deuda.objects.all()
    serializer_class = DeudaSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Filtros personalizados para las deudas"""
        queryset = Deuda.objects.select_related('cliente', 'plan').prefetch_related('historial')
        
        # Filtros
        estado = self.request.query_params.get('estado', None)
        cliente_id = self.request.query_params.get('cliente_id', None)
        plan_id = self.request.query_params.get('plan_id', None)
        fecha_desde = self.request.query_params.get('fecha_desde', None)
        fecha_hasta = self.request.query_params.get('fecha_hasta', None)
        
        if estado:
            queryset = queryset.filter(estado=estado)
        
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        
        if plan_id:
            queryset = queryset.filter(plan_id=plan_id)
        
        if fecha_desde:
            try:
                fecha_desde = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_vencimiento__gte=fecha_desde)
            except ValueError:
                pass
        
        if fecha_hasta:
            try:
                fecha_hasta = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_vencimiento__lte=fecha_hasta)
            except ValueError:
                pass
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtener resumen de deudas"""
        queryset = self.get_queryset()
        
        # Estadísticas básicas
        total_deudas = queryset.count()
        total_monto = queryset.aggregate(total=Sum('monto_deuda'))['total'] or Decimal('0.00')
        total_pagado = queryset.aggregate(total=Sum('monto_pagado'))['total'] or Decimal('0.00')
        total_pendiente = total_monto - total_pagado
        
        # Deudas por estado
        deudas_por_estado = queryset.values('estado').annotate(
            cantidad=Count('id'),
            monto_total=Sum('monto_deuda'),
            monto_pendiente=Sum('monto_deuda') - Sum('monto_pagado')
        )
        
        # Top 10 deudores
        top_deudores = queryset.annotate(
            monto_pendiente=F('monto_deuda') - F('monto_pagado')
        ).filter(
            monto_pendiente__gt=0
        ).order_by('-monto_pendiente')[:10]
        
        data = {
            'total_deudas': total_deudas,
            'total_monto': float(total_monto),
            'total_pagado': float(total_pagado),
            'total_pendiente': float(total_pendiente),
            'deudas_por_estado': list(deudas_por_estado),
            'top_deudores': DeudaResumenSerializer(top_deudores, many=True).data
        }
        
        return Response({'success': True, 'data': data})
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas detalladas de deudas"""
        queryset = self.get_queryset()
        
        # Estadísticas generales
        stats = queryset.aggregate(
            total_deudas=Count('id'),
            total_monto_deuda=Sum('monto_deuda'),
            total_monto_pagado=Sum('monto_pagado'),
            promedio_deuda=Avg('monto_deuda'),
            promedio_meses_atraso=Avg('meses_atraso')
        )
        
        # Calcular monto pendiente
        total_pendiente = (stats['total_monto_deuda'] or Decimal('0.00')) - (stats['total_monto_pagado'] or Decimal('0.00'))
        
        # Deudas por estado
        deudas_por_estado = queryset.values('estado').annotate(
            cantidad=Count('id'),
            monto_total=Sum('monto_deuda'),
            monto_pendiente=Sum('monto_deuda') - Sum('monto_pagado')
        )
        
        # Deudas por mes (últimos 12 meses)
        hoy = timezone.now().date()
        doce_meses_atras = hoy - timedelta(days=365)
        
        deudas_por_mes = queryset.filter(
            mes_anio__gte=doce_meses_atras
        ).extra(
            select={'mes': "EXTRACT(month FROM mes_anio)", 'anio': "EXTRACT(year FROM mes_anio)"}
        ).values('mes', 'anio').annotate(
            cantidad=Count('id'),
            monto_total=Sum('monto_deuda'),
            monto_pendiente=Sum('monto_deuda') - Sum('monto_pagado')
        ).order_by('anio', 'mes')
        
        # Top 5 deudores
        top_deudores = queryset.annotate(
            monto_pendiente=F('monto_deuda') - F('monto_pagado')
        ).filter(
            monto_pendiente__gt=0
        ).order_by('-monto_pendiente')[:5]
        
        data = {
            'total_deudas': stats['total_deudas'] or 0,
            'total_monto_deuda': float(stats['total_monto_deuda'] or Decimal('0.00')),
            'total_monto_pagado': float(stats['total_monto_pagado'] or Decimal('0.00')),
            'total_monto_pendiente': float(total_pendiente),
            'promedio_deuda': float(stats['promedio_deuda'] or Decimal('0.00')),
            'promedio_meses_atraso': float(stats['promedio_meses_atraso'] or Decimal('0.00')),
            'deudas_por_estado': list(deudas_por_estado),
            'deudas_por_mes': list(deudas_por_mes),
            'top_deudores': DeudaResumenSerializer(top_deudores, many=True).data
        }
        
        return Response({'success': True, 'data': data})
    
    @action(detail=True, methods=['post'])
    def registrar_pago(self, request, pk=None):
        """Registrar un pago parcial o total de la deuda"""
        try:
            deuda = self.get_object()
            monto = Decimal(request.data.get('monto', 0))
            fecha_pago = request.data.get('fecha_pago', None)
            
            if monto <= 0:
                return Response({
                    'success': False,
                    'message': 'El monto debe ser mayor a 0'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if monto > deuda.monto_pendiente:
                return Response({
                    'success': False,
                    'message': f'El monto excede la deuda pendiente (${deuda.monto_pendiente})'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Registrar el pago
            nuevo_estado = deuda.registrar_pago(monto, fecha_pago)
            
            # Crear registro en el historial
            HistorialDeuda.objects.create(
                deuda=deuda,
                tipo_cambio='pago',
                descripcion=f'Pago registrado: ${monto}',
                monto_anterior=deuda.monto_pagado - monto,
                monto_nuevo=deuda.monto_pagado,
                estado_anterior=deuda.estado,
                estado_nuevo=nuevo_estado,
                usuario=request.user.username if request.user else 'sistema'
            )
            
            return Response({
                'success': True,
                'message': f'Pago registrado exitosamente. Nuevo estado: {nuevo_estado}',
                'data': DeudaSerializer(deuda).data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al registrar el pago: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def recalcular_estados(self, request):
        """Recalcular estados de todas las deudas"""
        try:
            deudas = self.get_queryset()
            actualizadas = 0
            
            for deuda in deudas:
                estado_anterior = deuda.estado
                deuda.calcular_estado()
                if deuda.estado != estado_anterior:
                    deuda.save()
                    actualizadas += 1
            
            return Response({
                'success': True,
                'message': f'{actualizadas} deudas actualizadas',
                'actualizadas': actualizadas
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al recalcular estados: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_deudas_stats(request):
    """Obtener estadísticas de deudas (endpoint público)"""
    try:
        # Estadísticas básicas
        total_deudas = Deuda.objects.count()
        total_monto = Deuda.objects.aggregate(total=Sum('monto_deuda'))['total'] or Decimal('0.00')
        total_pagado = Deuda.objects.aggregate(total=Sum('monto_pagado'))['total'] or Decimal('0.00')
        total_pendiente = total_monto - total_pagado
        
        # Clientes por estado
        clientes_por_estado = Deuda.objects.values('estado').annotate(
            cantidad=Count('cliente', distinct=True)
        )
        
        # Top 5 deudores
        top_deudores = Deuda.objects.annotate(
            monto_pendiente=F('monto_deuda') - F('monto_pagado')
        ).filter(
            monto_pendiente__gt=0
        ).order_by('-monto_pendiente')[:5]
        
        data = {
            'total_deudas': total_deudas,
            'total_monto_deuda': float(total_monto),
            'total_monto_pagado': float(total_pagado),
            'total_monto_pendiente': float(total_pendiente),
            'clientes_por_estado': list(clientes_por_estado),
            'top_deudores': DeudaResumenSerializer(top_deudores, many=True).data
        }
        
        return Response({
            'success': True,
            'data': data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_deudas_cliente(request, cliente_id):
    """Obtener deudas de un cliente específico"""
    try:
        deudas = Deuda.objects.filter(
            cliente_id=cliente_id
        ).select_related('cliente', 'plan').prefetch_related('historial')
        
        if not deudas.exists():
            return Response({
                'success': False,
                'message': 'No se encontraron deudas para este cliente'
            }, status=status.HTTP_404_NOT_FOUND)
        
        data = DeudaResumenSerializer(deudas, many=True).data
        
        return Response({
            'success': True,
            'data': data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
