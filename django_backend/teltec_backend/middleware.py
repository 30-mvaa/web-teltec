from django.http import JsonResponse
from django.db import connection
from django.utils import timezone
import json


class SimpleAuthMiddleware:
    """
    Middleware simple para autenticación basada en email
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Rutas que no requieren autenticación
        public_paths = [
            '/api/auth/login/',
            '/api/auth/forgot/',
            '/api/auth/reset/',
            '/api/auth/reset-password/',
            '/api/configuracion/',
            '/api/clientes/',
            '/api/pagos/',
            '/api/deudas/',
            '/api/notificaciones/',
            '/api/reportes/',
            '/api/gastos/',
            '/api/sitio-web/',  # Rutas públicas del sitio web
            '/admin/',
            '/admin/login/',
            '/',
        ]
        
        # Verificar si la ruta es pública
        if any(request.path.startswith(path) for path in public_paths):
            return self.get_response(request)
        
        # Para APIs, verificar autenticación solo si no es una ruta pública
        if request.path.startswith('/api/') and not any(request.path.startswith(path) for path in public_paths):
            # Obtener email del header o query params
            email = request.headers.get('X-User-Email') or request.GET.get('email')
            
            if not email:
                return JsonResponse({
                    'success': False,
                    'message': 'Autenticación requerida'
                }, status=401)
            
            # Verificar si el usuario existe y está activo
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT id, email, nombre, rol, activo, last_activity, session_timeout_minutes
                        FROM usuarios 
                        WHERE email = %s AND activo = true
                    """, [email])
                    user_data = cursor.fetchone()
                
                if not user_data:
                    return JsonResponse({
                        'success': False,
                        'message': 'Usuario no encontrado o inactivo'
                    }, status=401)
                
                # Verificar timeout de sesión
                user_id, user_email, nombre, rol, activo, last_activity, session_timeout = user_data
                if last_activity:
                    timeout_minutes = session_timeout if session_timeout else 30
                    if timezone.now() > last_activity + timezone.timedelta(minutes=timeout_minutes):
                        return JsonResponse({
                            'success': False,
                            'message': 'Sesión expirada por inactividad. Por favor, inicie sesión nuevamente.'
                        }, status=401)
                
                # Actualizar last_activity
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE usuarios SET last_activity = %s WHERE email = %s
                    """, [timezone.now(), email])
                
                # Agregar información del usuario a la request
                request.user_email = email
                request.user_data = {
                    'id': user_id,
                    'email': user_email,
                    'nombre': nombre,
                    'rol': rol,
                    'activo': activo
                }
                
            except Exception as e:
                return JsonResponse({
                    'success': False,
                    'message': f'Error de autenticación: {str(e)}'
                }, status=500)
        
        return self.get_response(request) 