from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
from django.http import HttpResponse
from datetime import datetime
import json
from .models import ConfiguracionSistema
# Importar modelos desde las apps correctas
from planes_app.models import Plan
from sectores_app.models import Sector

@api_view(['GET'])
@permission_classes([AllowAny])
def obtener_configuracion(request):
    """Obtener todas las configuraciones del sistema"""
    try:
        # Como la tabla configuracion_sistema no existe, devolver configuraciones por defecto
        config_dict = {
            'empresa_nombre': {'valor': 'TelTec Net', 'descripcion': 'Nombre de la empresa', 'categoria': 'empresa'},
            'empresa_direccion': {'valor': 'Av. Principal 123, Centro', 'descripcion': 'Dirección de la empresa', 'categoria': 'empresa'},
            'empresa_telefono': {'valor': '0999859689', 'descripcion': 'Teléfono de la empresa', 'categoria': 'empresa'},
            'empresa_whatsapp': {'valor': '0984517703', 'descripcion': 'Número de WhatsApp de la empresa (sin guiones)', 'categoria': 'empresa'},
            'empresa_email': {'valor': 'vangamarca4@gmail.com', 'descripcion': 'Email de la empresa', 'categoria': 'empresa'},
            'empresa_ruc': {'valor': '1234567890001', 'descripcion': 'RUC de la empresa', 'categoria': 'empresa'},
            'email_smtp_server': {'valor': '', 'descripcion': 'Servidor SMTP', 'categoria': 'email'},
            'email_smtp_port': {'valor': '', 'descripcion': 'Puerto SMTP', 'categoria': 'email'},
            'email_usuario': {'valor': '', 'descripcion': 'Usuario de email', 'categoria': 'email'},
            'email_password': {'valor': '', 'descripcion': 'Contraseña de email', 'categoria': 'email'},
            'sistema_dias_aviso_pago': {'valor': '5', 'descripcion': 'Días de aviso antes del pago', 'categoria': 'sistema'},
            'sistema_dias_corte_servicio': {'valor': '10', 'descripcion': 'Días antes del corte de servicio', 'categoria': 'sistema'},
            'sistema_backup_automatico': {'valor': 'false', 'descripcion': 'Backup automático', 'categoria': 'sistema'},
            'sistema_notificaciones_activas': {'valor': 'true', 'descripcion': 'Notificaciones activas', 'categoria': 'sistema'},
            'db_host': {'valor': 'localhost', 'descripcion': 'Host de la base de datos', 'categoria': 'database'},
            'db_puerto': {'valor': '5432', 'descripcion': 'Puerto de la base de datos', 'categoria': 'database'},
            'db_nombre': {'valor': 'teltec_db', 'descripcion': 'Nombre de la base de datos', 'categoria': 'database'},
            'db_usuario': {'valor': 'teltec_user', 'descripcion': 'Usuario de la base de datos', 'categoria': 'database'},
            'login_intentos_maximos': {'valor': '3', 'descripcion': 'Intentos máximos de login', 'categoria': 'controlLogin'},
            'login_minutos_congelacion': {'valor': '15', 'descripcion': 'Minutos de congelación', 'categoria': 'controlLogin'}
        }
        
        return Response({
            'success': True,
            'data': config_dict
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al obtener configuración: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def guardar_configuracion(request):
    """Guardar configuración del sistema"""
    try:
        data = request.data
        
        # Configuraciones de empresa
        configuraciones_empresa = {
            'empresa_nombre': data.get('empresa', {}).get('nombre', ''),
            'empresa_direccion': data.get('empresa', {}).get('direccion', ''),
            'empresa_telefono': data.get('empresa', {}).get('telefono', ''),
            'empresa_whatsapp': data.get('empresa', {}).get('whatsapp', ''),
            'empresa_email': data.get('empresa', {}).get('email', ''),
            'empresa_ruc': data.get('empresa', {}).get('ruc', ''),
        }
        
        # Configuraciones de email
        configuraciones_email = {
            'email_smtp_server': data.get('email', {}).get('smtp_server', ''),
            'email_smtp_port': data.get('email', {}).get('smtp_port', ''),
            'email_usuario': data.get('email', {}).get('email_usuario', ''),
            'email_password': data.get('email', {}).get('email_password', ''),
        }
        
        # Configuraciones de sistema
        configuraciones_sistema = {
            'sistema_dias_aviso_pago': data.get('sistema', {}).get('dias_aviso_pago', ''),
            'sistema_dias_corte_servicio': data.get('sistema', {}).get('dias_corte_servicio', ''),
            'sistema_backup_automatico': str(data.get('sistema', {}).get('backup_automatico', False)),
            'sistema_notificaciones_activas': str(data.get('sistema', {}).get('notificaciones_activas', False)),
        }
        
        # Configuraciones de base de datos
        configuraciones_db = {
            'db_host': data.get('database', {}).get('host', ''),
            'db_puerto': data.get('database', {}).get('puerto', ''),
            'db_nombre': data.get('database', {}).get('nombre_db', ''),
            'db_usuario': data.get('database', {}).get('usuario', ''),
        }
        
        # Configuraciones de control de login
        configuraciones_login = {
            'login_intentos_maximos': data.get('controlLogin', {}).get('intentos_maximos', ''),
            'login_minutos_congelacion': data.get('controlLogin', {}).get('minutos_congelacion', ''),
        }
        
        # Combinar todas las configuraciones
        todas_configuraciones = {
            **configuraciones_empresa,
            **configuraciones_email,
            **configuraciones_sistema,
            **configuraciones_db,
            **configuraciones_login
        }
        
        # Guardar cada configuración
        for clave, valor in todas_configuraciones.items():
            config, created = ConfiguracionSistema.objects.get_or_create(
                clave=clave,
                defaults={'valor': valor}
            )
            if not created:
                config.valor = valor
                config.save()
        
        return Response({
            'success': True,
            'message': 'Configuración guardada exitosamente'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al guardar configuración: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def listar_planes(request):
    """Listar todos los planes"""
    try:
        planes = Plan.objects.all().order_by('precio')
        planes_data = []
        
        for plan in planes:
            planes_data.append({
                'id': plan.id,
                'nombre': plan.tipo_plan,  # Usar tipo_plan del modelo
                'precio': float(plan.precio),
                'velocidad': '',  # Campo no existe en el modelo actual
                'descripcion': plan.descripcion,
                'activo': plan.estado == 'activo',  # Convertir estado a booleano
                'fecha_creacion': plan.fecha_creacion.isoformat(),
                'fecha_actualizacion': plan.fecha_actualizacion.isoformat()
            })
        
        return Response({
            'success': True,
            'data': planes_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al listar planes: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def crear_plan(request):
    """Crear un nuevo plan"""
    try:
        data = request.data
        
        # Validar datos requeridos
        if not data.get('nombre') or not data.get('precio'):
            return Response({
                'success': False,
                'message': 'Nombre y precio son requeridos'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar si ya existe un plan con ese nombre
        if Plan.objects.filter(tipo_plan=data['nombre']).exists():
            return Response({
                'success': False,
                'message': 'Ya existe un plan con ese nombre'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Crear el plan
        plan = Plan.objects.create(
            tipo_plan=data['nombre'],
            precio=data['precio'],
            descripcion=data.get('descripcion', '')
        )
        
        return Response({
            'success': True,
            'message': 'Plan creado exitosamente',
            'data': {
                'id': plan.id,
                'nombre': plan.tipo_plan,
                'precio': float(plan.precio),
                'descripcion': plan.descripcion
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al crear plan: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([AllowAny])
def actualizar_plan(request, plan_id):
    """Actualizar un plan existente"""
    try:
        data = request.data
        
        # Buscar el plan
        try:
            plan = Plan.objects.get(id=plan_id)
        except Plan.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Plan no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validar datos requeridos
        if not data.get('nombre') or not data.get('precio'):
            return Response({
                'success': False,
                'message': 'Nombre y precio son requeridos'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar si ya existe otro plan con ese nombre
        if Plan.objects.filter(tipo_plan=data['nombre']).exclude(id=plan_id).exists():
            return Response({
                'success': False,
                'message': 'Ya existe otro plan con ese nombre'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Actualizar el plan
        plan.tipo_plan = data['nombre']
        plan.precio = data['precio']
        plan.descripcion = data.get('descripcion', plan.descripcion)
        plan.save()
        
        return Response({
            'success': True,
            'message': 'Plan actualizado exitosamente',
            'data': {
                'id': plan.id,
                'nombre': plan.tipo_plan,
                'precio': float(plan.precio),
                'descripcion': plan.descripcion
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al actualizar plan: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def eliminar_plan(request, plan_id):
    """Eliminar un plan físicamente de la base de datos"""
    try:
        # Buscar el plan
        try:
            plan = Plan.objects.get(id=plan_id)
        except Plan.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Plan no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verificar si el plan está siendo usado por algún cliente
        from clientes_planes_app.models import ClientePlan
        if ClientePlan.objects.filter(id_plan=plan).exists():
            return Response({
                'success': False,
                'message': 'No se puede eliminar el plan porque está siendo usado por clientes. Use desactivar en su lugar.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Eliminar físicamente el plan
        plan.delete()
        
        return Response({
            'success': True,
            'message': 'Plan eliminado físicamente de la base de datos'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al eliminar plan: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([AllowAny])
def desactivar_plan(request, plan_id):
    """Desactivar un plan (marcar como inactivo)"""
    try:
        # Buscar el plan
        try:
            plan = Plan.objects.get(id=plan_id)
        except Plan.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Plan no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Marcar como inactivo
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

@api_view(['PUT'])
@permission_classes([AllowAny])
def activar_plan(request, plan_id):
    """Activar un plan (marcar como activo)"""
    try:
        # Buscar el plan
        try:
            plan = Plan.objects.get(id=plan_id)
        except Plan.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Plan no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Marcar como activo
        plan.estado = 'activo'
        plan.save()
        
        return Response({
            'success': True,
            'message': 'Plan activado exitosamente'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al activar plan: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def listar_sectores(request):
    """Listar todos los sectores (activos e inactivos)"""
    try:
        # Obtener todos los sectores, no solo los activos
        sectores = Sector.objects.all().order_by('nombre_sector')
        sectores_data = []
        
        for sector in sectores:
            sectores_data.append({
                'id': sector.id,
                'nombre': sector.nombre_sector,  # Usar nombre_sector del modelo
                'descripcion': sector.descripcion,
                'activo': sector.estado == 'activo',  # Convertir estado a booleano
                'fecha_creacion': sector.fecha_creacion.isoformat(),
                'fecha_actualizacion': sector.fecha_actualizacion.isoformat()
            })
        
        return Response({
            'success': True,
            'data': sectores_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al listar sectores: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def crear_sector(request):
    """Crear un nuevo sector"""
    try:
        data = request.data
        
        # Validar datos requeridos
        if not data.get('nombre'):
            return Response({
                'success': False,
                'message': 'Nombre es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar si ya existe un sector con ese nombre
        if Sector.objects.filter(nombre_sector=data['nombre']).exists():
            return Response({
                'success': False,
                'message': 'Ya existe un sector con ese nombre'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Crear el sector
        sector = Sector.objects.create(
            nombre_sector=data['nombre'],
            descripcion=data.get('descripcion', '')
        )
        
        return Response({
            'success': True,
            'message': 'Sector creado exitosamente',
            'data': {
                'id': sector.id,
                'nombre': sector.nombre_sector,
                'descripcion': sector.descripcion
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al crear sector: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([AllowAny])
def actualizar_sector(request, sector_id):
    """Actualizar un sector existente"""
    try:
        data = request.data
        
        # Buscar el sector
        try:
            sector = Sector.objects.get(id=sector_id)
        except Sector.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Sector no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validar datos requeridos
        if not data.get('nombre'):
            return Response({
                'success': False,
                'message': 'Nombre es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar si ya existe otro sector con ese nombre
        if Sector.objects.filter(nombre_sector=data['nombre']).exclude(id=sector_id).exists():
            return Response({
                'success': False,
                'message': 'Ya existe otro sector con ese nombre'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Actualizar el sector
        sector.nombre_sector = data['nombre']
        sector.descripcion = data.get('descripcion', sector.descripcion)
        sector.save()
        
        return Response({
            'success': True,
            'message': 'Sector actualizado exitosamente',
            'data': {
                'id': sector.id,
                'nombre': sector.nombre_sector,
                'descripcion': sector.descripcion
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al actualizar sector: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def eliminar_sector(request, sector_id):
    """Eliminar un sector físicamente de la base de datos"""
    try:
        # Buscar el sector
        try:
            sector = Sector.objects.get(id=sector_id)
        except Sector.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Sector no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verificar si el sector está siendo usado por algún cliente
        from clientes.models import Cliente
        if Cliente.objects.filter(id_sector=sector).exists():
            return Response({
                'success': False,
                'message': 'No se puede eliminar el sector porque está siendo usado por clientes. Use desactivar en su lugar.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Eliminar físicamente el sector
        sector.delete()
        
        return Response({
            'success': True,
            'message': 'Sector eliminado físicamente de la base de datos'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al eliminar sector: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([AllowAny])
def desactivar_sector(request, sector_id):
    """Desactivar un sector (marcar como inactivo)"""
    try:
        # Buscar el sector
        try:
            sector = Sector.objects.get(id=sector_id)
        except Sector.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Sector no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Marcar como inactivo
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

@api_view(['PUT'])
@permission_classes([AllowAny])
def activar_sector(request, sector_id):
    """Activar un sector (marcar como activo)"""
    try:
        # Buscar el sector
        try:
            sector = Sector.objects.get(id=sector_id)
        except Sector.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Sector no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Marcar como activo
        sector.estado = 'activo'
        sector.save()
        
        return Response({
            'success': True,
            'message': 'Sector activado exitosamente'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al activar sector: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def inicializar_configuracion(request):
    """Inicializar configuración por defecto"""
    try:
        # Configuraciones por defecto
        configuraciones_default = {
            'empresa_nombre': 'TelTec Net',
            'empresa_direccion': 'Av. Principal 123, Centro',
            'empresa_telefono': '0999859689',
            'empresa_whatsapp': '0984517703',
            'empresa_email': 'vangamarca4@gmail.com',
            'empresa_ruc': '1234567890001',
            'email_smtp_server': 'smtp.gmail.com',
            'email_smtp_port': '587',
            'email_usuario': 'vangamarca4@gmail.com',
            'email_password': '',
            'sistema_dias_aviso_pago': '5',
            'sistema_dias_corte_servicio': '5',
            'sistema_backup_automatico': 'true',
            'sistema_notificaciones_activas': 'true',
            'db_host': 'localhost',
            'db_puerto': '5432',
            'db_nombre': 'teltec_db',
            'db_usuario': 'postgres',
            'login_intentos_maximos': '3',
            'login_minutos_congelacion': '5',
        }
        
        # Crear configuraciones por defecto
        for clave, valor in configuraciones_default.items():
            ConfiguracionSistema.objects.get_or_create(
                clave=clave,
                defaults={'valor': valor}
            )
        
        # Crear planes por defecto
        planes_default = [
            {'nombre': 'Básico', 'precio': 20.00, 'velocidad': '10 Mbps'},
            {'nombre': 'Estándar', 'precio': 30.00, 'velocidad': '25 Mbps'},
            {'nombre': 'Premium', 'precio': 45.00, 'velocidad': '50 Mbps'},
        ]
        
        for plan_data in planes_default:
            Plan.objects.get_or_create(
                tipo_plan=plan_data['nombre'],
                defaults={
                    'precio': plan_data['precio'],
                    'descripcion': f"Plan {plan_data['nombre']}"
                }
            )
        
        # Crear sectores por defecto
        sectores_default = [
            'Centro',
            'Norte',
            'Sur',
            'Este',
            'Oeste'
        ]
        
        for sector_nombre in sectores_default:
            Sector.objects.get_or_create(
                nombre_sector=sector_nombre,
                defaults={'descripcion': f"Sector de {sector_nombre}"}
            )
        
        return Response({
            'success': True,
            'message': 'Configuración inicializada exitosamente'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error al inicializar configuración: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
