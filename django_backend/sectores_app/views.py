from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .models import Sector
from .serializers import SectorSerializer, SectorUpdateSerializer, SectorListSerializer

# Create your views here.

class SectorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el modelo Sector
    """
    queryset = Sector.objects.all()
    serializer_class = SectorSerializer
    permission_classes = [AllowAny]
    
    def get_serializer_class(self):
        """Retorna el serializer apropiado según la acción"""
        if self.action == 'update' or self.action == 'partial_update':
            return SectorUpdateSerializer
        elif self.action == 'list':
            return SectorListSerializer
        return SectorSerializer
    
    def list(self, request, *args, **kwargs):
        """Listar sectores con filtros y paginación"""
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
            queryset = Sector.objects.all()
            
            # Aplicar filtros
            if search:
                queryset = queryset.filter(
                    Q(nombre_sector__icontains=search) |
                    Q(descripcion__icontains=search)
                )
            
            if estado and estado != 'todos':
                queryset = queryset.filter(estado=estado)
            
            # Contar total
            total_count = queryset.count()
            
            # Ordenamiento
            queryset = queryset.order_by('nombre_sector')
            
            # Paginación
            start = offset
            end = start + page_size
            sectores_paginados = queryset[start:end]
            
            # Serializar
            serializer = self.get_serializer(sectores_paginados, many=True)
            sectores_data = serializer.data
            
            # Calcular información de paginación
            total_pages = (total_count + page_size - 1) // page_size
            has_next = page < total_pages
            has_previous = page > 1
            
            return Response({
                'success': True,
                'data': sectores_data,
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
                'message': f'Error al obtener sectores: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request, *args, **kwargs):
        """Crear un nuevo sector"""
        try:
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                sector = serializer.save()
                
                return Response({
                    'success': True,
                    'message': 'Sector creado exitosamente',
                    'data': SectorSerializer(sector).data
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
                'message': f'Error al crear sector: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def update(self, request, *args, **kwargs):
        """Actualizar un sector existente"""
        try:
            sector = self.get_object()
            serializer = self.get_serializer(sector, data=request.data, partial=True)
            
            if serializer.is_valid():
                sector = serializer.save()
                
                return Response({
                    'success': True,
                    'message': 'Sector actualizado exitosamente',
                    'data': SectorSerializer(sector).data
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
                'message': f'Error al actualizar sector: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, *args, **kwargs):
        """Eliminar un sector (cambiar estado a inactivo)"""
        try:
            sector = self.get_object()
            
            # Verificar que no tenga clientes activos
            if sector.cantidad_clientes > 0:
                return Response({
                    'success': False,
                    'message': f'No se puede eliminar el sector. Tiene {sector.cantidad_clientes} clientes'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Cambiar estado a inactivo en lugar de eliminar
            sector.estado = 'inactivo'
            sector.save()
            
            return Response({
                'success': True,
                'message': 'Sector desactivado exitosamente'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error al desactivar sector: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas de sectores"""
        try:
            sectores = Sector.objects.all()
            stats = []
            
            for sector in sectores:
                stats.append({
                    'id': sector.id,
                    'nombre_sector': sector.nombre_sector,
                    'estado': sector.estado,
                    'cantidad_clientes': sector.cantidad_clientes
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
