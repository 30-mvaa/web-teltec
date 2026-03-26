from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .models import Plan
from .serializers import PlanSerializer, PlanUpdateSerializer, PlanListSerializer

# Create your views here.

class PlanViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el modelo Plan
    """
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [AllowAny]
    
    def get_serializer_class(self):
        """Retorna el serializer apropiado según la acción"""
        if self.action == 'update' or self.action == 'partial_update':
            return PlanUpdateSerializer
        elif self.action == 'list':
            return PlanListSerializer
        return PlanSerializer
    
    def list(self, request, *args, **kwargs):
        """Listar planes con filtros y paginación"""
        try:
            # Parámetros de paginación
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 50))
            search = request.query_params.get('search', '')
            estado = request.query_params.get('estado', '')
            
            # Validar parámetros
            if page < 1:
                page = 1
            if page_size < 1 or page_size > 200:
                page_size = 50
                
            offset = (page - 1) * page_size
            
            # Construir queryset base
            queryset = Plan.objects.all()
            
            # Aplicar filtros
            if search:
                queryset = queryset.filter(
                    Q(tipo_plan__icontains=search) |
                    Q(descripcion__icontains=search)
                )
            
            if estado and estado != 'todos':
                queryset = queryset.filter(estado=estado)
            
            # Contar total
            total_count = queryset.count()
            
            # Ordenamiento
            queryset = queryset.order_by('precio')
            
            # Paginación
            start = offset
            end = start + page_size
            planes_paginados = queryset[start:end]
            
            # Serializar
            serializer = self.get_serializer(planes_paginados, many=True)
            planes_data = serializer.data
            
            # Calcular información de paginación
            total_pages = (total_count + page_size - 1) // page_size
            has_next = page < total_pages
            has_previous = page > 1
            
            return Response({
                'success': True,
                'data': planes_data,
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
                    'estado': estado
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener planes: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request, *args, **kwargs):
        """Crear un nuevo plan"""
        try:
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                plan = serializer.save()
                
                return Response({
                    'success': True,
                    'message': 'Plan creado exitosamente',
                    'data': PlanSerializer(plan).data
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
                'message': f'Error al crear plan: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def update(self, request, *args, **kwargs):
        """Actualizar un plan existente"""
        try:
            plan = self.get_object()
            serializer = self.get_serializer(plan, data=request.data, partial=True)
            
            if serializer.is_valid():
                plan = serializer.save()
                
                return Response({
                    'success': True,
                    'message': 'Plan actualizado exitosamente',
                    'data': PlanSerializer(plan).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'message': 'Datos inválidos',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al actualizar plan: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, *args, **kwargs):
        """Eliminar un plan (cambiar estado a inactivo)"""
        try:
            plan = self.get_object()
            
            # Verificar que no tenga clientes activos
            if plan.clientes_activos > 0:
                return Response({
                    'success': False,
                    'message': f'No se puede eliminar el plan. Tiene {plan.clientes_activos} clientes activos'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Cambiar estado a inactivo en lugar de eliminar
            plan.estado = 'inactivo'
            plan.save()
            
            return Response({
                'success': True,
                'message': 'Plan desactivado exitosamente'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al desactivar plan: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas de planes"""
        try:
            planes = Plan.objects.all()
            stats = []
            
            for plan in planes:
                stats.append({
                    'id': plan.id,
                    'tipo_plan': plan.tipo_plan,
                    'precio': float(plan.precio),
                    'estado': plan.estado,
                    'clientes_activos': plan.clientes_activos
                })
            
            return Response({
                'success': True,
                'data': stats
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al obtener estadísticas: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
